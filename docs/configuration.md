# 配置参考

配置文件为 `daisy.jsonc`（支持注释的 JSON 格式），也支持 YAML（`daisy.yaml` / `daisy.yml`）。

## 配置查找顺序

1. 当前目录 `daisy.jsonc`
2. 当前目录 `daisy.json`
3. 当前目录 `daisy.yaml`
4. 当前目录 `daisy.yml`
5. `~/.daisy/config.jsonc`（用户级全局配置）
6. `~/.daisy/config.json`
7. `~/.daisy/config.yaml`
8. `~/.daisy/config.yml`
9. `DAISY_CONFIG` 环境变量指定路径

项目级配置优先于用户级配置，合并生效。

## 完整配置

```jsonc
{
  // ── 模型 ──
  "model": "deepseek-chat",
  "baseUrl": "https://api.example.com/v1",

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
  "mcp": {
    "database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "postgres://localhost:5432/mydb"
      }
    }
  },

  // ── Skills ──
  "skill": {
    "typescript": {
      "name": "typescript",
      "trigger": ["typescript", "ts"],
      "description": "TypeScript 编码规范",
      "path": ".opencode/skills/typescript.md"
    },
    "react": {
      "name": "react",
      "trigger": ["react", "jsx"],
      "description": "React 组件开发指南",
      "path": ".opencode/skills/react.md"
    }
  }
}
```

## 字段详解

### model

格式：模型名称（无需 provider 前缀，由环境变量自动检测）

| Provider | 示例 |
|----------|------|
| DeepSeek | `deepseek-chat` |
| OpenAI | `gpt-4o` |
| Anthropic | `claude-sonnet-4-20250514` |
| 自定义 | `模型名`（需配合 `baseUrl`） |

### agent

定义 Agent 角色。详见[自定义 Agent](agents.md)。

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `description` | string | 角色描述 | 否 |
| `systemPrompt` | string | 系统提示词 | 否 |
| `permission` | object | 权限配置 | 否 |
| `model` | string | 单独指定模型 | 否 |
| `temperature` | number | 单独指定温度 | 否 |
| `color` | string | 终端显示颜色 | 否 |

#### 权限级别

| 级别 | 行为 |
|------|------|
| `allow` | 自动允许，无需确认 |
| `deny` | 禁止使用 |
| `ask` | 执行前询问用户 |
| `restricted` | 仅在指定路径下允许 |

#### 内置工具

| 工具 | 说明 |
|------|------|
| `read` | 读取文件 |
| `edit` | 写入/修改文件 |
| `glob` | 搜索文件名 |
| `grep` | 搜索文件内容 |
| `bash` | 执行 Shell 命令 |

### mcp

每个 MCP 服务器配置。详见 [MCP 扩展](mcp.md)。

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `command` | string | 启动命令 | 是 |
| `args` | string[] | 命令行参数 | 否 |
| `env` | object | 环境变量 | 否 |
| `startupTimeout` | number | 启动超时（毫秒） | 否 |
| `healthInterval` | number | 健康检查间隔（毫秒） | 否 |
| `maxRestarts` | number | 最大重启次数 | 否 |
| `requestTimeout` | number | 请求超时（毫秒） | 否 |

### skill

每个 Skill 是一个对象，键为 Skill 名称，值为 Skill 配置。详见 [Skills 系统](skills.md)。

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `name` | string | Skill 名称 | 是 |
| `trigger` | string[] | 触发关键词 | 是 |
| `description` | string | 描述 | 否 |
| `path` | string | SKILL.md 文件路径 | 否 |
| `prompt` | string | 直接注入的提示词（加载后填充） | 否 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `GROQ_API_KEY` | Groq API Key（最高优先级） |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `DAISY_CONFIG` | 配置文件路径 |
