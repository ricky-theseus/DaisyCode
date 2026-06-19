#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { loadConfig, ensureSessionDir } from './config.js';
import { createDefaultRegistry } from './tools/registry.js';
import { PermissionSystem } from './permissions.js';
import { DeepSeekAdapter } from './model-adapter.js';
import { Agent } from './agent-loop.js';
import { createSession } from './session.js';
import { startRepl } from './repl.js';

async function main() {
  const { values } = parseArgs({
    options: {
      agent: { type: 'string', short: 'a', default: 'default' },
      dir: { type: 'string', short: 'd' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`DaisyCode — AI Coding Agent

Usage:
  daisy [options]

Options:
  -a, --agent <name>   Agent to use (default: "default")
  -d, --dir <path>     Project directory (default: cwd)
  -h, --help           Show this help`);
    process.exit(0);
  }

  const cwd = values.dir ? String(values.dir) : process.cwd();
  const config = loadConfig(cwd);
  const agentName = String(values.agent ?? config.default_agent ?? 'default');
  const agentConfig = config.agent?.[agentName];

  // Setup
  const registry = createDefaultRegistry();
  const permissions = new PermissionSystem();
  const model = new DeepSeekAdapter();
  const sessionDir = ensureSessionDir(cwd);
  const session = createSession(agentName, sessionDir);

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
  });

  // Start REPL
  await startRepl(agent, agentName);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
