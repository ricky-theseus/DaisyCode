import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── renderer ────────────────────────────────────────────────────────────

const renderer = await import('../src/tui/renderer.js');

void describe('renderer', () => {
  void describe('stripAnsi', () => {
    void it('removes simple SGR codes', () => {
      assert.equal(renderer.stripAnsi('\x1b[31mred\x1b[39m'), 'red');
    });

    void it('removes codes with ? prefix (DEC private)', () => {
      assert.equal(renderer.stripAnsi('\x1b[?25lhide\x1b[?25h'), 'hide');
    });

    void it('removes mixed sequences', () => {
      const input = `${renderer.bold}${renderer.fg.red}bold red${renderer.reset}`;
      assert.equal(renderer.stripAnsi(input), 'bold red');
    });

    void it('removes cursor movement sequences', () => {
      assert.equal(renderer.stripAnsi('\x1b[2K\x1b[5B\x1b[3A'), '');
    });

    void it('returns plain text unchanged', () => {
      assert.equal(renderer.stripAnsi('hello world'), 'hello world');
    });

    void it('handles empty string', () => {
      assert.equal(renderer.stripAnsi(''), '');
    });
  });

  void describe('visibleWidth', () => {
    void it('counts visible chars ignoring ANSI', () => {
      assert.equal(renderer.visibleWidth('\x1b[31mhello\x1b[39m'), 5);
    });
  });

  void describe('padLeft', () => {
    void it('pads to target width', () => {
      assert.equal(renderer.padLeft('hi', 5), 'hi   ');
    });

    void it('does not pad if already at width', () => {
      assert.equal(renderer.padLeft('hello', 5), 'hello');
    });
  });

  void describe('truncate', () => {
    void it('truncates with ellipsis', () => {
      assert.equal(renderer.truncate('hello world', 8), 'hello...');
    });

    void it('returns full string if within limit', () => {
      assert.equal(renderer.truncate('hi', 8), 'hi');
    });
  });

  void describe('cursor helpers', () => {
    void it('cursorUp', () => assert.equal(renderer.cursorUp(3), '\x1b[3A'));
    void it('cursorDown', () => assert.equal(renderer.cursorDown(2), '\x1b[2B'));
    void it('cursorLeft', () => assert.equal(renderer.cursorLeft(5), '\x1b[5D'));
    void it('cursorRight', () => assert.equal(renderer.cursorRight(1), '\x1b[1C'));
    void it('cursorPos', () => assert.equal(renderer.cursorPos(3, 5), '\x1b[3;5H'));
    void it('clearLine', () => assert.equal(renderer.clearLine(), '\x1b[2K'));
    void it('clearScreen', () => assert.equal(renderer.clearScreen(), '\x1b[2J'));
    void it('hideCursor', () => assert.equal(renderer.hideCursor(), '\x1b[?25l'));
    void it('showCursor', () => assert.equal(renderer.showCursor(), '\x1b[?25h'));
    void it('saveCursor', () => assert.equal(renderer.saveCursor(), '\x1b[s'));
    void it('restoreCursor', () => assert.equal(renderer.restoreCursor(), '\x1b[u'));
  });

  void describe('color maps', () => {
    void it('fg has expected keys', () => {
      assert.equal(renderer.fg.red, '\x1b[31m');
      assert.equal(renderer.fg.reset, '\x1b[39m');
    });
    void it('bg has expected keys', () => {
      assert.equal(renderer.bg.green, '\x1b[42m');
      assert.equal(renderer.bg.reset, '\x1b[49m');
    });
  });
});

// ── markdown ────────────────────────────────────────────────────────────

const markdown = await import('../src/tui/markdown.js');

void describe('markdown', () => {
  void it('renders h1 as bold+underline', () => {
    const out = markdown.renderMarkdown('# Title');
    assert.ok(out.includes(renderer.bold));
    assert.ok(out.includes(renderer.underline));
    assert.ok(out.includes('Title'));
    assert.ok(out.endsWith(renderer.reset));
  });

  void it('renders h2-h6 as bold only', () => {
    const out = markdown.renderMarkdown('## Sub');
    assert.ok(out.includes(renderer.bold));
    assert.ok(!out.includes(renderer.underline));
    assert.ok(out.includes('Sub'));
  });

  void it('renders bold text', () => {
    const out = markdown.renderMarkdown('**bold**');
    assert.ok(out.includes(renderer.bold));
    assert.ok(out.includes('bold'));
  });

  void it('renders italic text', () => {
    const out = markdown.renderMarkdown('*italic*');
    assert.ok(out.includes(renderer.italic));
    assert.ok(out.includes('italic'));
  });

  void it('renders inline code', () => {
    const out = markdown.renderMarkdown('use `code` here');
    assert.ok(out.includes(renderer.bg.yellow));
    assert.ok(out.includes('code'));
  });

  void it('renders unordered list', () => {
    const out = markdown.renderMarkdown('- item');
    assert.ok(out.includes(renderer.fg.green));
    assert.ok(out.includes('•'));
    assert.ok(out.includes('item'));
  });

  void it('renders ordered list', () => {
    const out = markdown.renderMarkdown('1. first');
    assert.ok(out.includes(renderer.fg.green));
    assert.ok(out.includes('1.'));
    assert.ok(out.includes('first'));
  });

  void it('renders task list unchecked', () => {
    const out = markdown.renderMarkdown('- [ ] todo');
    assert.ok(out.includes(renderer.fg.gray));
    assert.ok(out.includes('○'));
  });

  void it('renders task list checked', () => {
    const out = markdown.renderMarkdown('- [x] done');
    assert.ok(out.includes(renderer.fg.green));
    assert.ok(out.includes('✓'));
  });

  void it('renders blockquote', () => {
    const out = markdown.renderMarkdown('> quote');
    assert.ok(out.includes(renderer.fg.cyan));
    assert.ok(out.includes('│'));
    assert.ok(out.includes('quote'));
  });

  void it('renders thematic break', () => {
    const out = markdown.renderMarkdown('---');
    assert.ok(out.includes(renderer.fg.gray));
    assert.ok(out.includes('─'));
  });

  void it('renders link as underlined blue text', () => {
    const out = markdown.renderMarkdown('[text](url)');
    assert.ok(out.includes(renderer.underline));
    assert.ok(out.includes(renderer.fg.blue));
    assert.ok(out.includes('text'));
    assert.ok(!out.includes('url')); // url stripped
  });

  void it('renders image placeholder', () => {
    const out = markdown.renderMarkdown('![alt](img.png)');
    assert.ok(out.includes(renderer.fg.magenta));
    assert.ok(out.includes('[img: alt]'));
  });

  void it('renders code block with fence', () => {
    const out = markdown.renderMarkdown('```js\nconst x = 1\n```');
    assert.ok(out.includes('```'));
    assert.ok(out.includes('const'));
  });

  void it('renders strikethrough', () => {
    const out = markdown.renderMarkdown('~~strike~~');
    assert.ok(out.includes(renderer.dim));
    assert.ok(out.includes('strike'));
  });

  void it('renders table row', () => {
    const out = markdown.renderMarkdown('| a | b |');
    assert.ok(out.includes('a'));
    assert.ok(out.includes('b'));
    assert.ok(out.includes('|'));
  });

  void it('renders table separator', () => {
    const out = markdown.renderMarkdown('| --- | --- |');
    assert.ok(out.includes(renderer.fg.gray));
    assert.ok(out.includes('─'));
  });

  void it('handles empty string', () => {
    assert.equal(markdown.renderMarkdown(''), '');
  });
});

// ── input ───────────────────────────────────────────────────────────────

const input = await import('../src/tui/input.js');

void describe('input', () => {
  void describe('createInputState', () => {
    void it('creates default state', () => {
      const s = input.createInputState();
      assert.deepEqual(s.lines, ['']);
      assert.equal(s.cursorLine, 0);
      assert.equal(s.cursorCol, 0);
      assert.deepEqual(s.history, []);
      assert.equal(s.historyIdx, -1);
    });
  });

  void describe('processKey', () => {
    void it('recognizes printable char', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('a', s), { type: 'char', char: 'a' });
    });

    void it('recognizes Enter on empty last line as send', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\n', s), { type: 'send' });
    });

    void it('recognizes Enter on non-empty last line as enter', () => {
      const s = input.createInputState();
      s.lines = ['hello'];
      s.cursorLine = 0;
      s.cursorCol = 5;
      assert.deepEqual(input.processKey('\n', s), { type: 'enter' });
    });

    void it('recognizes Ctrl+C as cancel', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x03', s), { type: 'cancel' });
    });

    void it('recognizes Ctrl+D as exit', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x04', s), { type: 'exit' });
    });

    void it('recognizes Ctrl+L as ctrl_l', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x0c', s), { type: 'ctrl_l' });
    });

    void it('recognizes Ctrl+P as ctrl_p', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x10', s), { type: 'ctrl_p' });
    });

    void it('recognizes Ctrl+Q as interrupt', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x11', s), { type: 'interrupt' });
    });

    void it('recognizes Ctrl+S as send', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x13', s), { type: 'send' });
    });

    void it('recognizes Tab', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\t', s), { type: 'tab' });
    });

    void it('recognizes Backspace', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x7f', s), { type: 'backspace' });
    });

    void it('recognizes arrow keys', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[A', s), { type: 'up' });
      assert.deepEqual(input.processKey('\x1b[B', s), { type: 'down' });
      assert.deepEqual(input.processKey('\x1b[C', s), { type: 'right' });
      assert.deepEqual(input.processKey('\x1b[D', s), { type: 'left' });
    });

    void it('recognizes Home/End CSI', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[H', s), { type: 'home' });
      assert.deepEqual(input.processKey('\x1b[F', s), { type: 'end' });
    });

    void it('recognizes Home/End SS3', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1bOH', s), { type: 'home' });
      assert.deepEqual(input.processKey('\x1bOF', s), { type: 'end' });
    });

    void it('recognizes Delete', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[3~', s), { type: 'delete' });
    });

    void it('recognizes Shift+Enter', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[20~', s), { type: 'enter' });
    });

    void it('recognizes Alt+Enter as send', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[13;3u', s), { type: 'send' });
    });

    void it('recognizes Ctrl+Enter as send', () => {
      const s = input.createInputState();
      assert.deepEqual(input.processKey('\x1b[13;5u', s), { type: 'send' });
    });

    void it('returns null for unknown sequences', () => {
      const s = input.createInputState();
      assert.equal(input.processKey('\x1b[Z', s), null);
    });

    void it('returns null for lone escape', () => {
      const s = input.createInputState();
      assert.equal(input.processKey('\x1b', s), null);
    });
  });

  void describe('applyAction', () => {
    void it('inserts char at cursor', () => {
      const s = input.createInputState();
      const r = input.applyAction(s, { type: 'char', char: 'x' });
      assert.equal(r.lines[0], 'x');
      assert.equal(r.cursorCol, 1);
    });

    void it('inserts char in middle of line', () => {
      const s = input.createInputState();
      s.lines = ['ab'];
      s.cursorCol = 1;
      const r = input.applyAction(s, { type: 'char', char: 'X' });
      assert.equal(r.lines[0], 'aXb');
      assert.equal(r.cursorCol, 2);
    });

    void it('enter splits line', () => {
      const s = input.createInputState();
      s.lines = ['abc'];
      s.cursorCol = 1;
      const r = input.applyAction(s, { type: 'enter' });
      assert.deepEqual(r.lines, ['a', 'bc']);
      assert.equal(r.cursorLine, 1);
      assert.equal(r.cursorCol, 0);
    });

    void it('backspace removes char before cursor', () => {
      const s = input.createInputState();
      s.lines = ['ab'];
      s.cursorCol = 2;
      const r = input.applyAction(s, { type: 'backspace' });
      assert.equal(r.lines[0], 'a');
      assert.equal(r.cursorCol, 1);
    });

    void it('backspace joins lines at start', () => {
      const s = input.createInputState();
      s.lines = ['a', 'bc'];
      s.cursorLine = 1;
      s.cursorCol = 0;
      const r = input.applyAction(s, { type: 'backspace' });
      assert.deepEqual(r.lines, ['abc']);
      assert.equal(r.cursorLine, 0);
      assert.equal(r.cursorCol, 1);
    });

    void it('delete removes char at cursor', () => {
      const s = input.createInputState();
      s.lines = ['ab'];
      s.cursorCol = 0;
      const r = input.applyAction(s, { type: 'delete' });
      assert.equal(r.lines[0], 'b');
    });

    void it('delete joins with next line at end', () => {
      const s = input.createInputState();
      s.lines = ['a', 'bc'];
      s.cursorLine = 0;
      s.cursorCol = 1;
      const r = input.applyAction(s, { type: 'delete' });
      assert.deepEqual(r.lines, ['abc']);
    });

    void it('left moves cursor', () => {
      const s = input.createInputState();
      s.lines = ['ab'];
      s.cursorCol = 1;
      const r = input.applyAction(s, { type: 'left' });
      assert.equal(r.cursorCol, 0);
    });

    void it('left wraps to previous line', () => {
      const s = input.createInputState();
      s.lines = ['a', 'bc'];
      s.cursorLine = 1;
      s.cursorCol = 0;
      const r = input.applyAction(s, { type: 'left' });
      assert.equal(r.cursorLine, 0);
      assert.equal(r.cursorCol, 1);
    });

    void it('right moves cursor', () => {
      const s = input.createInputState();
      s.lines = ['ab'];
      s.cursorCol = 0;
      const r = input.applyAction(s, { type: 'right' });
      assert.equal(r.cursorCol, 1);
    });

    void it('right wraps to next line', () => {
      const s = input.createInputState();
      s.lines = ['a', 'bc'];
      s.cursorLine = 0;
      s.cursorCol = 1;
      const r = input.applyAction(s, { type: 'right' });
      assert.equal(r.cursorLine, 1);
      assert.equal(r.cursorCol, 0);
    });

    void it('home moves to column 0', () => {
      const s = input.createInputState();
      s.cursorCol = 5;
      const r = input.applyAction(s, { type: 'home' });
      assert.equal(r.cursorCol, 0);
    });

    void it('end moves to end of line', () => {
      const s = input.createInputState();
      s.lines = ['hello'];
      s.cursorCol = 0;
      const r = input.applyAction(s, { type: 'end' });
      assert.equal(r.cursorCol, 5);
    });

    void it('tab inserts 2 spaces', () => {
      const s = input.createInputState();
      const r = input.applyAction(s, { type: 'tab' });
      assert.equal(r.lines[0], '  ');
      assert.equal(r.cursorCol, 2);
    });

    void it('cancel clears input', () => {
      const s = input.createInputState();
      s.lines = ['hello'];
      s.cursorCol = 3;
      const r = input.applyAction(s, { type: 'cancel' });
      assert.deepEqual(r.lines, ['']);
      assert.equal(r.cursorCol, 0);
    });

    void it('send does not mutate state', () => {
      const s = input.createInputState();
      s.lines = ['hello'];
      const r = input.applyAction(s, { type: 'send' });
      assert.deepEqual(r.lines, ['hello']);
    });

    void it('up navigates history', () => {
      const s = input.createInputState();
      s.history = ['prev msg'];
      const r = input.applyAction(s, { type: 'up' });
      assert.equal(r.historyIdx, 0);
      assert.equal(r.lines[0], 'prev msg');
    });

    void it('down exits history back to blank', () => {
      const s = input.createInputState();
      s.history = ['prev msg'];
      s.historyIdx = 0;
      s.lines = ['prev msg'];
      const r = input.applyAction(s, { type: 'down' });
      assert.equal(r.historyIdx, -1);
      assert.deepEqual(r.lines, ['']);
    });
  });

  void describe('getInputText', () => {
    void it('joins lines with newline', () => {
      const s = input.createInputState();
      s.lines = ['hello', 'world'];
      assert.equal(input.getInputText(s), 'hello\nworld');
    });
  });

  void describe('commitToHistory', () => {
    void it('adds text to history and resets', () => {
      const s = input.createInputState();
      s.lines = ['my message'];
      const r = input.commitToHistory(s);
      assert.deepEqual(r.history, ['my message']);
      assert.deepEqual(r.lines, ['']);
    });

    void it('skips empty input', () => {
      const s = input.createInputState();
      const r = input.commitToHistory(s);
      assert.deepEqual(r.history, []);
    });

    void it('caps history at 100', () => {
      const s = input.createInputState();
      s.history = Array.from({ length: 100 }, (_, i) => `msg${i}`);
      s.lines = ['new msg'];
      const r = input.commitToHistory(s);
      assert.equal(r.history.length, 100);
      assert.equal(r.history[0], 'new msg');
    });
  });
});
