# 安装指南

## 系统要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 20（推荐 22 LTS） |
| npm | >= 9（或 pnpm / yarn） |
| 操作系统 | macOS 12+ / Linux / Windows 10+ |

## 安装方式

### 全局安装（推荐）

```bash
npm install -g daisycode
```

安装后可直接使用 `daisy` 命令：

```bash
daisy --version
```

### 项目本地安装

```bash
npm install --save-dev daisycode
```

通过 npx 调用：

```bash
npx daisy
```

或在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "daisy": "daisy"
  }
}
```

然后执行 `npm run daisy`。

### 从源码构建

```bash
git clone https://github.com/ricky-theseus/DaisyCode.git
cd DaisyCode
npm install
npm run build
npm link
```

## 验证安装

```bash
mkdir daisy-test
cd daisy-test
daisy init
daisy --dry-run "print hello"
```

无报错即安装成功。

## 升级

```bash
npm update -g daisycode
```

## Windows 注意事项

1. 使用 **PowerShell 7+**（非 cmd），以获得更好的终端体验
2. 安装 Node.js 时勾选"Add to PATH"
3. 环境变量使用 `$env:` 前缀：

```powershell
$env:DEEPSEEK_API_KEY = "sk-你的key"
```

4. 如遇路径问题，可尝试 Git Bash 或 WSL

## 故障排查

### 安装失败

```bash
npm cache clean --force
npm install -g daisycode
```

### 权限错误（Linux/macOS）

使用 nvm 管理 Node 版本，避免使用 sudo：

```bash
nvm install 22
nvm use 22
npm install -g daisycode
```

### 找不到 daisy 命令

检查 npm 全局 bin 目录是否在 PATH 中：

```bash
npm bin -g
# 将输出目录添加到 PATH
```
