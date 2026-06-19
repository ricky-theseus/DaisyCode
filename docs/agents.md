# 自定义 Agent

## 概述

DaisyCode 支持定义多个 AI 角色（Agent），每个角色可拥有独立的身份设定、权限范围和模型配置。

典型场景：**architect** 负责设计（只读权限），**builder** 负责实现（读写权限），**reviewer** 负责审查（只读权限）。分工协作，各司其职。

## 配置字段

在 `daisy.jsonc` 的 `agent` 字段中定义：

```jsonc
{
  "agent": {
    "default": {
      "description": "通用编程助手",
      "systemPrompt": "你是一个专业的编程助手，擅长代码生成和重构。",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "glob": "allow",
        "grep": "allow",
        "bash": "ask"
      }
    },
    "architect": {
      "description": "架构师",
      "systemPrompt": "你是软件架构师。设计系统架构，不编写实现代码。",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    },
    "reviewer": {
      "description": "代码审查员",
      "systemPrompt": "你是严格的代码审查员。检查代码质量、安全性和性能。",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    }
  }
}
```

### 字段说明

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| `description` | string | 角色描述 | 否 |
| `systemPrompt` | string | 系统提示词，定义角色行为 | 否 |
| `permission` | object | 权限配置 | 否 |
| `model` | string | 单独指定模型，覆盖全局配置 | 否 |
| `temperature` | number | 单独指定温度参数 | 否 |
| `color` | string | 终端显示颜色 | 否 |

## 权限配置

每个 Agent 独立配置工具权限：

```jsonc
{
  "read": "allow",    // 读取文件，自动允许
  "edit": "ask",      // 写入文件，执行前询问
  "glob": "allow",    // 搜索文件名，自动允许
  "grep": "allow",    // 搜索文件内容，自动允许
  "bash": "deny"      // 禁止执行 Shell 命令
}
```

### 权限级别

| 级别 | 行为 |
|------|------|
| `allow` | 自动允许，无需确认 |
| `deny` | 禁止使用 |
| `ask` | 执行前询问用户确认 |
| `restricted` | 仅在指定路径下允许 |

### 内置工具

| 工具 | 说明 |
|------|------|
| `read` | 读取文件 |
| `edit` | 写入/修改文件 |
| `glob` | 搜索文件名 |
| `grep` | 搜索文件内容 |
| `bash` | 执行 Shell 命令 |

## 使用方式

### 在 REPL 中切换

```
> /agent architect
切换到 architect 模式

> 设计一个用户认证系统
（architect 开始设计）

> /agent reviewer
切换到 reviewer 模式

> 审查上面的设计
（reviewer 开始审查）
```

### 命令行指定

```bash
daisy --agent reviewer "审查 src/ 目录下的代码"
```

## 最佳实践

1. **职责分离** — architect 不需要写代码，reviewer 不需要执行命令，通过权限配置强制执行
2. **提示词具体化** — 明确说明角色的职责边界、工作流程和输出格式
3. **差异化模型** — architect 使用更强的推理模型，tester 使用响应更快的模型
4. **从简开始** — 先使用 default Agent 跑通流程，再逐步添加专用角色
