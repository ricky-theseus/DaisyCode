# DaisyCode v2 Architecture Plan

**版本**: 2.0.0  
**状态**: 草案 (Draft)  
**日期**: 2026-06-20

---

## 目录

1. [概述](#1-概述)
2. [功能 1：TUI 终端界面](#2-功能-1tui-终端界面)
3. [功能 2：三级记忆](#3-功能-2三级记忆)
4. [功能 3：一键兼容](#4-功能-3一键兼容)
5. [实施顺序](#5-实施顺序)
6. [文件清单与职责](#6-文件清单与职责)
7. [接口定义总览](#7-接口定义总览)

---

## 1. 概述

DaisyCode v2 在 v1 内核基础上增加三个能力层：

`
┌──────────────────────────────────────────────────┐
│                     TUI 层                        │
│  Markdown 渲染 | 状态栏 | 侧边栏 | 多行输入 | 流式  │
├──────────────────────────────────────────────────┤
│                   记忆层                           │
│  用户级 | 项目级 | 会话级 → 自动注入 system prompt   │
├──────────────────────────────────────────────────┤
│                   兼容层                           │
│  Claude Code 导入 | OpenCode 导入 | daisy compat    │
├──────────────────────────────────────────────────┤
│                  v1 内核（不变）                    │
│  Agent Loop | MCP | Skills | Permissions | Config  │
└──────────────────────────────────────────────────┘
`

### 核心约束

- **零新依赖** — TUI 层使用 ANSI escape codes 手写，不引入 blessed/react-terminal/ink 等
- **向后兼容** — v2 不破坏 v1 的 session 格式、配置路径、命令行参数
- **最少文件** — 每个功能模块 1～2 个核心文件，不创建多余的抽象层

---

## 2. 功能 1：TUI 终端界面

### 2.1 动机

当前 epl.ts 使用 eadline 实现简单问答：
- 无法渲染 Markdown（代码块、表格、列表）
- 输入区只有单行（\ 续行的方式反直觉）
- 无状态栏/侧边栏/会话切换
- 流式输出逐字符写 stdout，不区分输出区

TUI 将终端划分为三个区域，替代 readline。

### 2.2 布局设计

`
┌─────────────────────────────────────────────────────┐
│  DaisyCode  │  agent: builder  │  model: deepseek   │  ← 状态栏 (1行)
│  tokens: 1,234  │  session: abc...                        │
├──────────┬──────────────────────────────────────────┤
│          │  `python                               │
│ 会话列表  │  def hello():                            │  ← 对话区 (动态)
│  (侧栏)  │      print("world")                      │
│          │  `                                     │
│  2026-06  │                                          │
│  20_reorg │  _The model suggested a refactor._       │
│          │                                          │
│  2026-06  │                                          │
│  19_init  │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  > 重构 utils 模块，把文件操作提取到单独文件          │  ← 输入区 (底部 3-5行)
│  /help    @builder   Ctrl+S send  Ctrl+Q cancel     │
└─────────────────────────────────────────────────────┘
`

### 2.3 区域划分

| 区域 | 位置 | 行数 | 内容 |
|------|------|------|------|
| 状态栏 | 顶部 | 1 | agent 名、模型名、token 统计、session ID 缩写 |
| 侧边栏 | 左 | 动态 | 会话列表（日期 + 名称缩写） |
| 对话区 | 中上 | 动态 | Markdown 渲染消息历史 |
| 输入区 | 底部 | 3~5 | 多行输入框、快捷键提示 |
| 分隔符 | 边界 | 1 | 区域间使用 ANSI 颜色分隔线 |

### 2.4 ANSI 渲染引擎 (	ui/renderer.ts)

核心渲染函数，操作 ANSI escape codes 实现区域管理。
> **说明**: 文档及代码示例中的 `\x1b` 表示 ASCII ESC 字符（0x1B）。

`	ypescript
// tui/renderer.ts

/** 光标移动 */
export function cursorUp(n: number): string    { return `\x1b[${n}A`; }
export function cursorDown(n: number): string  { return `\x1b[${n}B`; }
export function cursorRight(n: number): string { return `\x1b[${n}C`; }
export function cursorLeft(n: number): string  { return `\x1b[${n}D`; }
export function cursorPos(row: number, col: number): string { return `\x1b[${row};${col}H`; }
export function clearLine(): string            { return '\x1b[2K'; }
export function clearScreen(): string          { return '\x1b[2J'; }
export function hideCursor(): string           { return '\x1b[?25l'; }
export function showCursor(): string           { return '\x1b[?25h'; }
export function saveCursor(): string           { return '\x1b[s'; }
export function restoreCursor(): string        { return '\x1b[u'; }
export function scrollRegion(top: number, bottom: number): string { return `\x1b[${top};${bottom}r`; }

/** 颜色 */
export const fg = {
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
export const bg = { /* same pattern */ };
export const bold      = '\x1b[1m';
export const dim       = '\x1b[2m';
export const italic    = '\x1b[3m';
export const underline = '\x1b[4m';
export const reset     = '\x1b[0m';
`

### 2.5 Markdown 渲染 (	ui/markdown.ts)

逐行解析 Markdown，输出带 ANSI 颜色的文本。支持子集：

| 元素 | 渲染方式 |
|------|---------|
| # Heading | 加粗 + 下划线 |
| ## Heading | 加粗 |
| ` code ` | 黄色背景灰色字 |
|  `lang  块 | 灰色背景 + 语法关键词着色（简化版，仅高亮常见关键词） |
| - list | 绿色前缀 • |
| 1. list | 绿色序号 |
| > quote | 青色竖线前缀 |
| --- | 灰色分隔线 |
| **bold** | 加粗 |
| *italic* | 斜体 |
| 普通文本 | 原色 |

**设计原则**：
- 不做完整 AST 解析，逐行 regex 匹配
- 代码块内不做行内 Markdown 解析
- 渲染器接收纯字符串，返回带 ANSI 码的字符串
- 新增函数 enderMarkdown(text: string): string

### 2.6 输入区 (	ui/input.ts)

替代 readline，处理原始 stdin（stdin 设为 raw mode）。

`	ypescript
// tui/input.ts

export interface InputState {
  lines: string[];
  cursorLine: number;   // 当前行（相对于 lines）
  cursorCol: number;    // 当前列
  history: string[];    // 历史记录
  historyIdx: number;   // -1 = 新输入
}

export type InputAction =
  | { type: 'char'; char: string }
  | { type: 'enter' }        // 换行(Shift+Enter) 或 发送(Enter when last line empty)
  | { type: 'send' }         // Ctrl+Enter / Meta+Enter
  | { type: 'cancel' }       // Ctrl+C / Ctrl+Q
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'up' }
  | { type: 'down' }
  | { type: 'home' }
  | { type: 'end' }
  | { type: 'tab' }
  | { type: 'complete'; partial: string }  // @ 补全触发
  | { type: 'ctrl_l' }      // 清屏
  | { type: 'ctrl_d' }      // 退出
  | { type: 'ctrl_p' }      // 切换侧边栏
  | { type: 'ctrl_s' }      // 强制发送

export function processKey(seq: string, state: InputState): InputAction | null;
`

**交互规则**：
- Enter on non-empty line → 插入新行（多行编辑）
- Enter on empty last line → 发送（提交）
- Shift+Enter → 始终插入新行
- Ctrl+Enter → 始终发送
- Ctrl+C → 取消当前输入（不清除，回到空行）
- Ctrl+C 第二次 → 退出程序
- Ctrl+Q → 中断 agent 执行
- Ctrl+L → 清屏（保留对话历史）
- Ctrl+P → 切换侧边栏显示/隐藏
- Tab → 触发补全（@agent 名）
- 上/下 → 浏览输入历史

### 2.7 侧边栏 (	ui/sidebar.ts)

`	ypescript
// tui/sidebar.ts

export interface SidebarState {
  visible: boolean;
  sessions: SessionSummary[];
  activeIdx: number;
  width: number;  // 默认 20 列
}

export interface SessionSummary {
  id: string;
  label: string;    // "2026-06-20 14:30"
  preview: string;  // 首条消息前 15 字
  active: boolean;
}
`

- 侧边栏宽度固定 20 列
- 选中会话高亮
- 按 Ctrl+P 切换显示
- 侧边栏渲染在对话区左侧，对话区宽度自适应

### 2.8 状态栏 (	ui/status-bar.ts)

`	ypescript
// tui/status-bar.ts

export interface StatusBarState {
  agentName: string;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  sessionId: string;
  status: 'idle' | 'streaming' | 'thinking' | 'error';
}
`

- 始终固定在顶部第 1 行
- 使用 scrollRegion 锁定顶部区域，对话区滚动不影响状态栏
- 状态变化时重绘整行
- status 字段决定颜色：idle=白, streaming=绿, thinking=黄, error=红

### 2.9 TUI 主控制器 (	ui/index.ts)

`	ypescript
// tui/index.ts

export interface TUIConfig {
  agentName: string;
  modelName: string;
  sessionId: string;
  onSend: (input: string) => AsyncIterable<AgentEvent>;
  onSwitchSession: (sessionId: string) => void;
  onExit: () => void;
}

export class TUI {
  constructor(config: TUIConfig);
  start(): void;              // 进入 raw mode, 开始事件循环
  stop(): void;               // 退出 raw mode, 恢复终端
  appendMessage(html: string): void;    // 追加 AI 回复到对话区
  updateStatus(status: Partial<StatusBarState>): void;
  refreshSessions(sessions: SessionSummary[]): void;
}
`

**事件循环**：
1. stdin raw mode 监听键盘事件
2. processKey() 转换字节序列为 InputAction
3. 根据 action 更新 input state + 局部重绘
4. Enter/send → 调用 onSend(input) → 流式渲染到对话区
5. 流式渲染：逐个 chunk 写入对话区 buffer，触底自动滚动

**关键设计决策**：
- 不使用 setInterval 轮询，使用 process.stdin.on('data') 事件驱动
- 每次重绘只更新变化区域（rectangular diff），不整屏重绘
- 对话区维护一个 lines: string[] buffer，每次追加时只更新最后 N 行
- 窗口 resize 时（process.stdout.on('resize')）重新计算布局并全量重绘

### 2.10 与 Agent 集成

现有 Agent.run() 返回 AsyncIterable<AgentEvent>，TUI 直接 consume：

`	ypescript
// 伪代码
const events = agent.run(input);
for await (const event of events) {
  switch (event.type) {
    case 'text_delta':
      tui.streamToConversation(event.content);  // 追加 Markdown 渲染
      break;
    case 'tool_call':
      tui.updateStatus({ status: 'thinking' });
      tui.appendMessage(\x1b[90m⚡ ...\x1b[0m);
      break;
    case 'done':
      tui.updateStatus({ status: 'idle' });
      break;
  }
}
`

---

## 3. 功能 2：三级记忆

### 3.1 动机

当前 session.ts 只持久化当前会话的 message 数组，没有跨会话记忆：
- 用户偏好/项目上下文每次对话都需要重复告知
- 没有自动摘要机制，长会话全部保留导致 token 浪费
- 无法在项目级别配置"总是使用 Python"、"项目是 Next.js"等持久上下文

三级记忆解决这个问题：
`
用户级  ─ 偏好（模型偏好、快捷方式）              ~/.daisy/memory/user.json
项目级  ─ 上下文（项目类型、技术栈、约定）          .daisy/memory/project.json
会话级  ─ 当前对话 + 自动生成的摘要               .daisy/memory/sessions/<id>.json
`

### 3.2 文件路径

| 级别 | 路径 | 示例 |
|------|------|------|
| 用户 | ~/.daisy/memory/user.json | 始终存在的用户级记忆 |
| 项目 | <cwd>/.daisy/memory/project.json | 项目根目录下 |
| 会话 | <cwd>/.daisy/memory/sessions/<id>.json | 增强现有 session |

### 3.3 数据模型

`	ypescript
// types.ts 新增

export interface UserMemory {
  version: 1;
  updatedAt: string;
  preferences: {
    defaultModel?: string;
    defaultAgent?: string;
    theme?: 'light' | 'dark';
    shortcuts?: Record<string, string>;  // 用户自定义快捷键
  };
  facts: string[];          // 用户个人事实（"用户是前端开发者"）
  learned: Record<string, unknown>;  // 模型学习到的用户习惯
}

export interface ProjectMemory {
  version: 1;
  updatedAt: string;
  summary: string;          // 项目一句话描述
  techStack: string[];      // ["TypeScript", "React", "Node.js"]
  conventions: string[];    // ["使用 2 空格缩进", "使用 pnpm"]
  structure: string;        // 项目目录结构简述
  facts: string[];          // 项目上下文事实
  learned: Record<string, unknown>;
}

export interface SessionMemory {
  // 复用现有的 SessionConfig
  // 新增字段:
  summary?: string;         // 自动生成的会话摘要（首次 10 条消息后生成）
  tags?: string[];          // 自动标签
  tokenCount?: number;      // 总 token 数（用于截断判断）
}
`

### 3.4 MemoryManager (memory/manager.ts)

`	ypescript
// memory/manager.ts

export class MemoryManager {
  private userPath: string;
  private projectPath: string;
  private projectDir: string;

  constructor(opts: { projectDir?: string });

  // === 加载 ===
  loadUser(): UserMemory;
  loadProject(): ProjectMemory | null;
  loadSession(sessionId: string): SessionMemory | null;

  // === 保存 ===
  saveUser(memory: UserMemory): void;
  saveProject(memory: ProjectMemory): void;
  saveSession(memory: SessionMemory): void;

  // === 记忆注入 — 返回要注入到 system prompt 前缀的字符串 ===
  buildMemoryPrompt(): string;

  // === 会话摘要 ===
  generateSessionSummary(session: SessionConfig): string;  // 简单摘要算法
  autoTagSession(session: SessionConfig): string[];        // 关键词提取标签
}
`

**记忆注入流程**（在 Agent.run() 中调用）：

`
Agent.run(input)
  → memoryManager.buildMemoryPrompt()
  → 将返回的字符串注入到 system prompt 前缀
  → 正常 agent loop
`

uildMemoryPrompt() 输出示例：

`
[用户记忆]
- 偏好模型: deepseek/deepseek-chat
- 用户是 TypeScript 全栈开发者

[项目记忆]
- 项目: DaisyCode, AI Coding Agent 运行时
- 技术栈: TypeScript, Node.js 20+
- 约定: 零新依赖原则, ESM 模块

[会话记忆]
- 当前会话正在讨论 TUI 架构设计
`

### 3.5 会话摘要算法 (memory/summary.ts)

`	ypescript
// memory/summary.ts

export function summarizeSession(session: SessionConfig): string {
  // 简单算法（非 LLM 调用）：
  // 1. 取用户首条消息的前 100 字符
  // 2. 取最近一条用户消息的前 100 字符
  // 3. 提取高频关键词（出现 3 次以上的名词）
  // 格式: "主题: {首条概要} | 最近: {最近话题} | 关键词: {kw1, kw2}"
}

export function extractTags(session: SessionConfig, knownStacks: string[]): string[] {
  // 从消息内容中提取已知技术栈关键词
  // 匹配 project memory 中的 techStack
  // 加上时间标签: "session-2026-06"
}

export function shouldSummarize(session: SessionConfig): boolean {
  // 首次 10 条消息后自动生成摘要
  // 之后每 20 条消息更新一次
  // 摘要存储在 session.summary
}
`

**不调用 LLM 做摘要**（ponytail: 简单统计就够，LLM 摘要引入延迟 + 成本，升级路径：如果用户明确要求语义摘要，再加）。

### 3.6 集成到 Agent

gent-loop.ts 改动：

`	ypescript
// Agent.run() 开头：
const memoryPrompt = this.memoryManager?.buildMemoryPrompt() ?? '';
const effectiveSystemPrompt = memoryPrompt
  ? `${memoryPrompt}\n\n${this.systemPrompt}`
  : this.systemPrompt;

// session 自动保存：每次 agent loop 结束时
// 如果消息数超过阈值，自动生成/更新摘要
`

index.ts 改动：

`	ypescript
const memoryManager = new MemoryManager({ projectDir: cwd });
// 注入到 Agent 构造参数
`

### 3.7 自动持久化

| 时机 | 操作 |
|------|------|
| Agent 启动 | 加载三级记忆 → 注入 system prompt |
| 每 10 条消息 | 更新会话摘要 + 写盘 |
| 会话结束 (Ctrl+D) | 最终摘要 + 写盘 |
| 跨项目（检测 .daisy 不存在）| 仅用户级记忆生效 |
| 首次运行 | 自动创建 ~/.daisy/memory/ 和 .daisy/memory/ |

---

## 4. 功能 3：一键兼容

### 4.1 动机

当前用户迁移成本高：
- Claude Code 用户已有 CLAUDE.md + commands + skills 配置
- OpenCode 用户已有 opencode.json + agents + skills 配置
- 手动迁移繁琐，且格式不兼容

daisy compat 命令自动检测并导入上述配置，保持原始文件不动，生成 DaisyCode 兼容配置。

### 4.2 CLI 接口

`
daisy compat                # 自动检测当前目录，交互式导入
daisy compat --dry-run      # 预览将要导入的内容，不写文件
daisy compat --force        # 覆盖已有兼容配置
daisy compat --from claude  # 只导入 Claude Code
daisy compat --from opencode # 只导入 OpenCode
daisy compat --list         # 列出已导入的兼容配置
`

### 4.3 兼容扫描器 (compat/scanner.ts)

`	ypescript
// compat/scanner.ts

export interface CompatSource {
  type: 'claude' | 'opencode';
  confidence: 'high' | 'medium' | 'low';
  files: string[];
  hints: string[];           // 检测到的内容描述
}

export interface CompatPlan {
  sources: CompatSource[];
  commands: ImportedCommand[];
  skills: ImportedSkill[];
  mcpServers: ImportedMCPServer[];
  agents: ImportedAgent[];
}

export function scanDirectory(dir: string): CompatPlan;
`

**检测逻辑**：

| 文件 | 类型 | 检测方法 |
|------|------|---------|
| CLAUDE.md | claude | 存在即 high confidence |
| .claude/commands/ | claude | 目录存在 |
| .claude/skills/ | claude | 目录存在 |
| .claude/MCP.json | claude | 存在即确认 |
| .claude/settings.json | claude | 存在即确认，提取 allowedTools → permission, model → defaultModel |
| opencode.json | opencode | 存在即 high confidence |
| .opencode/agents/ | opencode | 目录存在 |
| .opencode/skills/ | opencode | 目录存在 |
| .opencode/prompts/ | opencode | 目录存在 |

### 4.4 导入器 (compat/importer.ts)

`	ypescript
// compat/importer.ts

export interface ImportResult {
  type: 'claude' | 'opencode';
  imported: {
    commands: number;
    skills: number;
    mcpServers: number;
    agents: number;
  };
  warnings: string[];
  targetPath: string;       // .daisy/compat/ 下的路径
}

export function importClaudeCode(dir: string, opts?: { dryRun?: boolean; force?: boolean }): ImportResult;
export function importOpenCode(dir: string, opts?: { dryRun?: boolean; force?: boolean }): ImportResult;
`

**导入映射**：

| 来源 | 路径 | 目标路径 |
|------|------|---------|
| CLAUDE.md | ./CLAUDE.md | .daisy/compat/claude/CLAUDE.md |
| Claude commands | .claude/commands/*.md | .daisy/compat/claude/commands/*.md |
| Claude skills | .claude/skills/*.md | .daisy/compat/claude/skills/*.md |
| Claude MCP.json | .claude/MCP.json | .daisy/compat/claude/MCP.json |
| opencode.json | ./opencode.json | .daisy/compat/opencode/opencode.json |
| OpenCode agents | .opencode/agents/*.md | .daisy/compat/opencode/agents/*.md |
| OpenCode skills | .opencode/skills/*.md | .daisy/compat/opencode/skills/*.md |
| OpenCode prompts | .opencode/prompts/*.md | .daisy/compat/opencode/prompts/*.md |

### 4.5 配置合并器 (compat/merger.ts)

`	ypescript
// compat/merger.ts

export interface MergeOptions {
  projectDir: string;
  sources: ('claude' | 'opencode')[];
  dryRun?: boolean;
  force?: boolean;
}

export function mergeIntoDaisyConfig(opts: MergeOptions): DaisyConfig;
`

**合并策略**：

1. **CLAUDE.md** → 读取内容，追加到 DaisyCode 的 default agent system prompt 末尾
2. **Commands** → 映射为 DaisyCode gent 配置项（每个 command 文件生成一个 agent entry）
3. **Skills** → 复制到 .daisy/skills/，自动生成 daisy.jsonc 中的 skill section
4. **MCP.json** → 转换为 DaisyCode MCP 配置格式（格式基本一致，直接复制）
5. **opencode.json agents** → 按名称深合并到 daisy.jsonc agent section
6. **opencode.json MCP** → 按名称深合并到 DaisyCode MCP section

合并结果写入 daisy.jsonc（如果不存在）或 daisy.compat.jsonc（如果有已有配置且非 force）。

### 4.6 运行时兼容 (compat/runtime.ts)

`	ypescript
// compat/runtime.ts

export class CompatRuntime {
  private loaded: Set<string>;

  constructor(projectDir: string);

  /** 检查是否有兼容配置加载 */
  hasCompat(type: 'claude' | 'opencode'): boolean;

  /** 获取兼容配置的 CLAUDE.md 内容 */
  getClaudeMd(): string | null;

  /** 获取兼容配置的 MCP 服务器 */
  getMCPServers(): Record<string, MCPProcessConfig>;

  /** 列出所有兼容内容 */
  list(): CompatPlan;
}
`

CompatRuntime 在 Agent 启动时自动检查 .daisy/compat/ 目录，如果有兼容配置则自动加载 MCP 服务器和 prompts。

### 4.7 配置示例

导入后生成的 daisy.jsonc：

`jsonc
{
  // 兼容层导入的自定义 agent
  "agent": {
    "architect": {
      "description": "系统架构师，来自 opencode.json",
      "permission": { "read": "allow", "edit": "ask" }
    }
  },
  // 兼容层导入的 MCP 服务器
  "mcp": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    }
  },
  // 兼容层导入的 Skills
  "skill": {
    "react": {
      "trigger": ["react", "jsx"],
      "path": ".daisy/skills/react.md"
    }
  }
}
`

---

## 5. 实施顺序

### Phase 1: TUI (Day 1-3)

| Step | 文件 | 内容 |
|------|------|------|
| 1.1 | 	ui/renderer.ts | ANSI escape code 常量 + 光标/颜色函数 |
| 1.2 | 	ui/markdown.ts | Markdown → ANSI 渲染器（逐行 regex） |
| 1.3 | 	ui/input.ts | raw mode 键盘输入 + 状态机 + @补全 |
| 1.4 | 	ui/status-bar.ts | 顶部状态栏渲染 |
| 1.5 | 	ui/sidebar.ts | 左侧会话列表 |
| 1.6 | 	ui/index.ts | TUI 主控制器（布局 + 事件循环 + 流式渲染）|
| 1.7 | 修改 index.ts | startRepl 调用 TUI 替代 readline |
| 1.8 | 保留 epl.ts | 作为 fallback（--no-tui 或非 TTY 环境）|

### Phase 2: 三级记忆 (Day 3-5)

| Step | 文件 | 内容 |
|------|------|------|
| 2.1 | memory/manager.ts | MemoryManager 加载/保存/注入 |
| 2.2 | memory/summary.ts | 会话摘要算法 |
| 2.3 | 修改 	ypes.ts | 新增 UserMemory / ProjectMemory 类型 |
| 2.4 | 修改 session.ts | 增加 summary/tags/tokenCount 字段 |
| 2.5 | 修改 gent-loop.ts | MemoryManager 注入 system prompt |
| 2.6 | 修改 index.ts | 创建 MemoryManager 实例并传入 Agent |

### Phase 3: 一键兼容 (Day 5-7)

| Step | 文件 | 内容 |
|------|------|------|
| 3.1 | compat/scanner.ts | 目录扫描 + 检测兼容源 |
| 3.2 | compat/importer.ts | Claude Code / OpenCode 导入逻辑 |
| 3.3 | compat/merger.ts | 配置合并到 daisy.jsonc |
| 3.4 | compat/runtime.ts | 运行时兼容加载 |
| 3.5 | 修改 index.ts | 注册 daisy compat 命令 |
| 3.6 | 修改 config.ts | 加载时检测 .daisy/compat/ 补充配置 |

### 跨阶段

- 测试：每个模块的 	ests/ 目录下对应测试文件
- 文档：全部完成后统一更新 README 和 CLI help

---

## 6. 文件清单与职责

`
src/
├── tui/                          # [新增] TUI 层
│   ├── index.ts                  # TUI 主控制器：布局管理 + 事件循环
│   ├── renderer.ts               # ANSI escape codes 常量 + 光标/颜色工具
│   ├── markdown.ts               # Markdown → ANSI 渲染器
│   ├── input.ts                  # Raw mode 键盘输入处理
│   ├── status-bar.ts             # 顶部状态栏
│   └── sidebar.ts                # 左侧会话列表
│
├── memory/                       # [新增] 三级记忆
│   ├── manager.ts                # MemoryManager 统一管理
│   ├── summary.ts                # 会话摘要生成
│   └── types.ts                  # UserMemory / ProjectMemory 类型（或合并到 types.ts）
│
├── compat/                       # [新增] 一键兼容
│   ├── scanner.ts                # 目录扫描 + 兼容源检测
│   ├── importer.ts               # 导入逻辑（claude / opencode）
│   ├── merger.ts                 # 配置合并到 daisy.jsonc
│   └── runtime.ts                # 运行时加载兼容配置
│
├── repl.ts                       # [保留修改] readline fallback + 新增 --no-tui 检测
├── session.ts                    # [修改] 增加 summary/tags/tokenCount
├── agent-loop.ts                 # [修改] 注入 memory prompt
├── types.ts                      # [修改] 增加记忆相关类型
├── config.ts                     # [修改] 加载兼容配置
└── index.ts                      # [修改] 注册 compat 命令 + 初始化 TUI/MemoryManager
`

### 删除或废弃

无。v1 所有文件保留，只做增量修改。

---

## 7. 接口定义总览

### 7.1 TUI 接口

`	ypescript
// tui/renderer.ts
export function cursorUp(n: number): string;
export function cursorDown(n: number): string;
export function cursorLeft(n: number): string;
export function cursorRight(n: number): string;
export function cursorPos(row: number, col: number): string;
export function clearLine(): string;
export function clearScreen(): string;
export function hideCursor(): string;
export function showCursor(): string;
export function saveCursor(): string;
export function restoreCursor(): string;
export function scrollRegion(top: number, bottom: number): string;
export const fg: Record<string, string>;
export const bg: Record<string, string>;
export const bold: string;
export const dim: string;
export const reset: string;

// tui/markdown.ts
export function renderMarkdown(text: string): string;

// tui/input.ts
export interface InputState { lines: string[]; cursorLine: number; cursorCol: number; history: string[]; historyIdx: number; }
export type InputAction = { type: 'char' | 'enter' | 'send' | 'cancel' | 'backspace' | 'delete' | 'left' | 'right' | 'up' | 'down' | 'home' | 'end' | 'tab' | 'ctrl_l' | 'ctrl_d' | 'ctrl_p' | 'ctrl_s'; char?: string; };
export function processKey(seq: string, state: InputState): InputAction | null;
export function createInputState(): InputState;

// tui/status-bar.ts
export interface StatusBarState { agentName: string; modelName: string; promptTokens: number; completionTokens: number; sessionId: string; status: 'idle' | 'streaming' | 'thinking' | 'error'; }
export function renderStatusBar(state: StatusBarState): string;

// tui/sidebar.ts
export interface SidebarState { visible: boolean; sessions: SessionSummary[]; activeIdx: number; width: number; }
export interface SessionSummary { id: string; label: string; preview: string; active: boolean; }
export function renderSidebar(state: SidebarState, height: number): string[];

// tui/index.ts
export interface TUIConfig { agentName: string; modelName: string; sessionId: string; onSend: (input: string) => AsyncIterable<AgentEvent>; onSwitchSession: (sessionId: string) => void; onExit: () => void; }
export class TUI { constructor(config: TUIConfig); start(): void; stop(): void; appendMessage(text: string): void; updateStatus(status: Partial<StatusBarState>): void; refreshSessions(sessions: SessionSummary[]): void; }
`

### 7.2 记忆接口

`	ypescript
// memory/types.ts (或 types.ts 新增)
export interface UserMemory { version: 1; updatedAt: string; preferences: { defaultModel?: string; defaultAgent?: string; theme?: 'light' | 'dark'; shortcuts?: Record<string, string>; }; facts: string[]; learned: Record<string, unknown>; }
export interface ProjectMemory { version: 1; updatedAt: string; summary: string; techStack: string[]; conventions: string[]; structure: string; facts: string[]; learned: Record<string, unknown>; }
export interface SessionMemory extends SessionConfig { summary?: string; tags?: string[]; tokenCount?: number; }

// memory/manager.ts
export class MemoryManager { constructor(opts: { projectDir?: string }); loadUser(): UserMemory; loadProject(): ProjectMemory | null; loadSession(sessionId: string): SessionMemory | null; saveUser(memory: UserMemory): void; saveProject(memory: ProjectMemory): void; saveSession(memory: SessionMemory): void; buildMemoryPrompt(): string; generateSessionSummary(session: SessionConfig): string; autoTagSession(session: SessionConfig): string[]; }

// memory/summary.ts
export function summarizeSession(session: SessionConfig): string;
export function extractTags(session: SessionConfig, knownStacks: string[]): string[];
export function shouldSummarize(session: SessionConfig): boolean;
`

### 7.3 兼容接口

`	ypescript
// compat/scanner.ts
export interface CompatSource { type: 'claude' | 'opencode'; confidence: 'high' | 'medium' | 'low'; files: string[]; hints: string[]; }
export interface CompatPlan { sources: CompatSource[]; commands: ImportedCommand[]; skills: ImportedSkill[]; mcpServers: ImportedMCPServer[]; agents: ImportedAgent[]; }
export interface ImportedCommand { name: string; content: string; source: string; }
export interface ImportedSkill { name: string; trigger: string[]; content: string; source: string; }
export interface ImportedMCPServer { name: string; config: MCPProcessConfig; source: string; }
export interface ImportedAgent { name: string; config: AgentConfig; source: string; }
export function scanDirectory(dir: string): CompatPlan;

// compat/importer.ts
export interface ImportResult { type: 'claude' | 'opencode'; imported: { commands: number; skills: number; mcpServers: number; agents: number; }; warnings: string[]; targetPath: string; }
export function importClaudeCode(dir: string, opts?: { dryRun?: boolean; force?: boolean }): ImportResult;
export function importOpenCode(dir: string, opts?: { dryRun?: boolean; force?: boolean }): ImportResult;

// compat/merger.ts
export interface MergeOptions { projectDir: string; sources: ('claude' | 'opencode')[]; dryRun?: boolean; force?: boolean; }
export function mergeIntoDaisyConfig(opts: MergeOptions): DaisyConfig;

// compat/runtime.ts
export class CompatRuntime { constructor(projectDir: string); hasCompat(type: 'claude' | 'opencode'): boolean; getClaudeMd(): string | null; getMCPServers(): Record<string, MCPProcessConfig>; list(): CompatPlan; }
`

### 7.4 对 v1 接口的修改

`	ypescript
// types.ts 新增字段
interface SessionConfig {
  // ... 现有字段不变
  summary?: string;          // [新增] 会话摘要
  tags?: string[];           // [新增] 自动标签
  tokenCount?: number;       // [新增] 总 token 数
}

// AgentOptions 新增字段
interface AgentOptions {
  // ... 现有字段不变
  memoryManager?: MemoryManager;  // [新增] 三级记忆管理器
}

// index.ts CLI 新增命令
daisy compat [--dry-run] [--force] [--from claude|opencode] [--list]
`

---

*文档版本: 2.0.0-draft | 最后更新: 2026-06-20*
