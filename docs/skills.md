# Skills 系统

## 什么是 Skills？

Skills 是给 AI 注入专业知识的"技能包"。比如你希望 AI 写 TypeScript 时遵守你们团队的规范，写一个 SKILL.md 就行。

Skills 本质上是结构化的提示词，在 AI 启动时注入到系统提示里。

## 内置 Skills

| Skill | 用途 |
|-------|------|
| `typescript` | TypeScript 编码规范 |
| `react` | React 组件开发指南 |
| `node` | Node.js 最佳实践 |
| `testing` | 测试编写规范 |
| `security` | 安全编码实践 |

启用：

```jsonc
{
  "skills": {
    "include": ["typescript", "react"]
  }
}
```

## 自定义 Skills

### 1. 创建 SKILL.md

在项目里建个 `skills/` 目录，里面放 `.md` 文件：

```
my-project/
├── skills/
│   ├── team-rules.md
│   └── database.md
└── daisy.jsonc
```

### 2. 写 SKILL.md

```markdown
# 团队编码规范

## 命名规则
- 变量和函数用 camelCase
- 类和组件用 PascalCase
- 常量用 UPPER_SNAKE_CASE

## 文件组织
- 每个组件一个文件
- 测试文件和源文件放同级目录
- 样式用 CSS Modules

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

### 3. 配置

```jsonc
{
  "skills": {
    "include": ["typescript"],
    "paths": ["./skills"]
  }
}
```

## Skills 优先级

多个 skills 同时启用时，按这个顺序合并：

1. 自定义 skills（`paths` 里的）— 优先级最高
2. 内置 skills（`include` 里的）
3. 默认系统提示词

冲突时自定义覆盖内置。

## 最佳实践

1. **一个 skill 只讲一件事** — 别把 TypeScript 规范和数据库规范写一起
2. **给代码示例** — 抽象规则不如直接给例子
3. **放版本控制** — 团队共享，大家一起维护
4. **从少到多** — 先加一两个核心 skill，不够再加
