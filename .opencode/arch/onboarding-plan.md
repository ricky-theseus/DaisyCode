# DaisyCode Onboarding 方案

**版本**: 1.0  
**状态**: 草案  
**日期**: 2026-06-19

---

## 1. 需求分析

### 1.1 当前问题

DaisyCode 当前依赖环境变量配置 API Key：

```typescript
// model-adapter.ts —— detectProvider()
export function detectProvider(): ProviderName {
  if (process.env.DEEPSEEK_API_KEY) {return 'deepseek';}
  if (process.env.ANTHROPIC_API_KEY) {return 'anthropic';}
  if (process.env.OPENAI_API_KEY) {return 'openai';}
  return 'deepseek';  // <- 无 API Key 时默认走 DeepSeek，会 401 报错
}
```

首次运行无任何配置时，`daisy` 命令直接崩溃在 API 认证失败上。新手用户体验极差。

### 1.2 目标

| 目标 | 优先级 | 说明 |
|------|--------|------|
| 零配置可用 | P0 | `npm install -g daisycode && daisy` 直接能用 |
| 内置免费模型 | P0 | 至少一个免费 AI provider 内置可用 |
| 交互式配置 | P1 | 首次启动引导用户选择模型 |
| 高级配置入口 | P1 | `daisy connect` 命令管理 provider |
| 配置持久化 | P1 | API key 存入用户目录，不暴露 |

---

## 2. 免费模型方案对比

### 2.1 备选方案

| 方案 | 费用 | 速度 | 质量 | 兼容性 | 零配置难度 |
|------|------|------|------|--------|-----------|
| **Groq** | 免费 (30 req/min) | ⚡ 极快 (~240 tok/s) | 中高 (Llama 3.3 70B) | OpenAI 兼容 | 需注册拿 key |
| **Cloudflare Workers AI** | 免费 (10k req/day) | 🚀 快 | 中 (Llama 3.1 8B) | 需 AI Gateway 转 OpenAI 格式 | 需注册拿 key |
| **Ollama 本地** | 完全免费 | 🐢 取决于硬件 | 取决于模型 | OpenAI 兼容 | 需本地安装 |
| **DeepSeek** | 付费 ($0.27/M) | ⚡ 快 | 高 (V3) | OpenAI 兼容 | 需付费 |
| **OpenAI** | 付费 | ⚡ 快 | 高 | 原生 | 需付费 |

### 2.2 推荐方案：Groq

**选择理由**（权衡分析）：

| 维度 | Groq | Cloudflare | Ollama |
|------|------|-----------|--------|
| API 兼容性 | ✅ 原生 OpenAI 格式，零适配 | ⚠️ Workers AI 原生 API 不兼容，需搭 AI Gateway 做转接 | ✅ 原生 OpenAI 格式 |
| 模型质量 | ✅ Llama 3.3 70B = GPT-4 级别 | ❌ 免费层只有 8B 模型 | ✅ 取决于用户自己拉的模型 |
| 开通门槛 | 1 步：注册 → 复制 key | 2 步：注册 → 创建 gateway → 配 token | 1 步：装 Ollama |
| 速度 | ✅ Token 生成极快 | ✅ 边缘网络延迟低 | ❌ 无 GPU 极慢 |
| 可靠性 | ✅ 托管服务 | ✅ 全球边缘网络 | ❌ 用户本地环境不可控 |

**结论**：Groq 作为**默认推荐**，因为它是真正的 OpenAI 兼容（零适配成本）、推理极快、免费额度更适合 coding agent 场景（coding 需要快速迭代 prompt）。

Cloudflare Workers AI 需要额外搭 AI Gateway 才能兼容 OpenAI 格式，增加了 onboarding 复杂度。但 Cloudflare 的免费额度更高，适合作为**备选免费方案**。

Ollama 是**零依赖的最佳选择**——如果检测到本地 Ollama 运行，自动使用它（完全免费、无需注册）。但不应作为默认推荐，因为用户不一定已安装。

### 2.3 最终分层策略

```
运行 daisy
  ├─ 已有 API Key (环境变量 / auth.json) → 直接用
  ├─ 检测到 Ollama 运行中 → 自动使用 (零配置)
  ├─ 没有任何配置 → 显示交互式菜单选择：
  │   ├─ [推荐] Groq (免费) — 引导注册并输入 key
  │   ├─ Cloudflare Workers AI (免费) — 引导注册并输入 key
  │   ├─ Ollama (本地) — 如果安装了 Ollama 但未运行，提示启动
  │   └─ 我有 API Key (DeepSeek / OpenAI / Claude)
  └─ 用户跳过 → 进入演示模式（有限功能，纯本地 mock）
```

---

## 3. 配置存储

### 3.1 存储位置

沿袭 `config.ts` 已有的 `~/.daisy/` 目录策略：

```
~/.daisy/
  ├── auth.json           ← API keys & provider 配置 (本文件)
  ├── config.jsonc        ← 用户级配置 (已有)
  └── sessions/           ← 会话 (已有)
```

### 3.2 auth.json 格式

```json
{
  "defaultProvider": "groq",
  "defaultModel": "llama-3.3-70b-versatile",
  "providers": {
    "groq": {
      "apiKey": "gsk_xxxxxxxxxxxx",
      "baseURL": "https://api.groq.com/openai/v1"
    },
    "cloudflare": {
      "apiKey": "xxxxxxxxxxxxxx",
      "accountId": "xxxxxxxxxxxxxx",
      "baseURL": "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run"
    },
    "deepseek": {
      "apiKey": "sk_xxxxxxxxxxxx",
      "baseURL": "https://api.deepseek.com/v1"
    },
    "openai": {
      "apiKey": "sk-xxxxxxxxxxxx",
      "baseURL": "https://api.openai.com/v1"
    },
    "anthropic": {
      "apiKey": "sk-ant-xxxxxxxxxx",
      "baseURL": "https://api.anthropic.com/v1"
    }
  }
}
```

### 3.3 文件权限

- `auth.json` 创建时设置 `0600`（仅所有者可读写）
- 父目录 `~/.daisy/` 的权限保持默认

### 3.4 配置优先级（Provider 选择）

```
环境变量 > auth.json > daisy.jsonc > 默认
```

环境变量仍为最高优先级，用于 CI/CD 等无交互场景：

| 环境变量 | 对应 Provider |
|---------|-------------|
| `GROQ_API_KEY` | groq |
| `DEEPSEEK_API_KEY` | deepseek |
| `OPENAI_API_KEY` | openai |
| `ANTHROPIC_API_KEY` | anthropic |
| `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID` | cloudflare |

---

## 4. 交互流程设计

### 4.1 首次启动流程

```
$ daisy
```

```
╭──────────────────────────────────────────────╮
│  🌼 DaisyCode — 首次启动                     │
│                                              │
│  还没找到 AI 模型配置，选一个方式开始：        │
│                                              │
│  ╭────────────────────────────────────────╮  │
│  │                                        │  │
│  │  🎯 推荐方案                           │  │
│  │                                        │  │
│  │  1) ☁️ Groq (免费)                     │  │
│  │     无需绑定信用卡，30 req/min 免费额度   │  │
│  │     Llama 3.3 70B — 极速推理            │  │
│  │                                        │  │
│  │  🌿 其他方案                           │  │
│  │                                        │  │
│  │  2) 🌥️ Cloudflare Workers AI (免费)    │  │
│  │     10,000 请求/天，需注册 Cloudflare    │  │
│  │                                        │  │
│  │  3) 🏠 Ollama (本地)                    │  │
│  │     完全免费，需安装 Ollama              │  │
│  │                                        │  │
│  │  🔑 已有 Key                          │  │
│  │                                        │  │
│  │  4) DeepSeek                           │  │
│  │  5) OpenAI                             │  │
│  │  6) Anthropic Claude                   │  │
│  │  7) 自定义 (OpenAI 兼容 API)           │  │
│  │                                        │  │
│  │  8) 🎮 演示模式 (无需 Key, 功能受限)    │  │
│  │                                        │  │
│  ╰────────────────────────────────────────╯  │
│                                              │
│  选择 (1-8): _                                │
╰──────────────────────────────────────────────╯
```

**选择 1 (Groq):**
```
  已选: Groq (免费)

  ⚠️ 需要一个 Groq API Key:
   1. 打开 https://console.groq.com/keys
   2. 点击 "Create API Key"
   3. 复制 key (格式: gsk_xxx)

  请输入你的 Groq API Key: gsk_xxx

  ✅ 验证成功! 正在测试模型...

  可用模型:
   1. Llama 3.3 70B (推荐)  → llama-3.3-70b-versatile
   2. Llama 3.1 8B (更快)    → llama-3.1-8b-instant
   3. Mixtral 8x7B            → mixtral-8x7b-32768

  选择默认模型 (1-3) [1]: 1

  ✅ 配置已保存到 ~/.daisy/auth.json
  🚀 启动 DaisyCode...
```

**选择 3 (Ollama):**
```
  已选: Ollama (本地)

  检测 Ollama 运行中...
  ⚠️ 未检测到 Ollama (http://localhost:11434)

   1. 安装 Ollama: https://ollama.com
   2. 启动: ollama serve
   3. 拉取模型: ollama pull llama3.2

  按回车键后重试检测...
  或输入 'b' 返回菜单:
```

**选择 8 (演示模式):**
```
  演示模式: 使用内置 mock 响应
  功能限制: 仅文件读取/编辑，无 AI 生成

  按回车继续...
```

### 4.2 `daisy init` 改造

现有 `daisy init` 只创建项目配置，不够热。改造为：

```
$ daisy init

  DaisyCode — 初始化项目

  你想从哪开始？
   1) 🆕 新项目 — 创建 daisy.jsonc
   2) 🔗 配置 AI Provider — 如同 daisy connect
   3) 🔄 从 OpenCode 迁移 — daisy migrate

  选择 (1-3) [1]:
```

---

## 5. CLI 命令: `daisy connect`

### 5.1 命令树

```
daisy connect                    → 交互式菜单
daisy connect list               → 列出已配置的 provider
daisy connect set <provider>     → 配置某个 provider (带参数或交互)
daisy connect remove <provider>  → 移除某个 provider 配置
daisy connect test               → 测试当前配置是否可用
```

### 5.2 `daisy connect` 交互式菜单

```
$ daisy connect

  ╭─ DaisyCode Connect ─────────────────────────╮
  │                                             │
  │  当前配置:                                   │
  │    ☁️ Groq → llama-3.3-70b-versatile ✅      │
  │                                             │
  │  操作:                                      │
  │    1. 切换默认 Provider                     │
  │    2. 新增 Provider                        │
  │    3. 修改 Provider 配置                   │
  │    4. 测试当前配置                          │
  │    5. 查看所有配置                          │
  │    6. 断开 Provider (移除)                  │
  │                                             │
  │    0. 退出                                  │
  │                                             │
  │  选择 (0-6): _                               │
  ╰─────────────────────────────────────────────╯
```

### 5.3 `daisy connect set <provider>`

非交互式模式，用于脚本/CI：

```bash
daisy connect set groq --key gsk_xxx --model llama-3.3-70b-versatile
daisy connect set deepseek --key sk_xxx
daisy connect set custom --base-url https://xxx/v1 --key sk_xxx --model my-model
```

### 5.4 `daisy connect list`

```
$ daisy connect list

  已配置的 AI Provider:
  ┌────────────┬────────────────────────┬──────────────────────────┬──────┐
  │ Provider   │ Model                  │ Base URL                 │ 默认 │
  ├────────────┼────────────────────────┼──────────────────────────┼──────┤
  │ groq       │ llama-3.3-70b-versatile│ api.groq.com/openai/v1   │  ✅  │
  │ cloudflare │ @cf/meta/llama-3.1-8b  │ api.cloudflare.com/...   │      │
  └────────────┴────────────────────────┴──────────────────────────┴──────┘
```

### 5.5 与现有 CLI 集成

改造 `src/index.ts` 的 `main()` 函数：

```typescript
if (command === 'connect') {
  const subcommand = positionals[1];
  await connectCommand(subcommand, positionals.slice(2));
  return;
}
```

---

## 6. 内置模型清单

### 6.1 免费模型

| Provider | 模型名称 | API Model ID | 上下文 | 适合场景 |
|----------|---------|-------------|--------|---------|
| **Groq** | Llama 3.3 70B | `llama-3.3-70b-versatile` | 32K | 默认推荐，编码主力 |
| **Groq** | Llama 3.1 8B | `llama-3.1-8b-instant` | 8K | 快速问答、文件操作 |
| **Groq** | Mixtral 8x7B | `mixtral-8x7b-32768` | 32K | 长上下文场景 |
| **Cloudflare** | Llama 3.1 8B | `@cf/meta/llama-3.1-8b-instruct` | 8K | 基础编码 |
| **Cloudflare** | Qwen 2.5 7B | `@cf/qwen/qwen2.5-7b-instruct` | 32K | 中文场景优秀 |
| **Cloudflare** | Deepseek Coder 6.7B | `@cf/deepseek-ai/deepseek-coder-6.7b-instruct` | 32K | 代码补全 |
| **Ollama** | 用户拉取的任何模型 | 自动检测 | 取决于模型 | 完全本地 |

### 6.2 付费模型（需自行配置 Key）

| Provider | 模型名称 | API Model ID | 价格 (per M tokens) |
|----------|---------|-------------|-------------------|
| DeepSeek | DeepSeek V3 | `deepseek-chat` | $0.27 输入 / $1.10 输出 |
| DeepSeek | DeepSeek R1 | `deepseek-reasoner` | $0.55 输入 / $2.19 输出 |
| OpenAI | GPT-4o | `gpt-4o` | $2.50 输入 / $10.00 输出 |
| OpenAI | GPT-4o Mini | `gpt-4o-mini` | $0.15 输入 / $0.60 输出 |
| OpenAI | o3 Mini | `o3-mini` | $1.10 输入 / $4.40 输出 |
| Anthropic | Claude Sonnet 4 | `claude-sonnet-4-20250514` | $3.00 输入 / $15.00 输出 |
| Anthropic | Claude Haiku 3.5 | `claude-3-5-haiku-latest` | $0.80 输入 / $4.00 输出 |

---

## 7. 代码改动清单

### 7.1 新文件

| 文件 | 职责 | 预估行数 |
|------|------|---------|
| `src/auth.ts` | auth.json 读写、验证、加密存储 | 150 |
| `src/commands/connect.ts` | `daisy connect` 子命令 | 250 |
| `src/commands/onboarding.ts` | 首次启动交互式菜单 | 200 |
| `src/models.ts` | 内置模型清单（免费 + 付费） | 80 |
| `src/ollama.ts` | Ollama 自动检测 | 50 |

### 7.2 修改文件

| 文件 | 改动 | 行数 |
|------|------|------|
| `src/index.ts` | 启动时检查 auth → 无配置走 onboarding；新增 `connect` 子命令 | +40 |
| `src/config.ts` | 新增 `loadAuth()` 函数，合并到配置加载流程 | +30 |
| `src/model-adapter.ts` | `detectProvider()` 同时检查 auth.json 中的 provider；新增 Cloudflare adapter | +50 |
| `src/commands/init.ts` | 改造 init 流程，整合 AI provider 配置 | +30 |

### 7.3 不修改

| 文件 | 原因 |
|------|------|
| `src/agent-loop.ts` | 不关心 provider 来源 |
| `src/orchestrator.ts` | 不关心 provider 来源 |
| `src/permissions.ts` | 不关心 provider 来源 |
| `src/repl.ts` | 不关心 provider 来源 |
| `src/types.ts` | DaisyConfig 类型不变，auth 是独立存储 |

### 7.4 零新依赖

本方案不引入任何新 npm 依赖。原因：

- Groq API 完全兼容 OpenAI 格式 → 复用 `OpenAIAdapter`
- Cloudflare Workers AI 通过 AI Gateway 转 OpenAI 格式 → 复用 `OpenAIAdapter`
- Ollama 也是 OpenAI 格式 → 复用 `OpenAIAdapter`
- auth.json 用原生 `fs` 读写，不需要加密库（不做 UI 级别的密钥管理）
- 交互菜单用原生 `readline`（已有的）

---

## 8. 架构关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    daisy 启动流程                             │
│                                                             │
│   index.ts main()                                           │
│     ↓                                                        │
│   loadConfig() + loadAuth()   ←── auth.json                 │
│     ↓                                                        │
│   有 Key?                                                    │
│    ├── 是 → detectProvider() → createModel() → 正常启动      │
│    │          (环境变量 > auth.json > daisy.jsonc)           │
│    │                                                         │
│    └── 否 → │ 检测到 Ollama?                                  │
│              ├── 是 → 自动配置 Ollama adapter → 正常启动       │
│              └── 否 → showOnboardingMenu()                   │
│                         ├─ Groq → saveAuth() → 启动          │
│                         ├─ Cloudflare → saveAuth() → 启动    │
│                         ├─ Ollama → saveAuth() → 启动        │
│                         ├─ 自定义 → saveAuth() → 启动        │
│                         └─ 演示模式 → mockAdapter → 启动     │
│                                                             │
│   daisy connect 流程                                         │
│                                                             │
│   connectCommand()                                           │
│     ↓                                                        │
│   loadAuth() → 显示当前配置 → 交互修改 → saveAuth()          │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. ModelAdapter 改造

### 9.1 Cloudflare 适配

Cloudflare Workers AI 原生 API **不兼容** OpenAI 格式。有两种方式：

**方案 A（推荐）：使用 AI Gateway 转接**

AI Gateway 提供 OpenAI 兼容的 `/v1/chat/completions` 端点：

```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai/chat/completions
```

用户配置 Cloudflare 时，引导创建 AI Gateway：

```
1. 打开 https://dash.cloudflare.com → AI → AI Gateway
2. 创建 Gateway (如 "daisy-gateway")
3. 获取 Gateway URL 和 API Token
```

**方案 B：自实现 Cloudflare Adapter**

如果用户不愿意配置 Gateway，我们提供一个直接的 `CloudflareAdapter`：

```typescript
export class CloudflareAdapter implements ModelAdapter {
  private accountId: string;
  private apiKey: string;
  private model: string;

  constructor(opts: { accountId: string; apiKey: string; model: string }) {
    this.accountId = opts.accountId;
    this.apiKey = opts.apiKey;
    this.model = opts.model;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: request.messages.map(m => ({ role: m.role, content: m.content })) }),
    });
    const data = await response.json() as any;
    return { message: { role: 'assistant', content: data.result.response } };
  }

  // stream: Cloudflare Workers AI support streaming via SSE
  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> { ... }
}
```

**决定**：先实现方案 A（AI Gateway），因为 0 额外适配代码，直接复用 `OpenAIAdapter`。如果用户没有 Gateway，引导其创建。

### 9.2 detectProvider 改造

```typescript
export function detectProvider(auth?: AuthConfig): ProviderName {
  // 1. 环境变量优先
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';

  // 2. auth.json
  if (auth?.defaultProvider) return auth.defaultProvider;

  // 3. 检测 Ollama
  if (ollamaDetected) return 'ollama';

  // 4. 无配置
  return 'none';
}
```

### 9.3 `createModel` 改造

```typescript
export function createModel(opts?: ModelFactoryOptions): ModelAdapter {
  const provider = opts?.provider ?? detectProvider(auth);
  // ... 现有 deepseek/openai/anthropic 分支 ...
  // 新增分支:
  case 'groq':
    return new OpenAIAdapter({
      baseURL: opts?.baseURL ?? 'https://api.groq.com/openai/v1',
      apiKey: opts?.apiKey ?? auth?.providers.groq?.apiKey,
      model: opts?.model ?? 'llama-3.3-70b-versatile',
    });
  case 'ollama':
    return new OpenAIAdapter({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama',  // Ollama 不需要 key，但要兼容 header
      model: opts?.model ?? 'llama3.2',
    });
}
```

---

## 10. 实现顺序

```
Step 1: 基础设施
  ├── src/auth.ts           ← auth.json 读写
  ├── src/models.ts         ← 内置模型清单
  └── src/ollama.ts         ← Ollama 检测

Step 2: Onboarding 流程
  ├── src/commands/onboarding.ts  ← 首次启动菜单
  └── src/index.ts                ← 启动时检测 + 分发

Step 3: connect 命令
  ├── src/commands/connect.ts  ← daisy connect 全套子命令
  └── src/index.ts             ← 注册 connect 子命令

Step 4: ModelAdapter 改造
  └── src/model-adapter.ts     ← detectProvider + createModel 增强
```

---

## 11. 安全性考虑

| 风险 | 应对 |
|------|------|
| auth.json 泄露 | 文件权限设为 0600；.gitignore 建议添加 `~/.daisy/auth.json` |
| API Key 暴露在日志 | CLI 输出时对 API Key 做 mask（`gsk_xxx****xxx`） |
| 中间人攻击 | 所有 API 调用使用 HTTPS；不信任自签名证书 |
| Ollama 不安全 | Ollama 默认监听 localhost；不在生产环境暴露 |

---

## 12. 未纳入范围

| 功能 | 原因 | 未来可能 |
|------|------|---------|
| 系统 keychain 集成 (macOS Keychain / Windows Credential Manager) | 增加复杂度，YAGNI | Phase 3 |
| 用量统计/计费提醒 | 不是 MVP 目标 | Phase 3 |
| 模型自动切换（根据任务）| 非首次体验内容 | Phase 3 |
| 代理/VPN 支持 | 少数场景 | 通过环境变量 `HTTP_PROXY` 已支持 |

---

## 13. 附录：参考实现

### 13.1 auth.ts 核心接口

```typescript
interface ProviderAuth {
  apiKey: string;
  baseURL?: string;
  accountId?: string;    // Cloudflare 专用
}

interface AuthConfig {
  defaultProvider: string;
  defaultModel: string;
  providers: Record<string, ProviderAuth>;
}

function loadAuth(): AuthConfig | null;
function saveAuth(config: AuthConfig): void;
function maskKey(key: string): string;  // 显示时脱敏
```

### 13.2 models.ts 核心接口

```typescript
interface ModelInfo {
  provider: string;
  id: string;
  name: string;
  contextLength: number;
  free: boolean;
  description: string;
  paid?: { inputPrice: number; outputPrice: number };  // per M tokens
}

const FREE_MODELS: ModelInfo[] = [
  { provider: 'groq', id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 32768, free: true, description: 'Groq 免费层 — 推荐' },
  { provider: 'groq', id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextLength: 8192, free: true, description: 'Groq 免费层 — 更快' },
  { provider: 'cloudflare', id: '@cf/meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', contextLength: 8192, free: true, description: 'Cloudflare Workers AI' },
  // ...
];
```

### 13.3 Groq 的 OpenAI 兼容性

确认：Groq API 完全兼容 OpenAI 的 `/v1/chat/completions` 格式。

```typescript
// 无需自定义适配器，直接：
new OpenAIAdapter({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: 'gsk_xxx',
  model: 'llama-3.3-70b-versatile',
});
```

---

*文档版本: 1.0 | 最后更新: 2026-06-19*
