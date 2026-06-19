# CLI 命令参考

## daisy — 启动 AI Agent

最常用的命令。不加参数进交互模式，加参数单次执行。

```bash
# 交互模式（推荐）
daisy

# 单次执行
daisy "创建一个 Express 服务器"

# 指定模型
daisy --model openai/gpt-4o "重构这个函数"

# 指定 Agent 角色
daisy --agent reviewer "审查代码"

# 只看计划不执行
daisy --dry-run "重构 utils.ts"
```

## daisy init — 初始化配置

在当前目录生成 `daisy.jsonc`：

```bash
daisy init
```

## 全局选项

| 选项 | 简写 | 说明 |
|------|------|------|
| `--version` | | 显示版本号 |
| `--help` | `-h` | 显示帮助 |
| `--verbose` | `-v` | 详细输出 |
| `--config <path>` | `-c` | 指定配置文件 |
| `--model <model>` | `-m` | 指定模型 |
| `--base-url <url>` | | 自定义 API 地址 |
| `--agent <name>` | | 指定 Agent 角色 |
| `--dry-run` | | 只显示计划，不执行 |

## REPL 内部命令

在交互模式里用的命令，以 `/` 开头。

### 会话管理

| 命令 | 说明 |
|------|------|
| `/exit` 或 `Ctrl+C` | 退出 |
| `/clear` | 清空当前会话 |
| `/save` | 保存会话 |
| `/load <name>` | 加载会话 |
| `/list` | 列出所有会话 |
| `/resume` | 恢复上次会话 |

### Agent 切换

| 命令 | 说明 |
|------|------|
| `/agent <name>` | 切换到指定 agent |
| `/agents` | 列出所有 agent |
| `/default` | 切回默认 agent |

### 模型切换

| 命令 | 说明 |
|------|------|
| `/model <name>` | 切换模型 |
| `/models` | 列出可用模型 |

### 调试

| 命令 | 说明 |
|------|------|
| `/verbose` | 切换详细输出 |
| `/tokens` | 显示 Token 用量 |
| `/cost` | 显示费用估算 |
| `/debug` | 调试信息 |

### 工具

| 命令 | 说明 |
|------|------|
| `/tools` | 列出可用工具 |
| `/permissions` | 显示当前权限 |

## 实用技巧

### 管道输入

```bash
cat requirements.txt | daisy "根据这个生成 package.json"
```

### 输出重定向

```bash
daisy "分析项目依赖" > analysis.md
```

### CI/CD 里用

```bash
daisy --agent reviewer "审查本次 PR 的代码变更"
```

## 退出码

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 一般错误 |
| 2 | 配置错误 |
| 3 | API 错误 |
| 4 | 权限错误 |
