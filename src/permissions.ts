import type { AgentPermissions, PermissionLevel, ToolContext } from './types.js';

const LEVEL_ORDER: Record<PermissionLevel, number> = {
  allow: 0,
  ask: 1,
  restricted: 2,
  deny: 3,
};

function stricter(a: PermissionLevel, b: PermissionLevel): PermissionLevel {
  return LEVEL_ORDER[a] > LEVEL_ORDER[b] ? a : b;
}

export function mergePermissions(
  parent: AgentPermissions,
  child: AgentPermissions | undefined,
): AgentPermissions {
  const result: AgentPermissions = { ...parent };
  if (!child) return result;

  for (const key of Object.keys(child)) {
    if (key in parent) {
      result[key] = stricter(parent[key], child[key]);
    } else {
      result[key] = child[key];
    }
  }
  return result;
}

export interface PermissionCheck {
  allowed: boolean;
  level: PermissionLevel;
  reason?: string;
}

export class PermissionSystem {
  check(
    tool: string,
    _args: Record<string, unknown>,
    context: ToolContext,
  ): PermissionCheck {
    const level = context.permissions[tool] ?? 'ask';

    switch (level) {
      case 'allow':
        return { allowed: true, level };
      case 'deny':
        return { allowed: false, level, reason: `Tool "${tool}" is denied for agent "${context.agent}"` };
      case 'restricted':
        return { allowed: true, level, reason: 'restricted' };
      case 'ask':
      default:
        return { allowed: false, level, reason: `Tool "${tool}" requires confirmation` };
    }
  }
}
