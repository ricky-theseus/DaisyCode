#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { loadConfig, ensureSessionDir } from './config.js';
import { createDefaultRegistry } from './tools/registry.js';
import { createTaskTool } from './tools/task.js';
import { PermissionSystem } from './permissions.js';
import { createModel } from './model-adapter.js';
import { Agent } from './agent-loop.js';
import { Orchestrator } from './orchestrator.js';
import { SkillsLoader } from './skills/loader.js';
import { SkillsMatcher } from './skills/matcher.js';
import { createSession, loadSession, saveExportedSession } from './session.js';
import { startRepl } from './repl.js';
import { migrate } from './commands/migrate.js';
import { initProject } from './commands/init.js';

function showHelp(exitCode = 0): void {
  console.log(`DaisyCode — AI Coding Agent

Usage:
  daisy [command] [options]

Commands:
  migrate              Migrate opencode.json → daisy.jsonc
  init                 Initialize a new DaisyCode project
  export <sessionId>   Export a session to Markdown
  (no command)         Start interactive REPL

Options:
  -a, --agent <name>   Agent to use (default: "default")
  -d, --dir <path>     Project directory (default: cwd)
  -h, --help           Show this help`);
  process.exit(exitCode);
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      agent: { type: 'string', short: 'a', default: 'default' },
      dir: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    showHelp(0);
  }

  const cwd = values.dir ? String(values.dir) : process.cwd();
  const command = positionals[0];

  // Subcommands
  if (command === 'migrate') {
    migrate(cwd);
    return;
  }

  if (command === 'init') {
    await initProject(cwd);
    return;
  }

  if (command === 'export') {
    const sessionId = positionals[1];
    if (!sessionId) {
      console.error('Usage: daisy export <sessionId>');
      process.exit(1);
    }
    const sessionDir = ensureSessionDir(cwd);
    const session = loadSession(sessionId, sessionDir);
    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      process.exit(1);
    }
    const path = saveExportedSession(session, sessionDir, 'markdown');
    console.log(`Session exported to: ${path}`);
    return;
  }

  // Default: start REPL
  const config = loadConfig(cwd);
  const agentName = String(values.agent ?? config.default_agent ?? 'default');
  const agentConfig = config.agent?.[agentName];

  const permissions = new PermissionSystem();
  const model = createModel();
  const registry = createDefaultRegistry();
  const orchestrator = new Orchestrator(model, registry, permissions);
  registry.register(createTaskTool(orchestrator));
  const sessionDir = ensureSessionDir(cwd);
  const session = createSession(agentName, sessionDir);

  const skillsLoader = new SkillsLoader();
  const loadedSkills = skillsLoader.loadAll(config.skill, cwd);
  const skillsMatcher = Object.keys(loadedSkills).length > 0
    ? new SkillsMatcher(loadedSkills)
    : undefined;

  const systemPrompt = agentConfig?.description
    ? `You are ${agentName}: ${agentConfig.description}`
    : 'You are a helpful AI coding assistant.';

  const agent = new Agent({
    model,
    registry,
    permissions,
    agentName,
    agentPermissions: agentConfig?.permission ?? { read: 'allow', edit: 'ask', glob: 'allow', grep: 'allow', bash: 'ask' },
    sessionId: session.id,
    systemPrompt,
    skills: skillsMatcher,
  });

  await startRepl(agent, agentName);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
