# DaisyCode 项目上下文

## 项目架构概览

DaisyCode 是一个 AI Coding Agent 运行时，采用**微内核 + 扩展**架构：

```
┌──────────────────────────────────────────────┐
│                  CLI (index.ts)               │
├──────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Agent    │  │ 权限系统  │  │ 会话管理    │ │
│  │ Loop     │  │          │  │            │ │
│  └────┬─────┘  └──────────┘  └────────────┘ │
│       │                                       │
│  ┌────▼─────┐  ┌──────────┐  ┌────────────┐ │
│  │ Model    │  │  Tools   │  │  Skills    │ │
│  │ Adapter  │  │  Registry│  │  Matcher   │ │
│  └──────────┘  └──────────┘  └────────────┘ │
│       │                                       │
│  ┌────▼─────┐  ┌──────────┐                  │
│  │ MCP      │  │Orchestr.│                  │
│  │ Manager  │  │         │                  │
│  └──────────┘  └──────────┘                  │
└──────────────────────────────────────────────┘
```

### 核心模块

| 模块 | 文件 | 职责 |
|------|------|------|
| CLI 入口 | `src/index.ts` | 参数解析、子命令分发、初始化 |
| Agent Loop | `src/agent-loop.ts` | 多轮 tool-calling 循环引擎 |
| 模型抽象 | `src/model-adapter.ts` | 多 Provider 统一接口 |
| 编排器 | `src/orchestrator.ts` | 多 Agent 子任务委派 |
| 权限系统 | `src/permissions.ts` | 四级权限控制 |
| 会话管理 | `src/session.ts` | 会话持久化与导出 |
| 配置加载 | `src/config.ts` | JSON/YAML 配置合并 |
| REPL | `src/repl.ts` | 交互式终端 |
| 工具注册 | `src/tools/` | 内置工具实现 |
| Skills | `src/skills/` | 技能匹配与注入 |
| MCP | `src/mcp/` | 子进程工具协议 |
| 命令 | `src/commands/` | CLI 子命令 |

## 技术栈

- **运行时**: Node.js >= 20
- **语言**: TypeScript 5.5+ (strict mode)
- **构建**: tsc (TypeScript Compiler)
- **测试**: Node.js 内置 test runner (`node:test`)
- **依赖**: 仅 `js-yaml`（运行时），`tsx` + `typescript` + `@types/node`（开发）
- **无第三方 LLM SDK** — 所有 API 调用使用原生 `fetch` + 手写请求

## 目录结构

```
DaisyCode/
├── src/                     # 源码
│   ├── index.ts             # CLI 入口
│   ├── agent-loop.ts        # Agent 循环引擎
│   ├── model-adapter.ts     # 模型抽象（多 Provider）
│   ├── orchestrator.ts      # 多 Agent 编排
│   ├── permissions.ts       # 权限系统
│   ├── session.ts           # 会话管理
│   ├── repl.ts              # 交互式终端
│   ├── config.ts            # 配置加载
│   ├── types.ts             # 类型定义
│   ├── tools/               # 内置工具
│   │   ├── types.ts         # ToolRegistry 定义
│   │   ├── registry.ts      # 默认工具注册
│   │   ├── read.ts          # 文件读取
│   │   ├── edit.ts          # 文件编辑
│   │   ├── write.ts         # 文件写入
│   │   ├── glob.ts          # 文件搜索
│   │   ├── grep.ts          # 内容搜索
│   │   ├── bash.ts          # 命令执行
│   │   └── task.ts          # 子任务委派
│   ├── skills/              # Skills 系统
│   │   ├── loader.ts        # 技能加载
│   │   └── matcher.ts       # 技能匹配
│   ├── mcp/                 # MCP 协议
│   │   ├── manager.ts       # 子进程管理
│   │   └── client.ts        # MCP 客户端
│   └── commands/            # CLI 子命令
│       ├── init.ts          # daisy init
│       └── migrate.ts       # daisy migrate
├── tests/                   # 测试
│   ├── agent-loop.test.ts
│   ├── config.test.ts
│   ├── mcp.test.ts
│   ├── orchestrator.test.ts
│   ├── permissions.test.ts
│   ├── session.test.ts
│   ├── skills.test.ts
│   └── tools.test.ts
├── .opencode/               # 开发团队配置
│   ├── agents/              # AI Agent 角色定义
│   ├── arch/                # 架构设计文档
│   └── prompts/             # Agent 提示词
├── dist/                    # 编译产物
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── AGENTS.md
└── CONTEXT.md
```

## 开发指南

### 环境要求

- Node.js >= 20
- 一个 LLM API Key（DeepSeek / OpenAI / Anthropic）

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode

# 安装依赖
npm install

# 设置 API Key
set DEEPSEEK_API_KEY=sk-xxx

# 开发模式运行（tsx 热重载）
npm run dev

# 构建
npm run build

# 运行编译版本
npm start
```

### 测试

```bash
# 运行所有测试
npm test

# 运行单个测试文件
node --import tsx --test tests/agent-loop.test.ts
```

### 构建发布

```bash
# 编译 TypeScript
npm run build

# 本地测试发布包
npm pack

# 发布到 npm
npm publish
```

## AI Agent 团队结构

DaisyCode 本身由一个 AI Agent 团队开发，通过 `opencode.json` 配置：

| 角色 | 标识 | 职责 |
|------|------|------|
| Tech Lead | `@tech-lead` | 需求拆解、任务分配、进度汇报 |
| Architect | `@architect` | 架构设计、技术选型 |
| Builder | `@builder` | 功能实现、编码 |
| Reviewer | `@reviewer` | Code Review、安全审计 |
| Tester | `@tester` | 测试编写与执行 |
| Documenter | `@documenter` | 文档编写 |
| DevOps | `@devops` | CI/CD、部署 |

工作流程：`需求 → Tech Lead（拆解）→ 各 Agent（执行）→ Tech Lead（汇总）→ 验收`

详见 [AGENTS.md](AGENTS.md)。

## 设计原则

1. **内核极小** — 只包含不可省略的核心逻辑，所有扩展通过 MCP/Skills/Agents 三层接入
2. **零新依赖** — 优先使用 Node.js 内置 API，运行时依赖控制在最少
3. **TypeScript strict** — 全项目 strict 模式，类型安全
4. **YAGNI** — 不提前抽象，不为"以后可能"的场景写代码
5. **可测试** — 核心逻辑都有测试覆盖，测试使用 Node.js 内置 runner
