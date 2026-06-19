# Custom Agents

## 什么是 Custom Agents？

Custom Agents 是 DaisyCode 的多 Agent 编排系统。你可以定义多个具有不同角色、权限和系统提示词的 Agent，让它们协作完成复杂任务。

## 配置 Agents

在 `daisy.jsonc` 中定义：

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
      "description": "架构师，负责系统设计",
      "systemPrompt": "你是一个经验丰富的软件架构师。在写代码之前，先设计好架构。",
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
      "systemPrompt": "你是一个严格的代码审查员。检查代码质量、安全性和性能。",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    },
    "tester": {
      "description": "测试工程师",
      "systemPrompt": "你是一个测试工程师。编写全面的测试用例。",
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

## 使用 Agents

### 在 REPL 中切换

```
> /agent architect
切换到 architect 模式

> 设计一个微服务架构
（architect 开始工作）

> /agent tester
切换到 tester 模式

> 为上面的服务编写测试
（tester 开始工作）
```

### 命令行指定

```bash
daisy --agent architect "设计一个用户认证系统"
```

## Agent 编排

DaisyCode 支持多 Agent 自动编排。当一个任务需要多个角色协作时，Orchestrator 会自动分派：

1. **architect** 设计系统架构
2. **builder** 实现代码
3. **reviewer** 审查代码
4. **tester** 编写测试

### 编排流程

```
用户请求 → Orchestrator 分析任务
  → 分配给 architect（设计）
  → 分配给 builder（实现）
  → 分配给 reviewer（审查）
  → 分配给 tester（测试）
  → 汇总结果返回用户
```

## Agent 配置项

| 字段 | 说明 | 必填 |
|------|------|------|
| `description` | Agent 角色描述 | 是 |
| `systemPrompt` | 系统提示词 | 否 |
| `permission` | 权限配置 | 是 |
| `model` | 使用的模型（可选，覆盖全局） | 否 |
| `temperature` | 模型温度（可选） | 否 |

## 权限配置

每个 Agent 可以独立配置权限：

```jsonc
{
  "read": "allow",    // 允许读取
  "edit": "ask",      // 编辑需要确认
  "glob": "allow",    // 允许搜索
  "grep": "allow",    // 允许搜索
  "bash": "deny"      // 禁止执行命令
}
```

## 最佳实践

### 1. 职责分离

为不同角色设置不同的权限。例如，architect 不需要编辑代码，reviewer 不需要执行命令。

### 2. 系统提示词

精心设计每个 Agent 的系统提示词，明确其职责和行为准则。

### 3. 模型选择

可以为特定 Agent 指定不同的模型。例如，architect 使用更强的推理模型，tester 使用更快的模型。

### 4. 渐进式复杂

从简单的单 Agent 开始，随着需求增长逐步引入多 Agent 编排。

## 示例场景

### 代码审查流程

```jsonc
{
  "agent": {
    "default": { /* ... */ },
    "reviewer": {
      "description": "代码审查员",
      "systemPrompt": "检查代码质量、安全性、性能。输出审查报告。",
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

使用：`daisy --agent reviewer "审查 src/ 目录下的代码"`
