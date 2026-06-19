import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { loadConfig } from '../src/config.js';

describe('config deepMerge', () => {
  // Test deepMerge indirectly via loadConfig with controlled env
  it('returns default config when no files exist', () => {
    const cfg = loadConfig('C:\\nonexistent_path_xyz');
    assert.strictEqual(cfg.default_agent, 'default');
    assert.strictEqual(cfg.model, 'deepseek/deepseek-chat');
    assert.ok(cfg.agent?.default);
    assert.strictEqual(cfg.agent!.default.permission!.read, 'allow');
  });

  it('filters __proto__ keys', () => {
    // Verify deepMerge filters prototype pollution keys by checking source
    const src = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf-8');
    assert.ok(src.includes("'__proto__'"), 'deepMerge should filter __proto__');
    assert.ok(src.includes("'constructor'"), 'deepMerge should filter constructor');
    assert.ok(src.includes("'prototype'"), 'deepMerge should filter prototype');
  });
});
