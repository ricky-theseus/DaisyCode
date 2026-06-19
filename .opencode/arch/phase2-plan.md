# Phase 2 实施计划
**版本**: 1.0
**基于架构文档**: v1.3
**日期**: 2026-06-19

---

## 概述

Phase 2 在 Phase 1 内核之上，实现三个扩展系统：

| 模块 | 架构文档章节 | 前置依赖 |
|------|-------------|---------|
| MCP Client | §4.5 | Phase 1 全部就绪 |
| Skills System | §4.2 | Phase 1 全部就绪 |
| Custom Agents Orchestration | §4.1 (Subagent) | Skills System 完成 |

注意：架构文档 Phase 2 中的 ModelAdapter（§4.6）已在 Phase 1 实现，本阶段不重复。

---

## 1. 新文件清单

### 1.1 MCP Client（4 个文件）

| 文件 | 职责 | 行数预估 |
|------|------|---------|
| `src/mcp/types.ts` | MCP JSON-RPC 协议类型、请求/响应接口 | 60 |
| `src/mcp/transport.ts` | stdin/stdout JSON-RPC 2.0 传输层 | 100 |
| `src/mcp/client.ts` | 单个 MCP 子进程封装（init/listTools/callTool/生命周期） | 150 |
| `src/mcp/manager.ts` | 多 MCP 子进程管理器（状态机、健康检查、重启、注册到 ToolRegistry） | 200 |

### 1.2 Skills System（2 个文件）

| 文件 | 职责 | 行数预估 |
|------|------|---------|
| `src/skills/loader.ts` | SKILL.md YAML front-matter 解析、加载、缓存 | 100 |
| `src/skills/matcher.ts` | trigger 关键词匹配、prompt 注入、多匹配合并 | 120 |

### 1.3 Custom Agents Orchestration（2 个文件）

| 文件 | 职责 | 行数预估 |
|------|------|---------|
| `src/orchestrator.ts` | SubagentSession 管理（创建/销毁/深度计数/权限继承） | 180 |
| `src/tools/task.ts` | `task` 工具实现（对接 Orchestrator） | 80 |

---

## 2. 和 Phase 1 代码的接口关系

### 2.1 现有接口 —— 无需改动

这些 Phase 1 类型/接口开箱即用，MCP/Skills/Subagent 直接消费：

```typescript
// types.ts —— DaisyConfig 已有 skill/mcp 字段
export interface DaisyConfig {
  skill?: Record<string, Skill>;           // 已有，未实现
  mcp?: Record<string, MCPProcessConfig>;  // 已有，未实现
}

// types.ts —— Skill 类型已定义
export interface Skill {
  name: string;
  trigger: string[];
  description?: string;
  path?: string;
}

// types.ts —— MCPProcessConfig / MCPProcessState 已定义
export type MCPProcessState = 'created' | 'starting' | 'ready' | 'healthy' | 'error' | 'fatal';

// tools/types.ts —— ToolRegistry 是 MCP 工具的注册目标
registry.register(tool);  // MCP 工具就是往这里注册
registry.list();          // Agent Loop 已经遍历 registry.list()
registry.get(name);       // 已经用于工具执行

// permissions.ts —— PermissionSystem 用于工具调用前检查
// mergePermissions() —— 权限继承已实现，subagent 直接用
```

### 2.2 现有接口 —— 需要微调

| 文件 | 改动点 | 原因 |
|------|--------|------|
| `src/agent-loop.ts` | AgentOptions 增加 `skills?: SkillsMatcher` 和 `orchestrator?: Orchestrator` 两个可选字段 | Skills 注入 system prompt；Orchestrator 用于 `task` 工具回调 |
| `src/agent-loop.ts` | `run()` 中调用 `this.skills?.match(input)` 获取匹配技能 prompt，注入到 system message | 技能触发匹配 |
| `src/agent-loop.ts` | `run()` 中在 tool_call 执行前检查 `task` 工具走 orchestrator 而非 registry | task 工具特殊处理 |
| `src/tools/registry.ts` | `createDefaultRegistry()` 新增 `task` 工具注册 | Subagent 调用入口 |
| `src/index.ts` | 主入口创建 MCP Manager、Skills Matcher、Orchestrator，传入 Agent | 组装依赖 |

### 2.3 无改动的文件

| 文件 | 原因 |
|------|------|
| `src/tools/types.ts` | Tool 接口稳定，MCP 工具适配后也遵循此接口 |
| `src/permissions.ts` | check() 接口不变；mergePermissions() 已实现权限继承逻辑 |
| `src/session.ts` | 会话管理接口不变，subagent 使用独立 session |
| `src/repl.ts` | REPL 消费 AgentEvent，不关心工具来源 |

---

## 3. 实现顺序

```
Step 1: MCP Client 基础设施
  ├── src/mcp/types.ts        ← 协议类型
  ├── src/mcp/transport.ts    ← JSON-RPC over stdin/stdout
  ├── src/mcp/client.ts       ← 单进程封装
  └── src/mcp/manager.ts      ← 多进程管理 + ToolRegistry 集成

Step 2: Skills System
  ├── src/skills/loader.ts    ← SKILL.md 解析
  └── src/skills/matcher.ts   ← 匹配 + 注入

Step 3: Custom Agents Orchestration
  ├── src/orchestrator.ts     ← SubagentSession 管理
  └── src/tools/task.ts       ← task 工具实现

Step 4: 集成与入口
  └── src/index.ts            ← 组装所有模块
```

每个 Step 内部按 `types → implementation → integration` 顺序。

---

## 4. 关键技术点

### 4.1 MCP Client

**JSON-RPC 2.0 over stdin/stdout**

MCP 标准传输层。子进程 stdin 写请求，stdout 读响应。每条消息是一行 JSON（以 `\n` 分隔）：

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read","arguments":{"path":"foo.ts"}}}
{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"file content"}]}}
```

关键设计决策：

| 决策 | 选项 A | 选项 B | 选择 |
|------|--------|--------|------|
| MCP SDK vs 自实现 | `@modelcontextprotocol/sdk` | 手写 JSON-RPC | **自实现** —— MCP 协议足够简单（约5种方法），SDK 体积大（约500KB），额外依赖。自实现约 250 行覆盖全部需求 |
| 行分隔协议 | 单行 JSON | 流式 JSON | **单行 JSON** —— `\n` 分隔，readline 逐行读取，简单可靠 |
| 进程启动方式 | `child_process.spawn()` | `exec()`/`fork()` | **spawn** —— 需要 stdin/stdout 管道，spawn 是唯一选择 |

**状态机细节：**

```
created -> spawn() -> starting
starting -> 收到 initialize 响应 -> ready
ready -> 每 30s ping -> healthy
healthy -> ping 超时(3次) -> error
error -> 重启(最多3次, 指数退避) -> starting
fatal -> 从 ToolRegistry 移除该 MCP 的所有工具
```

**资源限制**（§ fix-19）：
- Node.js MCP 进程：`spawn()` 附带 `NODE_OPTIONS='--max-old-space-size=512'`
- 其他语言 MCP：通过 spawn 的 `resourceLimits` 传参

**JSON 校验**（§ fix-13）：所有 MCP stdout 输出经过 try-catch JSON.parse，失败返回 `mcp_invalid_response` 错误并触发重启。

### 4.2 Skills System

**SKILL.md 格式**

项目现有 skills 使用 YAML front-matter + Markdown body 格式（如 `.opencode/skills/`）。Skills System 解析同样格式：

```markdown
---
trigger:
  - "react"
  - "nextjs"
  - "frontend"
description: "React/Next.js 开发最佳实践"
---

## Skills Content
LLM 注入的 prompt 内容...
```

**加载策略：**
- 扫描配置中 `skill.<name>.path` 或默认路径（`skills/` 目录、`.opencode/skills/`）
- 解析 YAML front-matter + Markdown body -> 缓存为 `{ trigger, body }`
- 加载失败（文件不存在、YAML 解析错、缺 trigger 字段）-> 跳过，打印 warning，不影响其他 skill

**匹配规则：**
- 用户输入 -> 遍历已加载 skills -> 大小写不敏感匹配 trigger 关键词
- **词边界**：`/\breact\b/i` 避免 "reactor" 匹配
- 多匹配按配置顺序注入全部匹配 skill 的 body 到 system prompt
- 无匹配：使用默认 system prompt

**注入时机：**
- `Agent.run()` 开始时调用 `skills.match(input)` 一次
- 匹配结果拼接到 system message 末尾
- 整个 agent loop 周期内有效，不逐轮重新匹配

### 4.3 Custom Agents Orchestration

**Subagent 调用协议**

通过 `task` 工具实现，非文本解析：

```typescript
// LLM 生成的 tool_call
{
  name: "task",
  arguments: {
    agent: "builder",
    task: "实现 XXX 功能",
    background: false
  }
}
```

**Orchestrator 核心流程：**

```
Agent A 发出 task("builder", task)
-> Orchestrator 检查 maxDepth（当前 depth < 3）
-> 创建 SubagentSession（独立的 session id）
-> 计算继承权限（mergePermissions(parent, childConfig)）
-> 创建新的 Agent 实例（子进程 LLM + 子 session + 继承权限）
-> background=false: await Agent.run(task), 返回结果
-> background=true: Agent.run(task) 不 await, 结果摘要写入 parent session
-> 结果格式化为 tool_result 返回给父 agent
```

**深度限制**（§ fix-7）：`maxDepth=3`。Agent A -> B -> C 为 2 层（A 调 B 时 depth=1，B 调 C 时 depth=2）。超过时返回 `{ error: "max_depth_exceeded", maxDepth: 3 }`。Orchestrator 持有当前 depth 计数器。

**权限继承**（§ fix-15）：现有 `mergePermissions()` 已实现 `allow > ask > deny` 取严格值逻辑。Subagent 未配置的权限从父 agent 继承。直接复用。

**Background Subagent 结果**（§ fix-16）：
- `background=true`：结果截断为前 500 字符 + `...[truncated]`
- 完整结果存入独立的 background session
- 父 agent 可通过查询工具获取完整结果（Phase 3 实现查询工具，Phase 2 仅截断写入）

**文件锁**（§ fix-8）：多 subagent 并发写同一文件时返回 `{ warning: "file_locked" }`。Phase 2 实现基于路径的简易 Map 锁。

### 4.4 `task` 工具的特殊处理

`task` 工具不同于其他工具：
1. 不通过 ToolRegistry 执行（不走标准 execute 流程）
2. 在 Agent Loop 的 tool_call 处理分支中，检测到 name === 'task' 时，转交 Orchestrator
3. Orchestrator 负责调用 `Agent.run()` - 这意味着嵌套 agent loop
4. 权限检查：走标准 PermissionSystem.check('task', args, context)

### 4.5 配置变更

Phase 2 激活 `DaisyConfig` 已有的 `mcp` 和 `skill` 字段：

```yaml
# daisy.yml 示例
mcp:
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "."]
    startupTimeout: 10000

skill:
  react-dev:
    trigger: ["react", "nextjs", "frontend"]
    path: "./skills/react-dev.md"
```

### 4.6 依赖变更

| 操作 | 包 | 理由 |
|------|---|------|
| 不添加 | `@modelcontextprotocol/sdk` | JSON-RPC 自实现，免去 500KB 依赖 |

Phase 2 不引入新的 npm 依赖。全部使用 Node.js 内置 API（`child_process`、`readline`、`fs`）。

---

## 5. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| MCP 子进程僵尸进程 | 资源泄漏 | Agent 中断时 kill 全部子进程；进程退出事件处理中清理 |
| Skills 匹配性能（大量 skills） | 每次输入 O(n) 扫描 | Phase 2 不做优化（YAGNI）。skills 数量 < 100 时线性扫描足够快 |
| 嵌套 Agent 死循环 | 无限递归 | maxDepth=3 硬限制，超出返回错误 |
| 并发 subagent 文件冲突 | 数据覆盖 | 基于路径的简易锁，冲突时返回 warning（§ fix-8） |

---

## 6. 验收标准

### MCP Client
- [ ] MCP 子进程能成功启动并完成 initialize 握手
- [ ] 注册的工具出现在 ToolRegistry 中，Agent 可调用
- [ ] 健康检查 30s 周期正常，3 次无响应触发重启
- [ ] 重启 3 次失败后标记 fatal，从 registry 移除
- [ ] JSON 解析失败返回 `mcp_invalid_response`
- [ ] 通过 daisy.yml 配置 MCP 服务器正常

### Skills System
- [ ] SKILL.md 正确解析 front-matter 和 body
- [ ] trigger 关键词匹配生效，结果注入 system prompt
- [ ] 词边界匹配避免误触
- [ ] 文件不存在 / YAML 解析失败 / 缺 trigger -> 跳过不崩溃
- [ ] 多匹配按配置顺序注入

### Custom Agents
- [ ] `task` 工具调起 subagent 并正确执行
- [ ] maxDepth=3 限制生效
- [ ] 权限继承：`mergePermissions()` 结果正确
- [ ] background=true 异步执行，结果截断 500 字符
- [ ] 文件锁防冲突

---

*计划版本: 1.0 | 基于架构文档 v1.3*
