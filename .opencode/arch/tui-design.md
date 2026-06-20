# DaisyCode TUI Design Document

**Version**: v2.0
**Status**: Approved
**Date**: 2026-06-20
**Author**: Architecture Agent

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Position](#2-architecture-position)
3. [Color System](#3-color-system)
4. [Layout](#4-layout)
5. [SplashScreen](#5-splashscreen)
6. [StatusBar](#6-statusbar)
7. [Conversation](#7-conversation)
8. [InputBox](#8-inputbox)
9. [Keybind System](#9-keybind-system)
10. [Theme System](#10-theme-system)
11. [Component Tree](#11-component-tree)
12. [Flow](#12-flow)
13. [IPC Bridge](#13-ipc-bridge)
14. [Installation](#14-installation)
15. [Implementation Plan](#15-implementation-plan)
16. [Decision Log](#16-decision-log)
17. [Comparison with v1](#17-comparison-with-v1)

---

## 1. Overview

DaisyCode TUI is a **terminal user interface** delivered as the npm package `daisycode-tui`. It renders via Ink (React for Terminal) and communicates with the DaisyCode kernel via IPC/stdio.

### 1.1 Core Goals

| Goal | Description |
|------|-------------|
| **Decoupled** | Independent process communicating via IPC, can be developed/deployed separately |
| **Distinctive** | Cyberpunk visual identity with high brand recognition |
| **Minimal** | No sidebar, no panels — just `/sessions` for session switching |
| **Customizable** | JSON theme files, 24-bit true color |

### 1.2 Relationship with OpenCode TUI

| Dimension | OpenCode | DaisyCode v2 | Rationale |
|-----------|----------|-------------|-----------|
| Render engine | Ink | Ink | Same |
| Layout | Sidebar + panels + conversation | Minimal, no sidebar | Boss decided to remove sidebar |
| Color scheme | Blue tones | Cyberpunk purple/cyan | Brand differentiation |
| Splash | None | Logo splash screen | Brand showcase |
| Package structure | Monolithic | Separate npm package `daisycode-tui` | Decoupled |

---

## 2. Architecture Position

```
+----------------------------------------------------------------------+
|                    DaisyCode Kernel (daisycode)                       |
|  +----------+  +----------+  +----------+  +----------------------+  |
|  | Agent    |  | MCP      |  | Session  |  | REPL (src/tui/)     |  |
|  | Loop     |  | Client   |  | Manager  |  | ANSI fallback       |  |
|  +----------+  +----------+  +----------+  +----------------------+  |
|                          |                                           |
|                    IPC/stdio (JSON lines)                            |
|                          |                                           |
|  +----------------------------------------------------------------+  |
|  |              daisycode-tui (Ink process)                        |  |
|  |  +----------+ +--------+ +------+ +--------+ +-------+ +-----+ |  |
|  |  | Splash   | | Status | | Conv | | Input  | | Theme | | IPC  | |  |
|  |  | Screen   | | Bar    | |      | | Box    | | System| |Bridge| |  |
|  |  +----------+ +--------+ +------+ +--------+ +-------+ +-----+ |  |
|  +----------------------------------------------------------------+  |
+----------------------------------------------------------------------+
```

- **Kernel** (daisycode): Agent loop, MCP client, session manager. Has `src/tui/` as ANSI fallback
- **TUI package** (daisycode-tui): Standalone Node.js process running Ink app, communicates via stdin/stdout
- **IPC Protocol**: JSON lines format (one JSON object per line)

---

## 3. Color System

### 3.1 Cyberpunk Palette

| Token | HEX | Usage |
|-------|-----|-------|
| bg | #0a0014 | Background — deep purple |
| primary | #00ffcc | Primary — cyan: Logo, active borders |
| secondary | #b347ea | Secondary — purple: secondary elements |
| accent | #ff00aa | Accent — pink: alerts, actions |

### 3.2 Text Colors

| Token | HEX | Usage |
|-------|-----|-------|
| text | #e0e0e0 | Primary text |
| textMuted | #666666 | Secondary text |
| textDim | #444444 | Dim text (separators) |
| success | #00ffcc | Success/active |
| warning | #ffcc00 | Warning |
| error | #ff00aa | Error/alert |
| info | #b347ea | Info |
| border | #1a1a2e | Border |
| borderActive | #00ffcc | Active border |
| codeBg | #0d001a | Code block background |
| selection | #1a0033 | Selection background |

### 3.3 Syntax Highlighting

| Token | HEX |
|-------|-----|
| syntaxKeyword | #ff00aa (pink) |
| syntaxFunction | #00ffcc (cyan) |
| syntaxVariable | #e0e0e0 (white) |
| syntaxString | #b347ea (purple) |
| syntaxNumber | #ffcc00 (yellow) |
| syntaxComment | #444444 (dim) |
| syntaxOperator | #00ffcc (cyan) |

---

## 4. Layout

### 4.1 Screen Layout

No sidebar. Minimal layout with splash:

```
Splash Mode:
+--------------------------------------------------------------------+
|                                                                    |
|                    [ DaisyCode Logo ]                              |
|                                                                    |
|              +----------------------------------------------+      |
|              |  ? Type your question, or /help for help      |      |
|              +----------------------------------------------+      |
+--------------------------------------------------------------------+

Conversation Mode:
+--------------------------------------------------------------------+
|  DaisyCode     build | deepseek-chat              1.2k tokens      |  <- StatusBar
+--------------------------------------------------------------------+
| > /help                                                           |
|                                                                   |  <- Conversation
| Commands:                                                          |
|   /sessions  - session list                                        |
|   /new       - new session                                         |
|   /help      - show help                                           |
|                                                                   |
| +----------------------------------------------------------------+ |
| | ? Type your question, or /help for help                       | |  <- InputBox
| +----------------------------------------------------------------+ |
+--------------------------------------------------------------------+
```

### 4.2 Row Distribution

| Area | Rows | Description |
|------|------|-------------|
| StatusBar | 1 row | Visible in conversation mode |
| Separator | 1 row | Below StatusBar in conversation mode |
| Conversation | N-5 rows | Scrollable |
| InputBox | 3 rows | Rounded box, min 3 rows, max 8 rows |
| **Overlay** | Full screen | Help info overlays TUI |

### 4.3 Size Constraints

| Parameter | Value |
|-----------|-------|
| Minimum terminal width | 60 chars |
| Recommended terminal width | 100+ chars |
| Input box minimum height | 3 rows |
| Input box maximum height | 8 rows |
| Splash disappear time | After user sends first message |
| StatusBar mode | Persistent after kernel ready |

---

## 5. SplashScreen

### 5.1 Behavior

1. Full screen display on app start
2. User sends first message → fade transition to conversation mode
3. Each new session shows splash, disappears after first message

### 5.2 Logo ASCII

```
                              +-------+   +-------+   +---+   +-----------+   +---+   +---+
                              | D     |   | A     |   | I |   | S     Y   |   | C |   | O |
                              |   D   |   |   A   |   | I |   |   S   Y   |   |   C   |   O   |
                              |     D |   |     A |   | I |   |     S Y   |   | C     |     O |
                              +-------+   +-------+   +---+   +-----------+   +---+   +---+
```

- Logo rendered in primary (#00ffcc) cyan color
- Vertically centered in terminal
- Horizontally centered in terminal

### 5.3 Input Box

```
  +--------------------------------------------------------------------+
  |  ? Type your question, or /help for help                            |
  +--------------------------------------------------------------------+
```

- Rounded corners (`+` borders) using primary color
- Centered horizontally, width = 60% of terminal width
- `?` icon in primary color
- Text in text color
- `?` icon blinks

### 5.4 Props

| Prop | Type | Description |
|------|------|-------------|
| visible | boolean | Whether to show splash |
| onSubmit | (text: string) => void | Callback when user submits |
| prompt | string | Placeholder text for input |

---

## 6. StatusBar

### 6.1 Layout

```
  DaisyCode              build | deepseek-chat          1.2k tokens
+--------------------------------------------------------------------+
```

| Element | Position | Color |
|---------|----------|-------|
| DaisyCode | Left | Brand dot (#00ffcc) + app name |
| build | deepseek-chat | Center | Agent mode | current model |
| 1.2k tokens | Right | Token count |
| Separator | Below StatusBar | textDim color, full terminal width |

### 6.2 Props

| Prop | Type | Description |
|------|------|-------------|
| agent | string | Current agent name (e.g. build) |
| model | string | Model name (e.g. deepseek-chat) |
| tokens | number | Current session token count |
| status | 'idle' | 'stream' | 'think' | 'error' | Agent status |

### 6.3 Status Indicator

| Status | Dot Color | Description |
|--------|-----------|-------------|
| idle | #00ffcc (green) | Waiting for input |
| stream | #00ffcc (green, blinking) | Generating response |
| think | #b347ea (purple, blinking) | Model thinking |
| error | #ff00aa (pink) | Error/alert |

---

## 7. Conversation

### 7.1 Message Model

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  status?: 'sending' | 'streaming' | 'done' | 'error'
}
```

### 7.2 Rendering Rules

| Element | Rendering |
|---------|-----------|
| User messages | Right-aligned with prefix, text color |
| AI responses | Markdown rendered: code blocks, lists, bold, etc. |
| Code blocks | Dark background (codeBg), syntax highlighted keywords |
| Tool calls | Collapsed by default, expandable |
| Streaming response | Inline rendering, blinking cursor at end |
| Separator | Between messages, textDim color thin line |

### 7.3 Scrolling

- Auto-scroll to latest message
- Pause auto-scroll when user scrolls up
- PageUp/PageDown for page scroll
- Scroll to bottom resumes auto-scroll

### 7.4 Props

| Prop | Type | Description |
|------|------|-------------|
| messages | Message[] | Message list |
| isStreaming | boolean | Whether streaming is active |

---

## 8. InputBox

### 8.1 Appearance (Conversation Mode)

```
+--------------------------------------------------------------------+
| ? /help                                                             |
+--------------------------------------------------------------------+
```

- Rounded corners with border color
- Active border when focused (borderActive color)
- `?` icon in primary color
- Supports multi-line
- Bottom shows key hints:

```
+--------------------------------------------------------------------+
| ? Type your question                                                |
|                                                                     |
| tab=agent  ctrl+x=leader  ctrl+l=sessions  ctrl+p=command  Enter=send |
+--------------------------------------------------------------------+
```

### 8.2 Props

| Prop | Type | Description |
|------|------|-------------|
| onSubmit | (text: string) => void | Submit message |
| onCancel | () => void | Cancel/interrupt |
| disabled | boolean | Disabled when streaming |
| placeholder | string | Placeholder text |

### 8.3 Input Behavior

| Action | Behavior |
|--------|----------|
| Enter | Submit message (empty = no-op, non-empty = send) |
| Shift+Enter | Force newline |
| Ctrl+C | Empty input = exit; non-empty = interrupt |
| Auto-expand | Height grows with content, max 8 rows |

---

## 9. Keybind System

### 9.1 Global Keybinds

| Key | Action | Description |
|-----|--------|-------------|
| Tab | Switch Agent | Cycle through agents |
| Ctrl+X | Leader Mode | Enter leader mode, wait for command |
| Ctrl+L | Session List | Execute /sessions |
| Ctrl+P | Command Palette | Open command palette |
| Ctrl+C | Exit | Confirm and exit TUI |

### 9.2 Leader Mode

Press Ctrl+X to enter Leader Mode. StatusBar shows `leader:` prompt. Timeout 2 seconds.

| Key | Action |
|-----|--------|
| s | Session list |
| n | New session |
| q | Exit |
| h | Show keybind help |

Leader times out after 2 seconds, auto-exits leader mode.

### 9.3 Input Editing Keybinds

| Key | Action |
|-----|--------|
| Ctrl+U | Delete to start of line |
| Ctrl+K | Delete to end of line |
| Ctrl+W | Delete previous word |
| Ctrl+A / Ctrl+E | Start / End of line |
| Alt+B / Alt+F | Previous/next word |
| Ctrl+L | Clear screen |

### 9.4 Conversation Navigation Keybinds

| Key | Action |
|-----|--------|
| PageUp / PageDown | Scroll conversation |
| Home / End | First/last message |
| Up / Down | Scroll line by line |

---

## 10. Theme System

### 10.1 Theme Definition

Themes are JSON files stored in `~/.config/daisycode/themes/`:

```json
{
  "name": "cyberpunk",
  "colors": {
    "bg": "#0a0014",
    "primary": "#00ffcc",
    "secondary": "#b347ea",
    "accent": "#ff00aa",
    "text": "#e0e0e0",
    "textMuted": "#666666",
    "textDim": "#444444",
    "success": "#00ffcc",
    "warning": "#ffcc00",
    "error": "#ff00aa",
    "info": "#b347ea",
    "border": "#1a1a2e",
    "borderActive": "#00ffcc",
    "codeBg": "#0d001a",
    "selection": "#1a0033"
  },
  "syntax": {
    "keyword": "#ff00aa",
    "function": "#00ffcc",
    "variable": "#e0e0e0",
    "string": "#b347ea",
    "number": "#ffcc00",
    "comment": "#444444",
    "operator": "#00ffcc"
  }
}
```

### 10.2 Built-in Themes

| Theme | Description |
|-------|-------------|
| cyberpunk | Default — deep purple + cyan |
| tokyonight | Port of Tokyo Night color scheme |
| catppuccin | Port of Catppuccin Mocha |

### 10.3 Switching

- CLI: `daisy --theme tokyonight`
- Runtime: `/themes` command to switch

---

## 11. Component Tree

```
<App>
  <SplashScreen>          // Full screen when visible
    <Logo />
    <SplashInput />       // Centered input
  </SplashScreen>

  <StatusBar />           // Fixed top (hidden in splash mode)

  <Conversation>          // Scrollable conversation
    <Message />           // Each message
      <Markdown />
      <CodeBlock />       // Code block + syntax highlight
    ...
  </Conversation>

  <InputBox />            // Bottom input
    <Prompt />

  <ThemeProvider />       // Wraps App, provides theme context
```

### 11.1 File Structure

```
packages/tui/
  package.json
  tsconfig.json
  README.md
  src/
    index.tsx            // Entry: Ink render <App />
    App.tsx              // App root: route Splash/Conversation
    components/
      Splash.tsx         // Splash screen
      StatusBar.tsx      // Status bar
      Conversation.tsx   // Conversation area
      InputBox.tsx       // Input box
      Help.tsx           // Help overlay
    theme.ts             // Cyberpunk theme constants
    use-ipc.ts           // IPC bridge hook
    keybind.ts           // Keybind configuration
```

---

## 12. Flow

### 12.1 Startup Flow

```
User runs daisycode-tui
        |
        v
IPC Bridge spawns DaisyCode kernel (child_process.spawn)
        |
        v
Kernel responds -> ready event
        |
        v
TUI shows splash (SplashScreen)
        |
        v
User submits message -> IPC -> kernel processes -> IPC -> TUI renders
```

### 12.2 IPC Protocol

Communication between kernel and TUI via stdin/stdout using JSON lines.

**TUI -> Kernel (stdin):**

```json
{"type": "submit",   "content": "user message"}
{"type": "interrupt", ""}
{"type": "command",  "command": "/sessions"}
{"type": "heartbeat", ""}
```

**Kernel -> TUI (stdout):**

```json
{"type": "ready",     "version": "1.0.0"}
{"type": "message",   "role": "assistant", "content": "...", "done": false}
{"type": "message",   "role": "assistant", "content": "...", "done": true}
{"type": "status",    "agent": "build", "model": "deepseek-chat", "tokens": 1200}
{"type": "error",     "message": "API key not configured"}
{"type": "exit",      "code": 0}
```

### 12.3 Render Loop

```
User input (keyboard)
    |
    v
Ink event -> useKeybinds hook -> InputBox.onSubmit
    |
    v
IPC Bridge.send({ type: 'submit', content })
    |
    v
Kernel processes -> sends response
    |
    v
IPC Bridge.onMessage -> React state update -> Ink re-render
```

---

## 13. IPC Bridge

### 13.1 Bridge Implementation

```typescript
// packages/tui/src/use-ipc.ts

class IpcBridge {
  private kernel: ChildProcess | null = null
  private buffer = ''
  private onMessage: (msg: KernelMessage) => void

  constructor(onMessage: (msg: KernelMessage) => void) {
    this.onMessage = onMessage
  }

  // Start kernel process
  start(kernelPath: string): void {
    this.kernel = spawn(kernelPath, [], {
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    this.kernel.stdout.on('data', (chunk: Buffer) => {
      this.buffer += chunk.toString()
      const lines = this.buffer.split('\n')
      this.buffer = lines.pop() || ''  // incomplete line stays in buffer
      for (const line of lines) {
        if (!line.trim()) continue
        const msg = JSON.parse(line)
        this.onMessage(msg)
      }
    })
  }

  // Send message to kernel
  send(type: string, content?: string): void {
    const msg = { type, content }
    this.kernel?.stdin.write(JSON.stringify(msg) + '\n')
  }

  // Stop kernel
  stop(): void {
    this.kernel?.kill()
  }
}
```

### 13.2 State Sync

Kernel sends `status` events (agent, model, tokens) to TUI. TUI updates StatusBar accordingly. TUI can also query status on demand.

---

## 14. Installation

### 14.1 Global Install

```bash
npm install -g daisycode-tui
daisy-tui
```

### 14.2 Via DaisyCode CLI

```bash
npx daisycode tui    # Auto-download/install daisycode-tui
# or
daisy tui
```

### 14.3 Dev Mode

```bash
# In packages/tui/ directory
npm run dev           # tsx watch mode, hot reload
```

### 14.4 Config

TUI config at `~/.config/daisycode/tui.json`:

```json
{
  "theme": "cyberpunk",
  "fontSize": "medium",
  "animation": "fade",
  "minInputHeight": 3,
  "maxInputHeight": 8
}
```

---

## 15. Implementation Plan

### 15.1 Phases

| # | Task | Deliverable | Est. |
|---|------|-------------|------|
| 1 | Scaffold packages/tui/ | package.json, tsconfig, index.tsx | 0.5d |
| 2 | Theme system | types.ts, default.ts, provider.tsx | 0.5d |
| 3 | Splash screen | splash-screen.tsx + Logo | 0.5d |
| 4 | Conversation | conversation.tsx, message.tsx, markdown.tsx, code-block.tsx | 1.5d |
| 5 | Status bar | status-bar.tsx, separator.tsx | 0.5d |
| 6 | Input box | input-box.tsx, multi-line + keybinds | 1d |
| 7 | Keybind system | use-keybinds.ts, global + Leader mode | 1d |
| 8 | IPC bridge | bridge.ts, use-ipc.ts | 1d |
| 9 | Integration | End-to-end testing | 1d |
| 10 | Release | npm publish | 0.5d |

**Total estimate: 8 days**

### 15.2 Dependency Graph

```
theme -> splash -> conversation -> input -> keybinds -> ipc -> integration
  ^                             ^          ^
  |_____________________________|__________|
```

- Theme system developed first, used by all components
- Splash, StatusBar, Conversation, InputBox can be developed in parallel
- Keybind system depends on InputBox
- IPC bridge integrated last
- Real-time preview: `npm run dev` renders directly in terminal

---

## 16. Decision Log

| Decision | Option A | Option B | Choice | Rationale |
|----------|----------|----------|--------|-----------|
| Render engine | Ink (React) | Raw ANSI / Blessed | **Ink** | Declarative UI, familiar with React ecosystem |
| Package structure | Separate npm package | Inside daisycode repo | **Separate** | Clean decoupling, independent deploy |
| Kernel communication | IPC/stdio JSON lines | Unix socket / TCP | **IPC/stdio** | Cross-platform, simple and reliable |
| Layout | Sidebar + panels + conversation | Minimal no-sidebar | **Minimal** | Boss decision, focus on conversation |
| Splash | With splash | No splash | **With splash** | Brand showcase, onboarding feel |
| Color scheme | Cyberpunk | OpenCode colors | **Cyberpunk** | Brand differentiation |
| Keybind system | Global only | Per-component only | **Hybrid** | Tab/Ctrl+X/Ctrl+L global, input editing local |
| Theme storage | JSON files | In-memory only | **JSON files** | Users can customize themes |
| Syntax highlighting | Custom implementation | Prism/Shiki integration | **Custom** | Ponytail principle: keep it simple, no extra deps |

### 16.1 Rejected Alternatives

| Alternative | Reason |
|-------------|--------|
| **Blessed/NeoBlessed** | Callback-driven event model, Ink's declarative approach is more productive |
| **React Spectrum** | Too heavy, designed for web, terminal doesn't need that complexity |
| **Electron/Web view** | Outside TUI scope, terminal interaction is sufficient |
| **gRPC communication** | Over-engineered, JSON lines is simple and reliable, easy to debug |

---

## 17. Comparison with v1

### 17.1 Key Changes

| Dimension | v1 (OpenCode style) | v2 (Approved) | Rationale |
|-----------|-------------------|---------------|-----------|
| **Render engine** | Raw ANSI (src/tui/) | Ink (React for Terminal) | Boss chose Ink for better DX |
| **Package structure** | Inside src/tui/ | Separate packages/tui/ | Decoupled, independent |
| **Color scheme** | OpenCode blue | Cyberpunk purple+cyan | Brand differentiation |
| **Layout** | Full (StatusBar/Conv/Input/Sidebar) | Minimal (StatusBar+Conv) | Boss removed sidebar |
| **Splash** | None | Logo splash screen | Brand showcase |
| **Keybinds** | OpenCode full system (with Leader) | Hybrid (Ctrl+X/Ctrl+L/Ctrl+P/Tab) | Simplified, focused operations |
| **Sidebar** | Right side, session list | None | /sessions command replaces it |
| **Themes** | JSON file + 24-bit | JSON file + 24-bit | Same |
| **Syntax highlight** | Custom | Custom | Same |

### 17.2 src/tui/ Role

- **Keep**: `src/tui/` remains as DaisyCode's **REPL fallback** — the fallback interface when TUI is not installed
- **Fallback logic**: daisycode-tui preferred when installed; falls back to src/tui/ REPL when not installed
- **Not deleted**: Ensure existing TUI still works in CI/scripts

### 17.3 Migration Path

```
v1 (existing src/tui/ ANSI)
    |
    +-> User installs daisycode-tui -> auto-use new TUI
    |
    +-> User doesn't install -> continue using REPL (src/tui/)
```

---

*Document version: v2.0*
*Last updated: 2026-06-20*
*Author: Architecture Agent*
*Status: Approved by Boss*
