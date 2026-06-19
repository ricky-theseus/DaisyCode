# CLI 命令参考

## daisy — 启动 AI Agent

启动交互式会话或执行单次任务。

```bash
# 交互模式（推荐）
daisy

# 单次执行
daisy "创建一个 Express 服务器"

# 指定模型
daisy --model openai/gpt-4o "重构这个函数"

# 指定 Agent 角色
daisy --agent reviewer "审查代码"

# 仅显示执行计划，不实际执行
daisy --dry-run "重构 utils.ts"
```

## daisy connect — 配置 AI Provider

管理 AI 模型提供商。首次运行 `daisy` 时会自动进入配置向导。

```bash
# 交互式菜单
daisy connect

# 列出已配置的 provider
daisy connect list

# 移除 provider
daisy connect remove groq
```

支持的 Provider：

| Provider | 费用 | 配置方式 |
|----------|------|---------|
| Groq | 免费（30 req/min） | API Key |
| DeepSeek | 付费 | API Key |
| OpenAI | 付费 | API Key |
| Anthropic | 付费 | API Key |
| Custom | 自定 | Base URL + API Key |

## daisy init — 初始化配置

在当前目录生成 `daisy.jsonc` 配置文件。

```bash
daisy init
```

## daisy migrate — 迁移配置

将旧版本配置迁移到当前版本格式。

```bash
daisy migrate
```

## daisy export — 导出会话

导出指定会话历史记录为 Markdown。

```bash
daisy export <sessionId>
```

## 全局选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--version` | `-v` | 显示版本号 |
| `--help` | `-h` | 显示帮助信息 |
| `--dir <path>` | `-d` | 项目目录（默认：当前目录） |
| `--agent <name>` | `-a` | 指定 Agent 角色 |

## REPL 内部命令

交互模式中使用的命令，以 `/` 开头。

### 会话管理

| 命令 | 说明 |
|------|------|
| `/exit` 或 `Ctrl+C` | 退出 |
| `/clear` | 清空当前会话 |
| `/save` | 保存会话 |
| `/load <name>` | 加载指定会话 |
| `/list` | 列出所有会话 |
| `/resume` | 恢复上次会话 |

### Agent 切换

| 命令 | 说明 |
|------|------|
| `/agent <name>` | 切换到指定 Agent |
| `/agents` | 列出所有 Agent |
| `/default` | 切回默认 Agent |

### 模型切换

| 命令 | 说明 |
|------|------|
| `/model <name>` | 切换模型 |
| `/models` | 列出可用模型 |

### 调试

| 命令 | 说明 |
|------|------|
| `/verbose` | 切换详细输出 |
| `/tokens` | 显示 Token 用量 |
| `/cost` | 显示费用估算 |
| `/debug` | 显示调试信息 |

### 工具

| 命令 | 说明 |
|------|------|
| `/tools` | 列出所有可用工具 |
| `/permissions` | 显示当前权限配置 |

## 实用技巧

### 管道输入

```bash
cat requirements.txt | daisy "根据这个生成 package.json"
```

### 输出重定向

```bash
daisy "分析项目依赖" > analysis.md
```

### CI/CD 集成

```bash
daisy --agent reviewer "审查本次 PR 的代码变更"
```

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 一般错误 |
| 2 | 配置错误 |
| 3 | API 错误 |
| 4 | 权限错误 |
