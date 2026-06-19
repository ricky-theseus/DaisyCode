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

## 架构

```
┌─────────────┐     ┌──────────────────────────┐
│   开发者      │────▶│  DaisyCode 内核（极小）     │
└─────────────┘     │  • Agent Loop             │
                    │  • 权限系统                │
                    │  • 会话记忆                │
                    │  • 模型抽象                │
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

## 快速开始

```bash
# 安装（即将发布）
npm install -g daisycode

# 初始化项目
cd your-project
daisy init

# 启动
daisy
```

## 项目结构

```
DaisyCode/
├── src/                   # 源码（开发中）
├── .opencode/             # 开发团队配置
│   ├── agents/            # 开发用 AI Agent 角色
│   ├── arch/              # 架构设计文档
│   └── prompts/           # Agent 提示词
├── docs/                  # 用户文档
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── CHANGELOG.md
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

详见 [AGENTS.md](AGENTS.md)。

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
