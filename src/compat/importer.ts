import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { homedir } from 'node:os';
import { scanDirectory, type CompatPlan, type ImportedCommand, type ImportedSkill, type ImportedMCPServer, type ImportedAgent } from './scanner.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface ImportResult {
  type: 'claude' | 'opencode';
  imported: {
    commands: number;
    skills: number;
    mcpServers: number;
    agents: number;
  };
  warnings: string[];
  targetPath: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function writeFileSafe(path: string, content: string): boolean {
  try {
    ensureDir(dirname(path));
    writeFileSync(path, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function copyFileSafe(src: string, dest: string): boolean {
  try {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

// ── Import Claude Code ─────────────────────────────────────────────────

export function importClaudeCode(
  dir: string,
  opts?: { dryRun?: boolean; force?: boolean },
): ImportResult {
  const plan = scanDirectory(dir);
  const claudeSources = plan.sources.filter(s => s.type === 'claude');
  const warnings: string[] = [];
  const imported = { commands: 0, skills: 0, mcpServers: 0, agents: 0 };

  if (claudeSources.length === 0) {
    return { type: 'claude', imported, warnings: ['No Claude Code configuration found.'], targetPath: '' };
  }

  const compatDir = join(dir, '.daisy', 'compat', 'claude');
  const dryRun = opts?.dryRun ?? false;
  const force = opts?.force ?? false;

  // Check if already imported
  if (!force && existsSync(compatDir) && readdirSync(compatDir).length > 0) {
    warnings.push('Claude Code config already imported. Use --force to re-import.');
    return { type: 'claude', imported, warnings, targetPath: compatDir };
  }

  // ── Copy CLAUDE.md ──
  const claudeMdPaths = [
    join(dir, 'CLAUDE.md'),
    join(dir, '.claude', 'CLAUDE.md'),
  ];
  for (const src of claudeMdPaths) {
    if (existsSync(src)) {
      const dest = join(compatDir, 'CLAUDE.md');
      if (!dryRun) copyFileSafe(src, dest);
      break;
    }
  }

  // ── Copy commands ──
  const commandDirs = [
    join(dir, '.claude', 'commands'),
    join(homedir(), '.claude', 'commands'),
  ];
  for (const cmdDir of commandDirs) {
    if (!existsSync(cmdDir)) continue;
    for (const f of readdirSync(cmdDir).filter(f => f.endsWith('.md'))) {
      const src = join(cmdDir, f);
      const dest = join(compatDir, 'commands', f);
      if (!dryRun) copyFileSafe(src, dest);
      imported.commands++;
    }
  }

  // ── Copy skills ──
  const skillDirs = [
    join(dir, '.claude', 'skills'),
    join(homedir(), '.claude', 'skills'),
  ];
  for (const skillDir of skillDirs) {
    if (!existsSync(skillDir)) continue;
    for (const skillName of readdirSync(skillDir)) {
      const src = join(skillDir, skillName, 'SKILL.md');
      if (!existsSync(src)) continue;
      const dest = join(compatDir, 'skills', skillName, 'SKILL.md');
      if (!dryRun) copyFileSafe(src, dest);
      imported.skills++;
    }
  }

  // ── Copy MCP configs ──
  const mcpPaths = [
    join(dir, '.mcp.json'),
    join(homedir(), '.claude', '.mcp.json'),
  ];
  for (const src of mcpPaths) {
    if (!existsSync(src)) continue;
    const dest = join(compatDir, 'MCP.json');
    if (!dryRun) copyFileSafe(src, dest);
    imported.mcpServers++;
  }

  // ── Copy settings ──
  const settingsPath = join(dir, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    const dest = join(compatDir, 'settings.json');
    if (!dryRun) copyFileSafe(settingsPath, dest);
    imported.agents++;
  }

  return { type: 'claude', imported, warnings, targetPath: compatDir };
}

// ── Import OpenCode ────────────────────────────────────────────────────

export function importOpenCode(
  dir: string,
  opts?: { dryRun?: boolean; force?: boolean },
): ImportResult {
  const plan = scanDirectory(dir);
  const opencodeSources = plan.sources.filter(s => s.type === 'opencode');
  const warnings: string[] = [];
  const imported = { commands: 0, skills: 0, mcpServers: 0, agents: 0 };

  if (opencodeSources.length === 0) {
    return { type: 'opencode', imported, warnings: ['No OpenCode configuration found.'], targetPath: '' };
  }

  const compatDir = join(dir, '.daisy', 'compat', 'opencode');
  const dryRun = opts?.dryRun ?? false;
  const force = opts?.force ?? false;

  if (!force && existsSync(compatDir) && readdirSync(compatDir).length > 0) {
    warnings.push('OpenCode config already imported. Use --force to re-import.');
    return { type: 'opencode', imported, warnings, targetPath: compatDir };
  }

  // ── Copy opencode.json ──
  const configPath = join(dir, 'opencode.json');
  if (existsSync(configPath)) {
    const dest = join(compatDir, 'opencode.json');
    if (!dryRun) copyFileSafe(configPath, dest);
    imported.agents++;
  }

  // ── Copy agents ──
  const agentsDir = join(dir, '.opencode', 'agents');
  if (existsSync(agentsDir)) {
    for (const f of readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
      const src = join(agentsDir, f);
      const dest = join(compatDir, 'agents', f);
      if (!dryRun) copyFileSafe(src, dest);
      imported.agents++;
    }
  }

  // ── Copy skills ──
  const skillsDir = join(dir, '.opencode', 'skills');
  if (existsSync(skillsDir)) {
    for (const skillName of readdirSync(skillsDir)) {
      const src = join(skillsDir, skillName, 'SKILL.md');
      if (!existsSync(src)) continue;
      const dest = join(compatDir, 'skills', skillName, 'SKILL.md');
      if (!dryRun) copyFileSafe(src, dest);
      imported.skills++;
    }
  }

  // ── Copy commands ──
  const commandsDir = join(dir, '.opencode', 'commands');
  if (existsSync(commandsDir)) {
    for (const f of readdirSync(commandsDir).filter(f => f.endsWith('.md'))) {
      const src = join(commandsDir, f);
      const dest = join(compatDir, 'commands', f);
      if (!dryRun) copyFileSafe(src, dest);
      imported.commands++;
    }
  }

  // ── Copy prompts ──
  const promptsDir = join(dir, '.opencode', 'prompts');
  if (existsSync(promptsDir)) {
    for (const f of readdirSync(promptsDir).filter(f => f.endsWith('.md'))) {
      const src = join(promptsDir, f);
      const dest = join(compatDir, 'prompts', f);
      if (!dryRun) copyFileSafe(src, dest);
    }
  }

  return { type: 'opencode', imported, warnings, targetPath: compatDir };
}
