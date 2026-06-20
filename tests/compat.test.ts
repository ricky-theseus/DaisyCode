import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { scanDirectory } = await import('../src/compat/scanner.js');
const { importClaudeCode, importOpenCode } = await import('../src/compat/importer.js');

// ── Helpers ─────────────────────────────────────────────────────────────

let tmpDir: string;

function freshDir(): string {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = mkdtempSync(join(tmpdir(), 'daisy-compat-test-'));
  return tmpDir;
}

function write(path: string, content: string): void {
  mkdirSync(join(tmpDir, path).replace(/\\[^\\]+$/, ''), { recursive: true });
  writeFileSync(join(tmpDir, path), content, 'utf-8');
}

// ── scanner ─────────────────────────────────────────────────────────────

void describe('scanner', () => {
  void describe('scanDirectory', () => {
    void it('returns empty plan for empty directory', () => {
      const dir = freshDir();
      const plan = scanDirectory(dir);
      assert.deepEqual(plan.sources, []);
      assert.deepEqual(plan.commands, []);
      assert.deepEqual(plan.skills, []);
      assert.deepEqual(plan.mcpServers, []);
      assert.deepEqual(plan.agents, []);
    });

    void it('detects CLAUDE.md in project root', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      const plan = scanDirectory(dir);
      assert.equal(plan.sources.length, 1);
      assert.equal(plan.sources[0].type, 'claude');
      assert.equal(plan.sources[0].confidence, 'high');
      assert.ok(plan.sources[0].hints[0].includes('CLAUDE.md'));
    });

    void it('detects .claude/CLAUDE.md', () => {
      const dir = freshDir();
      write('.claude/CLAUDE.md', '# rules');
      const plan = scanDirectory(dir);
      assert.equal(plan.sources.length, 1);
      assert.equal(plan.sources[0].type, 'claude');
    });

    void it('detects opencode.json', () => {
      const dir = freshDir();
      write('opencode.json', '{}');
      const plan = scanDirectory(dir);
      assert.equal(plan.sources.length, 1);
      assert.equal(plan.sources[0].type, 'opencode');
    });

    void it('detects both Claude and OpenCode sources', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      write('opencode.json', '{}');
      const plan = scanDirectory(dir);
      assert.equal(plan.sources.length, 2);
      const types = plan.sources.map(s => s.type).sort();
      assert.deepEqual(types, ['claude', 'opencode']);
    });

    void it('detects .claude/commands/', () => {
      const dir = freshDir();
      write('.claude/commands/test.md', '# Test command\n\nrun tests');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('commands')));
    });

    void it('detects .claude/skills/', () => {
      const dir = freshDir();
      write('.claude/skills/my-skill/SKILL.md', '# My Skill');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('skills')));
    });

    void it('detects .mcp.json', () => {
      const dir = freshDir();
      write('.mcp.json', JSON.stringify({ mcpServers: { test: { command: 'node', args: [] } } }));
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('MCP')));
    });

    void it('detects .opencode/agents/', () => {
      const dir = freshDir();
      write('.opencode/agents/coder.md', '# Coder agent');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('agents')));
    });

    void it('detects .opencode/skills/', () => {
      const dir = freshDir();
      write('.opencode/skills/test-skill/SKILL.md', '# Test');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('skills')));
    });

    void it('detects .opencode/commands/', () => {
      const dir = freshDir();
      write('.opencode/commands/deploy.md', '# Deploy');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('commands')));
    });

    void it('detects .opencode/prompts/', () => {
      const dir = freshDir();
      write('.opencode/prompts/review.md', '# Review');
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('prompts')));
    });

    void it('detects .claude/settings.json', () => {
      const dir = freshDir();
      write('.claude/settings.json', JSON.stringify({ model: 'claude-3' }));
      const plan = scanDirectory(dir);
      assert.ok(plan.sources[0].hints.some(h => h.includes('settings')));
    });

    void it('parses Claude commands from .claude/commands/', () => {
      const dir = freshDir();
      write('.claude/commands/test.md', '# Test command\n\nrun tests');
      const plan = scanDirectory(dir);
      assert.equal(plan.commands.length, 1);
      assert.equal(plan.commands[0].name, 'test');
      assert.equal(plan.commands[0].source, 'claude');
    });

    void it('parses OpenCode commands from .opencode/commands/', () => {
      const dir = freshDir();
      write('.opencode/commands/deploy.md', '# Deploy');
      const plan = scanDirectory(dir);
      assert.equal(plan.commands.length, 1);
      assert.equal(plan.commands[0].name, 'deploy');
      assert.equal(plan.commands[0].source, 'opencode');
    });

    void it('parses Claude skills', () => {
      const dir = freshDir();
      write('.claude/skills/my-skill/SKILL.md', '# My Skill');
      const plan = scanDirectory(dir);
      assert.equal(plan.skills.length, 1);
      assert.equal(plan.skills[0].name, 'my-skill');
      assert.equal(plan.skills[0].source, 'claude');
    });

    void it('parses OpenCode skills', () => {
      const dir = freshDir();
      write('.opencode/skills/test-skill/SKILL.md', '# Test');
      const plan = scanDirectory(dir);
      assert.equal(plan.skills.length, 1);
      assert.equal(plan.skills[0].name, 'test-skill');
      assert.equal(plan.skills[0].source, 'opencode');
    });

    void it('parses MCP servers from .mcp.json', () => {
      const dir = freshDir();
      write('.mcp.json', JSON.stringify({
        mcpServers: {
          filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
        },
      }));
      const plan = scanDirectory(dir);
      assert.equal(plan.mcpServers.length, 1);
      assert.equal(plan.mcpServers[0].name, 'filesystem');
      assert.equal(plan.mcpServers[0].config.command, 'npx');
    });

    void it('parses agents from opencode.json', () => {
      const dir = freshDir();
      write('opencode.json', JSON.stringify({
        agent: {
          coder: { description: 'Writes code', model: 'gpt-4' },
        },
      }));
      const plan = scanDirectory(dir);
      assert.equal(plan.agents.length, 1);
      assert.equal(plan.agents[0].name, 'coder');
      assert.equal(plan.agents[0].config.model, 'gpt-4');
    });

    void it('parses agents from .claude/settings.json', () => {
      const dir = freshDir();
      write('.claude/settings.json', JSON.stringify({
        model: 'claude-opus',
        allowedTools: ['Read', 'Write'],
      }));
      const plan = scanDirectory(dir);
      assert.equal(plan.agents.length, 1);
      assert.equal(plan.agents[0].name, 'claude-default');
      assert.deepEqual(plan.agents[0].config.permission, { Read: 'allow', Write: 'allow' });
    });

    void it('merges agent systemPrompt from .opencode/agents/', () => {
      const dir = freshDir();
      write('opencode.json', JSON.stringify({
        agent: { coder: { description: 'Coder' } },
      }));
      write('.opencode/agents/coder.md', 'You are a coder.');
      const plan = scanDirectory(dir);
      const coder = plan.agents.find(a => a.name === 'coder');
      assert.ok(coder);
      assert.equal(coder.config.systemPrompt, 'You are a coder.');
    });
  });
});

// ── importer ────────────────────────────────────────────────────────────

void describe('importer', () => {
  void describe('importClaudeCode', () => {
    void it('returns warning when no Claude config found', () => {
      const dir = freshDir();
      const result = importClaudeCode(dir);
      assert.equal(result.imported.commands, 0);
      assert.ok(result.warnings.length > 0);
    });

    void it('copies CLAUDE.md to compat dir', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      const result = importClaudeCode(dir);
      assert.ok(existsSync(join(result.targetPath, 'CLAUDE.md')));
    });

    void it('copies commands from .claude/commands/', () => {
      const dir = freshDir();
      write('.claude/commands/test.md', '# test');
      const result = importClaudeCode(dir);
      assert.equal(result.imported.commands, 1);
      assert.ok(existsSync(join(result.targetPath, 'commands', 'test.md')));
    });

    void it('copies skills from .claude/skills/', () => {
      const dir = freshDir();
      write('.claude/skills/my-skill/SKILL.md', '# skill');
      const result = importClaudeCode(dir);
      assert.equal(result.imported.skills, 1);
      assert.ok(existsSync(join(result.targetPath, 'skills', 'my-skill', 'SKILL.md')));
    });

    void it('copies .mcp.json', () => {
      const dir = freshDir();
      write('.mcp.json', JSON.stringify({ mcpServers: {} }));
      const result = importClaudeCode(dir);
      assert.equal(result.imported.mcpServers, 1);
      assert.ok(existsSync(join(result.targetPath, 'MCP.json')));
    });

    void it('copies .claude/settings.json', () => {
      const dir = freshDir();
      write('.claude/settings.json', JSON.stringify({ model: 'claude' }));
      const result = importClaudeCode(dir);
      assert.equal(result.imported.agents, 1);
      assert.ok(existsSync(join(result.targetPath, 'settings.json')));
    });

    void it('dryRun does not write files', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      const result = importClaudeCode(dir, { dryRun: true });
      assert.ok(!existsSync(join(result.targetPath, 'CLAUDE.md')));
    });

    void it('warns on re-import without force', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      importClaudeCode(dir);
      const result = importClaudeCode(dir);
      assert.ok(result.warnings.some(w => w.includes('already imported')));
    });

    void it('force re-import succeeds', () => {
      const dir = freshDir();
      write('CLAUDE.md', '# rules');
      importClaudeCode(dir);
      write('CLAUDE.md', '# updated rules');
      const result = importClaudeCode(dir, { force: true });
      assert.ok(result.warnings.length === 0 || !result.warnings.some(w => w.includes('already imported')));
    });
  });

  void describe('importOpenCode', () => {
    void it('returns warning when no OpenCode config found', () => {
      const dir = freshDir();
      const result = importOpenCode(dir);
      assert.equal(result.imported.commands, 0);
      assert.ok(result.warnings.length > 0);
    });

    void it('copies opencode.json', () => {
      const dir = freshDir();
      write('opencode.json', JSON.stringify({}));
      const result = importOpenCode(dir);
      assert.ok(existsSync(join(result.targetPath, 'opencode.json')));
    });

    void it('copies agents from .opencode/agents/', () => {
      const dir = freshDir();
      write('opencode.json', JSON.stringify({ agent: { coder: {} } }));
      write('.opencode/agents/coder.md', '# Coder');
      const result = importOpenCode(dir);
      assert.equal(result.imported.agents, 2); // 1 from json + 1 from md
      assert.ok(existsSync(join(result.targetPath, 'agents', 'coder.md')));
    });

    void it('copies skills from .opencode/skills/', () => {
      const dir = freshDir();
      write('.opencode/skills/test-skill/SKILL.md', '# Test');
      const result = importOpenCode(dir);
      assert.equal(result.imported.skills, 1);
      assert.ok(existsSync(join(result.targetPath, 'skills', 'test-skill', 'SKILL.md')));
    });

    void it('copies commands from .opencode/commands/', () => {
      const dir = freshDir();
      write('.opencode/commands/deploy.md', '# Deploy');
      const result = importOpenCode(dir);
      assert.equal(result.imported.commands, 1);
      assert.ok(existsSync(join(result.targetPath, 'commands', 'deploy.md')));
    });

    void it('copies prompts from .opencode/prompts/', () => {
      const dir = freshDir();
      write('.opencode/prompts/review.md', '# Review');
      const result = importOpenCode(dir);
      assert.ok(existsSync(join(result.targetPath, 'prompts', 'review.md')));
    });

    void it('dryRun does not write files', () => {
      const dir = freshDir();
      write('opencode.json', JSON.stringify({}));
      const result = importOpenCode(dir, { dryRun: true });
      assert.ok(!existsSync(join(result.targetPath, 'opencode.json')));
    });
  });
});
