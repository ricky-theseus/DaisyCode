# 模型 Provider 配置

DaisyCode 支持多个 AI 模型 Provider，自动检测已配置的 API Key 并选择对应 Provider。

## 自动检测优先级

`GROQ_API_KEY` > `DEEPSEEK_API_KEY` > `ANTHROPIC_API_KEY` > `OPENAI_API_KEY`

只需配置一个 Key 即可使用，无需全部配置。环境变量优先级高于 `~/.daisy/auth.json` 中保存的配置。

## DeepSeek

性价比高，国内访问速度快，适合日常开发。

```bash
export DEEPSEEK_API_KEY=sk-你的key
```

| 模型 | 说明 |
|------|------|
| `deepseek/deepseek-chat` | 默认模型，通用场景 |
| `deepseek/deepseek-reasoner` | 推理模型，适合复杂任务 |

获取 API Key：[platform.deepseek.com](https://platform.deepseek.com/)

## OpenAI

生态最丰富，支持多模态能力。

```bash
export OPENAI_API_KEY=sk-你的key
```

| 模型 | 说明 |
|------|------|
| `openai/gpt-4o` | 默认模型，全能型 |
| `openai/gpt-4o-mini` | 轻量版，响应更快 |
| `openai/o3-mini` | 推理模型 |

获取 API Key：[platform.openai.com](https://platform.openai.com/api-keys)

## Anthropic

代码生成能力强，支持长上下文窗口。

```bash
export ANTHROPIC_API_KEY=sk-ant-你的key
```

| 模型 | 说明 |
|------|------|
| `anthropic/claude-sonnet-4-20250514` | 默认模型 |
| `anthropic/claude-3-5-sonnet-20241022` | 稳定版 |

获取 API Key：[console.anthropic.com](https://console.anthropic.com/)

## Groq

免费使用，推理速度快，适合高频交互。

```bash
export GROQ_API_KEY=gsk_你的key
```

| 模型 | 说明 |
|------|------|
| `groq/llama-3.3-70b-versatile` | 默认模型 |

获取 API Key：[console.groq.com/keys](https://console.groq.com/keys)

## 自定义 API（OpenAI 兼容）

任何兼容 OpenAI API 格式的服务均可使用，包括本地部署的 Ollama、第三方代理等。

```bash
export OPENAI_API_KEY=你的key
```

启动时指定模型和地址：

```bash
daisy --model qwen2.5-coder --base-url http://localhost:11434/v1
```

或在配置中固定：

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
| Cloudflare Workers AI | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` |
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
| `temperature` | 随机性（0 = 确定，2 = 高随机） | 0.7 |
| `maxTokens` | 最大输出 Token 数 | 4096 |
| `topP` | 核采样参数 | 0.9 |

## 对话中切换模型

在 REPL 中随时切换：

```
> /model openai/gpt-4o
> /model deepseek/deepseek-chat
> /model groq/llama-3.3-70b-versatile
```

## 常见问题

### API Key 未生效

```bash
# 检查环境变量是否设置
echo $DEEPSEEK_API_KEY
```

### 连接失败

- 检查网络连接，国内用户可能需要代理
- 确认 API 地址是否正确
- 检查账户余额是否充足
