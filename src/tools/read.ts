import { readFileSync, existsSync } from 'node:fs';
import type { Tool } from './types.js';

const DEFAULT_MAX_BYTES = 1_048_576; // 1MB

export const readTool: Tool = {
  name: 'read',
  description: 'Read file contents from the filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Path to the file' },
      offset: { type: 'number', description: 'Line number to start from (0-indexed)', minimum: 0 },
      limit: { type: 'number', description: 'Max lines to read (1-2000)', minimum: 1, maximum: 2000 },
      maxBytes: { type: 'number', description: 'Max bytes to read', default: DEFAULT_MAX_BYTES },
    },
    required: ['path'],
  },
  async execute(args) {
    const path = String(args.path ?? '');
    const offset = typeof args.offset === 'number' ? args.offset : 0;
    const limit = typeof args.limit === 'number' ? args.limit : 2000;
    const maxBytes = typeof args.maxBytes === 'number' ? args.maxBytes : DEFAULT_MAX_BYTES;

    if (!existsSync(path)) {
      return { error: 'file_not_found', path };
    }

    const content = readFileSync(path, 'utf-8');
    const totalBytes = Buffer.byteLength(content, 'utf-8');

    let truncated = false;
    let text = content;
    if (totalBytes > maxBytes) {
      text = content.slice(0, maxBytes);
      truncated = true;
    }

    const lines = text.split('\n');
    const totalLines = lines.length;
    const sliced = lines.slice(offset, limit ? offset + limit : undefined);

    return {
      content: sliced.join('\n'),
      totalLines,
      truncated,
      totalBytes,
    };
  },
};
