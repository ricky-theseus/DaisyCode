import type { ChatRequest, ChatResponse, ChatChunk, Message, ToolCall } from './types.js';

export interface ModelAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<ChatChunk>;
}

interface DeepSeekMessage {
  role: string;
  content: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

interface DeepSeekChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string | null;
}

interface DeepSeekDelta {
  role?: string;
  content?: string;
  tool_calls?: {
    index: number;
    id?: string;
    type?: 'function';
    function?: { name?: string; arguments?: string };
  }[];
}

interface DeepSeekChunkChoice {
  index: number;
  delta: DeepSeekDelta;
  finish_reason: string | null;
}

interface DeepSeekResponse {
  choices: DeepSeekChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface DeepSeekStreamChunk {
  choices: DeepSeekChunkChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function toDeepSeekMessages(msgs: Message[]): DeepSeekMessage[] {
  return msgs.map(m => {
    const msg: DeepSeekMessage = { role: m.role, content: m.content };
    if (m.tool_calls) {
      msg.tool_calls = m.tool_calls;
    }
    if (m.tool_call_id) {
      msg.tool_call_id = m.tool_call_id;
    }
    return msg;
  });
}

function fromDeepSeekToolCalls(
  calls: { id: string; type: 'function'; function: { name: string; arguments: string } }[],
): ToolCall[] {
  return calls.map(c => ({
    id: c.id,
    type: 'function' as const,
    function: { name: c.function.name, arguments: c.function.arguments },
  }));
}

export function estimateTokens(text: string, usageTotal?: number): number {
  if (usageTotal !== undefined && usageTotal > 0) return usageTotal;
  return Math.ceil(text.length / 3.5);
}

export class DeepSeekAdapter implements ModelAdapter {
  private baseURL: string;
  private apiKey: string;
  private timeout: number;

  constructor(opts?: { baseURL?: string; apiKey?: string; timeout?: number }) {
    this.baseURL = opts?.baseURL ?? 'https://api.deepseek.com/v1';
    this.apiKey = opts?.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '';
    this.timeout = opts?.timeout ?? 120_000;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const body = {
      model: 'deepseek-chat',
      messages: toDeepSeekMessages(request.messages),
      tools: request.tools.length > 0 ? request.tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })) : undefined,
    };

    const data = await this.fetchWithRetry<DeepSeekResponse>('/chat/completions', body, request.signal);
    const choice = data.choices[0];

    const message: Message = {
      role: 'assistant',
      content: choice.message.content ?? '',
    };

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      message.tool_calls = fromDeepSeekToolCalls(choice.message.tool_calls);
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

  async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const body = {
      model: 'deepseek-chat',
      messages: toDeepSeekMessages(request.messages),
      tools: request.tools.length > 0 ? request.tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })) : undefined,
      stream: true,
    };

    const response = await this.fetchWithRetryRaw('/chat/completions', body, request.signal);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') return;

        try {
          const chunk: DeepSeekStreamChunk = JSON.parse(payload);
          const choice = chunk.choices?.[0];
          if (!choice) continue;

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
        } catch {
          // skip malformed chunk
        }
      }
    }
  }

  private async fetchWithRetry<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.fetchWithRetryRaw(path, body, signal);
    return response.json() as Promise<T>;
  }

  private async fetchWithRetryRaw(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const url = `${this.baseURL}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Link external signal
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

        if (response.ok) return response;

        // 429 — rate limit, retry with backoff
        if (response.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // 5xx — server error, retry up to 2 times
        if (response.status >= 500 && attempt < 2) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Non-retryable error
        const text = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${text}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.name === 'AbortError') throw lastError;
        // Retry on network errors
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
