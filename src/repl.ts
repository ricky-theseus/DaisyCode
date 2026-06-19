import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import type { AgentEvent } from './types.js';
import type { Agent } from './agent-loop.js';

function sanitizeOutput(text: string): string {
  // Filter ANSI escape sequences (keep \n \t \r)
  // eslint-disable-next-line no-control-regex
  return text
    .replace(/\x00/g, '')           // NULL bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars except \n \t \r
    .split('\n')
    .map(line => line.length > 1000 ? line.slice(0, 1000) + '...[truncated]' : line)
    .join('\n');
}

const AGENT_NAMES = ['default', 'architect', 'builder', 'reviewer', 'tester', 'documenter', 'devops'];

export async function startRepl(agent: Agent, agentName: string): Promise<void> {
  const rl = readline.createInterface({ input, output, prompt: '' });

  let currentInput = '';
  let isMultiline = false;
  let running = false;
  let abortController: AbortController | null = null;

  console.log(`DaisyCode — Agent: ${agentName} (Ctrl+C to interrupt, Ctrl+D to exit)`);

  const prompt = () => {
    output.write(isMultiline ? '... ' : `\n${agentName}> `);
  };

  prompt();

  const processInput = async (input: string) => {
    if (running) return;
    running = true;
    abortController = new AbortController();

    try {
      const events = agent.run(input, { signal: abortController.signal });
      for await (const event of events) {
        switch (event.type) {
          case 'text_delta':
            output.write(sanitizeOutput(event.content));
            break;
          case 'tool_call':
            output.write(`\n\x1b[90m⚡ ${event.tool}(${JSON.stringify(event.args)})\x1b[0m\n`);
            break;
          case 'tool_result':
            output.write(`\x1b[90m→ ${event.tool}: ${JSON.stringify(event.result).slice(0, 200)}...\x1b[0m\n`);
            break;
          case 'error':
            output.write(`\n\x1b[31mError: ${event.error.message}\x1b[0m\n`);
            break;
          case 'done':
            output.write('\n');
            break;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AgentAbortedError') {
        output.write('\n\x1b[33mInterrupted\x1b[0m\n');
      } else {
        output.write(`\n\x1b[31mError: ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`);
      }
    } finally {
      running = false;
      abortController = null;
      prompt();
    }
  };

  // Handle line input
  rl.on('line', (line) => {
    if (running) return;

    const trimmed = line.trimEnd();

    if (isMultiline) {
      if (trimmed === '') {
        // Empty line ends multiline
        isMultiline = false;
        const input = currentInput;
        currentInput = '';
        processInput(input);
      } else {
        currentInput += '\n' + trimmed;
        prompt();
      }
      return;
    }

    if (trimmed === '') {
      prompt();
      return;
    }

    // Check for multiline trigger
    if (trimmed.endsWith('\\')) {
      isMultiline = true;
      currentInput = trimmed.slice(0, -1);
      prompt();
      return;
    }

    // @agent-name completion
    if (trimmed.startsWith('@')) {
      const partial = trimmed.slice(1).toLowerCase();
      const match = AGENT_NAMES.find(n => n.startsWith(partial));
      if (match) {
        output.write(match.slice(partial.length));
      }
      return;
    }

    processInput(trimmed);
  });

  // Ctrl+C handling
  rl.on('SIGINT', () => {
    if (running && abortController) {
      abortController.abort();
    } else if (isMultiline) {
      isMultiline = false;
      currentInput = '';
      output.write('\n');
      prompt();
    } else {
      output.write('\n');
      prompt();
    }
  });

  // Ctrl+D to exit
  rl.on('close', () => {
    output.write('\n');
    process.exit(0);
  });

  // Tab completion for agent names
  rl.on('tab', () => {
    // default tab behavior
  });
}
