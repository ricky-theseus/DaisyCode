import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Tool } from './types.js';

function matchGlob(pattern: string, name: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`).test(name);
}

function walkFiles(dir: string, baseDir: string, include: string, results: string[]): void {
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
        walkFiles(fullPath, baseDir, include, results);
      } else if (matchGlob(include, relPath)) {
        results.push(fullPath);
      }
    } catch {
      // skip inaccessible
    }
  }
}

export const grepTool: Tool = {
  name: 'grep',
  description: 'Search file contents using a regex pattern',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string', description: 'Regex pattern to search for' },
      path: { type: 'string', description: 'Directory to search in (default: cwd)' },
      include: { type: 'string', description: 'File glob pattern to filter (e.g. "*.ts")' },
    },
    required: ['pattern'],
  },
  async execute(args) {
    const pattern = String(args.pattern ?? '');
    const cwd = args.path ? String(args.path) : process.cwd();
    const include = args.include ? String(args.include) : '**/*';

    const regex = new RegExp(pattern, 'g');
    const matches: { file: string; line: number; content: string }[] = [];

    const files: string[] = [];
    walkFiles(cwd, cwd, include, files);

    for (const fullPath of files) {
      if (!existsSync(fullPath)) continue;
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const relPath = relative(cwd, fullPath);
        for (let i = 0; i < lines.length; i++) {
          regex.lastIndex = 0;
          if (regex.test(lines[i])) {
            matches.push({ file: relPath, line: i + 1, content: lines[i].trim() });
          }
        }
      } catch {
        // skip binary or unreadable files
      }
    }

    return { matches };
  },
};
