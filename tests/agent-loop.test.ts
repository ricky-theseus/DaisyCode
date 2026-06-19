import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Agent } from '../src/agent-loop.js';
import { ToolRegistry } from '../src/tools/types.js';
import { PermissionSystem } from '../src/permissions.js';
import type { ModelAdapter } from '../src/model-adapter.js';
import type { ChatRequest, ChatResponse, ChatChunk } from '../src/types.js';

class MockModelAdapter implements ModelAdapter {
  private responses: ChatResponse[];
  private index = 0;

  constructor(responses: ChatResponse[]) {
    this.responses = responses;
  }

  async chat(_request: ChatRequest): Promise<ChatResponse> {
    const resp = this.responses[this.index];
    this.index = (this.index + 1) % this.responses.length;
    return resp;
  }

  async *stream(_request: ChatRequest): AsyncIterable<ChatChunk> {
    // not used by Agent.run
  }
}

describe('Agent', () => {
  it('empty input returns silently (no events)', async () => {
    const model = new MockModelAdapter([{ message: { role: 'assistant', content: '' } }]);
    const agent = new Agent({
      model,
      registry: new ToolRegistry(),
      permissions: new PermissionSystem(),
      agentName: 'test',
      agentPermissions: {},
      sessionId: 's1',
    });

    const events: any[] = [];
    for await (const ev of agent.run('')) {
      events.push(ev);
    }
    assert.strictEqual(events.length, 0);
  });

  it('whitespace-only input returns silently', async () => {
    const model = new MockModelAdapter([{ message: { role: 'assistant', content: '' } }]);
    const agent = new Agent({
      model,
      registry: new ToolRegistry(),
      permissions: new PermissionSystem(),
      agentName: 'test',
      agentPermissions: {},
      sessionId: 's1',
    });

    const events: any[] = [];
    for await (const ev of agent.run('   \n  ')) {
      events.push(ev);
    }
    assert.strictEqual(events.length, 0);
  });

  it('basic conversation emits text_delta then done', async () => {
    const model = new MockModelAdapter([
      { message: { role: 'assistant', content: 'Hello!' } },
    ]);
    const agent = new Agent({
      model,
      registry: new ToolRegistry(),
      permissions: new PermissionSystem(),
      agentName: 'test',
      agentPermissions: {},
      sessionId: 's1',
    });

    const events: any[] = [];
    for await (const ev of agent.run('hi')) {
      events.push(ev);
    }
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].type, 'text_delta');
    assert.strictEqual(events[0].content, 'Hello!');
    assert.strictEqual(events[1].type, 'done');
  });

  it('emits error event when model throws', async () => {
    const throwingModel: ModelAdapter = {
      async chat() { throw new Error('model failure'); },
      async *stream() {},
    };
    const agent = new Agent({
      model: throwingModel,
      registry: new ToolRegistry(),
      permissions: new PermissionSystem(),
      agentName: 'test',
      agentPermissions: {},
      sessionId: 's1',
    });

    const events: any[] = [];
    for await (const ev of agent.run('trigger error')) {
      events.push(ev);
    }
    // error event is yielded, then loop exits and yields done
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].type, 'error');
    assert.strictEqual(events[0].error.message, 'model failure');
    assert.strictEqual(events[1].type, 'done');
  });
});
