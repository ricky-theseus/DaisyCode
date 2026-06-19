# Skills 系统

## 概述

Skills 是向 AI 注入专业知识的机制。通过编写结构化的 Markdown 文档（SKILL.md），可以让 AI 在编码时遵循团队规范、框架最佳实践或领域特定规则。

Skills 本质上是预置的系统提示词，在 AI 会话启动时注入。

## SKILL.md 格式

每个 Skill 是一个 Markdown 文件，内容自由编写，建议包含以下结构：

```markdown
# 技能名称

## 规则
- 规则一
- 规则二

## 代码示例

```typescript
// ✅ 正确写法
const userName = "张三";
function getUser() { }

// ❌ 错误写法
const user_name = "张三";
function get_user() { }
```

## 参考
- 相关文档链接
```

## 内置 Skills

| Skill | 用途 |
|-------|------|
| `typescript` | TypeScript 编码规范 |
| `react` | React 组件开发指南 |
| `node` | Node.js 最佳实践 |
| `testing` | 测试编写规范 |
| `security` | 安全编码实践 |

启用内置 Skills：

```jsonc
{
  "skill": {
    "typescript": {
      "name": "typescript",
      "trigger": ["typescript", "ts"],
      "description": "TypeScript 编码规范"
    },
    "react": {
      "name": "react",
      "trigger": ["react", "jsx"],
      "description": "React 组件开发指南"
    }
  }
}
```

## 自定义 Skills

### 1. 创建目录

在项目中创建 Skills 目录：

```
my-project/
├── skills/
│   ├── team-rules.md
│   └── database.md
└── daisy.jsonc
```

### 2. 编写 SKILL.md

```markdown
# 团队编码规范

## 命名规则
- 变量和函数使用 camelCase
- 类和组件使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE

## 文件组织
- 每个组件独立文件
- 测试文件与源文件同级目录
- 样式使用 CSS Modules

## 代码示例

```typescript
// ✅ 正确
const userName = "张三";
function getUser() { }

// ❌ 错误
const user_name = "张三";
function get_user() { }
```
```

### 3. 配置加载路径

```jsonc
{
  "skill": {
    "typescript": {
      "name": "typescript",
      "trigger": ["typescript", "ts"],
      "description": "TypeScript 编码规范"
    },
    "team-rules": {
      "name": "team-rules",
      "trigger": ["team", "rules"],
      "description": "团队编码规范",
      "path": "./skills/team-rules.md"
    }
  }
}
```

## 加载路径

每个 Skill 的 SKILL.md 文件通过以下路径查找，按优先级从高到低：

1. `skill.<name>.path` 中指定的路径 — 最高优先级
2. `.opencode/skills/<name>.md`（项目级）
3. `~/.config/opencode/skills/<name>.md`（用户级全局）

同名 Skill 自定义版本覆盖内置版本。

## 最佳实践

1. **单一职责** — 每个 Skill 只关注一个主题，不要混合 TypeScript 规范和数据库规范
2. **提供代码示例** — 抽象规则不如直接给出正反例对比
3. **纳入版本控制** — Skills 文件应提交到仓库，团队共享维护
4. **渐进式添加** — 从一两个核心 Skill 开始，根据实际需要逐步补充
