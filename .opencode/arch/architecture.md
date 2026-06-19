# DaisyCode 架构设计文档

**版本**: 1.2.0  
**状态**: 已定稿 (Final)  
**日期**: 2026-06-19

---

## 目录

1. [概述](#1-概述)
2. [核心原则](#2-核心原则)
3. [整体架构](#3-整体架构)
4. [模块详解](#4-模块详解)
5. [技术选型与决策记录](#5-技术选型与决策记录)
6. [配置系统](#6-配置系统)
7. [数据流](#7-数据流)
8. [API 接口设计](#8-api-接口设计)
9. [会话管理](#9-会话管理)
10. [分阶段实施计划](#10-分阶段实施计划)
11. [迁移方案](#11-迁移方案)

---

## 1. 概述

DaisyCode 是一个 **AI Coding Agent** 运行时。它提供极简内核，通过 MCP 协议接入外部工具、通过 Skills 注入专业技能、通过 Custom Agents 实现多 agent 编排。

### 1.1 目标

- 替代 OpenCode 作为 DaisyCode 团队的自有运行平台
- 提供可扩展的 AI coding agent 基础设施
- 保持内核极简，一切功能通过扩展机制接入

### 1.2 非目标

- 不做 IDE/编辑器
- 不做 UI 框架或 Web 服务
- 不做实时协作平台
- 不做 agent 市场/商店

---

## 2. 核心原则

| 原则 | 说明 |
|------|------|
| **内核极简** | Agent loop + 5 基础工具 + 会话记忆 + 权限 + 模型抽象，最小运行时依赖 (js-yaml) <!-- fix-4: 修正"零运行时依赖"为"最小运行时依赖"，诚实标注 js-yaml --> |
| **扩展优先** | 所有非核心功能通过 MCP/Skills/Custom Agents 三层扩展实现 |
| **可维护性 > 性能 > 开发速度** | 代码可读性和可维护性优先 |
| **YAGNI** | 不添加当前不需要的功能 |
| **文件最少** | 不创建不必要的抽象层或接口 |
| **标准库优先** | 能用 Node.js 内置 API 解决的，不引入外部依赖 |

---

## 3. 整体架构

```
┌─────────────────────────────────────────────┐
│                  REPL / CLI                  │
│          (逐 token 渲染，AbortSignal)         │
│  <!-- fix-18: 渲染安全: 过滤 ANSI/NULL/控制字符 --> │
├─────────────────────────────────────────────┤
│               Agent Engine                   │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
│  │  Agent   │ │  Skills  │ │ Permissions  │  │
│  │  Loop    │ │ Matcher  │ │   System    │  │
│  │(Abort-   │ │(trigger  │ │  .check()   │  │
│  │Signal)   │ │ keyword) │ │             │  │
│  └──────────┘ └──────────┘ └─────────────┘  │
│  ┌──────────────────────────────────────┐   │
│  │         Tool Registry                │   │
│  │  (内置工具 + MCP 工具, 统一权限)      │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│              ModelAdapter                   │
│  ┌──────────────────────────────────────┐   │
│  │  chat() + stream()                   │   │
│  │  Token估算: API usage → charCount/3.5 │   │
│  │  <!-- fix-14: 超时(120s) + 429退避重试 --> │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│           MCP 子进程管理器                   │
│  ┌──────────────────────────────────────┐   │
│  │  状态机: 创建→健康检查→超时→自动重启   │   │
│  │  <!-- fix-13: JSON 校验 + 错误返回 -->   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│           配置系统 (深合并)                  │
│  按 agent / skill / MCP 名称合并，不覆盖    │
│  <!-- fix-17: __proto__ 过滤 -->            │
└─────────────────────────────────────────────┘
```

### 模块依赖关系

- REPL → Agent Engine → Tool Registry → MCP 子进程管理器
- Agent Engine → ModelAdapter → LLM API
- Agent Engine → Permissions System → Tool Registry
- Agent Engine → Skills Matcher (关键词匹配 trigger)
- 所有模块 → 配置系统 (深合并)

---

## 4. 模块详解

### 4.1 Agent Engine

核心事件循环。管理 agent 的生命周期：接收输入 → 匹配技能 → 调用 LLM → 解析工具调用 → 权限检查 → 执行工具 → 返回结果。

#### 中断机制

Agent.run() 接受 AbortSignal 参数：

```
Agent.run(input, { signal: AbortSignal })
```

- Ctrl+C → AbortController.abort() → Agent Loop 检测 signal.aborted → 安全停止当前工具执行 → 清理子进程 → 抛出 AgentAbortedError
- 各工具调用也透传 AbortSignal，使长时间操作（MCP 调用、bash 命令）可中断
- 中断后 REPL 捕获 AgentAbortedError，恢复到交互提示符，不崩溃

#### Subagent 调用协议

Subagent 通过 task 工具调用，不是文本解析：

```
// Tool: task
{
  name: "task",
  arguments: {
    agent: "builder",
    task: "实现 XXX 功能",
    background: true
  }
}
````

- Agent Engine 收到 task 工具调用后，创建子 SubagentSession
- background=true 时异步执行，调用方立即继续
- background=false 时同步等待，调用方挂起
- Subagent 返回结果通过会话记忆传递回父 agent
- <!-- fix-7: 深度限制 maxDepth=3 --> **深度限制**: Subagent 嵌套深度默认 maxDepth=3（Agent A → B → C 为 2 层），超出时返回 `{ error: "max_depth_exceeded", maxDepth: 3 }`。深度计数器在 SubagentSession 创建时 +1，完成时 -1。

#### 空输入处理 (§ fix-11)

```
Agent.run(""): 静默返回，不调用 LLM，不发任何事件。
Agent.run(input):
  if (!input || input.trim() === '') return;
```

### 4.2 Skills Matcher

技能匹配机制。每个 Skill 声明一个 `trigger` 字段，定义触发关键词：

```
skill:
  trigger:
    - "react"
    - "nextjs"
    - "前端"
    - "component"
```

- 用户输入 → 逐 skill 匹配 trigger 关键词（大小写不敏感）
- 匹配成功 → 自动加载该 Skill 指令注入 system prompt
- 多个匹配 → 全部注入
- 无匹配 → 使用默认 prompt

#### 触发匹配规则

- 精确匹配：输入中包含 trigger 词即匹配
- 词边界：避免 "reactor" 匹配 "react"
- 优先级：多个匹配时，按配置顺序注入

#### 加载失败处理 (§ fix-20)

Skill 文件（SKILL.md）加载时异常处理策略：

- 文件不存在 → 跳过该 Skill，记录 warning
- YAML/front-matter 解析失败 → 跳过该 Skill，记录 warning
- 缺少必需字段（如 trigger）→ 跳过该 Skill，记录 warning
- 任何 SKILL.md 加载错误不影响其他 Skill 的正常加载和匹配
- 整体 Skills 加载不因此崩溃

### 4.3 Permission System

统一的权限检查入口。所有工具调用（包括 MCP 工具）都经过 PermissionSystem.check()：

```
PermissionSystem.check({
  tool: "bash",
  arguments: { command: "rm -rf /" },
  context: ToolContext
}) → Promise<{ allowed: boolean, reason?: string }>
```

#### 权限级别

| 级别 | 含义 |
|------|------|
| allow | 自动允许 |
| deny | 自动拒绝 |
| ask | 询问用户确认 |
| restricted | 带条件允许（如命令白名单） |

#### 类型统一

所有 `ToolContext.permissions` 统一使用 `AgentPermissions` 类型：

```typescript
type AgentPermissions = {
  read: 'allow' | 'deny' | 'ask';
  edit: 'allow' | 'deny' | 'ask';
  bash: 'allow' | 'deny' | 'ask';
  glob: 'allow' | 'deny' | 'ask';
  task: 'allow' | 'deny' | 'ask';
  // ... 扩展工具权限
}
```

#### 权限继承 (§ fix-15)

Subagent 权限 = 父 agent 权限 ∩ 自身配置（取更严格的）：

| 父权限 | 子配置 | 结果 |
|--------|--------|------|
| allow  | ask    | ask  |
| ask    | allow  | ask  |
| deny   | allow  | deny |

规则: `allow > ask > deny`，取更严格的值。子 agent 未配置的权限继承父 agent。

### 4.4 Tool Registry

工具注册中心。管理所有可用工具的元数据和调用实现。

#### 内置工具

- read / edit / write / glob / grep — 文件操作
- bash — 命令执行 (Windows: 优先 pwsh → cmd 降级, 正斜杠路径) (§ fix-3)
- websearch / webfetch — 网络访问
- task — Subagent 调用

#### 内置工具 Schema (§ fix-1)

每个内置工具声明统一的 input/output schema：

| 工具 | 输入参数 | 成功输出 | 错误返回 |
|------|---------|---------|---------|
| read | path: string, offset?: number(>=0), limit?: number(1-2000), maxBytes?: number(默认 1MB) | `{ content: string, totalLines: number }` | ENOENT → `{ error: "file_not_found", path }` |
| write | path: string, content: string | `{ success: true }` | 权限错误 → `{ error: "permission_denied" }` |
| edit | path: string, oldText: string, newText: string | `{ success: true, changed: boolean }` | 替换文本不存在 → `{ error: "text_not_found" }` |
| glob | pattern: string, path?: string | `{ files: string[] }` | 无匹配 → `{ files: [] }` |
| grep | pattern: string, path?: string, include?: string | `{ matches: { file: string, line: number, content: string }[] }` | 无匹配 → `{ matches: [] }` |
| bash | command: string, timeout?: number(ms) | `{ stdout: string, stderr: string, exitCode: number }` | 超时 → `{ error: "timeout", exitCode: -1 }` |

**参数说明**:
- read.maxBytes：超过时返回前 maxBytes 字节 + `{ truncated: true, totalBytes: number }` (§ fix-12)
- bash.Windows：优先检测 pwsh，降级到 cmd，路径统一使用正斜杠转换

#### MCP 工具

通过 MCP 协议注册的外部工具。MCP 工具调用也经过 PermissionSystem.check()：

```
tool_call → PermissionSystem.check(tool, args) → 允许 → MCP子进程执行 → 返回结果
                                        → 拒绝 → 返回权限错误
```

### 4.5 MCP 子进程管理器

管理所有 MCP 服务器子进程的生命周期。核心是状态机：

```
         ┌──────────┐
         │  Created  │
         └────┬─────┘
              │ 启动
         ┌────▼─────┐
         │ Starting │ ← 超时(5s) → Error
         └────┬─────┘
              │ 就绪
         ┌────▼─────┐
         │  Ready   │ ←──┐
         └────┬─────┘    │
              │ 健康检查  │
         ┌────▼─────┐    │
         │ Healthy  │────┘ (每30s健康检查)
         └────┬─────┘
              │ 崩溃/超时
         ┌────▼─────┐
         │  Error   │
         └────┬─────┘
              │ 自动重启(最多3次)
         ┌────▼─────┐
         │ Starting │
         └──────────┘
```

#### 关键行为

- **启动超时**: 5秒内未响应 → Error → 尝试重启
- **健康检查**: 每30秒发送 ping → 无响应(3次) → Error → 重启
- **自动重启**: 最多3次，指数退避(1s → 2s → 4s)
- **请求超时**: 单个工具调用超时(默认60s) → 取消请求，不杀进程
- **彻底失败**: 3次重启都失败 → 标记 Fatal
  - 该 MCP 工具从 ToolRegistry 中移除（禁用），其他 MCP 工具不受影响
  - 用户收到通知后可通过命令手动重启该 MCP 服务器

#### JSON 校验 (§ fix-13)

MCP 子进程返回的原始 JSON 经过 JSON.parse try-catch：

- 解析成功 → 正常处理
- 解析失败 → 返回 `{ error: "mcp_invalid_response", message: "MCP 返回了非 JSON 格式响应" }`，触发自动重启

#### 资源清理

- 进程退出时，杀死所有子进程
- 空闲超时(5分钟无请求) → 暂停进程（节省资源）
- Agent 中断(AbortSignal) → 立即终止所有 MCP 子进程

#### 资源隔离 (§ fix-19)

MCP 子进程 spawn 时附加资源限制，防止单进程拖垮主进程：

- **内存限制**: spawn 时传入 `--max-old-space-size=512`（Node.js MCP 进程可用），其他语言 MCP 通过 `resourceLimits` 参数配置
- **CPU 限制**: 不主动限制（MCP 应为 I/O 密集型），异常 CPU 占用由健康检查超时兜底（30s ping 无响应 → 标记 Error → 重启）
- **文件描述符**: 不主动限制（由操作系统默认值保证），异常泄漏由进程重启回收

```typescript
interface MCPResourceLimits {
  maxOldSpaceSize?: number;  // Node.js --max-old-space-size, 默认 512
  maxBufferSize?: number;    // stdout/stderr 最大缓冲, 默认 1MB
}
```

### 4.6 ModelAdapter

模型适配器抽象层。支持 chat 和 stream 两种模式。

#### Interface

```typescript
interface ModelAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
}
```

#### stream() 方法

- 返回 AsyncIterable，逐 chunk 发射 token
- 每个 chunk 包含：{ type: 'text' | 'tool_call', content: string }
- REPL 通过 for-await-of 逐 token 渲染到终端

#### Token 估算

- 优先依赖 API 返回的 usage 字段
- 降级方案：charCount / 3.5（中文每 token 约 1.5 char，英文约 3.5 char）
- 用于 context window 管理：当 estimated_total > max_tokens * 0.8 时，触发截断

```typescript
function estimateTokens(text: string): number {
  if (usage?.totalTokens) return usage.totalTokens;
  return Math.ceil(text.length / 3.5);
}
```

#### Tool Call 格式 (§ fix-2)

采用 OpenAI function_call 格式作为标准：

```typescript
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}
```

ModelAdapter 实现时，LLM 返回的 tool_calls 必须解析为此格式。非标准格式（如 Anthropic tool_use）由 ModelAdapter 适配层转换。

#### Tool Call 校验与重试 (§ fix-6)

LLM 返回的 tool_calls 经过 validate + retry 机制：

1. **校验**: 检查每个 tool_call 的 name 是否在已注册工具列表中，arguments 是否为合法 JSON
2. **重试**: 校验失败时，向 LLM 重发最近一条消息 + 错误提示，最多重试 2 次
3. **放弃**: 超过重试次数 → 跳过该 tool_call，记录错误到会话

```typescript
interface ToolCallValidation {
  valid: boolean;
  errors?: { index: number; reason: string }[];
}
```

#### Context 窗口管理 (§ fix-9)

当 estimated_total > max_tokens * 0.8 时，触发截断：

1. **保留** system 消息、工具调用结果和最近的 assistant/user 消息
2. **丢弃** 最旧的对话轮次（一对 user+assistant 消息），每次丢弃一轮
3. **上限** 工具调用结果保留，不因截断而被丢弃
4. 截断后重新计算 token 数，直到低于阈值

#### API 超时与限流 (§ fix-14)

- **超时**: ModelAdapter 默认 requestTimeout=120s，透传 AbortSignal
- **429 重试**: 收到 429/速率限制 → 指数退避重试（1s → 2s → 4s → 8s），最多 4 次
- **5xx 重试**: 服务器错误（500/502/503）→ 退避重试最多 2 次
- **不可恢复错误**: 4xx 非 429、认证失败 → 直接抛出，不重试

---

## 5. 技术选型与决策记录

### 5.1 架构决策记录 (ADR)

| ID | 决策 | 理由 | 时间 |
|----|------|------|------|
| ADR-001 | TypeScript + Node.js 运行时 | 团队熟悉，生态丰富 | 2026-06 |
| ADR-002 | MCP 协议作为工具扩展标准 | 行业标准，多语言支持 | 2026-06 |
| ADR-003 | AbortSignal 实现中断机制 | 原生 API，无需额外依赖 | 2026-06 |
| ADR-004 | 权限系统统一检查 MCP 工具 | 安全一致性，最小权限 | 2026-06 |
| ADR-005 | stream() 为 ModelAdapter 一等方法 | REPL 体验，逐 token 反馈 | 2026-06 |
| ADR-006 | Subagent 通过 task 工具调用 | 结构化，可追踪，可中断 | 2026-06 |

### 5.2 技术栈

| 层级 | 技术 | 理由 |
|------|------|------|
| 语言 | TypeScript 5.x | 类型安全，团队熟悉 |
| 运行时 | Node.js 20+ LTS | 稳定，ESM 支持完善 |
| MCP | @modelcontextprotocol/sdk | 官方 SDK |
| 测试 | 内置 test runner (Node) | 零依赖 |
| 配置 | YAML (js-yaml) | 可读性优于 JSON |
| 流式 | Node.js ReadableStream / AsyncIterable | 原生 API |

### 5.3 构建与运行 (§ fix-5)

```json
{
  "name": "daisycode",
  "type": "module",
  "scripts": {
    "dev": "tsx src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "node --test src/**/*.test.ts"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "tsx": "^4.0",
    "@types/node": "^20.0"
  }
}
```

- **开发**: `npm run dev` — tsx 直接运行 TypeScript，零配置
- **生产构建**: `npm run build` — tsc 编译到 dist/
- **生产运行**: `npm start` — node dist/main.js
- **测试**: `npm test` — Node 内置 test runner

---

## 6. 配置系统

### 6.1 配置来源

1. 默认配置（硬编码）
2. 用户配置文件（如 opencode.json / .daisy.yml）
3. 项目本地配置
4. 环境变量覆盖

### 6.2 配置合并策略：深合并

按 agent / skill / MCP 名称合并，不覆盖整个对象：

```yaml
# 用户配置只覆盖 temperature 和 model
agent:
  builder:
    temperature: 0.5
    model: "gpt-4"

# 合并结果：保留 defaults 的 description/permission，覆盖 temperature/model
```

#### 合并规则

- 简单类型（string/number/boolean）：覆盖
- 对象类型：递归合并（非覆盖）
- 数组类型：替换（不合并）
- 特殊字段（如 permission）：按 key 合并

#### 示意 (§ fix-17: 过滤 __proto__/constructor/prototype 防止原型污染)

```typescript
function deepMerge(target: any, source: any): any {
  if (isPlainObject(target) && isPlainObject(source)) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      // 过滤 __proto__、constructor、prototype 防止原型污染
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      result[key] = deepMerge(target[key], source[key]);
    }
    return result;
  }
  return source !== undefined ? source : target;
}
```

### 6.3 配置优先级

环境变量 > 用户配置 > 项目配置 > 默认配置

---

## 7. 数据流

### 7.1 用户交互流

```
用户输入 → REPL → Agent Engine → Skills Matcher(匹配trigger)
  → ModelAdapter.chat/stream(注入matched skills prompt)
  → LLM返回 → 解析tool_call
  → PermissionSystem.check(tool, args)
  → Tool Registry执行(内置)/MCP执行(子进程)
  → 结果返回Agent Loop → 继续下一次迭代
  → REPL逐token渲染stream输出
```

### 7.2 中断流

```
Ctrl+C → AbortController.abort()
  → Agent.run() 检测 signal.aborted
  → 终止当前工具调用（透传 AbortSignal 到子进程）
  → 清理 MCP 子进程
  → 抛出 AgentAbortedError
  → REPL 捕获，恢复提示符
```

### 7.3 Subagent 调用流

```
Agent A → task tool → Agent Engine
  → 创建 SubagentSession(B)
  → 注入 B 的 agent definition 到 system prompt
  → 调用 B 的 LLM
  → background=false: 等待 B 返回
  → background=true: 异步执行，A 继续
  → B 的结果写入会话记忆
```

#### 并发写冲突 (§ fix-8)

多 subagent 并发写入同一文件：使用基于路径的简单锁串行化，冲突时返回 `{ warning: "file_locked" }`。

#### Background Subagent 结果 (§ fix-16)

background=true 时，subagent 结果以摘要形式（前 500 字符 + "...[truncated]"）写入主会话，而非全量写入。完整结果存储在独立的 background session 中，父 agent 可通过专用工具查询。

---

## 8. API 接口设计

### 8.1 核心类型

```typescript
// 统一权限类型
type PermissionLevel = 'allow' | 'deny' | 'ask';
type AgentPermissions = Record<string, PermissionLevel>;

// 工具调用上下文
interface ToolContext {
  agent: string;
  permissions: AgentPermissions;  // 统一类型
  signal?: AbortSignal;
  sessionId: string;
}

// Chef 请求/响应
interface ChatRequest {
  messages: Message[];
  tools: ToolDefinition[];
  signal?: AbortSignal;
}

interface ChatResponse {
  message: Message;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

interface ChatChunk {
  type: 'text' | 'tool_call';
  content: string;
  index: number;
}

// MCP 进程状态
type MCPProcessState = 'created' | 'starting' | 'ready' | 'healthy' | 'error' | 'fatal';

interface MCPProcessConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  startupTimeout?: number;   // 默认 5000ms
  healthInterval?: number;   // 默认 30000ms
  maxRestarts?: number;      // 默认 3
  requestTimeout?: number;   // 默认 60000ms
}
```

#### 渲染安全 (§ fix-18)

REPL 输出渲染前的过滤：

- 过滤 ANSI 转义序列（保留可控的格式标记如颜色代码）
- 过滤 NULL 字节 (\x00)
- 过滤控制字符（除 \n \t \r 外）
- 超长行（>1000 字符）截断显示

### 8.2 Agent API

```typescript
interface Agent {
  run(input: string, options?: { signal?: AbortSignal }): AsyncIterable<AgentEvent>;
}
```

**空输入** (§ fix-11): `Agent.run("")` 不调用 LLM，不发事件，静默返回空迭代器。

```typescript
type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; tool: string; args: any }
  | { type: 'tool_result'; tool: string; result: any }
  | { type: 'error'; error: Error }
  | { type: 'done' };
```

### 8.3 ModelAdapter API

```typescript
interface ModelAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
}
```

---

## 9. 会话管理

### 9.1 会话持久化

- 会话存储在 `.daisy/sessions/{sessionId}.json`
- <!-- fix-10: 会话 JSON 损坏恢复 --> 读取时 try-catch JSON.parse，解析失败回退到 `{ messages: [] }` 空对话
- 写入时先写 `.tmp` 临时文件再原子重命名 `.json`，避免写入中断导致损坏

---

## 10. 分阶段实施计划

### Phase 1: 内核 (MVP)
1. Agent Loop (支持 AbortSignal)
2. 内置 5 工具 (read/edit/glob/grep/bash)
3. 配置系统 (深合并，含 __proto__ 过滤)
4. Permission System (MCP 工具统一检查)
5. REPL 基础交互 (含渲染安全过滤)

### Phase 2: 扩展
1. MCP 子进程管理器 (状态机 + 健康检查 + 自动重启 + JSON 校验)
2. ModelAdapter (chat + stream + token 估算 + 超时/退避 + tool_call 校验)
3. Skills Matcher (trigger 关键词匹配)
4. Subagent 调用 (task 工具, maxDepth=3)

### Phase 3: 完善
1. 会话记忆持久化 (含 JSON 损坏恢复)
2. 多模型支持
3. 插件热加载
4. Telemetry

---

## 11. 迁移方案

### 11.1 从 OpenCode 迁移

1. 复制 opencode.json 配置 → 适配 DaisyCode 格式
2. 迁移 agent 定义（格式兼容，按名称深合并）
3. 迁移 MCP 配置（格式一致）
4. 迁移 Skills（需要添加 trigger 字段）
5. .daisy/sessions/ 目录加入 .gitignore

### 11.2 兼容层

- 提供 opencode.json 配置读取兼容
- agent definition 向后兼容（缺少 mode 等字段时使用默认值）
- MCP 工具调用协议完全兼容

### 11.3 .gitignore 建议

```
node_modules/
.daisy/sessions/
*.log
.env
.env.local
```

- `.daisy/sessions/` — 会话历史记录，不应提交
- 用户可自建 `.daisy/` 目录存放本地配置

---

*文档版本: 1.2.0 | 最后更新: 2026-06-19*


