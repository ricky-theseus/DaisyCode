import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { Tool } from './types.js';

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
  async execute(args) {
    const path = String(args.path ?? '');
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
  async execute(args) {
    const path = String(args.path ?? '');
    const content = String(args.content ?? '');
    writeFileSync(path, content, 'utf-8');
    return { success: true };
  },
};
