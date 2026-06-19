import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Tool } from './types.js';

function matchGlob(pattern: string, name: string): boolean {
  // Simple glob matching: supports *, **, ?
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`).test(name);
}

function walk(dir: string, baseDir: string, pattern: string, results: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = relative(baseDir, fullPath);

    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (matchGlob(pattern, `${relPath  }/`)) {
          results.push(`${relPath  }/`);
        }
        walk(fullPath, baseDir, pattern, results);
      } else {
        if (matchGlob(pattern, relPath)) {
          results.push(relPath);
        }
      }
    } catch {
      // skip inaccessible entries
    }
  }
}

export const globTool: Tool = {
  name: 'glob',
  description: 'Find files matching a glob pattern',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Glob pattern (e.g. "**/*.ts")' },
      path: { type: 'string', description: 'Directory to search in (default: cwd)' },
    },
    required: ['pattern'],
  },
  async execute(args) {
    const pattern = String(args.pattern ?? '');
    const cwd = args.path ? String(args.path) : process.cwd();

    const files: string[] = [];
    walk(cwd, cwd, pattern, files);
    return { files };
  },
};
