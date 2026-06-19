# CLI 命令参考

## 概述

DaisyCode 提供了一套完整的 CLI 命令，用于启动 Agent、管理配置和调试。

## 全局选项

所有命令都支持以下全局选项：

| 选项 | 简写 | 说明 |
|------|------|------|
| `--version` | | 显示版本号 |
| `--help` | `-h` | 显示帮助信息 |
| `--verbose` | `-v` | 详细输出模式 |
| `--config <path>` | `-c` | 指定配置文件路径 |
| `--model <model>` | `-m` | 指定模型 |
| `--base-url <url>` | | 自定义 API 地址 |
| `--dry-run` | | 仅显示计划，不执行 |

## 命令列表

### daisy

启动交互式 REPL 或执行单次任务。

```bash
# 启动交互式 REPL
daisy

# 单次执行
daisy "创建一个 Express 服务器"

# 指定模型
daisy --model openai/gpt-4o "重构这个函数"

# 详细输出
daisy -v "分析项目结构"
```

### daisy init

在当前目录初始化 DaisyCode 配置。

```bash
daisy init
```

生成 `daisy.jsonc` 文件，包含默认配置。

### daisy --version

显示当前版本。

```bash
daisy --version
# 输出: 1.0.0
```

### daisy --help

显示帮助信息。

```bash
daisy --help
```

## REPL 内部命令

在交互式 REPL 中，可以使用以下内部命令：

### 会话管理

| 命令 | 说明 |
|------|------|
| `/exit` 或 `Ctrl+C` | 退出 REPL |
| `/clear` | 清除当前会话 |
| `/save` | 保存当前会话 |
| `/load <name>` | 加载指定会话 |
| `/list` | 列出所有保存的会话 |
| `/resume` | 恢复上次会话 |

### Agent 管理

| 命令 | 说明 |
|------|------|
| `/agent <name>` | 切换到指定 Agent |
| `/agents` | 列出所有可用 Agent |
| `/default` | 切换到默认 Agent |

### 模型管理

| 命令 | 说明 |
|------|------|
| `/model <name>` | 切换模型 |
| `/models` | 列出可用模型 |

### 调试

| 命令 | 说明 |
|------|------|
| `/verbose` | 切换详细输出 |
| `/tokens` | 显示当前会话 Token 统计 |
| `/cost` | 显示当前会话费用估算 |
| `/debug` | 显示调试信息 |

### 工具

| 命令 | 说明 |
|------|------|
| `/tools` | 列出可用工具 |
| `/permissions` | 显示当前权限配置 |

## 使用示例

### 日常开发

```bash
# 进入项目目录，启动 REPL
cd my-project
daisy

# 在 REPL 中
> 帮我创建一个新的 React 组件
> 添加单元测试
> 优化性能
```

### CI/CD 集成

```bash
# 在 CI 中执行代码审查
daisy --agent reviewer "审查本次 PR 的代码变更"

# 生成文档
daisy "为 src/ 目录生成 API 文档"
```

### 批量处理

```bash
# 管道输入
cat requirements.txt | daisy "根据需求生成 package.json"

# 重定向输出
daisy "分析项目依赖" > analysis.md
```

## 退出码

| 退出码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1 | 一般错误 |
| 2 | 配置错误 |
| 3 | API 错误 |
| 4 | 权限错误 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `DAISY_CONFIG` | 配置文件路径 |
| `DAISY_SESSION_DIR` | 会话存储目录 |
| `DAISY_LOG_LEVEL` | 日志级别（debug/info/warn/error） |
| `DAISY_NO_COLOR` | 禁用彩色输出 |
