import type { MCPProcessState, MCPConfig, MCPToolDef, MCPCallToolResult } from './types.js';
import { MCPServerTransport } from './transport.js';

export class MCPClient {
  readonly name: string;
  state: MCPProcessState = 'created';
  tools: MCPToolDef[] = [];
  private transport: MCPServerTransport;
  private config: MCPConfig;
  private restartCount = 0;
  private healthTimer: NodeJS.Timeout | null = null;
  private pingFails = 0;
  private onStateChange: ((state: MCPProcessState) => void) | null = null;

  constructor(name: string, config: MCPConfig) {
    this.name = name;
    this.config = config;
    this.transport = new MCPServerTransport();
  }

  onStateChangeCallback(cb: (state: MCPProcessState) => void): void {
    this.onStateChange = cb;
  }

  async initialize(): Promise<void> {
    this.state = 'starting';
    this.onStateChange?.(this.state);

    return new Promise((resolve, reject) => {
      const startupTimeout = this.config.startupTimeout ?? 15_000;
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.state = 'error';
          this.onStateChange?.(this.state);
          reject(new Error(`MCP "${this.name}" startup timeout after ${startupTimeout}ms`));
        }
      }, startupTimeout);

      this.transport.onError((err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.state = 'error';
          this.onStateChange?.(this.state);
          reject(err);
        }
      });

      this.transport.onClose((code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.state = 'error';
          this.onStateChange?.(this.state);
          reject(new Error(`MCP "${this.name}" exited with code ${code} during startup`));
        }
      });

      // Spawn the process
      try {
        this.transport.spawn(
          this.config.command,
          this.config.args,
          this.config.env,
          this.config.requestTimeout,
        );
      } catch (err) {
        clearTimeout(timer);
        this.state = 'error';
        this.onStateChange?.(this.state);
        reject(err);
        return;
      }

      // Send initialize request
      this.transport.send({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'daisycode', version: '1.0.0' },
        },
      }).then((resp) => {
        if (resp.error) {
          throw new Error(`MCP initialize error: ${resp.error.message}`);
        }
        // Initialize succeeded — now list tools
        return this.transport.send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
          params: {},
        });
      }).then((resp) => {
        if (resp.error) {
          throw new Error(`MCP tools/list error: ${resp.error.message}`);
        }
        const result = resp.result as { tools: MCPToolDef[] };
        this.tools = result.tools ?? [];

        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.state = 'ready';
          this.onStateChange?.(this.state);
          this.startHealthCheck();
          resolve();
        }
      }).catch((err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          this.state = 'error';
          this.onStateChange?.(this.state);
          reject(err);
        }
      });
    });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPCallToolResult> {
    if (this.state === 'fatal' || this.state === 'error') {
      return {
        content: [{ type: 'text', text: `MCP "${this.name}" is in state "${this.state}", cannot call tool "${name}"` }],
        isError: true,
      };
    }

    try {
      const resp = await this.transport.send({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args },
      });

      if (resp.error) {
        return {
          content: [{ type: 'text', text: `MCP error: ${resp.error.message}` }],
          isError: true,
        };
      }

      return resp.result as MCPCallToolResult;
    } catch (err) {
      return {
        content: [{ type: 'text', text: `MCP call failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }

  async ping(): Promise<boolean> {
    try {
      const resp = await this.transport.send({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'ping',
        params: {},
      });
      return !resp.error;
    } catch {
      return false;
    }
  }

  close(): void {
    this.stopHealthCheck();
    this.transport.close();
    this.state = 'fatal';
    this.onStateChange?.(this.state);
  }

  get restartCountValue(): number {
    return this.restartCount;
  }

  incrementRestartCount(): void {
    this.restartCount++;
  }

  resetRestartCount(): void {
    this.restartCount = 0;
  }

  private startHealthCheck(): void {
    const interval = this.config.healthInterval ?? 30_000;
    this.healthTimer = setInterval(async () => {
      const ok = await this.ping();
      if (ok) {
        this.pingFails = 0;
        if (this.state === 'ready' || this.state === 'healthy') {
          this.state = 'healthy';
          this.onStateChange?.(this.state);
        }
      } else {
        this.pingFails++;
        // ponytail: 3 consecutive ping failures → error state
        if (this.pingFails >= 3) {
          this.state = 'error';
          this.onStateChange?.(this.state);
        }
      }
    }, interval).unref();
  }

  private stopHealthCheck(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
}
