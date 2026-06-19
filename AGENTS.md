# DaisyCode AI Agent 团队

## 项目概览
DaisyCode 是一个 AI Coding Agent 项目。团队架构如下：

## 团队成员

### 👤 老板（你）
- **角色**: 产品负责人 / CEO
- **职责**: 描述需求、做决策、验收成果
- **不需要具备技术背景**，只需告诉 Tech Lead "我想要什么"

### 🤖 Tech Lead（技术主管）- 默认对话对象
- **角色**: 你的专属技术管家
- **职责**: 听懂你的需求 → 拆解任务 → 分配工作 → 汇报进度
- **调用方式**: 直接对话（Tab 切换到 Tech Lead）
- **你只需要和 Tech Lead 聊天**，他会搞定一切

### 🤖 Architect（架构师）
- **角色**: 系统设计师
- **职责**: 架构设计、技术选型、方案评估
- **调用方式**: Tech Lead 自动调用 `@architect`

### 🤖 Builder（工程师）
- **角色**: 主力程序员
- **职责**: 写代码、实现功能
- **调用方式**: Tech Lead 自动调用 `@builder`

### 🤖 Reviewer（审查官）
- **角色**: 代码质量守护者
- **职责**: Code Review、安全审计
- **调用方式**: Tech Lead 自动调用 `@reviewer`

### 🤖 Tester（测试员）
- **角色**: 质量保障
- **职责**: 编写和执行测试
- **调用方式**: Tech Lead 自动调用 `@tester`

### 🤖 Documenter（文档员）
- **角色**: 技术文档工程师
- **职责**: README、API 文档、开发指南
- **调用方式**: Tech Lead 自动调用 `@documenter`

### 🤖 DevOps
- **角色**: 运维工程师
- **职责**: CI/CD、构建部署、基础设施
- **调用方式**: Tech Lead 自动调用 `@devops`

## 工作流程

```
你（需求）→ Tech Lead（拆解）→ 各 Subagent（执行）→ Tech Lead（汇总）→ 你（验收）
```

## 使用方式

1. 在项目根目录执行 `opencode`
2. 默认进入 Tech Lead 对话
3. 直接说出你的需求（越详细越好，但不够详细也没关系，Tech Lead 会追问）
4. Tech Lead 会自动调用合适的 agent 完成工作
