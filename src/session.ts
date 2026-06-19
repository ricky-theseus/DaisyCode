import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { SessionConfig, Message } from './types.js';

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
