# 示例：加一个 MCP 工具

给 DaisyCode 加上 GitHub 工具，让 AI 能直接操作你的仓库。

## 1. 准备 GitHub Token

去 [GitHub Settings > Tokens](https://github.com/settings/tokens) 创建一个 token，勾上 `repo` 权限。

```bash
export GITHUB_TOKEN=ghp_你的token
```

## 2. 配置 MCP 服务器

编辑 `daisy.jsonc`，加上 `mcpServers`：

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

> 注意：`GITHUB_TOKEN` 也可以不写在配置里，用环境变量 `export GITHUB_TOKEN=xxx` 更安全。

## 3. 启动试试

```bash
daisy
```

看看工具有没有加载成功：

```
> /tools
```

应该能看到 GitHub 相关的工具，比如 `github_list_issues`、`github_create_issue` 等。

## 4. 让 AI 操作 GitHub

```
> 看看我的 DaisyCode 仓库有哪些 open issue
```

AI 会调用 GitHub MCP 工具查询。

```
> 帮我创建一个 issue，标题是"加一个搜索功能"，内容写"需要在首页加搜索框"
```

AI 会调用 `github_create_issue` 工具。

## 5. 再加一个数据库 MCP

同样的方式，加个 PostgreSQL 工具：

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

然后 AI 就能查数据库了：

```
> 查一下 orders 表最近 10 条记录
```

## 你学到了什么

- MCP 服务器在 `mcpServers` 里配置
- 每个服务器是 `command` + `args` + `env`
- 敏感信息放 `env` 里，别硬编码
- 加完配置重启 DaisyCode 就能用
- `/tools` 命令查看所有可用工具
