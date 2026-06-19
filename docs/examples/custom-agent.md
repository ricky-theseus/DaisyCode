# 示例：自定义 Agent

配置三个角色：架构师、程序员、审查员，协作完成一个功能。

## 1. 配置 Agents

编辑 `daisy.jsonc`：

```jsonc
{
  "model": "deepseek/deepseek-chat",
  "agent": {
    "default": {
      "description": "通用编程助手",
      "systemPrompt": "你是一个专业的编程助手。",
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
      "systemPrompt": "你是经验丰富的软件架构师。\n\n工作流程：\n1. 先理解需求\n2. 设计系统架构\n3. 输出设计文档\n4. 不要写代码\n\n设计文档要包含：\n- 技术选型及理由\n- 模块划分\n- 数据流\n- 接口设计",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    },
    "builder": {
      "description": "程序员",
      "systemPrompt": "你是一个资深程序员。\n\n工作流程：\n1. 理解架构设计\n2. 按设计实现代码\n3. 写单元测试\n4. 确保代码可运行",
      "permission": {
        "read": "allow",
        "edit": "ask",
        "glob": "allow",
        "grep": "allow",
        "bash": "ask"
      }
    },
    "reviewer": {
      "description": "代码审查员",
      "systemPrompt": "你是严格的代码审查员。\n\n审查要点：\n1. 代码质量：命名、结构、注释\n2. 安全性：SQL 注入、XSS、敏感信息泄露\n3. 性能：不必要的循环、内存泄漏\n4. 测试覆盖\n\n输出审查报告，列出每个问题和修改建议。",
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

注意 architect 和 reviewer 的 `edit` 和 `bash` 都是 `deny`——他们只能看，不能改。

## 2. 用 architect 设计

```bash
daisy --agent architect "设计一个用户认证系统，支持邮箱注册登录、JWT token"
```

architect 会输出设计文档，但不会写一行代码。

## 3. 用 builder 实现

```bash
daisy --agent builder "按上面的设计实现用户认证系统"
```

builder 会读你的项目结构，然后写代码。

## 4. 用 reviewer 审查

```bash
daisy --agent reviewer "审查 builder 刚写的认证代码"
```

reviewer 会检查代码质量、安全性、性能，输出审查报告。

## 5. 在 REPL 里切换

也可以进交互模式手动切换：

```
$ daisy

> /agent architect
切换到 architect 模式

> 设计一个用户认证系统
（architect 输出设计文档）

> /agent builder
切换到 builder 模式

> 按上面的设计实现
（builder 写代码）

> /agent reviewer
切换到 reviewer 模式

> 审查刚写的代码
（reviewer 输出审查报告）
```

## 你学到了什么

- 每个 agent 可以有不同的权限和提示词
- architect 和 reviewer 设 `deny` 防止误操作
- `/agent <name>` 在对话中切换角色
- `--agent <name>` 在命令行指定角色
- 不同角色各司其职，协作完成复杂任务
