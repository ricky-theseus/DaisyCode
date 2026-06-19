# 快速开始

5 分钟跑通 DaisyCode。

## 1. 安装

```bash
npm install -g daisycode
```

验证：

```bash
daisy --version
# 应该输出 1.x.x
```

> Node.js 版本要求 >= 20。用 `node --version` 检查。

## 2. 首次启动

直接运行 `daisy`，会自动进入配置向导：

```bash
daisy
```

你会看到交互菜单，选一个免费模型就能开始：

```
  🌼 DaisyCode — 首次启动

  还没找到 AI 模型配置，选一个方式开始：

   1) ☁️ Groq (free·recommended)    — Llama 3.3 70B, fast inference
   2) 🌥️ Cloudflare Workers AI (free)  — Llama 3.2, DeepSeek R1
   3) 🏠 Ollama (local)             — auto-detect if running
   4) 🇨🇳 DeepSeek                    — paid, China-friendly
   5) 🤖 OpenAI                      — paid, GPT series
   6) 🧠 Anthropic                   — paid, Claude series
   7) ⚙️ Custom (OpenAI-compatible)   — any baseURL
   8) 🎮 Demo mode                   — no AI, just testing

  Choice [1]:
```

**推荐选 1 (Groq)** — 免费、无需绑定信用卡、极速推理。

按提示输入 API Key 后，DaisyCode 自动启动。

## 3. 初始化项目

```bash
cd 你的项目目录
daisy init
```

这会在当前目录生成 `daisy.jsonc` 配置文件。

## 4. 第一次对话

```bash
daisy
```

进入交互模式后，直接说：

```
> 帮我创建一个 hello.js，输出 "Hello DaisyCode!"
```

DaisyCode 会创建文件、写代码。编辑文件时会问你"可以吗？"，输入 `y` 确认。

退出按 `Ctrl+C` 或输入 `/exit`。

## 5. 加一个 MCP 工具

MCP 让 AI 能用外部工具。比如加一个 GitHub 工具：

在 `daisy.jsonc` 里加上：

```jsonc
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_你的token"
      }
    }
  }
}
```

然后重启 DaisyCode，AI 就能操作 GitHub 了：

```
> 看看我的仓库有哪些 open issue
```

## 下一步

- [配置详解](configuration.md) — 所有配置项
- [MCP 扩展](mcp.md) — 更多 MCP 工具
- [示例合集](examples/hello-world.md) — 从例子学
