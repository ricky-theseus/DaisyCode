# 快速开始

5 分钟内完成安装、配置并开始第一次对话。

## 前置要求

- Node.js >= 20（推荐 22 LTS）
- npm >= 9

## 1. 安装

```bash
npm install -g daisycode
```

验证安装：

```bash
daisy --version
# 输出示例：1.2.0
```

## 2. 配置 AI Provider

首次运行 `daisy` 会自动进入配置向导：

```bash
daisy
```

输出示例：

```
  DaisyCode — 首次启动

  选择 AI Provider:

   1) DeepSeek
   2) OpenAI
   3) Anthropic
   4) Groq
   5) Custom (OpenAI-compatible)

  请输入编号 [1]:
```

推荐选择 **4 (Groq)** — 免费、无需绑定信用卡、推理速度快。

按提示输入 API Key 后，DaisyCode 自动进入交互模式。

## 3. 初始化项目

```bash
cd /path/to/your/project
daisy init
```

在当前目录生成 `daisy.jsonc` 配置文件。

## 4. 第一次对话

```bash
daisy
```

进入交互模式后，输入：

```
> 创建一个 hello.js，输出 "Hello DaisyCode!"
```

DaisyCode 会分析需求、创建文件。写文件时会征求确认：

```
要创建 hello.js，可以吗？(y/N)
```

输入 `y` 确认。退出按 `Ctrl+C` 或输入 `/exit`。

## 5. 添加 MCP 工具（可选）

MCP 让 AI 能调用外部工具。以 GitHub 为例，编辑 `daisy.jsonc`：

```jsonc
{
  "mcp": {
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

重启 DaisyCode，AI 即可操作 GitHub：

```
> 看看我的仓库有哪些 open issue
```

## 下一步

- [配置详解](configuration.md) — 完整配置项参考
- [MCP 扩展](mcp.md) — 更多 MCP 工具接入
- [示例合集](examples/hello-world.md) — 从实战中学习
