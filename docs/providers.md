# 模型 Provider 配置

DaisyCode 支持多个 AI 模型，自动检测你配了哪个 API Key 就用哪个。

## 自动检测

优先级：`DEEPSEEK_API_KEY` > `ANTHROPIC_API_KEY` > `OPENAI_API_KEY`

配一个就行，不用全配。

## DeepSeek

性价比高，国内访问快，推荐日常开发用。

```bash
export DEEPSEEK_API_KEY=sk-你的key
```

| 模型 | 说明 |
|------|------|
| `deepseek/deepseek-chat` | 默认，日常够用 |
| `deepseek/deepseek-reasoner` | 推理模型，适合复杂任务 |

## OpenAI

生态最丰富，支持多模态。

```bash
export OPENAI_API_KEY=sk-你的key
```

| 模型 | 说明 |
|------|------|
| `openai/gpt-4o` | 默认，全能 |
| `openai/gpt-4o-mini` | 轻量版，快 |
| `openai/o3-mini` | 推理模型 |

## Anthropic

代码能力很强，长上下文。

```bash
export ANTHROPIC_API_KEY=sk-ant-你的key
```

| 模型 | 说明 |
|------|------|
| `anthropic/claude-sonnet-4-20250514` | 默认 |
| `anthropic/claude-3-5-sonnet-20241022` | 稳定版 |

## 自定义 API（OpenAI 兼容）

任何兼容 OpenAI API 的服务都能用，比如本地跑的 Ollama、Azure、Groq。

```bash
export OPENAI_API_KEY=你的key
```

启动时指定地址：

```bash
daisy --model 你的模型名 --base-url https://你的api地址/v1
```

或者在配置里写死：

```jsonc
{
  "model": "qwen2.5-coder",
  "baseUrl": "http://localhost:11434/v1"
}
```

### 常见兼容服务

| 服务 | baseURL |
|------|---------|
| Ollama（本地） | `http://localhost:11434/v1` |
| Groq | `https://api.groq.com/openai/v1` |
| Together AI | `https://api.together.xyz/v1` |
| Azure OpenAI | `https://你的资源名.openai.azure.com` |

## 模型参数

```jsonc
{
  "modelOptions": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 0.9
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `temperature` | 随机性（0=确定，2=放飞） | 0.7 |
| `maxTokens` | 最大输出长度 | 4096 |
| `topP` | 核采样 | 0.9 |

## 对话中切换模型

在 REPL 里随时换：

```
> /model openai/gpt-4o
> /model deepseek/deepseek-chat
```

## 常见问题

### API Key 没生效

```bash
# 检查有没有设上
echo $DEEPSEEK_API_KEY
```

### 连不上

- 检查网络，国内用户可能需要代理
- 确认 API 地址对不对
- 看看账户余额够不够
