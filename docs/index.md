# DaisyCode 文档

DaisyCode 是一个 **AI 编程助手**，直接在终端里跑，不用开 IDE 插件。

## 它能干什么？

**场景 1：AI 帮你写代码**

```bash
cd 你的项目
daisy "帮我写一个 Express 服务器，带用户注册登录"
```

DaisyCode 会读你的项目文件、写代码、跑命令，全程对话式交互。

**场景 2：接入 MCP 工具**

MCP 是 AI 界的"USB 接口"。接上数据库、GitHub、浏览器，AI 就能直接操作它们：

```bash
daisy "查一下 orders 表里最近 10 条记录"
# → DaisyCode 自动调数据库 MCP 工具执行 SQL
```

**场景 3：多 Agent 协作**

一个任务拆给多个 AI 角色分工：

```bash
daisy --agent architect "设计订单系统的架构"
daisy --agent builder "按架构实现代码"
daisy --agent reviewer "审查 builder 写的代码"
```

## 30 秒上手

```bash
npm install -g daisycode
cd 你的项目
export DEEPSEEK_API_KEY=sk-xxxxx
daisy init
daisy
```

## 文档目录

| 文档 | 适合谁看 |
|------|---------|
| [快速开始](quickstart.md) | 所有人，5 分钟跑通 |
| [安装](installation.md) | 需要装 DaisyCode 的人 |
| [配置](configuration.md) | 想调配置的人 |
| [模型 Provider](providers.md) | 换模型 / 加 API |
| [MCP 扩展](mcp.md) | 想给 AI 加工具的人 |
| [Skills 系统](skills.md) | 想注入专业知识的人 |
| [自定义 Agent](agents.md) | 想搞多角色协作的人 |
| [CLI 命令](cli.md) | 命令行参考 |
| [示例：Hello World](examples/hello-world.md) | 第一个例子 |
| [示例：加 MCP 工具](examples/add-mcp-tool.md) | 实战 MCP |
| [示例：自定义 Agent](examples/custom-agent.md) | 实战多 Agent |
