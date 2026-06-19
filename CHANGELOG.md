# 更新日志

所有版本变更记录。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

## [1.0.0] - 2026-06-19

### Added

#### Phase 1 — 内核 (Kernel)
- Agent Loop 核心引擎：多轮 tool-calling 循环，支持中断恢复
- 6 个基础工具：read / edit / write / glob / grep / bash
- 四级权限系统：allow / deny / ask / restricted
- 会话记忆：自动持久化到 `.daisy/sessions/`
- REPL 交互式终端：流式输出、彩色渲染
- 模型抽象层：`ModelAdapter` interface（chat + stream）
- DeepSeek 适配器：支持 deepseek-chat 模型

#### Phase 2 — 扩展 (Extensibility)
- MCP 协议支持：子进程管理、健康检查、自动重启
- Skills 系统：关键词匹配 + prompt 注入
- Custom Agents：多 Agent 编排、子任务委派
- 文件锁机制：防止并发写入冲突
- Skills Matcher：智能技能匹配与组合

#### Phase 3 — 工程化 (Engineering)
- CLI 命令：`daisy init` / `daisy migrate` / `daisy export`
- 会话导出：Markdown 格式导出完整对话
- CI 配置：GitHub Actions 自动测试
- 配置系统：支持 JSON / JSONC / YAML 三种格式
- 项目级 + 用户级配置合并

#### Phase 4 — 发布 (Release)
- 多 Provider 支持：DeepSeek / OpenAI / Anthropic
- `ModelFactory`：自动检测环境变量选择 provider
- 自定义 baseURL：支持任意 OpenAI 兼容 API
- npm 发布配置：`files` 白名单、`.npmignore`、`engines` 约束
- 完整 README：安装指南、使用示例、provider 说明
- CONTEXT.md：项目上下文文档

[1.0.0]: https://github.com/ricky-theseus/DaisyCode/releases/tag/v1.0.0
