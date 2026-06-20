import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { homedir } from 'node:os';
import type { MCPProcessConfig, AgentConfig } from '../types.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface CompatSource {
  type: 'claude' | 'opencode';
  confidence: 'high' | 'medium' | 'low';
  files: string[];
  hints: string[];
}

export interface ImportedCommand {
  name: string;
  content: string;
  source: string;
}

export interface ImportedSkill {
  name: string;
  trigger: string[];
  content: string;
  source: string;
}

export interface ImportedMCPServer {
  name: string;
  config: MCPProcessConfig;
  source: string;
}

export interface ImportedAgent {
  name: string;
  config: AgentConfig;
  source: string;
}

export interface CompatPlan {
  sources: CompatSource[];
  commands: ImportedCommand[];
  skills: ImportedSkill[];
  mcpServers: ImportedMCPServer[];
  agents: ImportedAgent[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function loadJsonSafe(path: string): Record<string, unknown> | null {
  const raw = readFileSafe(path);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function listMdFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md'));
  } catch {
    return [];
  }
}

function listSkillDirs(dir: string): string[] {
  try {
    return readdirSync(dir).filter(f => {
      const skillMd = join(dir, f, 'SKILL.md');
      return existsSync(skillMd);
    });
  } catch {
    return [];
  }
}

// ── Scan Claude Code ───────────────────────────────────────────────────

function scanClaude(dir: string): CompatSource {
  const files: string[] = [];
  const hints: string[] = [];

  // CLAUDE.md in project root
  const claudeMd = join(dir, 'CLAUDE.md');
  if (existsSync(claudeMd)) {
    files.push(claudeMd);
    hints.push('CLAUDE.md — project rules');
  }

  // .claude/CLAUDE.md
  const dotClaudeMd = join(dir, '.claude', 'CLAUDE.md');
  if (existsSync(dotClaudeMd)) {
    files.push(dotClaudeMd);
    hints.push('.claude/CLAUDE.md — project rules');
  }

  // .claude/commands/
  const commandsDir = join(dir, '.claude', 'commands');
  if (existsSync(commandsDir)) {
    const cmds = listMdFiles(commandsDir);
    for (const c of cmds) {
      files.push(join(commandsDir, c));
    }
    if (cmds.length > 0) hints.push(`.claude/commands/ — ${cmds.length} custom commands`);
  }

  // ~/.claude/commands/
  const userCommandsDir = join(homedir(), '.claude', 'commands');
  if (existsSync(userCommandsDir)) {
    const cmds = listMdFiles(userCommandsDir);
    for (const c of cmds) {
      files.push(join(userCommandsDir, c));
    }
    if (cmds.length > 0) hints.push(`~/.claude/commands/ — ${cmds.length} user commands`);
  }

  // ~/.claude/skills/
  const userSkillsDir = join(homedir(), '.claude', 'skills');
  if (existsSync(userSkillsDir)) {
    const skills = listSkillDirs(userSkillsDir);
    for (const s of skills) {
      files.push(join(userSkillsDir, s, 'SKILL.md'));
    }
    if (skills.length > 0) hints.push(`~/.claude/skills/ — ${skills.length} skills`);
  }

  // .claude/skills/
  const projectSkillsDir = join(dir, '.claude', 'skills');
  if (existsSync(projectSkillsDir)) {
    const skills = listSkillDirs(projectSkillsDir);
    for (const s of skills) {
      files.push(join(projectSkillsDir, s, 'SKILL.md'));
    }
    if (skills.length > 0) hints.push(`.claude/skills/ — ${skills.length} skills`);
  }

  // .mcp.json / ~/.claude/.mcp.json
  const mcpJson = join(dir, '.mcp.json');
  if (existsSync(mcpJson)) {
    files.push(mcpJson);
    hints.push('.mcp.json — MCP server config');
  }
  const userMcpJson = join(homedir(), '.claude', '.mcp.json');
  if (existsSync(userMcpJson)) {
    files.push(userMcpJson);
    hints.push('~/.claude/.mcp.json — user MCP server config');
  }

  // .claude/settings.json
  const settingsJson = join(dir, '.claude', 'settings.json');
  if (existsSync(settingsJson)) {
    files.push(settingsJson);
    hints.push('.claude/settings.json — permissions & model settings');
  }

  const confidence: CompatSource['confidence'] = files.length > 0 ? 'high' : 'low';

  return { type: 'claude', confidence, files, hints };
}

// ── Scan OpenCode ──────────────────────────────────────────────────────

function scanOpenCode(dir: string): CompatSource {
  const files: string[] = [];
  const hints: string[] = [];

  // opencode.json
  const opencodeJson = join(dir, 'opencode.json');
  if (existsSync(opencodeJson)) {
    files.push(opencodeJson);
    hints.push('opencode.json — config');
  }

  // .opencode/agents/
  const agentsDir = join(dir, '.opencode', 'agents');
  if (existsSync(agentsDir)) {
    const agents = listMdFiles(agentsDir);
    for (const a of agents) {
      files.push(join(agentsDir, a));
    }
    if (agents.length > 0) hints.push(`.opencode/agents/ — ${agents.length} custom agents`);
  }

  // .opencode/skills/
  const skillsDir = join(dir, '.opencode', 'skills');
  if (existsSync(skillsDir)) {
    const skills = listSkillDirs(skillsDir);
    for (const s of skills) {
      files.push(join(skillsDir, s, 'SKILL.md'));
    }
    if (skills.length > 0) hints.push(`.opencode/skills/ — ${skills.length} skills`);
  }

  // .opencode/commands/
  const commandsDir = join(dir, '.opencode', 'commands');
  if (existsSync(commandsDir)) {
    const cmds = listMdFiles(commandsDir);
    for (const c of cmds) {
      files.push(join(commandsDir, c));
    }
    if (cmds.length > 0) hints.push(`.opencode/commands/ — ${cmds.length} commands`);
  }

  // .opencode/prompts/
  const promptsDir = join(dir, '.opencode', 'prompts');
  if (existsSync(promptsDir)) {
    const prompts = listMdFiles(promptsDir);
    for (const p of prompts) {
      files.push(join(promptsDir, p));
    }
    if (prompts.length > 0) hints.push(`.opencode/prompts/ — ${prompts.length} prompts`);
  }

  const confidence: CompatSource['confidence'] = files.length > 0 ? 'high' : 'low';

  return { type: 'opencode', confidence, files, hints };
}

// ── Parse imported content ─────────────────────────────────────────────

function parseClaudeCommands(dir: string): ImportedCommand[] {
  const result: ImportedCommand[] = [];

  // Project-level
  const projectDir = join(dir, '.claude', 'commands');
  if (existsSync(projectDir)) {
    for (const f of listMdFiles(projectDir)) {
      const content = readFileSafe(join(projectDir, f));
      if (content) {
        result.push({ name: basename(f, extname(f)), content, source: 'claude' });
      }
    }
  }

  // User-level
  const userDir = join(homedir(), '.claude', 'commands');
  if (existsSync(userDir)) {
    for (const f of listMdFiles(userDir)) {
      const content = readFileSafe(join(userDir, f));
      if (content) {
        result.push({ name: basename(f, extname(f)), content, source: 'claude' });
      }
    }
  }

  return result;
}

function parseClaudeSkills(dir: string): ImportedSkill[] {
  const result: ImportedSkill[] = [];

  const scanDir = (base: string) => {
    const skillsDir = join(base, 'skills');
    if (!existsSync(skillsDir)) return;
    for (const skillName of readdirSync(skillsDir)) {
      const skillMd = join(skillsDir, skillName, 'SKILL.md');
      if (!existsSync(skillMd)) continue;
      const content = readFileSafe(skillMd);
      if (!content) continue;
      // ponytail: extract trigger from first line or filename, no YAML frontmatter parser needed
      const trigger = [skillName.toLowerCase()];
      result.push({ name: skillName, trigger, content, source: 'claude' });
    }
  };

  scanDir(join(dir, '.claude'));
  scanDir(join(homedir(), '.claude'));

  return result;
}

function parseClaudeMCP(dir: string): ImportedMCPServer[] {
  const result: ImportedMCPServer[] = [];

  const tryLoad = (path: string) => {
    const data = loadJsonSafe(path);
    if (!data) return;
    // ponytail: flat mcpServers map, same shape as DaisyCode
    const servers = data.mcpServers ?? data;
    if (typeof servers !== 'object') return;
    for (const [name, cfg] of Object.entries(servers as Record<string, unknown>)) {
      if (typeof cfg !== 'object' || cfg === null) continue;
      const c = cfg as Record<string, unknown>;
      if (typeof c.command !== 'string') continue;
      result.push({
        name,
        config: {
          command: c.command,
          args: Array.isArray(c.args) ? c.args.map(String) : [],
          env: typeof c.env === 'object' && c.env !== null ? c.env as Record<string, string> : undefined,
        },
        source: 'claude',
      });
    }
  };

  tryLoad(join(dir, '.mcp.json'));
  tryLoad(join(homedir(), '.claude', '.mcp.json'));

  return result;
}

function parseClaudeSettings(dir: string): ImportedAgent[] {
  const settingsPath = join(dir, '.claude', 'settings.json');
  const data = loadJsonSafe(settingsPath);
  if (!data) return [];

  const result: ImportedAgent[] = [];
  const agentConfig: AgentConfig = {};

  // Map allowedTools → permissions
  const allowedTools = data.allowedTools;
  if (Array.isArray(allowedTools)) {
    const perms: Record<string, 'allow' | 'deny' | 'ask'> = {};
    for (const tool of allowedTools) {
      perms[String(tool)] = 'allow';
    }
    agentConfig.permission = perms;
  }

  // Map model
  if (typeof data.model === 'string') {
    agentConfig.model = data.model;
  }

  if (Object.keys(agentConfig).length > 0) {
    result.push({ name: 'claude-default', config: agentConfig, source: 'claude' });
  }

  return result;
}

function parseOpenCodeAgents(dir: string): ImportedAgent[] {
  const result: ImportedAgent[] = [];

  // From opencode.json
  const configPath = join(dir, 'opencode.json');
  const config = loadJsonSafe(configPath) as Record<string, unknown> | null;
  if (config?.agent && typeof config.agent === 'object') {
    for (const [name, cfg] of Object.entries(config.agent as Record<string, unknown>)) {
      if (typeof cfg !== 'object' || cfg === null) continue;
      const c = cfg as Record<string, unknown>;
      const agent: AgentConfig = {};
      if (typeof c.description === 'string') agent.description = c.description;
      if (typeof c.model === 'string') agent.model = c.model;
      if (typeof c.temperature === 'number') agent.temperature = c.temperature;
      if (typeof c.color === 'string') agent.color = c.color;
      if (c.permission && typeof c.permission === 'object') {
        agent.permission = c.permission as Record<string, 'allow' | 'deny' | 'ask'>;
      }
      result.push({ name, config: agent, source: 'opencode' });
    }
  }

  // From .opencode/agents/*.md — merge systemPrompt into existing agents
  const agentsDir = join(dir, '.opencode', 'agents');
  if (existsSync(agentsDir)) {
    for (const f of listMdFiles(agentsDir)) {
      const agentName = basename(f, extname(f));
      const content = readFileSafe(join(agentsDir, f));
      if (!content) continue;
      const existing = result.find(a => a.name === agentName);
      if (existing) {
        existing.config.systemPrompt = content;
      } else {
        result.push({ name: agentName, config: { systemPrompt: content }, source: 'opencode' });
      }
    }
  }

  return result;
}

function parseOpenCodeSkills(dir: string): ImportedSkill[] {
  const result: ImportedSkill[] = [];

  const skillsDir = join(dir, '.opencode', 'skills');
  if (!existsSync(skillsDir)) return result;

  for (const skillName of readdirSync(skillsDir)) {
    const skillMd = join(skillsDir, skillName, 'SKILL.md');
    if (!existsSync(skillMd)) continue;
    const content = readFileSafe(skillMd);
    if (!content) continue;
    const trigger = [skillName.toLowerCase()];
    result.push({ name: skillName, trigger, content, source: 'opencode' });
  }

  return result;
}

function parseOpenCodeCommands(dir: string): ImportedCommand[] {
  const result: ImportedCommand[] = [];

  const commandsDir = join(dir, '.opencode', 'commands');
  if (!existsSync(commandsDir)) return result;

  for (const f of listMdFiles(commandsDir)) {
    const content = readFileSafe(join(commandsDir, f));
    if (content) {
      result.push({ name: basename(f, extname(f)), content, source: 'opencode' });
    }
  }

  return result;
}

// ── Main scan ──────────────────────────────────────────────────────────

export function scanDirectory(dir: string): CompatPlan {
  const sources: CompatSource[] = [];

  const claude = scanClaude(dir);
  if (claude.files.length > 0) sources.push(claude);

  const opencode = scanOpenCode(dir);
  if (opencode.files.length > 0) sources.push(opencode);

  const commands: ImportedCommand[] = [
    ...parseClaudeCommands(dir),
    ...parseOpenCodeCommands(dir),
  ];

  const skills: ImportedSkill[] = [
    ...parseClaudeSkills(dir),
    ...parseOpenCodeSkills(dir),
  ];

  const mcpServers: ImportedMCPServer[] = [
    ...parseClaudeMCP(dir),
  ];

  const agents: ImportedAgent[] = [
    ...parseClaudeSettings(dir),
    ...parseOpenCodeAgents(dir),
  ];

  return { sources, commands, skills, mcpServers, agents };
}
