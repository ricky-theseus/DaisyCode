# 安装指南

## 系统要求

- **Node.js** >= 20（推荐 22 LTS）
- **npm** >= 9（或 pnpm / yarn）
- **系统**：macOS / Linux / Windows

## 安装方式

### 全局安装（推荐）

```bash
npm install -g daisycode
```

装完就能用 `daisy` 命令了：

```bash
daisy --version
```

### 项目本地安装

```bash
npm install --save-dev daisycode
```

然后用 npx 跑：

```bash
npx daisy
```

或者在 `package.json` 加个脚本：

```json
{
  "scripts": {
    "daisy": "daisy"
  }
}
```

然后 `npm run daisy`。

### 从源码安装

```bash
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode
npm install
npm run build
npm link
```

## Windows 注意事项

1. **用 PowerShell 7+**（不是 cmd），支持更好
2. **Node.js 要加到 PATH** — 安装 Node.js 时勾上"Add to PATH"
3. 如果路径报错，试试 Git Bash 或 WSL
4. 环境变量用 `$env:` 前缀：

```powershell
$env:DEEPSEEK_API_KEY = "sk-你的key"
```

## 验证安装

```bash
mkdir daisy-test
cd daisy-test
daisy init
daisy --dry-run "print hello"
```

没报错就说明装好了。

## 升级

```bash
npm update -g daisycode
```

## 常见问题

### 安装失败

```bash
# 清缓存重试
npm cache clean --force
npm install -g daisycode
```

### 权限错误（Linux/macOS）

用 nvm 管理 Node，别用 sudo：

```bash
nvm install 22
nvm use 22
npm install -g daisycode
```

### 找不到命令

检查 npm 全局 bin 目录在不在 PATH 里：

```bash
npm bin -g
# 把这个目录加到 PATH
```
