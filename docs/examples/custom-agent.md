# 示例：自定义 Agent 协作

配置三个角色——架构师、开发者、审查员，协作完成一个功能模块。

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
      "systemPrompt": "你是经验丰富的软件架构师。\n\n工作流程：\n1. 理解需求\n2. 设计系统架构\n3. 输出设计文档\n4. 不编写实现代码\n\n设计文档包含：\n- 技术选型及理由\n- 模块划分\n- 数据流设计\n- 接口定义",
      "permission": {
        "read": "allow",
        "edit": "deny",
        "glob": "allow",
        "grep": "allow",
        "bash": "deny"
      }
    },
    "builder": {
      "description": "开发者",
      "systemPrompt": "你是一个资深程序员。\n\n工作流程：\n1. 理解架构设计\n2. 按设计实现代码\n3. 编写单元测试\n4. 确保代码可运行",
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
      "systemPrompt": "你是严格的代码审查员。\n\n审查要点：\n1. 代码质量：命名、结构、注释\n2. 安全性：SQL 注入、XSS、敏感信息泄露\n3. 性能：不必要的循环、内存泄漏\n4. 测试覆盖\n\n输出审查报告，列出每个问题及修改建议。",
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

注意 architect 和 reviewer 的 `edit` 和 `bash` 均为 `deny`——他们只能读取文件，不能修改或执行命令。

## 2. 架构师设计

```bash
daisy --agent architect "设计一个用户认证系统，支持邮箱注册登录、JWT Token"
```

architect 输出设计文档，不编写任何代码。

## 3. 开发者实现

```bash
daisy --agent builder "按上面的设计实现用户认证系统"
```

builder 读取项目结构，按设计文档编写代码。

## 4. 审查员审查

```bash
daisy --agent reviewer "审查 builder 刚写的认证代码"
```

reviewer 检查代码质量、安全性、性能，输出审查报告。

## 5. REPL 中切换角色

也可以进入交互模式手动切换：

```
$ daisy

> /agent architect
切换到 architect 模式

> 设计一个用户认证系统
（architect 输出设计文档）

> /agent builder
切换到 builder 模式

> 按上面的设计实现
（builder 编写代码）

> /agent reviewer
切换到 reviewer 模式

> 审查刚写的代码
（reviewer 输出审查报告）
```

## 要点总结

- 每个 Agent 可独立配置权限和提示词
- architect 和 reviewer 设置 `deny` 防止误操作
- `/agent <name>` 在对话中切换角色
- `--agent <name>` 在命令行指定角色
- 不同角色各司其职，通过权限约束协作完成复杂任务
