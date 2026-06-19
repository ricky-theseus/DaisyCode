# DaisyCode

> AI Coding Agent 团队配置 —— 一键搭建你的 AI 开发团队

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![OpenCode](https://img.shields.io/badge/powered%20by-opencode-2563eb)](https://opencode.ai)
[![Last Commit](https://img.shields.io/github/last-commit/ricky-theseus/DaisyCode)](https://github.com/ricky-theseus/DaisyCode)
[![Issues](https://img.shields.io/github/issues/ricky-theseus/DaisyCode)](https://github.com/ricky-theseus/DaisyCode/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

## 📖 简介

DaisyCode 是一套基于 [OpenCode](https://opencode.ai) 构建的 AI Coding Agent 团队配置，包含 7 个专业角色：Tech Lead / Architect / Builder / Reviewer / Tester / Documenter / DevOps。只需一句需求，AI 团队自动完成从设计到部署的全流程。

## ✨ 核心特性

- **一键启动** — `opencode` 启动，自动加载 7 角色 AI 团队
- **角色协作** — 需求分析 → 架构设计 → 编码 → 审查 → 测试 → 文档 → 部署
- **完整工作流** — 从需求到交付的端到端自动化
- **可定制** — 修改 `opencode.json` 即可调整团队配置
- **企业级设计** — 背景子代理、三级权限、MCP 工具集成

## 🚀 快速开始

### 前提条件

- [OpenCode](https://opencode.ai) CLI 或桌面端
- Git

### 安装

```bash
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode
opencode
```

### 使用

直接与 Tech Lead 对话，用自然语言描述你的需求。例如：

```
我想做一个 Python 爬虫，帮我抓取新闻标题并存到 SQLite 数据库
```

Tech Lead 会自动拆解任务并分派给 Architect → Builder → Reviewer → Tester。

## 📂 项目结构

```
DaisyCode/
├── opencode.json              # Agent 团队配置（核心）
├── .opencode/                 # OpenCode 配置
│   ├── agents/                # Agent 角色定义
│   ├── prompts/               # 系统提示词
│   └── arch/                  # 架构设计文档
├── docs/                      # 项目文档
├── AGENTS.md                  # 团队角色说明书
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
└── SECURITY.md
```

## 🧑‍💻 团队角色

| 角色 | 职责 | 工作模式 |
|------|------|----------|
| 👤 **老板** | 描述需求、做决策、验收成果 | 直接对话 |
| 🤖 **Tech Lead** | 技术主管、任务拆解、进度汇报 | 默认对话对象 |
| 🤖 **Architect** | 系统架构设计、技术选型 | `@architect` |
| 🤖 **Builder** | 功能实现、编写代码 | `@builder` |
| 🤖 **Reviewer** | Code Review、安全审计 | `@reviewer` |
| 🤖 **Tester** | 测试编写与执行 | `@tester` |
| 🤖 **Documenter** | 文档编写与维护 | `@documenter` |
| 🤖 **DevOps** | CI/CD、构建部署 | `@devops` |

## 🤝 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)
