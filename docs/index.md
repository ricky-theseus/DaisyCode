# DaisyCode 文档

> 一个轻量化、可扩展的 AI Coding Agent 运行时

## 什么是 DaisyCode？

DaisyCode 是一个 **AI Coding Agent 运行时**，核心理念是**内核极小，能力全可扩展**。它不是一个 IDE 插件，而是一个独立的 CLI 工具，可以在任何项目中运行 AI Agent。

### 设计哲学

- **内核极简** — 核心只有 Agent Loop + 5 个基础工具 + 权限系统 + 会话记忆，约 1500 行 TypeScript
- **三层扩展** — MCP 协议接入任意工具，Skills 注入专业技能，Custom Agents 自定义角色
- **零学习门槛** — 开发者通过配置文件即可扩展，不需要改内核代码
- **权限可控** — 四级权限模型，所有工具统一鉴权

### 适用场景

- 代码生成与重构
- 项目脚手架搭建
- 自动化代码审查
- 文档生成
- 数据库迁移脚本
- 任意需要 AI 辅助的编程任务

## 快速开始

```bash
# 全局安装
npm install -g daisycode

# 进入项目目录
cd your-project

# 初始化配置
daisy init

# 设置 API Key
export DEEPSEEK_API_KEY=sk-xxx

# 启动交互式 REPL
daisy
```

## 核心特性

| 特性 | 说明 |
|------|------|
| 多 Provider | 支持 DeepSeek / OpenAI / Anthropic 及任意 OpenAI 兼容 API |
| 流式输出 | 逐 token 渲染，支持中断恢复 |
| 子进程隔离 | MCP 工具进程级隔离，崩溃自动重启 |
| 权限系统 | 四级权限：allow / deny / ask / restricted |
| 会话管理 | 自动保存会话历史，支持恢复 |
| 可扩展 | MCP / Skills / Custom Agents 三层扩展 |

## 文档导航

- [安装指南](installation.md) — 系统要求、安装方式
- [使用指南](usage.md) — CLI 使用、配置文件、最佳实践
- [配置说明](configuration.md) — 完整配置参考
- [模型供应方](providers.md) — 支持的模型和 API 配置
- [MCP 扩展](mcp.md) — MCP 协议和工具扩展
- [Skills 系统](skills.md) — 专业技能注入
- [Custom Agents](agents.md) — 自定义 Agent 角色
- [CLI 命令](cli.md) — 完整命令参考

## 架构概览

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

## 项目地址

GitHub: [https://github.com/ricky-theseus/DaisyCode](https://github.com/ricky-theseus/DaisyCode)
