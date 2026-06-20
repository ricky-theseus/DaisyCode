import type { SessionConfig } from '../types.js';

export interface UserMemory {
  version: 1;
  updatedAt: string;
  preferences: {
    defaultModel?: string;
    defaultAgent?: string;
    theme?: 'light' | 'dark';
    shortcuts?: Record<string, string>;
  };
  facts: string[];
  learned: Record<string, unknown>;
}

export interface ProjectMemory {
  version: 1;
  updatedAt: string;
  summary: string;
  techStack: string[];
  conventions: string[];
  structure: string;
  facts: string[];
  learned: Record<string, unknown>;
}

export interface SessionMemory extends SessionConfig {
  summary?: string;
  tags?: string[];
  tokenCount?: number;
}
