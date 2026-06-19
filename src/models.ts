export interface ModelInfo {
  provider: string;
  id: string;
  name: string;
  contextLength: number;
  description: string;
}

export const MODELS: ModelInfo[] = [
  { provider: 'deepseek', id: 'deepseek-chat', name: 'DeepSeek V3', contextLength: 65536, description: 'DeepSeek V3 聊天' },
  { provider: 'deepseek', id: 'deepseek-reasoner', name: 'DeepSeek R1', contextLength: 65536, description: 'DeepSeek R1 推理' },
  { provider: 'openai', id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, description: 'OpenAI GPT-4o' },
  { provider: 'openai', id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, description: 'OpenAI GPT-4o Mini' },
  { provider: 'openai', id: 'o3-mini', name: 'o3 Mini', contextLength: 200000, description: 'OpenAI o3 Mini' },
  { provider: 'anthropic', id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextLength: 200000, description: 'Anthropic Claude Sonnet 4' },
  { provider: 'anthropic', id: 'claude-3-5-haiku-latest', name: 'Claude Haiku 3.5', contextLength: 200000, description: 'Anthropic Claude Haiku 3.5' },
  { provider: 'groq', id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 32768, description: 'Groq 免费层' },
  { provider: 'groq', id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextLength: 8192, description: 'Groq 更快' },
  { provider: 'groq', id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextLength: 32768, description: 'Groq 长上下文' },
];

export function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'deepseek': return 'deepseek-chat';
    case 'openai': return 'gpt-4o';
    case 'anthropic': return 'claude-sonnet-4-20250514';
    case 'groq': return 'llama-3.3-70b-versatile';
    default: return '';
  }
}
