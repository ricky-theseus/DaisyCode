# 示例：Hello World

使用 DaisyCode 创建一个 Node.js HTTP 服务器。

## 1. 准备工作

```bash
# 安装 DaisyCode
npm install -g daisycode

# 创建项目目录
mkdir hello-daisy
cd hello-daisy

# 初始化配置
daisy init

# 设置 API Key（替换为你的 Key）
export DEEPSEEK_API_KEY=sk-你的key
```

## 2. 启动交互模式

```bash
daisy
```

看到 `>` 提示符即进入交互模式。

## 3. 让 AI 创建项目

输入以下指令：

```
> 创建一个 package.json 和 index.js，实现一个 HTTP 服务器，监听 3000 端口，返回 "Hello DaisyCode!"
```

DaisyCode 会分析需求并创建文件。写入文件时会请求确认：

```
要创建 package.json，可以吗？(y/N)
```

输入 `y` 确认。

## 4. 查看生成的文件

```
> 列出当前目录的文件
```

DaisyCode 会调用 glob 工具列出项目文件。

## 5. 运行服务器

```
> 帮我运行这个服务器
```

DaisyCode 执行 `node index.js`。打开浏览器访问 `http://localhost:3000` 查看结果。

按 `Ctrl+C` 停止服务器。

## 完整对话记录

```
$ daisy
> 创建一个 package.json 和 index.js，实现一个 HTTP 服务器，
  监听 3000 端口，返回 "Hello DaisyCode!"

[分析需求...]
[创建 package.json] → 确认？ y
[创建 index.js] → 确认？ y

> 列出当前目录的文件

[输出文件列表]

> 帮我运行这个服务器

[执行 node index.js]
服务器已启动: http://localhost:3000
```

## 要点总结

- `daisy init` 初始化项目配置文件
- `daisy` 进入交互模式
- AI 先分析需求再执行操作
- 写入文件前会征求用户确认
