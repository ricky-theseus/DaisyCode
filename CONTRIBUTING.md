# 贡献指南

DaisyCode 是一个配置驱动的 AI Agent 团队项目。欢迎提交 Issue、Pull Request 和功能建议。

## 贡献方式

- **报告 Bug**：[提交 Issue](https://github.com/ricky-theseus/DaisyCode/issues/new?template=bug_report.md)
- **功能建议**：[提交 Issue](https://github.com/ricky-theseus/DaisyCode/issues/new?template=feature_request.md)
- **提交代码**：Fork → 创建分支 → 提交 PR

## 开发环境搭建

### 前置要求

- Node.js >= 18（推荐 20+）
- npm >= 9

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode

# 安装依赖
npm install

# 启动开发模式（使用 tsx 热重载）
npm run dev

# 构建
npm run build
```

### 代码质量

```bash
# 运行 ESLint 检查
npm run lint

# 自动格式化代码
npm run format

# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run coverage
```

### 测试

测试使用 Node.js 内置测试运行器（`node --test`），测试文件位于 `tests/` 目录。

```bash
# 运行所有测试
npm test

# 运行单个测试文件
node --import tsx --test tests/config.test.ts
```

### 覆盖率

覆盖率使用 c8 生成，支持 text 和 lcov 格式：

```bash
npm run coverage
```

覆盖率报告会输出到终端，同时生成 `coverage/` 目录，包含 lcov 格式的详细报告。

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat: 添加新 Agent 角色 xxx
fix: 修复 xxx Agent 权限错误
docs: 更新 README
chore: 更新依赖
refactor: 重构 xxx 模块
test: 添加 xxx 测试
style: 格式化代码
```

## PR 检查清单

- [ ] 代码通过 ESLint 检查（`npm run lint`）
- [ ] 所有测试通过（`npm test`）
- [ ] 新增功能有对应的测试覆盖
- [ ] 修改了 opencode.json 配置
- [ ] 更新了相关文档
- [ ] 如有新角色，已更新 AGENTS.md
- [ ] 已阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## 项目结构

```
DaisyCode/
├── src/                   # 源码
│   ├── index.ts           # CLI 入口
│   ├── agent-loop.ts      # Agent 循环引擎
│   ├── model-adapter.ts   # 模型抽象（多 Provider）
│   ├── orchestrator.ts    # 多 Agent 编排
│   ├── permissions.ts     # 权限系统
│   ├── session.ts         # 会话管理
│   ├── repl.ts            # 交互式终端
│   ├── config.ts          # 配置加载
│   ├── types.ts           # 类型定义
│   ├── tools/             # 内置工具
│   ├── skills/            # Skills 系统
│   ├── mcp/               # MCP 协议
│   └── commands/          # CLI 子命令
├── tests/                 # 测试
├── docs/                  # 文档
├── .github/workflows/     # CI 配置
├── README.md
├── CONTRIBUTING.md
└── CHANGELOG.md
```

## 发布流程

维护者专用：

1. 更新版本号：`npm version patch|minor|major`
2. 更新 CHANGELOG.md
3. 推送 tag：`git push --tags`
4. CI 自动发布到 npm

## 行为准则

请阅读并遵守 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
