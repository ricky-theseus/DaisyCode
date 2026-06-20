import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanDirectory, type CompatPlan, type ImportedCommand, type ImportedSkill, type ImportedMCPServer, type ImportedAgent } from './scanner.js';
import type { DaisyConfig, AgentConfig, MCPProcessConfig, Skill } from '../types.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface MergeOptions {
  projectDir: string;
  sources: ('claude' | 'opencode')[];
  dryRun?: boolean;
  force?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function readFileSafe(path: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}

function loadJsonc(path: string): Record<string, unknown> | null {
  const raw = readFileSafe(path);
  if (!raw) return null;
  try {
    // ponytail: naive comment stripping — breaks if a string literal contains //
    const stripped = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

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

// ── Merge logic ────────────────────────────────────────────────────────

function mergeClaudeMd(plan: CompatPlan): string | null {
  // Look for CLAUDE.md content in the scanned files
  // ponytail: just read from known locations, no need for a full content tracker
  return null; // handled by reading from .daisy/compat/claude/CLAUDE.md at runtime
}

function mergeCommands(plan: CompatPlan): Record<string, AgentConfig> {
  const agents: Record<string, AgentConfig> = {};
  for (const cmd of plan.commands) {
    // Each command becomes an agent entry with the command content as system prompt
    agents[`compat-${cmd.name}`] = {
      description: `Imported command: ${cmd.name} (from ${cmd.source})`,
      systemPrompt: cmd.content,
    };
  }
  return agents;
}

function mergeSkills(plan: CompatPlan): Record<string, Skill> {
  const skills: Record<string, Skill> = {};
  for (const sk of plan.skills) {
    skills[sk.name] = {
      name: sk.name,
      trigger: sk.trigger,
      description: `Imported skill from ${sk.source}`,
      path: `.daisy/compat/${sk.source}/skills/${sk.name}/SKILL.md`,
      prompt: sk.content,
    };
  }
  return skills;
}

function mergeMCPServers(plan: CompatPlan): Record<string, MCPProcessConfig> {
  const mcp: Record<string, MCPProcessConfig> = {};
  for (const srv of plan.mcpServers) {
    mcp[srv.name] = srv.config;
  }
  return mcp;
}

function mergeAgents(plan: CompatPlan): Record<string, AgentConfig> {
  const agents: Record<string, AgentConfig> = {};
  for (const ag of plan.agents) {
    // Deep merge: later sources override earlier ones
    const existing = agents[ag.name];
    if (existing) {
      agents[ag.name] = deepMerge(existing, ag.config) as AgentConfig;
    } else {
      agents[ag.name] = ag.config;
    }
  }
  return agents;
}

// ── Main merge ─────────────────────────────────────────────────────────

export function mergeIntoDaisyConfig(opts: MergeOptions): DaisyConfig {
  const { projectDir, sources, dryRun, force } = opts;
  const plan = scanDirectory(projectDir);

  // Build merged config sections
  const mergedAgents: Record<string, AgentConfig> = {};
  const mergedSkills: Record<string, Skill> = {};
  const mergedMCP: Record<string, MCPProcessConfig> = {};

  // Process in order: claude first, then opencode (opencode overrides claude on conflict)
  for (const source of sources) {
    if (source === 'claude') {
      const cmdAgents = mergeCommands(plan);
      for (const [k, v] of Object.entries(cmdAgents)) {
        mergedAgents[k] = v;
      }
      const skills = mergeSkills(plan);
      for (const [k, v] of Object.entries(skills)) {
        mergedSkills[k] = v;
      }
      const mcp = mergeMCPServers(plan);
      for (const [k, v] of Object.entries(mcp)) {
        mergedMCP[k] = v;
      }
      const agents = mergeAgents(plan);
      for (const [k, v] of Object.entries(agents)) {
        mergedAgents[k] = v;
      }
    }

    if (source === 'opencode') {
      const cmdAgents = mergeCommands(plan);
      for (const [k, v] of Object.entries(cmdAgents)) {
        mergedAgents[k] = v;
      }
      const skills = mergeSkills(plan);
      for (const [k, v] of Object.entries(skills)) {
        mergedSkills[k] = v;
      }
      const agents = mergeAgents(plan);
      for (const [k, v] of Object.entries(agents)) {
        mergedAgents[k] = v;
      }
    }
  }

  // Build the final config
  const config: DaisyConfig = {
    agent: Object.keys(mergedAgents).length > 0 ? mergedAgents : undefined,
    skill: Object.keys(mergedSkills).length > 0 ? mergedSkills : undefined,
    mcp: Object.keys(mergedMCP).length > 0 ? mergedMCP : undefined,
  };

  // Write to daisy.compat.jsonc (or daisy.jsonc if force and no existing)
  if (!dryRun) {
    const compatConfigPath = join(projectDir, 'daisy.compat.jsonc');
    const daisyConfigPath = join(projectDir, 'daisy.jsonc');

    // Check if daisy.jsonc exists — if not, we can write directly
    const targetPath = (!force && existsSync(daisyConfigPath))
      ? compatConfigPath
      : daisyConfigPath;

    // If target is daisy.jsonc and force, merge with existing
    let finalConfig: DaisyConfig = config;
    if (targetPath === daisyConfigPath && existsSync(daisyConfigPath)) {
      const existing = loadJsonc(daisyConfigPath) as DaisyConfig | null;
      if (existing) {
        finalConfig = deepMerge(existing, config) as DaisyConfig;
      }
    }

    const json = JSON.stringify(finalConfig, null, 2);
    writeFileSync(targetPath, `// Auto-generated by daisy compat\n${json}\n`, 'utf-8');
  }

  return config;
}
