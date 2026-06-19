# 使用指南

## 基本用法

### 交互式 REPL

最常用的方式是通过交互式终端与 DaisyCode 对话：

```bash
cd your-project
daisy
```

进入 REPL 后，可以直接输入自然语言指令：

```
> 帮我创建一个 Express.js 服务器
> 搜索项目中所有 TODO 注释
> 重构这个函数，提取公共逻辑
```

输入 `/exit` 或按 `Ctrl+C` 退出。

### 单次执行

```bash
daisy "创建一个 React 组件，显示用户列表"
```

### 管道模式

```bash
cat requirements.txt | daisy "根据需求文件生成 package.json"
```

## 初始化项目

```bash
daisy init
```

这会在当前目录生成 `daisy.jsonc` 配置文件，包含默认的 Agent 配置和权限设置。

## 配置文件

DaisyCode 使用 `daisy.jsonc` 作为配置文件（支持 JSONC 格式，可以加注释）：

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/ricky-theseus/DaisyCode/main/schema.json",
  "model": "deepseek/deepseek-chat",
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

## 命令行选项

```bash
daisy [options] [prompt]

选项：
  --model, -m      指定模型（如 deepseek/deepseek-chat）
  --base-url       自定义 API 地址
  --config, -c     指定配置文件路径
  --dry-run        仅显示计划，不执行
  --verbose, -v    详细输出
  --version        显示版本号
  --help           显示帮助
```

## 工作流程示例

### 代码生成

```
> 创建一个 RESTful API 项目，使用 Express + TypeScript
```

DaisyCode 会：
1. 初始化项目结构
2. 生成 package.json
3. 创建 TypeScript 配置
4. 编写路由和控制器代码
5. 生成测试文件

### 代码重构

```
> 将 utils.ts 中的函数拆分为独立的模块文件
```

DaisyCode 会：
1. 分析当前代码结构
2. 设计模块拆分方案
3. 创建新文件并迁移代码
4. 更新导入引用

### Bug 修复

```
> 修复 login 函数的类型错误
```

DaisyCode 会：
1. 搜索相关代码
2. 分析类型错误原因
3. 应用修复
4. 验证修复结果

## 最佳实践

### 1. 明确指令

好的指令：
```
创建一个 Express 服务器，监听 3000 端口，包含 /users 和 /posts 两个路由
```

模糊的指令：
```
帮我写个服务器
```

### 2. 分步执行

复杂任务建议分步执行，每一步确认结果后再继续。

### 3. 使用权限控制

对于危险操作（如文件删除、shell 命令），设置权限为 `ask`，让 DaisyCode 在执行前征求你的同意。

### 4. 会话管理

DaisyCode 自动保存会话历史，可以通过 `/resume` 恢复之前的会话。

### 5. 结合 MCP 工具

通过 MCP 协议接入数据库、API 等外部工具，扩展 DaisyCode 的能力边界。
