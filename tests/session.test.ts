import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createSession, saveSession, loadSession, addMessage } from '../src/session.js';

const testDir = join(import.meta.dirname, '.test-sessions');

before(() => {
  if (!existsSync(testDir)) {mkdirSync(testDir, { recursive: true });}
});

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('session', () => {
  it('createSession returns a valid session', () => {
    const s = createSession('test-agent', testDir);
    assert.ok(s.id);
    assert.strictEqual(s.agent, 'test-agent');
    assert.deepStrictEqual(s.messages, []);
    assert.ok(s.createdAt);
    assert.strictEqual(s.createdAt, s.updatedAt);
  });

  it('saveSession + loadSession round-trip preserves data', () => {
    const s = createSession('agent-x', testDir);
    addMessage(s, { role: 'user', content: 'hello' });
    addMessage(s, { role: 'assistant', content: 'hi' });
    saveSession(s, testDir);

    const loaded = loadSession(s.id, testDir);
    assert.ok(loaded);
    assert.strictEqual(loaded!.id, s.id);
    assert.strictEqual(loaded!.agent, 'agent-x');
    assert.strictEqual(loaded!.messages.length, 2);
    assert.strictEqual(loaded!.messages[0].content, 'hello');
    assert.strictEqual(loaded!.messages[1].content, 'hi');
  });

  it('loadSession returns null for missing session', () => {
    const result = loadSession('nonexistent-id', testDir);
    assert.strictEqual(result, null);
  });

  it('loadSession returns fallback for corrupted JSON', () => {
    const id = randomUUID();
    const filePath = join(testDir, `${id}.json`);
    writeFileSync(filePath, '{invalid json!!!', 'utf-8');

    const result = loadSession(id, testDir);
    assert.ok(result);
    assert.strictEqual(result!.id, id);
    assert.strictEqual(result!.agent, 'default');
    assert.deepStrictEqual(result!.messages, []);
  });

  it('addMessage appends and updates updatedAt', async () => {
    const s = createSession('test', testDir);
    const before = s.updatedAt;
    await new Promise(r => setTimeout(r, 5));
    addMessage(s, { role: 'user', content: 'msg' });
    assert.strictEqual(s.messages.length, 1);
    assert.notStrictEqual(s.updatedAt, before);
  });
});
