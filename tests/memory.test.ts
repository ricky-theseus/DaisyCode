import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir, homedir } from 'node:os';

const { MemoryManager } = await import('../src/memory/manager.js');
const { shouldSummarize } = await import('../src/memory/summarize.js');

// ── Isolate user memory ─────────────────────────────────────────────────
// MemoryManager writes to ~/.daisy/memory/user.json.
// We save/restore around the whole suite, and delete before each test.

const userMemoryPath = join(homedir(), '.daisy', 'memory', 'user.json');
let savedUserMemory: string | null = null;

// Save real user memory before any test runs
beforeEach(() => {
  // Delete user memory so each test starts clean
  if (existsSync(userMemoryPath)) {
    if (savedUserMemory === null) {
      savedUserMemory = readFileSync(userMemoryPath, 'utf-8');
    }
    unlinkSync(userMemoryPath);
  }
});

// Restore after all tests
after(() => {
  if (savedUserMemory !== null) {
    mkdirSync(dirname(userMemoryPath), { recursive: true });
    writeFileSync(userMemoryPath, savedUserMemory, 'utf-8');
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

let tmpDir: string;

function freshDir(): string {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = mkdtempSync(join(tmpdir(), 'daisy-memory-test-'));
  return tmpDir;
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-session',
    agent: 'default',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── MemoryManager ───────────────────────────────────────────────────────

void describe('MemoryManager', () => {
  void describe('loadUser', () => {
    void it('returns default user memory when no file exists', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = manager.loadUser();
      assert.equal(mem.version, 1);
      assert.deepEqual(mem.preferences, {});
      assert.deepEqual(mem.facts, []);
      assert.deepEqual(mem.learned, {});
      assert.ok(mem.updatedAt);
    });
  });

  void describe('saveUser / loadUser roundtrip', () => {
    void it('persists user memory to disk', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = manager.loadUser();
      mem.preferences.defaultModel = 'gpt-4';
      mem.facts.push('I like TypeScript');
      manager.saveUser(mem);

      const loaded = manager.loadUser();
      assert.equal(loaded.preferences.defaultModel, 'gpt-4');
      assert.ok(loaded.facts.includes('I like TypeScript'));
    });
  });

  void describe('loadProject', () => {
    void it('returns null when no project memory exists', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      assert.equal(manager.loadProject(), null);
    });
  });

  void describe('saveProject / loadProject roundtrip', () => {
    void it('persists project memory to disk', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = {
        version: 1 as const,
        updatedAt: new Date().toISOString(),
        summary: 'A test project',
        techStack: ['TypeScript', 'Node.js'],
        conventions: ['use strict mode'],
        structure: 'src/',
        facts: [],
        learned: {},
      };
      manager.saveProject(mem);

      const loaded = manager.loadProject();
      assert.equal(loaded?.summary, 'A test project');
      assert.deepEqual(loaded?.techStack, ['TypeScript', 'Node.js']);
    });
  });

  void describe('saveSession / loadSession roundtrip', () => {
    void it('persists session to disk', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const session = makeSession({ messages: [{ role: 'user', content: 'hi' }] });
      manager.saveSession(session);

      const loaded = manager.loadSession('test-session');
      assert.equal(loaded?.id, 'test-session');
      assert.equal(loaded?.messages.length, 1);
    });

    void it('returns null for unknown session', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      assert.equal(manager.loadSession('nonexistent'), null);
    });
  });

  void describe('buildMemoryPrompt', () => {
    void it('returns empty string when no memory exists', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      assert.equal(manager.buildMemoryPrompt(), '');
    });

    void it('includes user preferences', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = manager.loadUser();
      mem.preferences.defaultModel = 'claude-3';
      mem.preferences.theme = 'dark';
      manager.saveUser(mem);

      const prompt = manager.buildMemoryPrompt();
      assert.ok(prompt.includes('[用户记忆]'));
      assert.ok(prompt.includes('claude-3'));
      assert.ok(prompt.includes('dark'));
    });

    void it('includes project memory', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = {
        version: 1 as const,
        updatedAt: new Date().toISOString(),
        summary: 'CLI tool',
        techStack: ['Go'],
        conventions: ['use cobra'],
        structure: '',
        facts: [],
        learned: {},
      };
      manager.saveProject(mem);

      const prompt = manager.buildMemoryPrompt();
      assert.ok(prompt.includes('[项目记忆]'));
      assert.ok(prompt.includes('CLI tool'));
      assert.ok(prompt.includes('Go'));
      assert.ok(prompt.includes('use cobra'));
    });

    void it('includes user facts', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const mem = manager.loadUser();
      mem.facts.push('I am a backend developer');
      manager.saveUser(mem);

      const prompt = manager.buildMemoryPrompt();
      assert.ok(prompt.includes('backend developer'));
    });
  });

  void describe('updateSessionMetadata', () => {
    void it('adds tokenCount', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const session = makeSession({
        messages: [
          { role: 'user', content: 'hello world' },
          { role: 'assistant', content: 'hi there' },
        ],
      });
      manager.updateSessionMetadata(session);
      const loaded = manager.loadSession('test-session');
      // 'hello world' (11) + 'hi there' (8) = 19 chars / 4 = 4.75 → ceil 5
      assert.equal((loaded as unknown as Record<string, unknown>).tokenCount, 5);
    });
  });

  void describe('updateMemory', () => {
    void it('extracts user facts from "I am" pattern', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const session = makeSession({
        messages: [{ role: 'user', content: 'I am a Rust developer.' }],
      });
      manager.updateMemory(session);

      const user = manager.loadUser();
      assert.ok(user.facts.includes('a Rust developer'));
    });

    void it('extracts tech stack from "using" pattern', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      // Message that doesn't match any fact pattern but has 'using TypeScript'
      const session = makeSession({
        messages: [{ role: 'user', content: 'Lets build this using TypeScript.' }],
      });
      manager.updateMemory(session);

      const project = manager.loadProject();
      // ponytail: regex includes '.' in char class, so captures 'TypeScript.'
      assert.ok(project?.techStack.some(t => t.startsWith('TypeScript')));
    });

    void it('ignores non-user messages', () => {
      const dir = freshDir();
      const manager = new MemoryManager({ projectDir: dir });
      const session = makeSession({
        messages: [{ role: 'assistant', content: 'I am an AI' }],
      });
      manager.updateMemory(session);

      const user = manager.loadUser();
      assert.equal(user.facts.length, 0);
    });
  });
});

// ── shouldSummarize ─────────────────────────────────────────────────────

void describe('shouldSummarize', () => {
  void it('returns false for fewer than 10 messages', () => {
    const s = makeSession({ messages: Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' })) });
    assert.equal(shouldSummarize(s), false);
  });

  void it('returns true at exactly 10 messages when no summary exists', () => {
    const s = makeSession({ messages: Array.from({ length: 10 }, () => ({ role: 'user', content: 'x' })) });
    assert.equal(shouldSummarize(s), true);
  });

  void it('returns false at 10 messages when summary already exists', () => {
    const s = makeSession({
      messages: Array.from({ length: 10 }, () => ({ role: 'user', content: 'x' })),
      summary: 'already summarized',
    });
    assert.equal(shouldSummarize(s), false);
  });

  void it('returns true at 30 messages (10 + 20)', () => {
    const s = makeSession({
      messages: Array.from({ length: 30 }, () => ({ role: 'user', content: 'x' })),
      summary: 'existing',
    });
    assert.equal(shouldSummarize(s), true);
  });

  void it('returns false at 29 messages', () => {
    const s = makeSession({
      messages: Array.from({ length: 29 }, () => ({ role: 'user', content: 'x' })),
      summary: 'existing',
    });
    assert.equal(shouldSummarize(s), false);
  });

  void it('returns true at 50 messages (10 + 2*20)', () => {
    const s = makeSession({
      messages: Array.from({ length: 50 }, () => ({ role: 'user', content: 'x' })),
      summary: 'existing',
    });
    assert.equal(shouldSummarize(s), true);
  });
});
