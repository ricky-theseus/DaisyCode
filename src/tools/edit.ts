import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Tool } from './types.js';

function isPathTraversal(requested: string, workspaceRoot: string | undefined): boolean {
  if (!workspaceRoot) return false;
  const resolved = resolve(workspaceRoot, requested);
  return !resolved.startsWith(resolve(workspaceRoot));
}

function resolvePath(rawPath: string, workspaceRoot: string | undefined): string {
  if (isPathTraversal(rawPath, workspaceRoot)) return rawPath;
  return workspaceRoot ? resolve(workspaceRoot, rawPath) : rawPath;
}

export const editTool: Tool = {
  name: 'edit',
  description: 'Edit a file by replacing text (oldStr → newStr)',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      oldText: { type: 'string', description: 'Text to replace' },
      newText: { type: 'string', description: 'Replacement text' },
    },
    required: ['path', 'oldText', 'newText'],
  },
  async execute(args, context) {
    const rawPath = String(args.path ?? '');
    const workspaceRoot = context?.workspaceRoot;
    if (isPathTraversal(rawPath, workspaceRoot)) {
      return { error: 'path_traversal_denied', path: rawPath };
    }
    const path = resolvePath(rawPath, workspaceRoot);
    const oldText = String(args.oldText ?? '');
    const newText = String(args.newText ?? '');

    if (!existsSync(path)) {
      return { error: 'file_not_found', path };
    }

    const content = readFileSync(path, 'utf-8');
    if (!content.includes(oldText)) {
      return { error: 'text_not_found', path };
    }

    const updated = content.replace(oldText, newText);
    writeFileSync(path, updated, 'utf-8');
    return { success: true, changed: content !== updated };
  },
};

export const writeTool: Tool = {
  name: 'write',
  description: 'Write content to a file (creates or overwrites)',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      content: { type: 'string', description: 'Content to write' },
    },
    required: ['path', 'content'],
  },
  async execute(args, context) {
    const rawPath = String(args.path ?? '');
    const workspaceRoot = context?.workspaceRoot;
    if (isPathTraversal(rawPath, workspaceRoot)) {
      return { error: 'path_traversal_denied', path: rawPath };
    }
    const path = resolvePath(rawPath, workspaceRoot);
    const content = String(args.content ?? '');
    writeFileSync(path, content, 'utf-8');
    return { success: true };
  },
};
