import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface ProviderAuth {
  apiKey: string;
  baseURL?: string;
  accountId?: string;
}

export interface AuthConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: Record<string, ProviderAuth>;
}

const AUTH_DIR = join(homedir(), '.daisy');
const AUTH_PATH = join(AUTH_DIR, 'auth.json');

function ensureDir(): void {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }
}

export function loadAuth(): AuthConfig | null {
  try {
    if (!existsSync(AUTH_PATH)) return null;
    const raw = readFileSync(AUTH_PATH, 'utf-8');
    return JSON.parse(raw) as AuthConfig;
  } catch {
    return null;
  }
}

export function saveAuth(config: AuthConfig): void {
  ensureDir();
  writeFileSync(AUTH_PATH, JSON.stringify(config, null, 2), { mode: 0o600, encoding: 'utf-8' });
}

export function getProvider(provider: string): ProviderAuth | undefined {
  const auth = loadAuth();
  return auth?.providers?.[provider];
}

export function setProvider(provider: string, config: ProviderAuth, opts?: { model?: string; setDefault?: boolean }): void {
  const auth = loadAuth() ?? { defaultProvider: provider, defaultModel: opts?.model ?? '', providers: {} };
  auth.providers[provider] = config;
  if (opts?.setDefault !== false) {
    auth.defaultProvider = provider;
  }
  if (opts?.model) {
    auth.defaultModel = opts.model;
  }
  saveAuth(auth);
}

export function removeProvider(provider: string): boolean {
  const auth = loadAuth();
  if (!auth || !auth.providers[provider]) return false;
  delete auth.providers[provider];
  if (auth.defaultProvider === provider) {
    const keys = Object.keys(auth.providers);
    auth.defaultProvider = keys[0] ?? '';
  }
  saveAuth(auth);
  return true;
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '****' + key.slice(-4);
}
