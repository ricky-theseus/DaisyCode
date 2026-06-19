import type { AgentEvent, Message, ToolCall, ToolContext, AgentPermissions } from './types.js';
import type { ModelAdapter } from './model-adapter.js';
import { ToolRegistry } from './tools/types.js';
import { PermissionSystem } from './permissions.js';

export interface AgentOptions {
  model: ModelAdapter;
  registry: ToolRegistry;
  permissions: PermissionSystem;
  agentName: string;
  agentPermissions: AgentPermissions;
  sessionId: string;
  systemPrompt?: string;
  maxIterations?: number;
}

export class AgentAbortedError extends Error {
  constructor() {
    super('Agent execution aborted');
    this.name = 'AgentAbortedError';
  }
}

export class Agent {
  private model: ModelAdapter;
  private registry: ToolRegistry;
  private permissions: PermissionSystem;
  private agentName: string;
  private agentPermissions: AgentPermissions;
  private sessionId: string;
  private systemPrompt: string;
  private maxIterations: number;

  constructor(opts: AgentOptions) {
    this.model = opts.model;
    this.registry = opts.registry;
    this.permissions = opts.permissions;
    this.agentName = opts.agentName;
    this.agentPermissions = opts.agentPermissions;
    this.sessionId = opts.sessionId;
    this.systemPrompt = opts.systemPrompt ?? 'You are a helpful AI coding assistant.';
    this.maxIterations = opts.maxIterations ?? 10;
  }

  async *run(input: string, options?: { signal?: AbortSignal }): AsyncIterable<AgentEvent> {
    // Empty input — silent return
    if (!input || input.trim() === '') return;

    const signal = options?.signal;
    const messages: Message[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input },
    ];

    const tools = this.registry.list();

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      if (signal?.aborted) throw new AgentAbortedError();

      // Context window management: truncate if too long
      this.truncateMessages(messages);

      let response: Message;
      try {
        const result = await this.model.chat({ messages, tools, signal });
        response = result.message;
      } catch (err) {
        yield { type: 'error', error: err instanceof Error ? err : new Error(String(err)) };
        break;
      }

      messages.push(response);

      // Emit text content
      if (response.content) {
        yield { type: 'text_delta', content: response.content };
      }

      // No tool calls — done
      if (!response.tool_calls || response.tool_calls.length === 0) {
        yield { type: 'done' };
        return;
      }

      // Process tool calls with validation + retry
      const toolCalls = response.tool_calls;
      const validationErrors = this.validateToolCalls(toolCalls);

      if (validationErrors.length > 0) {
        // Retry: send error back to LLM
        const errorMsg: Message = {
          role: 'user',
          content: `Tool call validation failed: ${validationErrors.map(e => e.reason).join('; ')}. Please fix and retry.`,
        };
        messages.push(errorMsg);
        continue;
      }

      // Execute each tool call
      for (const tc of toolCalls) {
        if (signal?.aborted) throw new AgentAbortedError();

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: `Error: invalid JSON in arguments: ${tc.function.arguments}`,
          });
          continue;
        }

        yield { type: 'tool_call', tool: tc.function.name, args };

        const toolContext: ToolContext = {
          agent: this.agentName,
          permissions: this.agentPermissions,
          signal,
          sessionId: this.sessionId,
        };

        // Permission check
        const permCheck = this.permissions.check(tc.function.name, args, toolContext);
        if (!permCheck.allowed) {
          const result = { error: 'permission_denied', reason: permCheck.reason };
          yield { type: 'tool_result', tool: tc.function.name, result };
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
          continue;
        }

        // Execute tool
        const tool = this.registry.get(tc.function.name);
        if (!tool) {
          const result = { error: 'tool_not_found', name: tc.function.name };
          yield { type: 'tool_result', tool: tc.function.name, result };
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
          continue;
        }

        try {
          const result = await tool.execute(args, toolContext);
          yield { type: 'tool_result', tool: tc.function.name, result };
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          const errorResult = { error: err instanceof Error ? err.message : String(err) };
          yield { type: 'tool_result', tool: tc.function.name, result: errorResult };
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(errorResult),
          });
        }
      }
    }

    // Max iterations reached
    yield { type: 'done' };
  }

  private validateToolCalls(calls: ToolCall[]): { index: number; reason: string }[] {
    const errors: { index: number; reason: string }[] = [];
    for (let i = 0; i < calls.length; i++) {
      const tc = calls[i];
      if (!this.registry.has(tc.function.name)) {
        errors.push({ index: i, reason: `Unknown tool: "${tc.function.name}"` });
      }
      try {
        JSON.parse(tc.function.arguments);
      } catch {
        errors.push({ index: i, reason: `Invalid JSON arguments for "${tc.function.name}"` });
      }
    }
    return errors;
  }

  private truncateMessages(messages: Message[]): void {
    const maxTokens = 128_000;
    const total = messages.reduce((sum, m) => sum + m.content.length, 0);

    if (total <= maxTokens * 0.8 * 3.5) return;

    // Keep system message (index 0), drop oldest user+assistant pairs
    while (messages.length > 3) {
      const kept = [messages[0]];
      // Keep the last 2 messages (latest user/assistant)
      kept.push(...messages.slice(-2));
      // Keep tool results
      for (let i = 1; i < messages.length - 2; i++) {
        if (messages[i].role === 'tool') {
          kept.push(messages[i]);
        }
      }
      messages.length = 0;
      messages.push(...kept);

      const newTotal = messages.reduce((sum, m) => sum + m.content.length, 0);
      if (newTotal <= maxTokens * 0.8 * 3.5) break;
      // If still over, drop one more pair
      if (messages.length <= 2) break;
      messages.splice(1, 2);
    }
  }
}
