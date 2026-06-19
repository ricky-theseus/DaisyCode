import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { Orchestrator, acquireFileLock, releaseFileLock, releaseSessionLocks } from '../src/orchestrator.js';
import { ToolRegistry } from '../src/tools/types.js';
import { PermissionSystem } from '../src/permissions.js';
import type { ModelAdapter } from '../src/model-adapter.js';
import type { ChatRequest, ChatResponse, ChatChunk } from '../src/types.js';

class MockModelAdapter implements ModelAdapter {
  async chat(_request: ChatRequest): Promise<ChatResponse> {
    return { message: { role: 'assistant', content: 'ok' } };
  }
  async *stream(_request: ChatRequest): AsyncIterable<ChatChunk> {
    yield { type: 'text', content: 'ok', index: 0 };
  }
}

function makeOrchestrator(): Orchestrator {
  return new Orchestrator(
    new MockModelAdapter(),
    new ToolRegistry(),
    new PermissionSystem(),
  );
}

describe('Orchestrator — createSubagent', () => {
  it('creates a subagent session with depth 0 when parentId is null', () => {
    const orch = makeOrchestrator();
    const { session, permissions } = orch.createSubagent(
      { agent: 'test-agent' },
      null,
      {},
    );
    assert.ok(session.id);
    assert.strictEqual(session.config.agent, 'test-agent');
    assert.strictEqual(session.parentId, null);
    assert.strictEqual(session.depth, 0);
    assert.deepStrictEqual(session.messages, []);
  });

  it('increments depth from parent', () => {
    const orch = makeOrchestrator();
    const parent = orch.createSubagent({ agent: 'parent' }, null, {});
    const child = orch.createSubagent(
      { agent: 'child' },
      parent.session.id,
      {},
    );
    assert.strictEqual(child.session.depth, 1);
    assert.strictEqual(child.session.parentId, parent.session.id);
  });

  it('throws when depth exceeds maxDepth=3', () => {
    const orch = makeOrchestrator();
    const s1 = orch.createSubagent({ agent: 'a1' }, null, {});
    const s2 = orch.createSubagent({ agent: 'a2' }, s1.session.id, {});
    const s3 = orch.createSubagent({ agent: 'a3' }, s2.session.id, {});
    const s4 = orch.createSubagent({ agent: 'a4' }, s3.session.id, {});
    // s4 has depth 3, which is NOT > 3, so it succeeds
    assert.strictEqual(s4.session.depth, 3);
    // s5 would have depth 4, which IS > 3
    assert.throws(
      () => orch.createSubagent({ agent: 'a5' }, s4.session.id, {}),
      /max_depth_exceeded/,
    );
  });

  it('inherits permissions from parent', () => {
    const orch = makeOrchestrator();
    const parent = orch.createSubagent(
      { agent: 'parent' },
      null,
      { read: 'allow', bash: 'deny' },
    );
    const child = orch.createSubagent(
      { agent: 'child', permissions: { edit: 'allow' } },
      parent.session.id,
      parent.permissions,
    );
    assert.strictEqual(child.permissions.read, 'allow');
    assert.strictEqual(child.permissions.bash, 'deny');
    assert.strictEqual(child.permissions.edit, 'allow');
  });

  it('child permissions override parent with stricter level', () => {
    const orch = makeOrchestrator();
    const parent = orch.createSubagent(
      { agent: 'parent', permissions: { read: 'allow' } },
      null,
      {},
    );
    const child = orch.createSubagent(
      { agent: 'child', permissions: { read: 'deny' } },
      parent.session.id,
      parent.permissions,
    );
    assert.strictEqual(child.permissions.read, 'deny');
  });

  it('parent permissions are preserved when child has none', () => {
    const orch = makeOrchestrator();
    const parent = orch.createSubagent(
      { agent: 'parent' },
      null,
      { read: 'allow' },
    );
    const child = orch.createSubagent(
      { agent: 'child' },
      parent.session.id,
      parent.permissions,
    );
    assert.strictEqual(child.permissions.read, 'allow');
  });

  it('generates unique session IDs', () => {
    const orch = makeOrchestrator();
    const s1 = orch.createSubagent({ agent: 'a' }, null, {});
    const s2 = orch.createSubagent({ agent: 'b' }, null, {});
    assert.notStrictEqual(s1.session.id, s2.session.id);
  });
});

describe('Orchestrator — runSubagent', () => {
  it('returns success with output for foreground task', async () => {
    const orch = makeOrchestrator();
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    const result = await orch.runSubagent(session, 'hello', {}, undefined, false);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.output, 'ok');
  });

  it('returns success immediately for background task', async () => {
    const orch = makeOrchestrator();
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    const result = await orch.runSubagent(session, 'hello', {}, undefined, true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.output, 'Task started in background.');
  });

  it('captures error when model throws', async () => {
    // Agent.run() catches model errors internally and yields an error event,
    // then breaks and yields done. The for-await loop in runSubagent does NOT
    // throw — it processes the error event as a normal event.
    // So runSubagent returns success: true with whatever output was accumulated.
    const throwingModel: ModelAdapter = {
      async chat() { throw new Error('model exploded'); },
      async *stream() {},
    };
    const orch = new Orchestrator(throwingModel, new ToolRegistry(), new PermissionSystem());
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    const result = await orch.runSubagent(session, 'hello', {}, undefined, false);
    // Agent catches the error internally, yields error event, then done.
    // runSubagent's for-await sees the error event (type: 'error') and
    // pushes it to session.messages but does NOT throw.
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.output, '');
    // The error event should be in session messages
    assert.ok(session.messages.length >= 1);
    const errorEvent = session.messages.find(m => m.type === 'error');
    assert.ok(errorEvent, 'expected an error event in session messages');
  });
});

describe('Orchestrator — background truncation', () => {
  it('truncates background output to 500 characters', async () => {
    const longModel: ModelAdapter = {
      async chat() {
        return { message: { role: 'assistant', content: 'x'.repeat(1000) } };
      },
      async *stream() {},
    };
    const orch = new Orchestrator(longModel, new ToolRegistry(), new PermissionSystem());
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    await orch.runSubagent(session, 'hello', {}, undefined, true);

    // Wait for background task to complete
    await new Promise(r => setTimeout(r, 100));

    // The last message should be the truncated summary
    const lastMsg = session.messages[session.messages.length - 1];
    assert.ok(lastMsg);
    assert.strictEqual(lastMsg.type, 'text_delta');
    assert.ok(lastMsg.content.includes('[background task complete]'));
    assert.ok(lastMsg.content.includes('...[truncated]'));
    // 500 chars + "[background task complete]\n" prefix + "...[truncated]" suffix
    assert.ok(lastMsg.content.length < 700);
  });

  it('does not truncate background output under 500 characters', async () => {
    const shortModel: ModelAdapter = {
      async chat() {
        return { message: { role: 'assistant', content: 'short output' } };
      },
      async *stream() {},
    };
    const orch = new Orchestrator(shortModel, new ToolRegistry(), new PermissionSystem());
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    await orch.runSubagent(session, 'hello', {}, undefined, true);

    await new Promise(r => setTimeout(r, 100));

    const lastMsg = session.messages[session.messages.length - 1];
    assert.ok(lastMsg);
    assert.ok(lastMsg.content.includes('short output'));
    assert.ok(!lastMsg.content.includes('...[truncated]'));
  });
});

describe('Orchestrator — cancelAll', () => {
  it('clears all sessions and releases locks', () => {
    const orch = makeOrchestrator();
    const { session } = orch.createSubagent({ agent: 'test' }, null, {});
    acquireFileLock('/tmp/test.txt', session.id);
    assert.strictEqual(acquireFileLock('/tmp/test.txt', 'other'), false);

    orch.cancelAll();

    // After cancel, lock should be released
    assert.strictEqual(acquireFileLock('/tmp/test.txt', 'other'), true);
  });
});

describe('file locks', () => {
  it('acquireFileLock returns true for new path', () => {
    assert.strictEqual(acquireFileLock('/tmp/lock-test-1', 's1'), true);
    releaseFileLock('/tmp/lock-test-1');
  });

  it('acquireFileLock returns false for locked path by different session', () => {
    acquireFileLock('/tmp/lock-test-2', 's1');
    assert.strictEqual(acquireFileLock('/tmp/lock-test-2', 's2'), false);
    releaseFileLock('/tmp/lock-test-2');
  });

  it('acquireFileLock returns true for same session re-locking', () => {
    acquireFileLock('/tmp/lock-test-3', 's1');
    assert.strictEqual(acquireFileLock('/tmp/lock-test-3', 's1'), true);
    releaseFileLock('/tmp/lock-test-3');
  });

  it('releaseFileLock removes the lock', () => {
    acquireFileLock('/tmp/lock-test-4', 's1');
    releaseFileLock('/tmp/lock-test-4');
    assert.strictEqual(acquireFileLock('/tmp/lock-test-4', 's2'), true);
    releaseFileLock('/tmp/lock-test-4');
  });

  it('releaseSessionLocks releases all locks for a session', () => {
    acquireFileLock('/tmp/a', 's1');
    acquireFileLock('/tmp/b', 's1');
    acquireFileLock('/tmp/c', 's2');
    releaseSessionLocks('s1');
    assert.strictEqual(acquireFileLock('/tmp/a', 's3'), true);
    assert.strictEqual(acquireFileLock('/tmp/b', 's3'), true);
    assert.strictEqual(acquireFileLock('/tmp/c', 's2'), true); // still held by s2
    releaseFileLock('/tmp/c');
  });
});
