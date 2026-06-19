export type PermissionLevel = 'allow' | 'deny' | 'ask' | 'restricted';

export type AgentPermissions = Record<string, PermissionLevel>;

export interface Message {
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  isError?: boolean;
}

export interface ChatRequest {
  messages: Message[];
  tools: ToolDef[];
  signal?: AbortSignal;
}

export interface ChatResponse {
  message: Message;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatChunk {
  type: 'text' | 'tool_call';
  content: string;
  index: number;
}

export interface ToolContext {
  agent: string;
  permissions: AgentPermissions;
  signal?: AbortSignal;
  sessionId: string;
  workspaceRoot?: string;
}

export type AgentEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call'; tool: string; args: unknown }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'error'; error: Error }
  | { type: 'done' };

export type MCPProcessState = 'created' | 'starting' | 'ready' | 'healthy' | 'error' | 'fatal';

export interface MCPProcessConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  startupTimeout?: number;
  healthInterval?: number;
  maxRestarts?: number;
  requestTimeout?: number;
}

export interface Skill {
  name: string;
  trigger: string[];
  description?: string;
  path?: string;
  /** Populated after loading: the SKILL.md body (prompt to inject) */
  prompt?: string;
}

export interface SessionConfig {
  id: string;
  agent: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentConfig {
  description?: string;
  model?: string;
  temperature?: number;
  permission?: AgentPermissions;
  color?: string;
}

export interface DaisyConfig {
  default_agent?: string;
  model?: string;
  agent?: Record<string, AgentConfig>;
  skill?: Record<string, Skill>;
  mcp?: Record<string, MCPProcessConfig>;
}
