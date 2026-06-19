import type { MCPProcessState, MCPConfig } from './types.js';
import type { ToolDef, ToolContext } from '../types.js';
import type { ToolRegistry} from '../tools/types.js';
import { type Tool } from '../tools/types.js';
import { MCPClient } from './client.js';

interface ManagedServer {
  client: MCPClient;
  config: MCPConfig;
  restartCount: number;
  maxRestarts: number;
  // ponytail: exponential backoff: 1s, 2s, 4s, 8s...
  // TODO: make base delay configurable
}

export class MCPManager {
  private servers = new Map<string, ManagedServer>();
  private registry: ToolRegistry;
  private healthTimer: NodeJS.Timeout | null = null;

  constructor(registry: ToolRegistry) {
    this.registry = registry;
  }

  async loadFromConfig(mcpConfigs?: Record<string, MCPConfig>): Promise<void> {
    if (!mcpConfigs) {return;}

    const entries = Object.entries(mcpConfigs);
    if (entries.length === 0) {return;}

    await Promise.all(entries.map(([name, config]) => this.registerServer(name, config)));
  }

  async registerServer(name: string, config: MCPConfig): Promise<void> {
    if (this.servers.has(name)) {
      // ponytail: skip duplicate registration silently
      return;
    }

    const client = new MCPClient(name, config);
    const managed: ManagedServer = {
      client,
      config,
      restartCount: 0,
      maxRestarts: config.maxRestarts ?? 3,
    };

    this.servers.set(name, managed);

    client.onStateChangeCallback((state) => {
      if (state === 'error') {
        this.handleError(name);
      }
    });

    try {
      await client.initialize();
      this.registerTools(name, client);
    } catch {
      // Initial startup failed — attempt restart
      await this.attemptRestart(name);
    }
  }

  private async attemptRestart(name: string): Promise<void> {
    const managed = this.servers.get(name);
    if (!managed) {return;}

    managed.restartCount++;
    if (managed.restartCount > managed.maxRestarts) {
      this.markFatal(name);
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s...
    const delay = Math.min(1000 * Math.pow(2, managed.restartCount - 1), 30_000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      const client = new MCPClient(name, managed.config);
      managed.client = client;

      client.onStateChangeCallback((state) => {
        if (state === 'error') {
          this.handleError(name);
        }
      });

      await client.initialize();
      managed.restartCount = 0;
      this.registerTools(name, client);
    } catch {
      await this.attemptRestart(name);
    }
  }

  private handleError(name: string): void {
    const managed = this.servers.get(name);
    if (!managed) {return;}

    // Attempt restart in background
    this.attemptRestart(name).catch(() => {
      // If restart chain fails, mark fatal
      this.markFatal(name);
    });
  }

  private markFatal(name: string): void {
    const managed = this.servers.get(name);
    if (!managed) {return;}

    managed.client.state = 'fatal';
    managed.client.close();

    // Remove all tools registered by this MCP server from the registry
    const prefix = `mcp_${name}_`;
    this.registry.unregisterByPrefix(prefix);
  }

  private registerTools(serverName: string, client: MCPClient): void {
    // Remove previously registered tools from this server (if any)
    const prefix = `mcp_${serverName}_`;
    this.registry.unregisterByPrefix(prefix);

    for (const toolDef of client.tools) {
      const tool: Tool = {
        name: `mcp_${serverName}_${toolDef.name}`,
        description: toolDef.description ?? `MCP tool from ${serverName}: ${toolDef.name}`,
        inputSchema: toolDef.inputSchema ?? {},
        execute: async (args: Record<string, unknown>, _context: ToolContext) => {
          return client.callTool(toolDef.name, args);
        },
      };
      this.registry.register(tool);
    }
  }

  getTools(): ToolDef[] {
    const tools: ToolDef[] = [];
    for (const [name, managed] of this.servers) {
      if (managed.client.state === 'fatal') {continue;}
      for (const t of managed.client.tools) {
        tools.push({
          name: `mcp_${name}_${t.name}`,
          description: t.description ?? `MCP tool from ${name}: ${t.name}`,
          inputSchema: t.inputSchema ?? {},
        });
      }
    }
    return tools;
  }

  getServerState(name: string): MCPProcessState | undefined {
    return this.servers.get(name)?.client.state;
  }

  close(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    for (const managed of this.servers.values()) {
      managed.client.close();
    }
    this.servers.clear();
  }
}
