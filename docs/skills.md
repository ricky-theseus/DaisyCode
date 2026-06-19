# Skills 系统

## 什么是 Skills？

Skills 是 DaisyCode 的专业技能注入系统。通过 Skills，你可以让 AI Agent 掌握特定领域的专业知识，如 TypeScript 最佳实践、React 组件设计模式、数据库优化技巧等。

## 工作原理

Skills 本质上是结构化的提示词模板，在 Agent 初始化时注入到系统提示词中。每个 Skill 包含：

- **领域知识** — 特定领域的最佳实践和规范
- **代码示例** — 符合规范的代码模板
- **约束规则** — 需要遵守的限制条件

## 内置 Skills

DaisyCode 内置了一些常用 Skills：

| Skill | 说明 |
|-------|------|
| `typescript` | TypeScript 编码规范 |
| `react` | React 组件开发指南 |
| `node` | Node.js 最佳实践 |
| `testing` | 测试编写规范 |
| `security` | 安全编码实践 |

## 启用 Skills

在 `daisy.jsonc` 中配置：

```jsonc
{
  "skills": {
    "include": ["typescript", "react", "testing"]
  }
}
```

## 自定义 Skills

### 创建 Skill 文件

在项目目录下创建 Skills 目录：

```
my-project/
├── skills/
│   ├── my-skill.md
│   └── database.md
└── daisy.jsonc
```

Skill 文件格式（Markdown）：

```markdown
# My Custom Skill

## 描述
这个 Skill 定义了项目的编码规范。

## 规则

### 命名规范
- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和组件
- 常量使用 UPPER_SNAKE_CASE

### 文件组织
- 每个组件一个文件
- 测试文件与源文件同级
- 样式文件使用 CSS Modules

## 代码示例

### 组件示例
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick}>
      {label}
    </button>
  );
}
```
```

### 配置自定义 Skills

```jsonc
{
  "skills": {
    "include": ["typescript"],
    "paths": ["./skills"]
  }
}
```

## Skills 优先级

当多个 Skills 同时启用时，按以下优先级合并：

1. 自定义 Skills（`paths` 中配置的）
2. 内置 Skills（`include` 中配置的）
3. 默认系统提示词

如果存在冲突规则，自定义 Skills 覆盖内置 Skills。

## 最佳实践

### 1. 保持专注

每个 Skill 聚焦一个领域，不要在一个 Skill 文件中塞入太多内容。

### 2. 提供示例

好的 Skill 应该包含具体的代码示例，而不仅仅是抽象规则。

### 3. 版本控制

将 Skills 文件纳入版本控制，团队共享。

### 4. 渐进式启用

先启用少量核心 Skills，根据实际效果逐步增加。

## 示例：项目级 Skills

### React 项目

```jsonc
{
  "skills": {
    "include": ["typescript", "react", "testing"],
    "paths": ["./skills"]
  }
}
```

### Node.js API 项目

```jsonc
{
  "skills": {
    "include": ["typescript", "node", "security"],
    "paths": ["./skills"]
  }
}
```

### 全栈项目

```jsonc
{
  "skills": {
    "include": ["typescript", "react", "node", "testing", "security"],
    "paths": ["./skills"]
  }
}
```
