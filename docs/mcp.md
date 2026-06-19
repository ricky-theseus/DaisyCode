# MCP 扩展

## 概述

MCP（Model Context Protocol）是 DaisyCode 的扩展机制。通过 MCP，AI 可以调用外部工具——查询数据库、操作 GitHub、发送 HTTP 请求等。

DaisyCode 内核仅内置 5 个基础工具（读文件、写文件、搜索、执行命令），其余能力全部通过 MCP 按需加载。

## 配置格式

在 `daisy.jsonc` 中添加 `mcp` 字段：

```jsonc
{
  "mcp": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_你的token"
      }
    },
    "database": {
      "command": "node",
      "args": ["mcp-db-server.js"],
      "env": {
        "DB_URL": "postgres://localhost:5432/mydb"
      }
    }
  }
}
```

每个 MCP 服务器运行在独立进程中，崩溃后自动重启，不影响主程序。

### 配置字段

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `command` | string | 启动命令 | 是 |
| `args` | string[] | 命令行参数 | 否 |
| `env` | object | 环境变量（存放敏感信息） | 否 |

## 两种模式

### stdio 模式

服务器通过标准输入/输出与 DaisyCode 通信。适用于本地工具。

```jsonc
{
  "mcp": {
    "my-tool": {
      "command": "node",
      "args": ["path/to/server.js"]
    }
  }
}
```

### remote 模式

服务器通过 HTTP/SSE 远程连接。适用于远程服务或团队共享的工具。

```jsonc
{
  "mcp": {
    "remote-api": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/client", "--url", "https://mcp.example.com/sse"]
    }
  }
}
```

## 内置工具（无需配置）

| 工具 | 说明 | 默认权限 |
|------|------|---------|
| `read` | 读取文件 | allow |
| `edit` | 写入/修改文件 | ask |
| `write` | 创建新文件 | ask |
| `glob` | 搜索文件名 | allow |
| `grep` | 搜索文件内容 | allow |
| `bash` | 执行 Shell 命令 | ask |
| `task` | 委派子任务给指定 Agent | allow |

## 自定义 MCP 服务器

创建一个 `hello-mcp.js`：

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "hello-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 声明工具列表
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "greet",
    description: "向指定用户打招呼",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "用户名" }
      },
      required: ["name"]
    }
  }]
}));

// 实现工具逻辑
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "greet") {
    const name = request.params.arguments?.name || "World";
    return {
      content: [{ type: "text", text: `Hello, ${name}!` }]
    };
  }
  throw new Error("Unknown tool");
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

在 `daisy.jsonc` 中注册：

```jsonc
{
  "mcp": {
    "hello": {
      "command": "node",
      "args": ["hello-mcp.js"]
    }
  }
}
```

重启 DaisyCode 后，AI 即可使用 `greet` 工具。

## 协议接口

MCP 服务器需实现两个核心接口：

### tools/list

返回工具列表。每个工具包含：

- `name` — 工具名称
- `description` — 工具描述（AI 据此判断何时调用）
- `inputSchema` — 参数定义（JSON Schema 格式）

### tools/call

执行工具调用。接收 `name` 和 `arguments`，返回 `content` 数组。

## 最佳实践

1. **敏感信息放 env** — 不要在配置中硬编码密码和 Token，通过 `env` 字段或环境变量传入
2. **错误处理** — 工具报错时返回有意义的错误信息，便于 AI 理解并调整
3. **资源清理** — 进程退出时关闭数据库连接、文件句柄等资源
4. **进程隔离** — 每个 MCP 服务器独立运行，崩溃不影响 DaisyCode 主进程
