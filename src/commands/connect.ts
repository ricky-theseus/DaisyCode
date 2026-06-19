import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { setProvider, loadAuth, maskKey } from '../auth.js';
import { getDefaultModel } from '../models.js';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function askSecret(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (wasRaw !== true) stdin.setRawMode?.(true);
    rl.question(question, answer => {
      if (wasRaw !== true) stdin.setRawMode?.(false);
      console.log(); // newline after hidden input
      resolve(answer);
    });
  });
}

const PROVIDERS = [
  { key: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { key: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
  { key: 'anthropic', label: 'Anthropic', defaultModel: 'claude-sonnet-4-20250514' },
  { key: 'groq', label: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
  { key: 'custom', label: 'Custom (OpenAI-compatible)', defaultModel: '' },
];

const BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  groq: 'https://api.groq.com/openai/v1',
};

export async function showOnboardingMenu(): Promise<boolean> {
  console.log('\n  DaisyCode — 首次启动\n');
  console.log('  选择 AI Provider:\n');

  for (let i = 0; i < PROVIDERS.length; i++) {
    console.log(`  ${i + 1}) ${PROVIDERS[i].label}`);
  }
  console.log();

  const rl = readline.createInterface({ input, output });
  const answer = (await ask(rl, '  请输入编号 [1]: ')).trim() || '1';
  rl.close();

  const idx = parseInt(answer, 10) - 1;
  if (idx < 0 || idx >= PROVIDERS.length) {
    console.log('\n  无效选择。\n');
    return showOnboardingMenu();
  }

  return setupProvider(PROVIDERS[idx]);
}

async function setupProvider(provider: typeof PROVIDERS[number]): Promise<boolean> {
  const rl = readline.createInterface({ input, output });

  console.log(`\n  已选: ${provider.label}\n`);

  let apiKey: string;
  if (provider.key === 'custom') {
    const baseURL = (await ask(rl, '  Base URL (https://your-api/v1): ')).trim();
    if (!baseURL) { rl.close(); return false; }
    const key = (await askSecret(rl, '  API Key: ')).trim();
    if (!key) { rl.close(); return false; }
    const model = (await ask(rl, '  模型名: ')).trim() || 'custom-model';
    setProvider('custom', { apiKey: key, baseURL }, { model });
    rl.close();
    console.log(`\n  ✅ 配置已保存到 ~/.daisy/auth.json\n`);
    return true;
  }

  apiKey = (await askSecret(rl, `  请输入 ${provider.label} API Key: `)).trim();
  if (!apiKey) { rl.close(); return false; }

  const model = getDefaultModel(provider.key);
  setProvider(provider.key, { apiKey, baseURL: BASE_URLS[provider.key] }, { model });
  rl.close();

  console.log(`\n  ✅ 配置已保存到 ~/.daisy/auth.json`);
  console.log(`  🚀 启动 DaisyCode...\n`);
  return true;
}

export async function connectCommand(subcommand?: string, args?: string[]): Promise<void> {
  if (subcommand === 'list') {
    const auth = loadAuth();
    if (!auth || Object.keys(auth.providers).length === 0) {
      console.log('\n  没有已配置的 AI Provider。\n');
      return;
    }
    console.log();
    for (const [name, config] of Object.entries(auth.providers)) {
      const isDefault = name === auth.defaultProvider;
      console.log(`  ${isDefault ? '*' : ' '} ${name}: ${maskKey(config.apiKey)}${isDefault ? ' (默认)' : ''}`);
    }
    console.log();
    return;
  }

  if (subcommand === 'remove') {
    const provider = args?.[0];
    if (!provider) {
      console.error('Usage: daisy connect remove <provider>');
      process.exit(1);
    }
    const { removeProvider } = await import('../auth.js');
    if (removeProvider(provider)) {
      console.log(`\n  ✅ ${provider} 已移除。\n`);
    } else {
      console.log(`\n  Provider "${provider}" 未找到。\n`);
    }
    return;
  }

  // Interactive mode
  await showOnboardingMenu();
}
