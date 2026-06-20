import { fg, bg, bold, reset, padLeft, truncate } from './renderer.js';

export interface StatusBarState {
  agentName: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  sessionId: string;
  status: 'idle' | 'streaming' | 'thinking' | 'error';
}

const statusColors: Record<string, string> = {
  idle: fg.white,
  streaming: fg.green,
  thinking: fg.yellow,
  error: fg.red,
};

const statusLabels: Record<string, string> = {
  idle: '● idle',
  streaming: '● stream',
  thinking: '● think',
  error: '● error',
};

/** Render the status bar as a single ANSI line */
export function renderStatusBar(state: StatusBarState, cols: number): string {
  const statusColor = statusColors[state.status] ?? fg.white;
  const statusLabel = statusLabels[state.status] ?? state.status;

  const left = `${bold}DaisyCode${reset} ${fg.gray}|${reset} agent: ${fg.cyan}${state.agentName}${reset} ${fg.gray}|${reset} model: ${fg.magenta}${truncate(state.modelName, 20)}${reset}`;
  const right = `${statusColor}${statusLabel}${reset} ${fg.gray}|${reset} tokens: ${state.promptTokens + state.completionTokens} ${fg.gray}|${reset} ${fg.gray}${state.sessionId.slice(0, 8)}${reset}`;

  const leftWidth = stripAnsiLen(left);
  const rightWidth = stripAnsiLen(right);
  const gap = Math.max(1, cols - leftWidth - rightWidth);

  return `${bg.blue}${fg.white} ${left}${' '.repeat(gap)}${right} ${reset}`;
}

function stripAnsiLen(text: string): number {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').length;
}
