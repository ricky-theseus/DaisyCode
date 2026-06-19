# 模型供应方配置

## 支持的 Provider

DaisyCode 支持多个 AI 模型供应方，自动检测可用的 API Key 并选择对应的 Provider。

## Provider 自动检测

按以下优先级自动选择：

1. `DEEPSEEK_API_KEY` → DeepSeek
2. `ANTHROPIC_API_KEY` → Anthropic
3. `OPENAI_API_KEY` → OpenAI

也可以在配置文件中显式指定。

## DeepSeek

### 配置

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 支持的模型

| 模型 | 说明 |
|------|------|
| `deepseek/deepseek-chat` | 默认模型，性价比高 |
| `deepseek/deepseek-reasoner` | 推理模型，适合复杂任务 |

### 特点

- 性价比高，适合日常开发
- 支持长上下文
- 响应速度快

## OpenAI

### 配置

```bash
export OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 支持的模型

| 模型 | 说明 |
|------|------|
| `openai/gpt-4o` | 默认，多模态 |
| `openai/gpt-4o-mini` | 轻量版，速度快 |
| `openai/o3-mini` | 推理模型 |

### 特点

- 生态最丰富
- 支持多模态（图片理解）
- 可通过 baseURL 使用兼容 API

## Anthropic

### 配置

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### 支持的模型

| 模型 | 说明 |
|------|------|
| `anthropic/claude-sonnet-4-20250514` | 默认 |
| `anthropic/claude-3-5-sonnet-20241022` | 稳定版 |

### 特点

- 代码能力优秀
- 长上下文窗口
- 安全性高

## 自定义 OpenAI 兼容 API

任何兼容 OpenAI API 的服务都可以使用。

### 配置

```bash
export OPENAI_API_KEY=sk-xxx
```

启动时指定 baseURL：

```bash
daisy --model "custom-model" --base-url "https://your-api.com/v1"
```

或在配置文件中指定：

```jsonc
{
  "model": "custom-model",
  "baseUrl": "https://your-api.com/v1"
}
```

### 常见兼容服务

- **Azure OpenAI** — `https://<resource>.openai.azure.com`
- **Groq** — `https://api.groq.com/openai/v1`
- **Together AI** — `https://api.together.xyz/v1`
- **Ollama（本地）** — `http://localhost:11434/v1`

## 模型参数

可以在配置文件中调整模型参数：

```jsonc
{
  "modelOptions": {
    "temperature": 0.7,
    "maxTokens": 4096,
    "topP": 0.9
  }
}
```

| 参数 | 说明 | 默认值 | 范围 |
|------|------|--------|------|
| `temperature` | 随机性控制 | 0.7 | 0-2 |
| `maxTokens` | 最大输出 Token | 4096 | 1-128000 |
| `topP` | 核采样 | 0.9 | 0-1 |

## 多 Provider 切换

可以在会话中动态切换 Provider：

```
> /model openai/gpt-4o
> /model deepseek/deepseek-chat
```

## 故障排除

### API Key 无效

```bash
# 检查环境变量是否设置
echo $DEEPSEEK_API_KEY

# 重新设置
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
```

### 连接超时

- 检查网络连接
- 确认 API 地址是否正确
- 对于中国大陆用户，可能需要配置代理

### 配额不足

- 检查 API 账户余额
- 确认是否有速率限制
- 考虑切换到其他 Provider
