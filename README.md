# DaisyCode

> 一个轻量化、可扩展的 AI Coding Agent

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/ricky-theseus/DaisyCode)](https://github.com/ricky-theseus/DaisyCode)
[![Issues](https://img.shields.io/github/issues/ricky-theseus/DaisyCode)](https://github.com/ricky-theseus/DaisyCode/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

## 简介

DaisyCode 是一个轻量化的 AI Coding Agent。核心理念：**内核极小，能力全可扩展。**

- 内核只有 Agent Loop + 5 个基础工具 + 权限系统 + 会话记忆
- 所有高级能力通过 MCP / Skills / Custom Agents 三层扩展接入
- 零学习门槛——开发者通过配置文件即可扩展，不需要改内核代码

## 核心特性

- **内核极简** — ~1500 行 TypeScript，2 个运行时依赖
- **可扩展** — MCP 协议接入任意工具，Skills 注入专业技能，Custom Agents 自定义角色
- **权限可控** — 四级权限（allow/deny/ask/restricted），所有工具统一鉴权
- **流式输出** — 逐 token 渲染，支持中断恢复
- **子进程隔离** — MCP 工具进程级隔离，崩溃自动重启
- **多 Provider** — 支持 DeepSeek / OpenAI / Anthropic 及任意 OpenAI 兼容 API

## 支持的 Provider

| Provider | 环境变量 | 默认模型 |
|----------|---------|---------|
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| 自定义 (OpenAI 兼容) | `OPENAI_API_KEY` + `baseURL` | 自定义 |

Provider 自动检测：按 `DEEPSEEK_API_KEY` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` 优先级选择。也可通过配置文件指定。

## 安装

```bash
npm install -g daisycode
```

## 快速开始

```bash
# 初始化项目
cd your-project
daisy init

# 设置 API Key（任选一个）
export DEEPSEEK_API_KEY=sk-xxx
# 或 export OPENAI_API_KEY=sk-xxx
# 或 export ANTHROPIC_API_KEY=sk-ant-xxx

# 启动交互式 REPL
daisy
```

### 使用自定义 OpenAI 兼容 API

```bash
# 设置环境变量
export OPENAI_API_KEY=sk-xxx
# 启动时指定 baseURL
daisy --model "custom-model" --base-url "https://your-api.com/v1"
```

## 架构

```
┌─────────────┐     ┌──────────────────────────┐
│   开发者      │────▶│  DaisyCode 内核（极小）     │
└─────────────┘     │  • Agent Loop             │
                    │  • 权限系统                │
                    │  • 会话记忆                │
                    │  • 模型抽象 (多 Provider)   │
                    └──────┬───────┬────────────┘
                           │       │
                    ┌──────▼──┐ ┌──▼──────────┐
                    │   MCP   │ │   Skills    │
                    │  工具接入 │ │  专业技能    │
                    └─────────┘ └─────────────┘
                           │
                    ┌──────▼──────────┐
                    │  Custom Agents  │
                    │  多 Agent 编排   │
                    └─────────────────┘
```

## 项目结构

```
DaisyCode/
├── src/                   # 源码
│   ├── index.ts           # CLI 入口
│   ├── agent-loop.ts      # Agent 循环引擎
│   ├── model-adapter.ts   # 模型抽象（多 Provider）
│   ├── orchestrator.ts    # 多 Agent 编排
│   ├── permissions.ts     # 权限系统
│   ├── session.ts         # 会话管理
│   ├── repl.ts            # 交互式终端
│   ├── config.ts          # 配置加载
│   ├── types.ts           # 类型定义
│   ├── tools/             # 内置工具
│   ├── skills/            # Skills 系统
│   ├── mcp/               # MCP 协议
│   └── commands/          # CLI 子命令
├── tests/                 # 测试
├── .opencode/             # 开发团队配置
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## 配置

项目根目录创建 `daisy.jsonc`：

```jsonc
{
  "model": "deepseek/deepseek-chat",
  "agent": {
    "default": {
      "description": "General coding assistant",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "glob": "allow",
        "grep": "allow",
        "bash": "ask"
      }
    }
  }
}
```

## 开发

DaisyCode 本身由一个 AI Agent 团队开发：

| 角色 | 职责 |
|------|------|
| Architect | 架构设计、技术选型 |
| Builder | 功能实现、编码 |
| Reviewer | Code Review、安全审计 |
| Tester | 测试编写与执行 |
| Documenter | 文档编写 |
| DevOps | CI/CD、部署 |

详见 [AGENTS.md](AGENTS.md) 和 [CONTEXT.md](CONTEXT.md)。

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
