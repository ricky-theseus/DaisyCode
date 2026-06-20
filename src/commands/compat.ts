import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scanDirectory, type CompatPlan } from '../compat/scanner.js';
import { importClaudeCode, importOpenCode, type ImportResult } from '../compat/importer.js';
import { mergeIntoDaisyConfig } from '../compat/merger.js';

// ── Types ──────────────────────────────────────────────────────────────

export interface CompatOptions {
  dryRun?: boolean;
  force?: boolean;
  from?: 'claude' | 'opencode';
  list?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function printPlan(plan: CompatPlan): void {
  for (const source of plan.sources) {
    const icon = source.type === 'claude' ? '☕' : '○';
    console.log(`  ${icon} ${source.type === 'claude' ? 'Claude Code' : 'OpenCode'} (confidence: ${source.confidence})`);
    for (const hint of source.hints) {
      console.log(`      ${hint}`);
    }
  }

  if (plan.commands.length > 0) {
    console.log(`\n  Commands (${plan.commands.length}):`);
    for (const cmd of plan.commands) {
      console.log(`    - ${cmd.name} (from ${cmd.source})`);
    }
  }

  if (plan.skills.length > 0) {
    console.log(`\n  Skills (${plan.skills.length}):`);
    for (const sk of plan.skills) {
      console.log(`    - ${sk.name} (from ${sk.source})`);
    }
  }

  if (plan.mcpServers.length > 0) {
    console.log(`\n  MCP Servers (${plan.mcpServers.length}):`);
    for (const srv of plan.mcpServers) {
      console.log(`    - ${srv.name} (from ${srv.source})`);
    }
  }

  if (plan.agents.length > 0) {
    console.log(`\n  Agents (${plan.agents.length}):`);
    for (const ag of plan.agents) {
      console.log(`    - ${ag.name} (from ${ag.source})`);
    }
  }
}

function printImportResult(result: ImportResult): void {
  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      console.log(`  ⚠ ${w}`);
    }
  }

  const { imported } = result;
  const total = imported.commands + imported.skills + imported.mcpServers + imported.agents;
  if (total > 0) {
    console.log(`  ✓ Imported:`);
    if (imported.commands > 0) console.log(`      Commands: ${imported.commands}`);
    if (imported.skills > 0) console.log(`      Skills: ${imported.skills}`);
    if (imported.mcpServers > 0) console.log(`      MCP Servers: ${imported.mcpServers}`);
    if (imported.agents > 0) console.log(`      Agents: ${imported.agents}`);
    console.log(`      → ${result.targetPath}`);
  }
}

function listImported(projectDir: string): void {
  const compatDir = join(projectDir, '.daisy', 'compat');
  if (!existsSync(compatDir)) {
    console.log('No imported compat configurations found.');
    return;
  }

  const entries = readdirSync(compatDir);
  if (entries.length === 0) {
    console.log('No imported compat configurations found.');
    return;
  }

  console.log('Imported compat configurations:');
  for (const entry of entries) {
    const entryPath = join(compatDir, entry);
    if (!existsSync(entryPath)) continue;
    const files = readdirSync(entryPath);
    console.log(`  ${entry === 'claude' ? '☕' : '○'} ${entry === 'claude' ? 'Claude Code' : 'OpenCode'}:`);
    for (const f of files) {
      const fPath = join(entryPath, f);
      if (existsSync(fPath)) {
        const stats = require('node:fs').statSync(fPath);
        if (stats.isDirectory()) {
          const subFiles = readdirSync(fPath);
          console.log(`      ${f}/ (${subFiles.length} files)`);
        } else {
          console.log(`      ${f}`);
        }
      }
    }
  }

  // Check if merged config exists
  const mergedPath = join(projectDir, 'daisy.compat.jsonc');
  if (existsSync(mergedPath)) {
    console.log(`\n  Merged config: daisy.compat.jsonc`);
  }
}

// ── Main compat command ────────────────────────────────────────────────

export function compatCommand(cwd: string, options: CompatOptions): void {
  const { dryRun, force, from, list } = options;

  if (list) {
    listImported(cwd);
    return;
  }

  // Scan
  console.log('🔍 Scanning for compatible configurations...\n');
  const plan = scanDirectory(cwd);

  if (plan.sources.length === 0) {
    console.log('No compatible configurations found.');
    console.log('DaisyCode looks for:');
    console.log('  Claude Code: CLAUDE.md, .claude/commands/, .claude/skills/, .mcp.json');
    console.log('  OpenCode: opencode.json, .opencode/agents/, .opencode/skills/');
    return;
  }

  printPlan(plan);

  if (dryRun) {
    console.log('\n--- Dry run — no files written ---');
    return;
  }

  // Determine which sources to import
  const sourcesToImport: ('claude' | 'opencode')[] = from ? [from] : ['claude', 'opencode'];

  // Import
  console.log('\n📦 Importing...\n');
  for (const source of sourcesToImport) {
    let result: ImportResult;
    if (source === 'claude') {
      result = importClaudeCode(cwd, { dryRun, force });
    } else {
      result = importOpenCode(cwd, { dryRun, force });
    }
    printImportResult(result);
  }

  // Merge
  console.log('\n🔧 Merging into config...\n');
  const merged = mergeIntoDaisyConfig({
    projectDir: cwd,
    sources: sourcesToImport,
    dryRun,
    force,
  });

  const mergedCount =
    Object.keys(merged.agent ?? {}).length +
    Object.keys(merged.skill ?? {}).length +
    Object.keys(merged.mcp ?? {}).length;

  if (mergedCount > 0) {
    console.log(`  ✓ Merged ${mergedCount} items into daisy config`);
    if (merged.agent) console.log(`      Agents: ${Object.keys(merged.agent).length}`);
    if (merged.skill) console.log(`      Skills: ${Object.keys(merged.skill).length}`);
    if (merged.mcp) console.log(`      MCP Servers: ${Object.keys(merged.mcp).length}`);
  } else {
    console.log('  Nothing to merge.');
  }

  console.log('\n✅ Compat import complete.');
  console.log('  Original files are untouched.');
  console.log('  Imported files: .daisy/compat/');
  console.log('  Merged config: daisy.compat.jsonc (or daisy.jsonc with --force)');
}
