# MCP 扩展指南

## 什么是 MCP？

MCP（Model Context Protocol）是一种开放协议，允许 AI Agent 通过标准化的接口接入外部工具和服务。DaisyCode 使用 MCP 作为主要扩展机制。

## 核心概念

- **MCP Server** — 一个独立的进程，提供一组工具
- **MCP Tool** — 一个具体的功能，如数据库查询、文件操作
- **MCP Client** — DaisyCode 内核中的 MCP 客户端，负责与 Server 通信

## 配置 MCP 服务器

在 `daisy.jsonc` 中配置：

```jsonc
{
  "mcpServers": {
    "database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "postgres://localhost:5432/mydb"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxx"
      }
    }
  }
}
```

### 配置项

| 字段 | 说明 | 必填 |
|------|------|------|
| `command` | 启动命令 | 是 |
| `args` | 命令行参数 | 否 |
| `env` | 环境变量 | 否 |
| `description` | 服务器描述 | 否 |

## 内置 MCP 工具

DaisyCode 内置了 5 个基础工具，无需额外配置：

| 工具 | 说明 | 默认权限 |
|------|------|---------|
| `read` | 读取文件内容 | allow |
| `edit` | 编辑文件 | ask |
| `glob` | 文件搜索 | allow |
| `grep` | 内容搜索 | allow |
| `bash` | 执行 Shell 命令 | ask |

## 开发 MCP 服务器

### 快速开始

创建一个简单的 MCP 服务器：

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'my-tools',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler('tools/list', async () => ({
  tools: [{
    name: 'hello',
    description: 'Say hello',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    },
  }],
}));

server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'hello') {
    const name = request.params.arguments?.name || 'World';
    return {
      content: [{ type: 'text', text: `Hello, ${name}!` }],
    };
  }
  throw new Error('Tool not found');
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

### 协议规范

MCP 工具需要实现两个端点：

#### tools/list

返回可用工具列表，每个工具包含：
- `name` — 工具名称
- `description` — 工具描述
- `inputSchema` — 输入参数的 JSON Schema

#### tools/call

执行工具调用，接收：
- `name` — 工具名称
- `arguments` — 调用参数

返回：
- `content` — 结果内容数组

## 最佳实践

### 1. 进程隔离

每个 MCP 服务器运行在独立的子进程中，崩溃不会影响主进程。

### 2. 环境变量

敏感信息通过环境变量传入，不要硬编码在配置中。

### 3. 错误处理

MCP 服务器应该优雅处理错误，返回有意义的错误信息。

### 4. 资源清理

MCP 服务器退出时应该清理资源（关闭数据库连接、文件句柄等）。

## 示例：数据库 MCP 服务器

```jsonc
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["mcp-postgres.js"],
      "env": {
        "PGHOST": "localhost",
        "PGPORT": "5432",
        "PGDATABASE": "mydb",
        "PGUSER": "user",
        "PGPASSWORD": "password"
      }
    }
  }
}
```

这个服务器可以提供 `query` 工具，让 AI Agent 直接执行 SQL 查询。
