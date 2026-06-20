import { fg, bg, bold, reset, truncate } from './renderer.js';

export interface SessionSummary {
  id: string;
  label: string;    // "2026-06-20 14:30"
  preview: string;  // first message preview
  active: boolean;
}

export interface SidebarState {
  visible: boolean;
  sessions: SessionSummary[];
  activeIdx: number;
  width: number;    // default 20
}

/** Render the sidebar as an array of lines (one per row) */
export function renderSidebar(state: SidebarState, height: number): string[] {
  if (!state.visible || state.sessions.length === 0) {
    return [];
  }

  const w = state.width;
  const lines: string[] = [];
  const separator = `${fg.gray}${'─'.repeat(w)}${reset}`;

  // Title
  lines.push(`${bold}${fg.white}${'Sessions'.padEnd(w)}${reset}`);

  for (let i = 0; i < state.sessions.length && lines.length < height; i++) {
    const session = state.sessions[i];
    const isActive = i === state.activeIdx;

    const label = truncate(session.label, w);
    const preview = truncate(session.preview, w);

    if (isActive) {
      lines.push(`${bg.blue}${fg.white} ${label.padEnd(w - 1)}${reset}`);
      lines.push(`${bg.blue}${fg.gray} ${preview.padEnd(w - 1)}${reset}`);
    } else {
      lines.push(`${fg.gray} ${label.padEnd(w - 1)}${reset}`);
      lines.push(`${fg.gray} ${preview.padEnd(w - 1)}${reset}`);
    }

    if (lines.length < height) {
      lines.push(separator);
    }
  }

  // Fill remaining height with empty lines
  while (lines.length < height) {
    lines.push(' '.repeat(w));
  }

  return lines;
}
