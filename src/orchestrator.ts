import { randomUUID } from 'node:crypto';
import type { AgentPermissions, AgentEvent } from './types.js';
import type { ModelAdapter } from './model-adapter.js';
import type { ToolRegistry } from './tools/types.js';
import { PermissionSystem, mergePermissions } from './permissions.js';
import { Agent } from './agent-loop.js';

const MAX_DEPTH = 3;
const BACKGROUND_TRUNCATE = 500;

export interface SubagentSession {
  id: string;
  config: SubagentConfig;
  messages: AgentEvent[];
  parentId: string | null;
  depth: number;
}

export interface SubagentConfig {
  agent: string;
  permissions?: AgentPermissions;
  systemPrompt?: string;
}

export interface SubagentResult {
  success: boolean;
  output: string;
  error?: string;
}

// ponytail: simple Map-based file lock, per-path.
// Upgrade to a proper RW lock if contention becomes measurable.
const fileLocks = new Map<string, string>(); // path -> sessionId

export function acquireFileLock(path: string, sessionId: string): boolean {
  if (fileLocks.has(path) && fileLocks.get(path) !== sessionId) {
    return false;
  }
  fileLocks.set(path, sessionId);
  return true;
}

export function releaseFileLock(path: string): void {
  fileLocks.delete(path);
}

export function releaseSessionLocks(sessionId: string): void {
  for (const [path, sid] of fileLocks) {
    if (sid === sessionId) fileLocks.delete(path);
  }
}

export class Orchestrator {
  private sessions = new Map<string, SubagentSession>();
  private model: ModelAdapter;
  private registry: ToolRegistry;
  private permissions: PermissionSystem;

  constructor(model: ModelAdapter, registry: ToolRegistry, permissions: PermissionSystem) {
    this.model = model;
    this.registry = registry;
    this.permissions = permissions;
  }

  createSubagent(
    config: SubagentConfig,
    parentId: string | null,
    parentPermissions: AgentPermissions,
  ): { session: SubagentSession; permissions: AgentPermissions } {
    const depth = parentId === null ? 0 : (this.sessions.get(parentId)?.depth ?? 0) + 1;

    if (depth > MAX_DEPTH) {
      throw new Error(`max_depth_exceeded: maxDepth=${MAX_DEPTH}`);
    }

    const inheritedPermissions = mergePermissions(parentPermissions, config.permissions);

    const session: SubagentSession = {
      id: randomUUID(),
      config,
      messages: [],
      parentId,
      depth,
    };

    this.sessions.set(session.id, session);
    return { session, permissions: inheritedPermissions };
  }

  async runSubagent(
    session: SubagentSession,
    task: string,
    permissions: AgentPermissions,
    parentSignal: AbortSignal | undefined,
    background: boolean,
  ): Promise<SubagentResult> {
    const agent = new Agent({
      model: this.model,
      registry: this.registry,
      permissions: this.permissions,
      agentName: session.config.agent,
      agentPermissions: permissions,
      sessionId: session.id,
      systemPrompt: session.config.systemPrompt ?? `You are ${session.config.agent}.`,
    });

    if (background) {
      this.runBackground(agent, task, session).catch((err) => {
        session.messages.push({
          type: 'text_delta',
          content: `[background task failed: ${err.message}]`,
        });
      });
      return { success: true, output: 'Task started in background.' };
    }

    let output = '';
    try {
      for await (const event of agent.run(task, { signal: parentSignal })) {
        session.messages.push(event);
        if (event.type === 'text_delta') {
          output += event.content;
        }
      }
      return { success: true, output };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { success: false, output, error };
    }
  }

  private async runBackground(agent: Agent, task: string, session: SubagentSession): Promise<void> {
    let output = '';
    try {
      for await (const event of agent.run(task)) {
        session.messages.push(event);
        if (event.type === 'text_delta') {
          output += event.content;
        }
      }
    } catch {
      // background errors silently truncated
    }
    const truncated = output.length > BACKGROUND_TRUNCATE
      ? output.slice(0, BACKGROUND_TRUNCATE) + '...[truncated]'
      : output;
    session.messages.push({ type: 'text_delta' as const, content: `[background task complete]\n${truncated}` });
  }

  cancelAll(): void {
    for (const [id] of this.sessions) {
      releaseSessionLocks(id);
    }
    this.sessions.clear();
  }
}
