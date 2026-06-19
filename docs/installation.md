# 安装指南

## 系统要求

- **Node.js** >= 18（推荐 20+）
- **npm** >= 9 或 **pnpm** / **yarn**
- **操作系统**：macOS / Linux / Windows（Windows 下推荐使用 PowerShell 或 WSL）

## 全局安装（推荐）

```bash
npm install -g daisycode
```

安装后验证：

```bash
daisy --version
# 输出: 1.0.0
```

## 项目本地安装

```bash
npm install --save-dev daisycode
```

然后通过 npx 使用：

```bash
npx daisy --version
```

或在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "daisy": "daisy"
  }
}
```

## 从源码安装

```bash
# 克隆仓库
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode

# 安装依赖
npm install

# 构建
npm run build

# 链接到全局
npm link
```

## 环境要求

### API Key

至少配置一个模型供应方的 API Key：

```bash
# DeepSeek（推荐，性价比高）
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# 或 OpenAI
export OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# 或 Anthropic
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### 可选依赖

某些 MCP 工具可能需要额外的系统工具：

- **git** — 用于 git 相关操作
- **ripgrep (rg)** — 用于高性能代码搜索（如果未安装，会回退到内置 grep）
- **curl** — 用于 HTTP 工具

## 验证安装

创建一个测试目录并运行：

```bash
mkdir daisy-test
cd daisy-test
daisy init
daisy --model "deepseek/deepseek-chat" --dry-run "print hello"
```

如果输出正确，说明安装成功。

## 升级

```bash
npm update -g daisycode
```

查看当前版本：

```bash
daisy --version
```

## 常见问题

### 安装失败

1. 确保 Node.js 版本 >= 18
2. 尝试清除 npm 缓存：`npm cache clean --force`
3. 使用 `--verbose` 查看详细错误

### 权限错误（Linux/macOS）

```bash
# 使用 nvm 管理 Node 版本，避免 sudo
nvm install 20
nvm use 20
npm install -g daisycode
```

### Windows 特别说明

- 推荐使用 PowerShell 7+
- 如果遇到路径问题，使用 WSL 或 Git Bash
- 确保 Node.js 已添加到 PATH
