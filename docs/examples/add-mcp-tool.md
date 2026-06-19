# 示例：接入 MCP 工具

通过 MCP 为 DaisyCode 添加 GitHub 和 PostgreSQL 工具，让 AI 直接操作外部服务。

## 1. 准备 GitHub Token

前往 [GitHub Settings > Tokens](https://github.com/settings/tokens) 创建 Personal Access Token，勾选 `repo` 权限。

```bash
export GITHUB_TOKEN=ghp_你的token
```

## 2. 配置 GitHub MCP

编辑 `daisy.jsonc`，添加 `mcpServers` 配置：

```jsonc
{
  "model": "deepseek/deepseek-chat",
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_你的token"
      }
    }
  },
  "agent": {
    "default": {
      "description": "通用编程助手",
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

> 建议通过环境变量传入 `GITHUB_TOKEN`，而非硬编码在配置文件中。

## 3. 验证工具加载

```bash
daisy
```

进入交互模式后，使用 `/tools` 命令查看已加载的工具：

```
> /tools
```

输出应包含 GitHub 相关工具，如 `github_list_issues`、`github_create_issue` 等。

## 4. 操作 GitHub

查询仓库 Issue：

```
> 看看我的 DaisyCode 仓库有哪些 open issue
```

AI 会调用 GitHub MCP 工具查询并返回结果。

创建 Issue：

```
> 帮我创建一个 issue，标题是"添加搜索功能"，内容写"需要在首页加搜索框"
```

AI 调用 `github_create_issue` 工具完成创建。

## 5. 添加 PostgreSQL MCP

同样的方式接入数据库工具：

```jsonc
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_你的token"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic/server-postgres"],
      "env": {
        "PGHOST": "localhost",
        "PGPORT": "5432",
        "PGDATABASE": "mydb",
        "PGUSER": "myuser",
        "PGPASSWORD": "mypass"
      }
    }
  }
}
```

重启后即可查询数据库：

```
> 查一下 orders 表最近 10 条记录
```

## 要点总结

- MCP 服务器在 `mcpServers` 字段中配置
- 每个服务器由 `command` + `args` + `env` 定义
- 敏感信息通过 `env` 或环境变量传入，避免硬编码
- 配置完成后重启 DaisyCode 生效
- `/tools` 命令查看所有可用工具
