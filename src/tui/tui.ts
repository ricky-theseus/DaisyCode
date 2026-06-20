// ponytail: event-driven, no polling, no frameworks
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import {
  cursorPos, clearLine, clearScreen, hideCursor, showCursor,
  scrollRegion, resetScrollRegion, fg, bg, bold, reset,
  getTermSize, padLeft,
} from './renderer.js';
import { renderMarkdown } from './markdown.js';
import { createInputState, processKey, applyAction, commitToHistory, getInputText } from './input.js';
import { renderStatusBar, type StatusBarState } from './statusbar.js';
import { renderSidebar, type SidebarState, type SessionSummary } from './sidebar.js';

export interface TUIConfig {
  agentName: string;
  modelName: string;
  sessionId: string;
  onSend: (input: string) => AsyncIterable<unknown>;
  onSwitchSession: (sessionId: string) => void;
  onExit: () => void;
}

const SIDEBAR_WIDTH = 20;
const INPUT_MIN_HEIGHT = 3;
const INPUT_MAX_HEIGHT = 5;
const STATUS_BAR_HEIGHT = 1;
const RESIZE_DEBOUNCE_MS = 100;

export class TUI {
  private config: TUIConfig;
  private running = false;
  private inputState = createInputState();
  private statusState: StatusBarState;
  private sidebarState: SidebarState;
  private conversationLines: string[] = [];
  private conversationScroll = 0; // scroll offset in lines
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelCount = 0;
  private cancelTimer: ReturnType<typeof setTimeout> | null = null;
  private onData: ((data: Buffer) => void) | null = null;
  private onResize: (() => void) | null = null;
  private onExit: (() => void) | null = null;

  // Layout cache
  private rows = 0;
  private cols = 0;
  private sidebarW = 0;
  private convTop = 0;
  private convBottom = 0;
  private convHeight = 0;
  private inputTop = 0;
  private inputHeight = 0;

  constructor(config: TUIConfig) {
    this.config = config;
    this.statusState = {
      agentName: config.agentName,
      modelName: config.modelName,
      promptTokens: 0,
      completionTokens: 0,
      sessionId: config.sessionId,
      status: 'idle',
    };
    this.sidebarState = {
      visible: true,
      sessions: [{ id: config.sessionId, label: 'Current', preview: '', active: true }],
      activeIdx: 0,
      width: SIDEBAR_WIDTH,
    };
  }

  start(): void {
    if (this.running) return;
    // ponytail: non-TTY → no TUI, caller should fall back to REPL
    if (!stdin.isTTY) return;
    this.running = true;
    this.cancelCount = 0;

    // Enter raw mode
    stdin.setRawMode(true);
    stdin.resume();

    // Initial layout
    this.recalcLayout();
    this.renderFull();

    // Listen for data
    this.onData = (data: Buffer) => this.handleInput(data.toString());
    stdin.on('data', this.onData);

    // Listen for resize
    this.onResize = () => this.handleResize();
    stdout.on('resize', this.onResize);

    // Cleanup on exit
    this.onExit = () => this.stop();
    process.on('exit', this.onExit);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.onData) {
      stdin.off('data', this.onData);
      this.onData = null;
    }
    if (this.onResize) {
      stdout.off('resize', this.onResize);
      this.onResize = null;
    }
    if (this.onExit) {
      process.off('exit', this.onExit);
      this.onExit = null;
    }

    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdin.pause();

    // Restore terminal
    stdout.write(resetScrollRegion());
    stdout.write(showCursor());
    stdout.write('\n');
  }

  appendMessage(text: string): void {
    const rendered = renderMarkdown(text);
    const lines = rendered.split('\n');
    this.conversationLines.push(...lines);
    this.conversationScroll = 0; // auto-scroll to bottom
    this.renderConversation();
    this.renderInput();
  }

  streamToken(token: string): void {
    // ponytail: append to last conversation line or add new
    const rendered = renderMarkdown(token);
    // Remove newlines from token for streaming (they'll be handled by appendMessage for full messages)
    if (this.conversationLines.length === 0) {
      this.conversationLines.push(rendered);
    } else {
      const lastIdx = this.conversationLines.length - 1;
      this.conversationLines[lastIdx] += rendered;
    }
    this.conversationScroll = 0;
    this.renderConversation();
    this.renderInput();
  }

  updateStatus(partial: Partial<StatusBarState>): void {
    Object.assign(this.statusState, partial);
    this.renderStatusBar();
  }

  refreshSessions(sessions: SessionSummary[]): void {
    this.sidebarState.sessions = sessions;
    this.renderSidebar();
  }

  // ─── Layout ───────────────────────────────────────────────

  private recalcLayout(): void {
    const { rows, cols } = getTermSize();
    this.rows = rows;
    this.cols = cols;

    this.sidebarW = (this.sidebarState.visible && cols >= 80) ? SIDEBAR_WIDTH : 0;
    this.inputHeight = Math.min(INPUT_MAX_HEIGHT, Math.max(INPUT_MIN_HEIGHT, this.inputState.lines.length + 2));
    this.convTop = STATUS_BAR_HEIGHT + 1; // +1 for separator
    this.convBottom = rows - this.inputHeight - 1; // -1 for separator
    this.convHeight = this.convBottom - this.convTop;
    this.inputTop = this.convBottom + 1; // after separator
  }

  // ─── Full Render ──────────────────────────────────────────

  private renderFull(): void {
    stdout.write(hideCursor());
    stdout.write(clearScreen());
    stdout.write(cursorPos(1, 1));
    this.renderStatusBar();
    this.renderConversation();
    this.renderInput();
    stdout.write(showCursor());
  }

  // ─── Status Bar ───────────────────────────────────────────

  private renderStatusBar(): void {
    stdout.write(cursorPos(1, 1));
    stdout.write(renderStatusBar(this.statusState, this.cols));
    stdout.write(cursorPos(2, 1));
    // Separator
    stdout.write(`${fg.gray}${'─'.repeat(this.cols)}${reset}`);
  }

  // ─── Sidebar ──────────────────────────────────────────────

  private renderSidebar(): void {
    if (this.sidebarW === 0) return;
    const lines = renderSidebar(this.sidebarState, this.convHeight);
    for (let i = 0; i < lines.length; i++) {
      const row = this.convTop + i;
      stdout.write(cursorPos(row, 1));
      stdout.write(lines[i]);
    }
  }

  // ─── Conversation ─────────────────────────────────────────

  private renderConversation(): void {
    const sidebarW = this.sidebarW;
    const convWidth = this.cols - sidebarW;
    const visibleLines = this.conversationLines.slice(
      Math.max(0, this.conversationLines.length - this.convHeight - this.conversationScroll),
      this.conversationLines.length - this.conversationScroll
    );

    for (let i = 0; i < this.convHeight; i++) {
      const row = this.convTop + i;
      stdout.write(cursorPos(row, sidebarW + 1));

      if (i < visibleLines.length) {
        const line = visibleLines[i];
        stdout.write(padLeft(line, convWidth));
      } else {
        stdout.write(clearLine());
      }
    }
  }

  // ─── Input ────────────────────────────────────────────────

  private renderInput(): void {
    const sidebarW = this.sidebarW;
    const convWidth = this.cols - sidebarW;

    // Separator above input
    stdout.write(cursorPos(this.inputTop - 1, 1));
    stdout.write(`${fg.gray}${'─'.repeat(this.cols)}${reset}`);

    // Input lines
    const lines = this.inputState.lines;
    const visibleLines = Math.min(lines.length, this.inputHeight);

    for (let i = 0; i < this.inputHeight; i++) {
      const row = this.inputTop + i;
      stdout.write(cursorPos(row, sidebarW + 1));

      if (i < visibleLines) {
        const prefix = i === 0 ? `${fg.green}>${reset} ` : '  ';
        stdout.write(prefix + lines[i]);
        // Clear rest of line
        const usedWidth = 2 + lines[i].length;
        if (usedWidth < convWidth) {
          stdout.write(' '.repeat(convWidth - usedWidth));
        }
      } else {
        stdout.write(clearLine());
      }
    }

    // Help bar at bottom
    const helpRow = this.inputTop + this.inputHeight;
    if (helpRow <= this.rows) {
      stdout.write(cursorPos(helpRow, 1));
      stdout.write(`${fg.gray}/help  @agent  Ctrl+S send  Ctrl+Q cancel  Ctrl+P sidebar${reset}`);
      stdout.write(clearLine());
    }

    // Position cursor
    const cursorRow = this.inputTop + Math.min(this.inputState.cursorLine, this.inputHeight - 1);
    const cursorCol = sidebarW + 2 + this.inputState.cursorCol;
    stdout.write(cursorPos(cursorRow, cursorCol + 1));
  }

  // ─── Input Handling ───────────────────────────────────────

  private handleInput(data: string): void {
    if (!this.running) return;

    const action = processKey(data, this.inputState);

    if (!action) return;

    switch (action.type) {
      case 'cancel': {
        this.cancelCount++;
        if (this.cancelCount >= 2) {
          // Double Ctrl+C → exit
          this.config.onExit();
          return;
        }
        // Reset cancel count after 500ms
        if (this.cancelTimer) clearTimeout(this.cancelTimer);
        this.cancelTimer = setTimeout(() => { this.cancelCount = 0; }, 500);

        this.inputState = applyAction(this.inputState, action);
        this.renderInput();
        break;
      }

      case 'exit': {
        this.config.onExit();
        return;
      }

      case 'interrupt': {
        // Interrupt agent execution — handled by caller via AbortController
        this.updateStatus({ status: 'idle' });
        this.appendMessage(`${fg.yellow}⏹ Interrupted${reset}`);
        break;
      }

      case 'send': {
        const text = getInputText(this.inputState);
        if (text.trim() === '') break;
        this.inputState = commitToHistory(this.inputState);
        this.appendMessage(`${fg.green}>${reset} ${text}`);
        this.updateStatus({ status: 'streaming' });
        this.renderInput();
        this.emitSend(text);
        break;
      }

      case 'ctrl_l': {
        // Clear conversation display (not history)
        this.conversationLines = [];
        this.renderFull();
        break;
      }

      case 'ctrl_p': {
        this.sidebarState.visible = !this.sidebarState.visible;
        this.recalcLayout();
        this.renderFull();
        break;
      }

      default: {
        this.inputState = applyAction(this.inputState, action);
        this.renderInput();
        break;
      }
    }
  }

  private async emitSend(input: string): Promise<void> {
    try {
      const events = this.config.onSend(input);
      for await (const _event of events) {
        // ponytail: caller handles streaming via appendMessage/streamToken
        // We just need to consume the iterable
      }
    } catch (err) {
      this.appendMessage(`${fg.red}Error: ${err instanceof Error ? err.message : String(err)}${reset}`);
    } finally {
      this.updateStatus({ status: 'idle' });
    }
  }

  // ─── Resize ───────────────────────────────────────────────

  private handleResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      this.recalcLayout();
      this.renderFull();
    }, RESIZE_DEBOUNCE_MS);
  }
}
