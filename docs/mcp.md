# MCP 扩展

## MCP 是什么？

MCP（Model Context Protocol）是 AI 界的"USB 接口"。通过它，AI 能调用外部工具——查数据库、操作 GitHub、发请求、读文件，什么都行。

DaisyCode 用 MCP 作为扩展机制。内核只带 5 个基础工具（读文件、写文件、搜索、执行命令），其他能力全靠 MCP 加。

## 配置 MCP 服务器

在 `daisy.jsonc` 里加 `mcpServers` 字段：

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

每个 MCP 服务器是一个独立进程，挂了会自动重启，不影响主程序。

### 配置项

| 字段 | 说明 | 必填 |
|------|------|------|
| `command` | 启动命令 | 是 |
| `args` | 参数 | 否 |
| `env` | 环境变量（放敏感信息） | 否 |

## 内置工具（不用配）

| 工具 | 说明 | 默认权限 |
|------|------|---------|
| `read` | 读文件 | allow |
| `edit` | 写文件 | ask |
| `glob` | 搜文件名 | allow |
| `grep` | 搜文件内容 | allow |
| `bash` | 执行命令 | ask |

## 写一个 MCP 服务器

创建一个 `hello-mcp.js`：

```javascript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "hello-tools", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// 告诉 AI 你有什么工具
server.setRequestHandler("tools/list", async () => ({
  tools: [{
    name: "greet",
    description: "跟人打个招呼",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "名字" }
      },
      required: ["name"]
    }
  }]
}));

// AI 调用工具时执行这里
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "greet") {
    const name = request.params.arguments?.name || "世界";
    return {
      content: [{ type: "text", text: `你好，${name}！` }]
    };
  }
  throw new Error("没这个工具");
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

然后在 `daisy.jsonc` 里加上：

```jsonc
{
  "mcpServers": {
    "hello": {
      "command": "node",
      "args": ["hello-mcp.js"]
    }
  }
}
```

重启 DaisyCode，AI 就能用 `greet` 工具了。

## 协议说明

MCP 服务器只需要实现两个接口：

### tools/list

返回工具列表。每个工具包含：
- `name` — 名字
- `description` — 描述（AI 靠这个决定什么时候用）
- `inputSchema` — 参数定义（JSON Schema 格式）

### tools/call

执行工具。收到 `name` 和 `arguments`，返回 `content` 数组。

## 最佳实践

1. **敏感信息放 env** — 别把密码写在配置里，用环境变量传
2. **错误处理** — 工具报错时返回有意义的错误信息
3. **资源清理** — 退出时关数据库连接、文件句柄
4. **进程隔离** — 每个 MCP 服务器独立进程，崩溃不影响主程序
