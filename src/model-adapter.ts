import type { ChatRequest, ChatResponse, ChatChunk, Message, ToolCall } from './types.js';
import { loadAuth } from './auth.js';

export interface ModelAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

interface OpenAICompatibleMessage {
  role: string;
  content: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

interface OpenAICompatibleChoice {
  index: number;
  message: OpenAICompatibleMessage;
  finish_reason: string | null;
}

interface OpenAICompatibleDelta {
  role?: string;
  content?: string;
  tool_calls?: {
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }[];
}

interface OpenAICompatibleChunkChoice {
  index: number;
  delta: OpenAICompatibleDelta;
  finish_reason: string | null;
}

interface OpenAICompatibleResponse {
  choices: OpenAICompatibleChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface OpenAICompatibleStreamChunk {
  choices: OpenAICompatibleChunkChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function toMessages(msgs: Message[]): OpenAICompatibleMessage[] {
  return msgs.map(m => {
    const msg: OpenAICompatibleMessage = { role: m.role, content: m.content };
    if (m.tool_calls) {msg.tool_calls = m.tool_calls;}
    if (m.tool_call_id) {msg.tool_call_id = m.tool_call_id;}
    return msg;
  });
}

function fromToolCalls(
  calls: { id: string; type: 'function'; function: { name: string; arguments: string } }[],
): ToolCall[] {
  return calls.map(c => ({
    id: c.id,
    type: 'function' as const,
    function: { name: c.function.name, arguments: c.function.arguments },
  }));
}

function buildToolsBody(tools: ChatRequest['tools']) {
  return tools.length > 0
    ? tools.map(t => ({
        type: 'function' as const,
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }))
    : undefined;
}

export function estimateTokens(text: string, usageTotal?: number): number {
  if (usageTotal !== undefined && usageTotal > 0) {return usageTotal;}
  return Math.ceil(text.length / 3.5);
}

// ─── Base HTTP client ────────────────────────────────────────────────────────

class HttpClient {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor(baseURL: string, apiKey: string, timeout: number) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.postRaw(path, body, signal);
    return response.json() as Promise<T>;
  }

  async *postStream<T>(path: string, body: unknown, signal?: AbortSignal): AsyncIterable<T> {
    const response = await this.postRaw(path, { ...(body as object), stream: true }, signal);
    const reader = response.body?.getReader();
    if (!reader) {throw new Error('No response body');}

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {break;}

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) {continue;}
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') {return;}

        try {
          yield JSON.parse(payload) as T;
        } catch {
          // skip malformed chunk
        }
      }
    }
  }

  private async postRaw(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const onAbort = () => { controller.abort(); };
      signal?.addEventListener('abort', onAbort, { once: true });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (response.ok) {return response;}

        if (response.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (response.status >= 500 && attempt < 2) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        const text = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${text}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.name === 'AbortError') {throw lastError;}
        if (attempt < 4) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', onAbort);
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }
}

// ─── OpenAI-compatible adapter (DeepSeek, OpenAI, Groq, Custom) ──────────────

export class OpenAICompatibleAdapter implements ModelAdapter {
  protected http: HttpClient;
  protected model: string;

  constructor(opts?: { baseURL?: string; apiKey?: string; timeout?: number; model?: string }) {
    this.http = new HttpClient(
      opts?.baseURL ?? 'https://api.openai.com/v1',
      opts?.apiKey ?? '',
      opts?.timeout ?? 120_000,
    );
    this.model = opts?.model ?? 'gpt-4o';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = { model: this.model, messages: toMessages(request.messages), tools: buildToolsBody(request.tools) };
    const data = await this.http.post<OpenAICompatibleResponse>('/chat/completions', body, request.signal);
    return this.toResponse(data);
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const body = { model: this.model, messages: toMessages(request.messages), tools: buildToolsBody(request.tools) };
    for await (const chunk of this.http.postStream<OpenAICompatibleStreamChunk>('/chat/completions', body, request.signal)) {
      yield* this.chunkToEvents(chunk);
    }
  }

  protected toResponse(data: OpenAICompatibleResponse): ChatResponse {
    const choice = data.choices[0];
    const message: Message = { role: 'assistant', content: choice.message.content ?? '' };
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      message.tool_calls = fromToolCalls(choice.message.tool_calls);
    }
    return {
      message,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  protected *chunkToEvents(chunk: OpenAICompatibleStreamChunk): Iterable<ChatChunk> {
    const choice = chunk.choices?.[0];
    if (!choice) {return;}

    if (choice.delta.content) {
      yield { type: 'text', content: choice.delta.content, index: choice.index };
    }

    if (choice.delta.tool_calls) {
      for (const tc of choice.delta.tool_calls) {
        if (tc.function?.name) {
          yield {
            type: 'tool_call',
            content: JSON.stringify({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments ?? '' }),
            index: tc.index,
          };
        }
      }
    }
  }
}

// ─── Anthropic ───────────────────────────────────────────────────────────────

interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  is_error?: boolean;
  tool_use_id?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  tools?: { name: string; description: string; input_schema: Record<string, unknown> }[];
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContent[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  usage: { input_tokens: number; output_tokens: number };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: { text?: string; type?: string; partial_json?: string };
  content_block?: AnthropicContent;
  message?: { usage?: { input_tokens: number; output_tokens: number } };
}

export class AnthropicAdapter implements ModelAdapter {
  private http: HttpClient;
  private model: string;
  private maxTokens: number;

  constructor(opts?: { baseURL?: string; apiKey?: string; timeout?: number; model?: string; maxTokens?: number }) {
    this.http = new HttpClient(
      opts?.baseURL ?? 'https://api.anthropic.com/v1',
      opts?.apiKey ?? '',
      opts?.timeout ?? 120_000,
    );
    this.model = opts?.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = opts?.maxTokens ?? 8192;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = this.buildBody(request);
    const data = await this.http.post<AnthropicResponse>('/messages', body, request.signal);
    return this.toResponse(data);
  }

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const body = this.buildBody(request);
    for await (const event of this.http.postStream<AnthropicStreamEvent>('/messages', body, request.signal)) {
      yield* this.eventToChunks(event);
    }
  }

  private buildBody(request: ChatRequest): AnthropicRequest {
    const systemParts: string[] = [];
    const msgs: AnthropicMessage[] = [];

    for (const m of request.messages) {
      if (m.role === 'system') {
        systemParts.push(m.content);
        continue;
      }

      if (m.role === 'tool') {
        const content: AnthropicContent = {
          type: 'tool_result',
          tool_use_id: m.tool_call_id ?? '',
          content: m.content,
        };
        const last = msgs[msgs.length - 1];
        if (last && last.role === 'user') {
          last.content.push(content);
        } else {
          msgs.push({ role: 'user', content: [content] });
        }
        continue;
      }

      const content: AnthropicContent[] = [{ type: 'text', text: m.content }];

      if (m.role === 'assistant' && m.tool_calls) {
        for (const tc of m.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          });
        }
      }

      msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content });
    }

    const body: AnthropicRequest = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: msgs,
    };

    if (systemParts.length > 0) {
      body.system = systemParts.join('\n\n');
    }

    if (request.tools.length > 0) {
      body.tools = request.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Record<string, unknown>,
      }));
    }

    return body;
  }

  private toResponse(data: AnthropicResponse): ChatResponse {
    const content = data.content.map(c => c.text ?? '').join('');
    const message: Message = { role: 'assistant', content };

    const toolCalls = data.content
      .filter((c): c is AnthropicContent & { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        c.type === 'tool_use' && !!c.id && !!c.name)
      .map(c => ({
        id: c.id,
        type: 'function' as const,
        function: { name: c.name, arguments: JSON.stringify(c.input) },
      }));

    if (toolCalls.length > 0) {message.tool_calls = toolCalls;}

    return {
      message,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  private *eventToChunks(event: AnthropicStreamEvent): Iterable<ChatChunk> {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      yield { type: 'text', content: event.delta.text, index: event.index ?? 0 };
    }
    if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
      const cb = event.content_block;
      yield {
        type: 'tool_call',
        content: JSON.stringify({ id: cb.id, name: cb.name, arguments: JSON.stringify(cb.input ?? {}) }),
        index: event.index ?? 0,
      };
    }
    if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta' && event.delta?.partial_json) {
      yield { type: 'text', content: event.delta.partial_json, index: event.index ?? 0 };
    }
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export type ProviderName = 'deepseek' | 'openai' | 'anthropic' | 'groq' | 'custom' | string;

export interface ModelFactoryOptions {
  provider?: ProviderName;
  baseURL?: string;
  apiKey?: string;
  model?: string;
  timeout?: number;
}

export function detectProvider(): ProviderName {
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';

  const auth = loadAuth();
  if (auth?.defaultProvider && auth.providers[auth.defaultProvider]?.apiKey) {
    return auth.defaultProvider;
  }

  return 'none';
}

export function createModel(opts?: ModelFactoryOptions): ModelAdapter | null {
  const provider = opts?.provider ?? detectProvider();
  const auth = loadAuth();
  const providerConfig = auth?.providers?.[provider];

  function resolveKey(envVar: string): string {
    return opts?.apiKey ?? process.env[envVar] ?? providerConfig?.apiKey ?? '';
  }

  switch (provider) {
    case 'groq':
      return new OpenAICompatibleAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL ?? 'https://api.groq.com/openai/v1',
        apiKey: resolveKey('GROQ_API_KEY'),
        timeout: opts?.timeout,
        model: opts?.model ?? auth?.defaultModel ?? 'llama-3.3-70b-versatile',
      });
    case 'deepseek':
      return new OpenAICompatibleAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL ?? 'https://api.deepseek.com/v1',
        apiKey: resolveKey('DEEPSEEK_API_KEY'),
        timeout: opts?.timeout,
        model: opts?.model ?? auth?.defaultModel ?? 'deepseek-chat',
      });
    case 'openai':
      return new OpenAICompatibleAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL ?? 'https://api.openai.com/v1',
        apiKey: resolveKey('OPENAI_API_KEY'),
        timeout: opts?.timeout,
        model: opts?.model ?? auth?.defaultModel ?? 'gpt-4o',
      });
    case 'anthropic':
      return new AnthropicAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL ?? 'https://api.anthropic.com/v1',
        apiKey: resolveKey('ANTHROPIC_API_KEY'),
        timeout: opts?.timeout,
        model: opts?.model ?? auth?.defaultModel ?? 'claude-sonnet-4-20250514',
      });
    case 'custom':
      return new OpenAICompatibleAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL,
        apiKey: opts?.apiKey ?? providerConfig?.apiKey ?? '',
        timeout: opts?.timeout,
        model: opts?.model ?? (providerConfig?.baseURL ? 'custom-model' : undefined),
      });
    case 'none':
      return null;
    default:
      return new OpenAICompatibleAdapter({
        baseURL: opts?.baseURL ?? providerConfig?.baseURL,
        apiKey: opts?.apiKey ?? providerConfig?.apiKey ?? '',
        timeout: opts?.timeout,
        model: opts?.model ?? provider,
      });
  }
}
