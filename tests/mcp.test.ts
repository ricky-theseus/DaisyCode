import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCError,
  MCPToolDef,
  MCPCallToolResult,
  MCPProcessState,
  MCPConfig,
} from '../src/mcp/types.js';

describe('MCP type definitions', () => {
  it('JSONRPCRequest has correct shape', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    };
    assert.strictEqual(req.jsonrpc, '2.0');
    assert.strictEqual(req.id, 1);
    assert.strictEqual(req.method, 'initialize');
    assert.deepStrictEqual(req.params, { protocolVersion: '2024-11-05' });
  });

  it('JSONRPCRequest works without params', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    };
    assert.strictEqual(req.params, undefined);
  });

  it('JSONRPCResponse has result', () => {
    const resp: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: { tools: [] },
    };
    assert.strictEqual(resp.jsonrpc, '2.0');
    assert.deepStrictEqual(resp.result, { tools: [] });
    assert.strictEqual(resp.error, undefined);
  });

  it('JSONRPCResponse has error', () => {
    const err: JSONRPCError = { code: -32601, message: 'Method not found' };
    const resp: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 1,
      error: err,
    };
    assert.strictEqual(resp.error?.code, -32601);
    assert.strictEqual(resp.error?.message, 'Method not found');
    assert.strictEqual(resp.result, undefined);
  });

  it('JSONRPCResponse error can have data', () => {
    const err: JSONRPCError = {
      code: -32000,
      message: 'Server error',
      data: { detail: 'OOM' },
    };
    assert.deepStrictEqual(err.data, { detail: 'OOM' });
  });

  it('JSONRPCNotification has no id', () => {
    const notif: JSONRPCNotification = {
      jsonrpc: '2.0',
      method: 'notify',
      params: { event: 'change' },
    };
    assert.strictEqual((notif as any).id, undefined);
    assert.strictEqual(notif.method, 'notify');
  });

  it('JSONRPCNotification works without params', () => {
    const notif: JSONRPCNotification = {
      jsonrpc: '2.0',
      method: 'cancel',
    };
    assert.strictEqual(notif.params, undefined);
  });

  it('MCPToolDef has required fields', () => {
    const tool: MCPToolDef = {
      name: 'read_file',
      description: 'Read a file',
      inputSchema: {
        type: 'object',
        properties: { path: { type: 'string' } },
      },
    };
    assert.strictEqual(tool.name, 'read_file');
    assert.strictEqual(tool.description, 'Read a file');
    assert.ok(tool.inputSchema.properties);
  });

  it('MCPToolDef description is optional', () => {
    const tool: MCPToolDef = {
      name: 'ping',
      inputSchema: {},
    };
    assert.strictEqual(tool.description, undefined);
  });

  it('MCPCallToolResult has content array', () => {
    const result: MCPCallToolResult = {
      content: [{ type: 'text', text: 'hello' }],
    };
    assert.strictEqual(result.content.length, 1);
    assert.strictEqual(result.content[0].text, 'hello');
    assert.strictEqual(result.isError, undefined);
  });

  it('MCPCallToolResult can have isError', () => {
    const result: MCPCallToolResult = {
      content: [{ type: 'text', text: 'error' }],
      isError: true,
    };
    assert.strictEqual(result.isError, true);
  });

  it('MCPCallToolResult content can have data', () => {
    const result: MCPCallToolResult = {
      content: [{ type: 'image', data: 'base64...' }],
    };
    assert.strictEqual(result.content[0].type, 'image');
    assert.strictEqual(result.content[0].data, 'base64...');
  });

  it('MCPProcessState is a union of valid states', () => {
    const states: MCPProcessState[] = ['created', 'starting', 'ready', 'healthy', 'error', 'fatal'];
    assert.strictEqual(states.length, 6);
  });

  it('MCPConfig has required fields', () => {
    const cfg: MCPConfig = {
      command: 'node',
      args: ['server.js'],
    };
    assert.strictEqual(cfg.command, 'node');
    assert.deepStrictEqual(cfg.args, ['server.js']);
  });

  it('MCPConfig all optional fields', () => {
    const cfg: MCPConfig = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem'],
      env: { HOME: '/tmp' },
      startupTimeout: 10_000,
      healthInterval: 15_000,
      maxRestarts: 5,
      requestTimeout: 30_000,
    };
    assert.strictEqual(cfg.startupTimeout, 10_000);
    assert.strictEqual(cfg.healthInterval, 15_000);
    assert.strictEqual(cfg.maxRestarts, 5);
    assert.strictEqual(cfg.requestTimeout, 30_000);
    assert.strictEqual(cfg.env?.HOME, '/tmp');
  });
});

describe('JSON-RPC message construction', () => {
  it('constructs a valid initialize request', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'daisycode', version: '1.0.0' },
      },
    };
    const serialized = JSON.stringify(req);
    const parsed = JSON.parse(serialized) as JSONRPCRequest;
    assert.strictEqual(parsed.jsonrpc, '2.0');
    assert.strictEqual(parsed.id, 1);
    assert.strictEqual(parsed.method, 'initialize');
    assert.strictEqual(parsed.params!.protocolVersion, '2024-11-05');
  });

  it('constructs a valid tools/list request', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    };
    assert.strictEqual(JSON.parse(JSON.stringify(req)).method, 'tools/list');
  });

  it('constructs a valid tools/call request', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'read_file',
        arguments: { path: '/tmp/test.txt' },
      },
    };
    const parsed = JSON.parse(JSON.stringify(req));
    assert.strictEqual(parsed.method, 'tools/call');
    assert.strictEqual(parsed.params.name, 'read_file');
    assert.strictEqual(parsed.params.arguments.path, '/tmp/test.txt');
  });

  it('constructs a valid ping request', () => {
    const req: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 42,
      method: 'ping',
      params: {},
    };
    assert.strictEqual(JSON.parse(JSON.stringify(req)).method, 'ping');
  });

  it('serializes and deserializes a response with result', () => {
    const resp: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 1,
      result: {
        tools: [
          { name: 'read', description: 'Read file', inputSchema: {} },
        ],
      },
    };
    const roundtrip = JSON.parse(JSON.stringify(resp)) as JSONRPCResponse;
    assert.strictEqual(roundtrip.id, 1);
    assert.ok(Array.isArray(roundtrip.result!.tools));
    assert.strictEqual(roundtrip.result!.tools[0].name, 'read');
  });

  it('serializes and deserializes a response with error', () => {
    const resp: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: 1,
      error: { code: -32603, message: 'Internal error' },
    };
    const roundtrip = JSON.parse(JSON.stringify(resp)) as JSONRPCResponse;
    assert.strictEqual(roundtrip.error!.code, -32603);
    assert.strictEqual(roundtrip.error!.message, 'Internal error');
  });

  it('notification serializes without id field at top level', () => {
    const notif: JSONRPCNotification = {
      jsonrpc: '2.0',
      method: 'notify',
      params: { event: 'change' },
    };
    const json = JSON.stringify(notif);
    // Top-level "id" should not be present
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.id, undefined);
    assert.strictEqual(parsed.method, 'notify');
    assert.strictEqual(parsed.jsonrpc, '2.0');
  });
});

describe('MCPClient state machine transitions', () => {
  it('starts in created state', async () => {
    // Import here to avoid side effects at module level
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    assert.strictEqual(client.state, 'created');
    client.close();
  });

  it('transitions to error on failed spawn', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'nonexistent-command-xyz', args: [] });
    try {
      await client.initialize();
    } catch {
      // expected
    }
    assert.strictEqual(client.state, 'error');
    client.close();
  });

  it('transitions to fatal on close', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    client.close();
    assert.strictEqual(client.state, 'fatal');
  });

  it('callTool returns error when in fatal state', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    client.close();
    const result = await client.callTool('read', { path: '/tmp/x' });
    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text!.includes('fatal'));
    client.close();
  });

  it('callTool returns error when in error state', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    // Force error state
    client.state = 'error';
    const result = await client.callTool('read', { path: '/tmp/x' });
    assert.strictEqual(result.isError, true);
    assert.ok(result.content[0].text!.includes('error'));
    client.close();
  });

  it('restartCount starts at 0', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    assert.strictEqual(client.restartCountValue, 0);
    client.close();
  });

  it('incrementRestartCount increases count', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    client.incrementRestartCount();
    assert.strictEqual(client.restartCountValue, 1);
    client.incrementRestartCount();
    assert.strictEqual(client.restartCountValue, 2);
    client.close();
  });

  it('resetRestartCount resets to 0', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    client.incrementRestartCount();
    client.incrementRestartCount();
    client.resetRestartCount();
    assert.strictEqual(client.restartCountValue, 0);
    client.close();
  });

  it('onStateChangeCallback fires on state transitions', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    const states: MCPProcessState[] = [];
    client.onStateChangeCallback((s) => states.push(s));

    // close triggers fatal
    client.close();
    assert.ok(states.includes('fatal'));
  });

  it('tools list is empty after construction', async () => {
    const { MCPClient } = await import('../src/mcp/client.js');
    const client = new MCPClient('test', { command: 'node', args: ['-e', 'process.exit(0)'] });
    assert.deepStrictEqual(client.tools, []);
    client.close();
  });
});

describe('MCPManager', () => {
  it('getServerState returns undefined for unknown server', async () => {
    const { MCPManager } = await import('../src/mcp/manager.js');
    const { ToolRegistry } = await import('../src/tools/types.js');
    const manager = new MCPManager(new ToolRegistry());
    assert.strictEqual(manager.getServerState('nonexistent'), undefined);
    manager.close();
  });

  it('loadFromConfig with undefined does nothing', async () => {
    const { MCPManager } = await import('../src/mcp/manager.js');
    const { ToolRegistry } = await import('../src/tools/types.js');
    const manager = new MCPManager(new ToolRegistry());
    await manager.loadFromConfig(undefined);
    // No crash = pass
    manager.close();
  });

  it('loadFromConfig with empty config does nothing', async () => {
    const { MCPManager } = await import('../src/mcp/manager.js');
    const { ToolRegistry } = await import('../src/tools/types.js');
    const manager = new MCPManager(new ToolRegistry());
    await manager.loadFromConfig({});
    manager.close();
  });

  it('registerServer with bad command sets error state', async () => {
    const { MCPManager } = await import('../src/mcp/manager.js');
    const { ToolRegistry } = await import('../src/tools/types.js');
    const manager = new MCPManager(new ToolRegistry());
    await manager.registerServer('bad', {
      command: 'nonexistent-command-xyz',
      args: [],
      maxRestarts: 0,
    });
    // Give it a moment to fail
    await new Promise(r => setTimeout(r, 50));
    const state = manager.getServerState('bad');
    assert.ok(state === 'error' || state === 'fatal', `expected error/fatal, got ${state}`);
    manager.close();
  });

  it('getTools returns empty for no servers', async () => {
    const { MCPManager } = await import('../src/mcp/manager.js');
    const { ToolRegistry } = await import('../src/tools/types.js');
    const manager = new MCPManager(new ToolRegistry());
    assert.deepStrictEqual(manager.getTools(), []);
    manager.close();
  });
});
