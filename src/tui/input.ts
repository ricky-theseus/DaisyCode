// ponytail: raw mode state machine, no readline dependency

export interface InputState {
  lines: string[];
  cursorLine: number;   // index into lines
  cursorCol: number;    // column within that line
  history: string[];    // previous submissions
  historyIdx: number;   // -1 = fresh input
}

export type InputAction =
  | { type: 'char'; char: string }
  | { type: 'enter' }        // Shift+Enter or Enter on non-empty last line → newline
  | { type: 'send' }         // Enter on empty last line, Ctrl+Enter, Ctrl+S
  | { type: 'cancel' }       // Ctrl+C (first press)
  | { type: 'interrupt' }    // Ctrl+Q (interrupt agent)
  | { type: 'exit' }         // Ctrl+C twice, Ctrl+D
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'tab' }
  | { type: 'ctrl_l' }       // clear screen
  | { type: 'ctrl_p' };      // toggle sidebar

export function createInputState(): InputState {
  return {
    lines: [''],
    cursorLine: 0,
    cursorCol: 0,
    history: [],
    historyIdx: -1,
  };
}

/** Process a raw byte sequence from stdin and return an action */
export function processKey(seq: string, state: InputState): InputAction | null {
  // Single characters
  if (seq.length === 1) {
    const code = seq.charCodeAt(0);

    // Ctrl+C
    if (code === 0x03) return { type: 'cancel' };
    // Ctrl+D
    if (code === 0x04) return { type: 'exit' };
    // Ctrl+L
    if (code === 0x0c) return { type: 'ctrl_l' };
    // Ctrl+P
    if (code === 0x10) return { type: 'ctrl_p' };
    // Ctrl+Q
    if (code === 0x11) return { type: 'interrupt' };
    // Ctrl+S
    if (code === 0x13) return { type: 'send' };
    // Tab
    if (code === 0x09) return { type: 'tab' };
    // Enter
    if (code === 0x0a || code === 0x0d) {
      // If last line is empty → send, otherwise insert newline
      const lastLine = state.lines[state.lines.length - 1];
      if (lastLine === '' && state.cursorLine === state.lines.length - 1) {
        return { type: 'send' };
      }
      return { type: 'enter' };
    }
    // Backspace
    if (code === 0x7f) return { type: 'backspace' };
    // Escape — could be start of escape sequence, handled below
    if (code === 0x1b) return null; // wait for more bytes

    // Printable character
    if (code >= 0x20 && code <= 0x7e) {
      return { type: 'char', char: seq };
    }

    return null;
  }

  // Multi-byte sequences (escape sequences)
  // CSI sequences: ESC [ ...
  if (seq.startsWith('\x1b[')) {
    const rest = seq.slice(2);

    // Arrow keys
    if (rest === 'A') return { type: 'up' };
    if (rest === 'B') return { type: 'down' };
    if (rest === 'C') return { type: 'right' };
    if (rest === 'D') return { type: 'left' };
    if (rest === 'H') return { type: 'home' };
    if (rest === 'F') return { type: 'end' };

    // Delete
    if (rest === '3~') return { type: 'delete' };
    // Home (vt100)
    if (rest === '1~') return { type: 'home' };
    // End (vt100)
    if (rest === '4~') return { type: 'end' };
  }

  // SS3 sequences: ESC O ...
  if (seq.startsWith('\x1bO')) {
    const rest = seq.slice(2);
    if (rest === 'H') return { type: 'home' };
    if (rest === 'F') return { type: 'end' };
  }

  // Shift+Enter: ESC [ 2 0 ~ or similar — treat as enter (newline)
  if (seq === '\x1b[20~' || seq === '\x1b[13;2u') {
    return { type: 'enter' };
  }

  // Alt+Enter / Ctrl+Enter: treat as send
  if (seq === '\x1b[13;3u' || seq === '\x1b[13;5u') {
    return { type: 'send' };
  }

  return null;
}

/** Apply an action to the input state, returning the new state */
export function applyAction(state: InputState, action: InputAction): InputState {
  const newState = { ...state, lines: [...state.lines] };

  switch (action.type) {
    case 'char': {
      const line = newState.lines[newState.cursorLine];
      const before = line.slice(0, newState.cursorCol);
      const after = line.slice(newState.cursorCol);
      newState.lines[newState.cursorLine] = before + action.char + after;
      newState.cursorCol += action.char.length;
      break;
    }

    case 'enter': {
      const line = newState.lines[newState.cursorLine];
      const before = line.slice(0, newState.cursorCol);
      const after = line.slice(newState.cursorCol);
      newState.lines[newState.cursorLine] = before;
      newState.lines.splice(newState.cursorLine + 1, 0, after);
      newState.cursorLine++;
      newState.cursorCol = 0;
      break;
    }

    case 'send': // ponytail: handled by caller in tui.ts, no state mutation needed
      break;

    case 'cancel': {
      // Clear input, keep history position
      newState.lines = [''];
      newState.cursorLine = 0;
      newState.cursorCol = 0;
      break;
    }

    case 'backspace': {
      if (newState.cursorCol > 0) {
        const line = newState.lines[newState.cursorLine];
        newState.lines[newState.cursorLine] = line.slice(0, newState.cursorCol - 1) + line.slice(newState.cursorCol);
        newState.cursorCol--;
      } else if (newState.cursorLine > 0) {
        // Join with previous line
        const prevLine = newState.lines[newState.cursorLine - 1];
        const curLine = newState.lines[newState.cursorLine];
        newState.cursorCol = prevLine.length;
        newState.lines[newState.cursorLine - 1] = prevLine + curLine;
        newState.lines.splice(newState.cursorLine, 1);
        newState.cursorLine--;
      }
      break;
    }

    case 'delete': {
      const line = newState.lines[newState.cursorLine];
      if (newState.cursorCol < line.length) {
        newState.lines[newState.cursorLine] = line.slice(0, newState.cursorCol) + line.slice(newState.cursorCol + 1);
      } else if (newState.cursorLine < newState.lines.length - 1) {
        // Join with next line
        const nextLine = newState.lines[newState.cursorLine + 1];
        newState.lines[newState.cursorLine] = line + nextLine;
        newState.lines.splice(newState.cursorLine + 1, 1);
      }
      break;
    }

    case 'left': {
      if (newState.cursorCol > 0) {
        newState.cursorCol--;
      } else if (newState.cursorLine > 0) {
        newState.cursorLine--;
        newState.cursorCol = newState.lines[newState.cursorLine].length;
      }
      break;
    }

    case 'right': {
      const line = newState.lines[newState.cursorLine];
      if (newState.cursorCol < line.length) {
        newState.cursorCol++;
      } else if (newState.cursorLine < newState.lines.length - 1) {
        newState.cursorLine++;
        newState.cursorCol = 0;
      }
      break;
    }

    case 'up': {
      if (newState.cursorLine > 0) {
        newState.cursorLine--;
        const line = newState.lines[newState.cursorLine];
        if (newState.cursorCol > line.length) {
          newState.cursorCol = line.length;
        }
      } else if (newState.historyIdx < newState.history.length - 1) {
        // Navigate history
        if (newState.historyIdx === -1) {
          // Save current input before navigating history
          newState.historyIdx = 0;
        } else {
          newState.historyIdx++;
        }
        const histEntry = newState.history[newState.historyIdx];
        newState.lines = histEntry.split('\n');
        newState.cursorLine = newState.lines.length - 1;
        newState.cursorCol = newState.lines[newState.cursorLine].length;
      }
      break;
    }

    case 'down': {
      if (newState.cursorLine < newState.lines.length - 1) {
        newState.cursorLine++;
        const line = newState.lines[newState.cursorLine];
        if (newState.cursorCol > line.length) {
          newState.cursorCol = line.length;
        }
      } else if (newState.historyIdx > 0) {
        newState.historyIdx--;
        const histEntry = newState.history[newState.historyIdx];
        newState.lines = histEntry.split('\n');
        newState.cursorLine = newState.lines.length - 1;
        newState.cursorCol = newState.lines[newState.cursorLine].length;
      } else if (newState.historyIdx === 0) {
        newState.historyIdx = -1;
        newState.lines = [''];
        newState.cursorLine = 0;
        newState.cursorCol = 0;
      }
      break;
    }

    case 'home': {
      newState.cursorCol = 0;
      break;
    }

    case 'end': {
      newState.cursorCol = newState.lines[newState.cursorLine].length;
      break;
    }

    case 'tab': {
      // ponytail: simple 2-space tab, no completion yet
      const line = newState.lines[newState.cursorLine];
      newState.lines[newState.cursorLine] = line.slice(0, newState.cursorCol) + '  ' + line.slice(newState.cursorCol);
      newState.cursorCol += 2;
      break;
    }
  }

  return newState;
}

/** Get the full text of the input state */
export function getInputText(state: InputState): string {
  return state.lines.join('\n');
}

/** Save current input to history and reset */
export function commitToHistory(state: InputState): InputState {
  const text = getInputText(state);
  if (text.trim() === '') return state;
  return {
    ...createInputState(),
    history: [text, ...state.history].slice(0, 100), // keep last 100
    historyIdx: -1,
  };
}
