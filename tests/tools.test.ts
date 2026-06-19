import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readTool } from '../src/tools/read.js';
import { editTool } from '../src/tools/edit.js';
import { globTool } from '../src/tools/glob.js';
import { grepTool } from '../src/tools/grep.js';
import { bashTool } from '../src/tools/bash.js';
import type { ToolContext } from '../src/types.js';

const testDir = join(import.meta.dirname, '.test-tools');
const testFile = join(testDir, 'hello.txt');
const ctx: ToolContext = { agent: 'test', permissions: {}, sessionId: 's1', workspaceRoot: testDir };

before(() => {
  if (!existsSync(testDir)) mkdirSync(testDir, { recursive: true });
  writeFileSync(testFile, 'line1\nline2\nline3\nline4\nline5\n', 'utf-8');
});

after(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('read tool', () => {
  it('reads a file', async () => {
    const result = await readTool.execute({ path: 'hello.txt' }, ctx) as any;
    assert.strictEqual(result.error, undefined);
    assert.ok(result.content.includes('line1'));
    // 5 lines + trailing newline = 6 split segments
    assert.strictEqual(result.totalLines, 6);
  });

  it('respects offset and limit', async () => {
    const result = await readTool.execute({ path: 'hello.txt', offset: 1, limit: 2 }, ctx) as any;
    const lines = result.content.split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 2);
    assert.strictEqual(lines[0], 'line2');
    assert.strictEqual(lines[1], 'line3');
  });

  it('rejects path traversal', async () => {
    const result = await readTool.execute({ path: '../outside.txt' }, ctx) as any;
    assert.strictEqual(result.error, 'path_traversal_denied');
  });

  it('returns file_not_found for missing file', async () => {
    const result = await readTool.execute({ path: 'missing.txt' }, ctx) as any;
    assert.strictEqual(result.error, 'file_not_found');
  });
});

describe('edit tool', () => {
  it('replaces text correctly', async () => {
    const filePath = join(testDir, 'edit_test.txt');
    writeFileSync(filePath, 'foo bar baz', 'utf-8');
    const result = await editTool.execute({ path: 'edit_test.txt', oldText: 'bar', newText: 'qux' }, ctx) as any;
    assert.strictEqual(result.success, true);
    const { readFileSync } = await import('node:fs');
    assert.strictEqual(readFileSync(filePath, 'utf-8'), 'foo qux baz');
  });

  it('rejects path traversal', async () => {
    const result = await editTool.execute({ path: '../outside.txt', oldText: 'a', newText: 'b' }, ctx) as any;
    assert.strictEqual(result.error, 'path_traversal_denied');
  });

  it('returns text_not_found when oldText missing', async () => {
    const filePath = join(testDir, 'edit_miss.txt');
    writeFileSync(filePath, 'hello', 'utf-8');
    const result = await editTool.execute({ path: 'edit_miss.txt', oldText: 'nope', newText: 'x' }, ctx) as any;
    assert.strictEqual(result.error, 'text_not_found');
  });
});

describe('glob tool', () => {
  it('finds matching files', async () => {
    const result = await globTool.execute({ pattern: '*.txt', path: testDir }, ctx) as any;
    assert.ok(result.files.length >= 1);
    assert.ok(result.files.some((f: string) => f.endsWith('hello.txt')));
  });
});

describe('grep tool', () => {
  it('finds matching lines', async () => {
    const result = await grepTool.execute({ pattern: 'line[13]', path: testDir, include: '*.txt' }, ctx) as any;
    assert.ok(result.matches.length >= 2);
    assert.ok(result.matches.some((m: any) => m.content === 'line1'));
    assert.ok(result.matches.some((m: any) => m.content === 'line3'));
  });

  it('rejects pattern longer than 200 chars', async () => {
    const longPattern = 'x'.repeat(201);
    const result = await grepTool.execute({ pattern: longPattern }, ctx) as any;
    assert.strictEqual(result.error, 'pattern_too_long');
  });
});

describe('bash tool', () => {
  it('echo works', async () => {
    const result = await bashTool.execute({ command: 'echo hello world' }, ctx) as any;
    assert.ok(result.stdout.includes('hello world'));
    assert.strictEqual(result.exitCode, 0);
  });
});
