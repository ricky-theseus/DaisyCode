# 示例：Hello World

用 DaisyCode 创建一个 Node.js 项目。

## 1. 准备

```bash
# 装 DaisyCode
npm install -g daisycode

# 建个项目目录
mkdir hello-daisy
cd hello-daisy

# 初始化
daisy init

# 设 API Key（换成你自己的）
export DEEPSEEK_API_KEY=sk-你的key
```

## 2. 启动

```bash
daisy
```

看到提示符 `>` 就说明进来了。

## 3. 让 AI 写代码

输入：

```
> 帮我创建一个 package.json 和 index.js，一个简单的 HTTP 服务器，监听 3000 端口，返回 "Hello DaisyCode!"
```

DaisyCode 会先分析需求，然后创建文件。写文件时会问你：

```
要创建 package.json，可以吗？(y/N)
```

输入 `y` 确认。

## 4. 看看结果

```
> 看看生成了什么文件
```

DaisyCode 会列出项目里的文件。

## 5. 运行

```
> 帮我运行这个服务器
```

它会执行 `node index.js`，然后你可以打开 `http://localhost:3000` 看看。

按 `Ctrl+C` 停掉服务器。

## 完整对话

```
$ daisy
> 帮我创建一个 package.json 和 index.js，一个简单的 HTTP 服务器，监听 3000 端口，返回 "Hello DaisyCode!"

[分析需求...]
[创建 package.json] → 确认？ y
[创建 index.js] → 确认？ y

> 看看生成了什么文件

[列出文件]

> 帮我运行这个服务器

[执行 node index.js]
服务器已启动: http://localhost:3000
```

## 你学到了什么

- `daisy init` 初始化项目
- `daisy` 进入交互模式
- AI 会先分析再动手
- 写文件前会征求你的同意
