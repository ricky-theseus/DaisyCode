import type { Tool } from './types.js';
import type { ToolContext } from '../types.js';
import type { Orchestrator } from '../orchestrator.js';

export function createTaskTool(orchestrator: Orchestrator): Tool {
  return {
    name: 'task',
    description: 'Delegate a task to a sub-agent. Use this when you need a specialized agent to handle a specific subtask.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Name of the agent to delegate to (e.g. "builder", "tester", "reviewer")',
        },
        task: {
          type: 'string',
          description: 'The task description to give to the sub-agent',
        },
        background: {
          type: 'boolean',
          description: 'If true, run the task in the background and return immediately',
          default: false,
        },
      },
      required: ['agent', 'task'],
    },
    async execute(args: Record<string, unknown>, context: ToolContext): Promise<unknown> {
      const agentName = String(args.agent);
      const task = String(args.task);
      const background = args.background === true;

      try {
        const { session, permissions } = orchestrator.createSubagent(
          { agent: agentName },
          context.sessionId,
          context.permissions,
        );

        const result = await orchestrator.runSubagent(
          session,
          task,
          permissions,
          context.signal,
          background,
        );

        if (!result.success) {
          return { error: result.error, output: result.output };
        }
        return { output: result.output };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
