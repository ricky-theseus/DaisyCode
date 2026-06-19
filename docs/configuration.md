# 配置说明

配置文件是 `daisy.jsonc`（支持注释的 JSON）。

## 查找顺序

DaisyCode 按这个顺序找配置：

1. 当前目录的 `daisy.jsonc`
2. 当前目录的 `daisy.json`
3. `~/.daisy/config.jsonc`（用户目录）
4. `DAISY_CONFIG` 环境变量指定的路径

## 完整配置参考

```jsonc
{
  // ── 模型 ──
  "model": "deepseek/deepseek-chat",
  "baseUrl": "https://api.example.com/v1",

  // ── 模型参数 ──
  "modelOptions": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 0.9
  },

  // ── Agent 配置 ──
  "agent": {
    "default": {
      "description": "通用编程助手",
      "systemPrompt": "你是一个专业的编程助手。",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "glob": "allow",
        "grep": "allow",
        "bash": "ask"
      }
    },
    "reviewer": {
      "description": "代码审查员",
      "systemPrompt": "检查代码质量、安全性、性能。",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    }
  },

  // ── MCP 服务器 ──
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "postgres://localhost:5432/mydb"
      }
    }
  },

  // ── Skills ──
  "skills": {
    "include": ["typescript", "react"],
    "paths": ["./my-skills"]
  },

  // ── 会话 ──
  "session": {
    "autoSave": true,
    "maxHistory": 100,
    "dir": ".daisy/sessions"
  },

  // ── 日志 ──
  "logging": {
    "level": "info",
    "file": ".daisy/logs/daisy.log"
  }
}
```

## 字段详解

### model

格式：`provider/model-name`

| Provider | 示例 |
|----------|------|
| DeepSeek | `deepseek/deepseek-chat` |
| OpenAI | `openai/gpt-4o` |
| Anthropic | `anthropic/claude-sonnet-4-20250514` |
| 自定义 | `你的模型名`（配合 `baseUrl`） |

### agent

定义 Agent 角色。每个 agent 包含：

| 字段 | 说明 | 必填 |
|------|------|------|
| `description` | 角色描述 | 是 |
| `systemPrompt` | 系统提示词 | 否 |
| `permission` | 权限配置 | 是 |
| `model` | 单独指定模型 | 否 |
| `temperature` | 单独指定温度 | 否 |

#### 权限级别

| 级别 | 行为 |
|------|------|
| `allow` | 自动允许，不问你 |
| `deny` | 禁止使用 |
| `ask` | 执行前问你"可以吗？" |
| `restricted` | 只能在指定路径下操作 |

#### 内置工具

| 工具 | 说明 |
|------|------|
| `read` | 读文件 |
| `edit` | 写文件 |
| `glob` | 搜文件名 |
| `grep` | 搜文件内容 |
| `bash` | 执行 shell 命令 |

### mcpServers

每个 MCP 服务器配置：

| 字段 | 说明 | 必填 |
|------|------|------|
| `command` | 启动命令 | 是 |
| `args` | 参数 | 否 |
| `env` | 环境变量 | 否 |

### skills

| 字段 | 说明 |
|------|------|
| `include` | 启用的内置 skills |
| `paths` | 自定义 skills 目录 |

### session

| 字段 | 说明 | 默认值 |
|------|------|--------|
| `autoSave` | 自动保存会话 | `true` |
| `maxHistory` | 最大消息数 | `100` |
| `dir` | 存储目录 | `.daisy/sessions` |

## 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `DAISY_CONFIG` | 配置文件路径 |
| `DAISY_SESSION_DIR` | 会话存储目录 |
| `DAISY_LOG_LEVEL` | 日志级别 |
| `DAISY_NO_COLOR` | 禁用彩色输出 |
