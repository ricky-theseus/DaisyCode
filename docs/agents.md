# 自定义 Agent

## 什么是 Custom Agents？

你可以定义多个 AI 角色，每个角色有不同的身份、权限、甚至用不同的模型。

比如：一个 architect 负责设计，权限只读不改；一个 builder 负责实现，可以写代码；一个 reviewer 负责审查，不能执行命令。

## 配置

在 `daisy.jsonc` 里定义：

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
      "systemPrompt": "你是软件架构师。写代码之前先设计架构。",
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

## 使用

### 在对话中切换

```
> /agent architect
切换到 architect 模式

> 设计一个用户认证系统
（architect 开始设计）

> /agent reviewer
切换到 reviewer 模式

> 审查上面设计的代码
（reviewer 开始审查）
```

### 命令行指定

```bash
daisy --agent reviewer "审查 src/ 目录下的代码"
```

## Agent 配置项

| 字段 | 说明 | 必填 |
|------|------|------|
| `description` | 角色描述 | 是 |
| `systemPrompt` | 系统提示词 | 否 |
| `permission` | 权限配置 | 是 |
| `model` | 单独指定模型 | 否 |
| `temperature` | 单独指定温度 | 否 |

## 权限配置

每个 agent 独立配置权限：

```jsonc
{
  "read": "allow",    // 读文件，不问
  "edit": "ask",      // 写文件，先问
  "glob": "allow",    // 搜文件，不问
  "grep": "allow",    // 搜内容，不问
  "bash": "deny"      // 禁止执行命令
}
```

## 最佳实践

1. **职责分离** — architect 不需要写代码，reviewer 不需要跑命令
2. **提示词要具体** — 说清楚这个角色该干什么、不该干什么
3. **不同角色用不同模型** — architect 用更强的推理模型，tester 用快的
4. **从简单开始** — 先一个 default agent 跑通，再加角色
