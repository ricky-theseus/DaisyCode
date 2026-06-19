import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { DaisyConfig } from './types.js';

const DEFAULT_CONFIG: DaisyConfig = {
  default_agent: 'default',
  model: 'deepseek/deepseek-chat',
  agent: {
    default: {
      description: 'Default agent',
      permission: {
        read: 'allow',
        edit: 'ask',
        glob: 'allow',
        grep: 'allow',
        bash: 'ask',
      },
    },
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge(target: unknown, source: unknown): unknown {
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      result[key] = deepMerge(target[key], source[key]);
    }
    return result;
  }
  return source !== undefined ? source : target;
}

function loadJsonc(path: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    // Strip JSONC comments
    const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

function loadYaml(path: string): Record<string, unknown> | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    // Dynamic import — js-yaml is an optional dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yaml = require('js-yaml') as typeof import('js-yaml');
    return yaml.load(raw) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function loadConfigFile(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  if (path.endsWith('.jsonc') || path.endsWith('.json')) return loadJsonc(path);
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return loadYaml(path);
  return null;
}

export function loadConfig(cwd?: string): DaisyConfig {
  const projectDir = cwd ?? process.cwd();
  const userDir = join(homedir(), '.daisy');

  const projectConfig = loadConfigFile(join(projectDir, 'daisy.jsonc'))
    ?? loadConfigFile(join(projectDir, 'daisy.json'))
    ?? loadConfigFile(join(projectDir, 'daisy.yaml'))
    ?? loadConfigFile(join(projectDir, 'daisy.yml'));

  const userConfig = loadConfigFile(join(userDir, 'config.jsonc'))
    ?? loadConfigFile(join(userDir, 'config.json'))
    ?? loadConfigFile(join(userDir, 'config.yaml'))
    ?? loadConfigFile(join(userDir, 'config.yml'));

  let config = DEFAULT_CONFIG as unknown as Record<string, unknown>;

  if (projectConfig) {
    config = deepMerge(config, projectConfig) as Record<string, unknown>;
  }
  if (userConfig) {
    config = deepMerge(config, userConfig) as Record<string, unknown>;
  }

  return config as DaisyConfig;
}

export function ensureSessionDir(cwd?: string): string {
  const dir = join(cwd ?? process.cwd(), '.daisy', 'sessions');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
