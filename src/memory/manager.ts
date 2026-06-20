import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { SessionConfig } from '../types.js';
import type { UserMemory, ProjectMemory } from './types.js';
import { summarizeSession, extractTags, shouldSummarize } from './summarize.js';

const USER_MEMORY_DIR = join(homedir(), '.daisy', 'memory');
const USER_MEMORY_PATH = join(USER_MEMORY_DIR, 'user.json');

const MAX_FACTS = 50;

function defaultUserMemory(): UserMemory {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    preferences: {},
    facts: [],
    learned: {},
  };
}

function defaultProjectMemory(): ProjectMemory {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    summary: '',
    techStack: [],
    conventions: [],
    structure: '',
    facts: [],
    learned: {},
  };
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function safeReadJSON<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    // ponytail: corrupt file — return fallback, don't crash
    return fallback;
  }
}

function safeWriteJSON(path: string, data: unknown): void {
  try {
    ensureDir(dirname(path));
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ponytail: write failure — silent degrade
  }
}

export class MemoryManager {
  private projectDir: string;
  private projectMemoryPath: string;
  private sessionsDir: string;

  constructor(opts: { projectDir?: string } = {}) {
    this.projectDir = opts.projectDir ?? process.cwd();
    this.projectMemoryPath = join(this.projectDir, '.daisy', 'memory', 'project.json');
    this.sessionsDir = join(this.projectDir, '.daisy', 'memory', 'sessions');
  }

  // === Load ===

  loadUser(): UserMemory {
    return safeReadJSON(USER_MEMORY_PATH, defaultUserMemory());
  }

  loadProject(): ProjectMemory | null {
    return safeReadJSON(this.projectMemoryPath, null as unknown as ProjectMemory);
  }

  loadSession(sessionId: string): SessionConfig | null {
    const path = join(this.sessionsDir, `${sessionId}.json`);
    return safeReadJSON<SessionConfig | null>(path, null);
  }

  // === Save ===

  saveUser(memory: UserMemory): void {
    memory.updatedAt = new Date().toISOString();
    safeWriteJSON(USER_MEMORY_PATH, memory);
  }

  saveProject(memory: ProjectMemory): void {
    memory.updatedAt = new Date().toISOString();
    safeWriteJSON(this.projectMemoryPath, memory);
  }

  saveSession(session: SessionConfig): void {
    const path = join(this.sessionsDir, `${session.id}.json`);
    safeWriteJSON(path, session);
  }

  // === Memory injection ===

  /**
   * Build a string to prepend to the system prompt.
   * Format:
   *
   * [用户记忆]
   * - ...
   *
   * [项目记忆]
   * - ...
   *
   * [会话记忆]
   * - ...
   */
  buildMemoryPrompt(): string {
    const parts: string[] = [];

    // User memory
    const user = this.loadUser();
    const userLines: string[] = [];
    if (user.preferences.defaultModel) {
      userLines.push(`- 偏好模型: ${user.preferences.defaultModel}`);
    }
    if (user.preferences.defaultAgent) {
      userLines.push(`- 偏好 Agent: ${user.preferences.defaultAgent}`);
    }
    if (user.preferences.theme) {
      userLines.push(`- 主题: ${user.preferences.theme}`);
    }
    for (const fact of user.facts.slice(0, 10)) {
      userLines.push(`- ${fact}`);
    }
    if (userLines.length) {
      parts.push('[用户记忆]');
      parts.push(userLines.join('\n'));
    }

    // Project memory
    const project = this.loadProject();
    if (project) {
      const projLines: string[] = [];
      if (project.summary) projLines.push(`- 项目: ${project.summary}`);
      if (project.techStack.length) projLines.push(`- 技术栈: ${project.techStack.join(', ')}`);
      if (project.conventions.length) {
        for (const c of project.conventions.slice(0, 5)) {
          projLines.push(`- 约定: ${c}`);
        }
      }
      if (project.facts.length) {
        for (const f of project.facts.slice(0, 5)) {
          projLines.push(`- ${f}`);
        }
      }
      if (projLines.length) {
        parts.push('[项目记忆]');
        parts.push(projLines.join('\n'));
      }
    }

    return parts.join('\n\n');
  }

  // === Session summary ===

  generateSessionSummary(session: SessionConfig): string {
    return summarizeSession(session);
  }

  autoTagSession(session: SessionConfig): string[] {
    const project = this.loadProject();
    return extractTags(session, project?.techStack ?? []);
  }

  /**
   * Update session metadata: summary, tags, tokenCount.
   * Called after messages are added.
   */
  updateSessionMetadata(session: SessionConfig): void {
    const s = session as SessionConfig & { summary?: string; tags?: string[]; tokenCount?: number };

    if (shouldSummarize(session)) {
      s.summary = this.generateSessionSummary(session);
      s.tags = this.autoTagSession(session);
    }

    // ponytail: rough token estimate — 4 chars per token
    const totalChars = session.messages.reduce((sum, m) => sum + m.content.length, 0);
    s.tokenCount = Math.ceil(totalChars / 4);

    this.saveSession(session);
  }

  /**
   * Extract facts from a user message and update user/project memory.
   * Uses simple heuristics (no LLM):
   * - Lines starting with "I am", "I use", "I work", "My project" → user facts
   * - Lines mentioning tech keywords → project techStack
   */
  updateMemory(session: SessionConfig): void {
    const lastMsg = session.messages[session.messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;

    const user = this.loadUser();
    const project = this.loadProject() ?? defaultProjectMemory();
    let changed = false;

    const lines = lastMsg.content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // User facts: "I am ...", "I use ...", "I work ..."
      const userFactMatch = trimmed.match(/^(?:I am|I'm|I use|I work|My name is)\s+(.+)/i);
      if (userFactMatch) {
        const fact = userFactMatch[1].replace(/[.!]+$/, '').trim();
        if (fact && !user.facts.includes(fact)) {
          user.facts.push(fact);
          changed = true;
        }
        continue;
      }

      // Project facts: "My project ...", "This project ...", "We use ..."
      const projFactMatch = trimmed.match(/^(?:My project|This project|We use|The project)\s+(.+)/i);
      if (projFactMatch) {
        const fact = projFactMatch[1].replace(/[.!]+$/, '').trim();
        if (fact && !project.facts.includes(fact)) {
          project.facts.push(fact);
          changed = true;
        }
        continue;
      }

      // Tech stack detection: "using TypeScript", "with React", "on Node.js"
      const techMatch = trimmed.match(/(?:using|with|on)\s+([A-Z][a-zA-Z0-9+#.]+)/g);
      if (techMatch) {
        for (const m of techMatch) {
          const tech = m.replace(/^(?:using|with|on)\s+/, '').trim();
          if (tech && !project.techStack.includes(tech)) {
            project.techStack.push(tech);
            changed = true;
          }
        }
      }
    }

    // Enforce max facts
    if (user.facts.length > MAX_FACTS) {
      user.facts = user.facts.slice(-MAX_FACTS);
    }
    if (project.facts.length > MAX_FACTS) {
      project.facts = project.facts.slice(-MAX_FACTS);
    }

    if (changed) {
      this.saveUser(user);
      this.saveProject(project);
    }
  }
}
