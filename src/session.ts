import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SessionConfig, Message } from './types.js';

export type ExportFormat = 'markdown';

export function createSession(agent: string, dir: string): SessionConfig {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    agent,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function saveSession(session: SessionConfig, dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = join(dir, `${session.id}.tmp`);
  const finalPath = join(dir, `${session.id}.json`);

  writeFileSync(tmpPath, JSON.stringify(session, null, 2), 'utf-8');
  renameSync(tmpPath, finalPath);
}

export function loadSession(id: string, dir: string): SessionConfig | null {
  const path = join(dir, `${id}.json`);
  if (!existsSync(path)) return null;

  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as SessionConfig;
  } catch {
    // Corrupted JSON — return empty session
    return { id, agent: 'default', messages: [], createdAt: '', updatedAt: '' };
  }
}

export function addMessage(session: SessionConfig, msg: Message): void {
  session.messages.push(msg);
  session.updatedAt = new Date().toISOString();
}

function formatMessage(msg: Message): string {
  const role = msg.role.toUpperCase();

  if (msg.tool_calls?.length && !msg.content) {
    const calls = msg.tool_calls.map(tc =>
      `  - ${tc.function.name}(${tc.function.arguments})`
    ).join('\n');
    return `### ${role}\n\n${calls}\n`;
  }

  let content = msg.content;

  if (msg.tool_calls?.length) {
    const calls = msg.tool_calls.map(tc =>
      `  - ${tc.function.name}(${tc.function.arguments})`
    ).join('\n');
    content += '\n' + calls;
  }

  if (msg.tool_call_id) {
    content = `[Tool result for ${msg.tool_call_id}]\n${content}`;
  }

  return `### ${role}\n\n${content}\n`;
}

export function exportSession(session: SessionConfig, format: ExportFormat): string {
  if (format !== 'markdown') {
    throw new Error(`Unsupported export format: ${format}`);
  }

  const lines: string[] = [];
  lines.push(`# DaisyCode Session: ${session.id}`);
  lines.push('');
  lines.push(`- **Agent:** ${session.agent}`);
  lines.push(`- **Created:** ${session.createdAt}`);
  lines.push(`- **Updated:** ${session.updatedAt}`);
  lines.push(`- **Messages:** ${session.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of session.messages) {
    lines.push(formatMessage(msg));
  }

  return lines.join('\n');
}

export function saveExportedSession(session: SessionConfig, dir: string, format: ExportFormat): string {
  const exportDir = join(dir, 'exports');
  if (!existsSync(exportDir)) {
    mkdirSync(exportDir, { recursive: true });
  }

  const content = exportSession(session, format);
  const ext = format === 'markdown' ? 'md' : 'txt';
  const path = join(exportDir, `${session.id}.${ext}`);
  writeFileSync(path, content, 'utf-8');
  return path;
}
