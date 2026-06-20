import type { SessionConfig } from '../types.js';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'its',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'shall', 'should', 'may', 'might',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'if',
  'then', 'than', 'too', 'very', 'just', 'about', 'also',
  'no', 'yes', 'ok', 'okay', 'please', 'thanks',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she',
  'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'get', 'got', 'use', 'used', 'using', 'make', 'made', 'making',
  'like', 'need', 'want', 'know', 'think', 'let', 'say', 'said',
  'see', 'go', 'come', 'take', 'look', 'find', 'give', 'tell',
  'one', 'two', 'first', 'last', 'next', 'new', 'old', 'more',
  'some', 'any', 'each', 'every', 'all', 'both', 'few', 'many',
  'much', 'other', 'another', 'such', 'own', 'same', 'different',
  'here', 'there', 'up', 'down', 'out', 'off', 'over', 'back',
  'well', 'way', 'thing', 'part', 'kind', 'lot', 'much',
  'still', 'even', 'though', 'although', 'while', 'because',
  'since', 'until', 'once', 'after', 'before', 'now', 'then',
  'always', 'never', 'often', 'sometimes', 'usually',
  'actually', 'basically', 'essentially', 'literally',
  'really', 'quite', 'pretty', 'rather', 'maybe', 'perhaps',
  'doesn', 'don', 'didn', 'won', 'wouldn', 'couldn', 'shouldn',
  'isn', 'aren', 'wasn', 'weren', 'haven', 'hasn', 'hadn',
  'll', 've', 're', 'm', 's', 't',
]);

/** Split text into lowercase words, filtering out stop words and short tokens. */
function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/** Count word frequency across all user messages. */
function countKeywords(session: SessionConfig): Map<string, number> {
  const freq = new Map<string, number>();
  for (const msg of session.messages) {
    if (msg.role !== 'user') continue;
    const words = extractWords(msg.content);
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return freq;
}

/**
 * Simple non-LLM summary algorithm:
 * 1. First user message (first 100 chars)
 * 2. Last user message (first 100 chars)
 * 3. High-frequency keywords (appearing >3 times)
 */
export function summarizeSession(session: SessionConfig): string {
  const userMessages = session.messages.filter(m => m.role === 'user');
  if (userMessages.length === 0) return '';

  const first = userMessages[0].content.slice(0, 100).replace(/\s+/g, ' ').trim();
  const last = userMessages[userMessages.length - 1].content.slice(0, 100).replace(/\s+/g, ' ').trim();

  const freq = countKeywords(session);
  const keywords = [...freq.entries()]
    .filter(([, count]) => count > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);

  const parts: string[] = [];
  if (first) parts.push(`主题: ${first}`);
  if (last && last !== first) parts.push(`最近: ${last}`);
  if (keywords.length) parts.push(`关键词: ${keywords.join(', ')}`);

  return parts.join(' | ');
}

/**
 * Extract tags from session messages.
 * Matches known tech stack keywords + adds a time-based tag.
 */
export function extractTags(session: SessionConfig, knownStacks: string[] = []): string[] {
  const tags = new Set<string>();

  // Time-based tag
  const date = session.createdAt ? new Date(session.createdAt) : new Date();
  tags.add(`session-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);

  // Match known tech stack keywords in messages
  if (knownStacks.length) {
    const allText = session.messages.map(m => m.content).join(' ').toLowerCase();
    for (const stack of knownStacks) {
      if (allText.includes(stack.toLowerCase())) {
        tags.add(stack);
      }
    }
  }

  return [...tags];
}

/**
 * Determine if session should be summarized.
 * First summary at 10 messages, then every 20 messages after that.
 */
export function shouldSummarize(session: SessionConfig): boolean {
  const count = session.messages.length;
  if (count < 10) return false;
  // ponytail: summary field added by SessionMemory extension in session.ts
  const hasSummary = !!(session as { summary?: string }).summary;
  if (!hasSummary) return count >= 10;
  // After first summary, update every 20 messages
  // Estimate last summary point: find the closest 10 + 20n threshold
  for (let n = 0; ; n++) {
    const threshold = 10 + n * 20;
    if (threshold > count) return false;
    if (threshold === count) return true;
  }
}
