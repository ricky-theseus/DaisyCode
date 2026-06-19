# 配置说明

## 配置文件

DaisyCode 使用 `daisy.jsonc` 作为配置文件，支持 JSONC 格式（带注释的 JSON）。

### 查找顺序

1. 当前目录的 `daisy.jsonc`
2. 当前目录的 `daisy.json`
3. 用户目录 `~/.daisy/config.jsonc`
4. 环境变量 `DAISY_CONFIG` 指定的路径

## 完整配置

```jsonc
{
  // 模型配置
  "model": "deepseek/deepseek-chat",

  // 自定义 API 地址（OpenAI 兼容 API）
  "baseUrl": "https://api.example.com/v1",

  // 模型参数
  "modelOptions": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 0.9
  },

  // Agent 配置
  "agent": {
    "default": {
      "description": "通用编程助手",
      "systemPrompt": "你是一个专业的编程助手...",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "glob": "allow",
        "grep": "allow",
        "bash": "ask"
      }
    }
  },

  // MCP 服务器配置
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "postgres://localhost:5432/mydb"
      }
    }
  },

  // Skills 配置
  "skills": {
    "include": ["typescript", "react"],
    "paths": ["./my-skills"]
  },

  // 会话配置
  "session": {
    "autoSave": true,
    "maxHistory": 100,
    "dir": ".daisy/sessions"
  },

  // 日志配置
  "logging": {
    "level": "info",
    "file": ".daisy/logs/daisy.log"
  }
}
```

## 配置项详解

### model

指定使用的模型，格式为 `provider/model-name`。

| Provider | 格式 | 示例 |
|----------|------|------|
| DeepSeek | `deepseek/<model>` | `deepseek/deepseek-chat` |
| OpenAI | `openai/<model>` | `openai/gpt-4o` |
| Anthropic | `anthropic/<model>` | `anthropic/claude-sonnet-4-20250514` |
| 自定义 | `<model>` | `custom-model` |

### agent

定义 Agent 角色。每个 Agent 包含：

- **description** — 角色描述
- **systemPrompt** — 系统提示词（可选，覆盖默认）
- **permission** — 权限配置

#### 权限级别

| 级别 | 说明 |
|------|------|
| `allow` | 自动允许，无需确认 |
| `deny` | 禁止使用 |
| `ask` | 执行前询问用户 |
| `restricted` | 仅允许在指定路径下操作 |

#### 内置工具

| 工具 | 说明 |
|------|------|
| `read` | 读取文件 |
| `edit` | 编辑文件 |
| `glob` | 文件搜索 |
| `grep` | 内容搜索 |
| `bash` | Shell 命令执行 |

### mcpServers

配置 MCP 服务器，每个服务器包含：

- **command** — 启动命令
- **args** — 命令行参数
- **env** — 环境变量

### skills

Skills 配置：

- **include** — 启用的内置 Skills 列表
- **paths** — 自定义 Skills 目录

### session

会话管理配置：

- **autoSave** — 是否自动保存会话
- **maxHistory** — 最大历史消息数
- **dir** — 会话存储目录

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `DAISY_CONFIG` | 配置文件路径 |
| `DAISY_SESSION_DIR` | 会话存储目录 |
| `DAISY_LOG_LEVEL` | 日志级别 |
