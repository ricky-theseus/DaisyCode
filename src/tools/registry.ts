import { ToolRegistry } from './types.js';
import { readTool } from './read.js';
import { editTool, writeTool } from './edit.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { bashTool } from './bash.js';

export function createDefaultRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(readTool);
  registry.register(editTool);
  registry.register(writeTool);
  registry.register(globTool);
  registry.register(grepTool);
  registry.register(bashTool);
  return registry;
}

export { ToolRegistry } from './types.js';
