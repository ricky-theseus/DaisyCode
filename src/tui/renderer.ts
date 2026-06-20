// ponytail: pure ANSI escape codes, no dependencies

/** Cursor movement */
export function cursorUp(n: number): string { return `\x1b[${n}A`; }
export function cursorDown(n: number): string { return `\x1b[${n}B`; }
export function cursorRight(n: number): string { return `\x1b[${n}C`; }
export function cursorLeft(n: number): string { return `\x1b[${n}D`; }
export function cursorPos(row: number, col: number): string { return `\x1b[${row};${col}H`; }
export function clearLine(): string { return '\x1b[2K'; }
export function clearScreen(): string { return '\x1b[2J'; }
export function hideCursor(): string { return '\x1b[?25l'; }
export function showCursor(): string { return '\x1b[?25h'; }
export function saveCursor(): string { return '\x1b[s'; }
export function restoreCursor(): string { return '\x1b[u'; }
export function scrollRegion(top: number, bottom: number): string { return `\x1b[${top};${bottom}r`; }
export function resetScrollRegion(): string { return '\x1b[r'; }

/** Foreground colors */
export const fg: Record<string, string> = {
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  reset:   '\x1b[39m',
};

/** Background colors */
export const bg: Record<string, string> = {
  black:   '\x1b[40m',
  red:     '\x1b[41m',
  green:   '\x1b[42m',
  yellow:  '\x1b[43m',
  blue:    '\x1b[44m',
  magenta: '\x1b[45m',
  cyan:    '\x1b[46m',
  white:   '\x1b[47m',
  gray:    '\x1b[100m',
  reset:   '\x1b[49m',
};

/** Text styles */
export const bold      = '\x1b[1m';
export const dim       = '\x1b[2m';
export const italic    = '\x1b[3m';
export const underline = '\x1b[4m';
export const reset     = '\x1b[0m';

/** Get terminal size */
export function getTermSize(): { rows: number; cols: number } {
  const rows = process.stdout.rows ?? 24;
  const cols = process.stdout.columns ?? 80;
  return { rows, cols };
}

/** Strip ANSI escape codes from a string (for width calculation) */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
}

/** Visible width of a string (ANSI-aware) */
export function visibleWidth(text: string): number {
  return stripAnsi(text).length;
}

/** Pad a string to a given visible width, left-aligned */
export function padLeft(text: string, width: number): string {
  const vw = visibleWidth(text);
  return vw >= width ? text : text + ' '.repeat(width - vw);
}

/** Truncate a string to a given visible width, adding ellipsis if truncated */
export function truncate(text: string, maxWidth: number): string {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxWidth) return text;
  return stripped.slice(0, Math.max(0, maxWidth - 3)) + '...';
}
