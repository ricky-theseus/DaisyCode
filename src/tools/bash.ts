import { spawn } from 'node:child_process';
import type { Tool } from './types.js';

function detectShell(): string {
  // Windows: prefer pwsh, fallback to cmd
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('node:child_process');
      execSync('where pwsh.exe', { stdio: 'ignore' });
      return 'pwsh.exe';
    } catch {
      return 'cmd.exe';
    }
  }
  return '/bin/bash';
}

function normalizePath(command: string): string {
  // Convert backslashes to forward slashes on Windows
  if (process.platform === 'win32') {
    return command.replace(/\\/g, '/');
  }
  return command;
}

export const bashTool: Tool = {
  name: 'bash',
  description: 'Execute a shell command',
  inputSchema: {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Command to execute' },
      timeout: { type: 'number', description: 'Timeout in milliseconds (default: 30000)' },
    },
    required: ['command'],
  },
  async execute(args, context) {
    const command = normalizePath(String(args.command ?? ''));
    const timeout = typeof args.timeout === 'number' ? args.timeout : 30_000;
    const shell = detectShell();

    return new Promise((resolve) => {
      const child = spawn(shell, process.platform === 'win32' ? ['/c', command] : ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: context.signal,
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, timeout);

      child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        if (timedOut) {
          resolve({ error: 'timeout', exitCode: -1, stdout, stderr });
        } else {
          resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({ error: err.message, exitCode: -1, stdout, stderr });
      });
    });
  },
};
