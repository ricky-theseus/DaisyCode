// MCP JSON-RPC 2.0 types — no dependencies, pure interfaces

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPToolDef {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPCallToolResult {
  content: { type: string; text?: string; data?: string }[];
  isError?: boolean;
}

// Re-export from types.ts for convenience
export type MCPProcessState = 'created' | 'starting' | 'ready' | 'healthy' | 'error' | 'fatal';

export interface MCPConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  startupTimeout?: number;
  healthInterval?: number;
  maxRestarts?: number;
  requestTimeout?: number;
}
