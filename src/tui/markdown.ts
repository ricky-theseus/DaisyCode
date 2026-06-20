// ponytail: line-by-line regex, no AST parser
import { fg, bg, bold, dim, italic, underline, reset } from './renderer.js';

/** Render markdown text to ANSI-escaped string */
export function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inCodeBlock) {
      // Check for closing fence
      if (/^```/.test(line)) {
        inCodeBlock = false;
        out.push(`${fg.gray}${line}${reset}`);
        continue;
      }
      out.push(renderCodeLine(line, codeLang));
      continue;
    }

    // Opening fence
    if (/^```(\w*)/.test(line)) {
      inCodeBlock = true;
      codeLang = line.match(/^```(\w*)/)?.[1] ?? '';
      out.push(`${fg.gray}${line}${reset}`);
      continue;
    }

    out.push(renderInline(line));
  }

  return out.join('\n');
}

/** Render a line inside a code block with basic keyword highlighting */
function renderCodeLine(line: string, lang: string): string {
  // ponytail: only highlight common keywords, no full syntax tree
  const keywords = lang ? getKeywords(lang) : [];
  let result = `${bg.gray}${fg.white}`;
  let remaining = line;

  if (keywords.length > 0) {
    // Simple keyword highlighting — split by word boundaries
    const parts = remaining.split(/(\b\w+\b)/g);
    for (const part of parts) {
      if (keywords.includes(part)) {
        result += `${fg.yellow}${part}${fg.white}`;
      } else {
        result += part;
      }
    }
  } else {
    result += line;
  }

  result += reset;
  return result;
}

/** Get keywords for a language (ponytail: minimal set) */
function getKeywords(lang: string): string[] {
  const langMap: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'from', 'async', 'await', 'if', 'else', 'for', 'of', 'in', 'class', 'interface', 'type', 'extends', 'implements', 'new', 'this', 'throw', 'try', 'catch', 'finally', 'true', 'false', 'null', 'undefined'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'from', 'async', 'await', 'if', 'else', 'for', 'of', 'in', 'class', 'new', 'this', 'throw', 'try', 'catch', 'finally', 'true', 'false', 'null', 'undefined'],
    python: ['def', 'return', 'import', 'from', 'class', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'async', 'await', 'try', 'except', 'finally', 'raise', 'with', 'as', 'pass', 'yield', 'lambda'],
    rust: ['fn', 'let', 'mut', 'return', 'if', 'else', 'for', 'while', 'loop', 'match', 'struct', 'enum', 'impl', 'trait', 'pub', 'use', 'mod', 'crate', 'self', 'super', 'true', 'false', 'Some', 'None', 'Ok', 'Err', 'async', 'await', 'move', 'ref'],
    go: ['func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'default', 'break', 'continue', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'defer', 'select', 'package', 'import', 'true', 'false', 'nil'],
    java: ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'this', 'super', 'try', 'catch', 'finally', 'throw', 'true', 'false', 'null', 'void', 'int', 'String', 'boolean'],
  };
  return langMap[lang.toLowerCase()] ?? [];
}

/** Render an inline markdown line (no code block) */
function renderInline(line: string): string {
  // ponytail: regex-based, no AST

  // Thematic break
  if (/^-{3,}$/.test(line.trim())) {
    return `${fg.gray}${'─'.repeat(Math.min(line.length, 80))}${reset}`;
  }

  // Headings
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const content = headingMatch[2];
    const rendered = renderInlineContent(content);
    if (level === 1) {
      return `${bold}${underline}${rendered}${reset}`;
    }
    return `${bold}${rendered}${reset}`;
  }

  // Blockquote
  const quoteMatch = line.match(/^>\s?(.*)$/);
  if (quoteMatch) {
    const content = renderInlineContent(quoteMatch[1]);
    return `${fg.cyan}│ ${content}${reset}`;
  }

  // Task list (must check before unordered list)
  const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
  if (taskMatch) {
    const checked = taskMatch[1] !== ' ';
    const content = renderInlineContent(taskMatch[2]);
    const checkbox = checked ? `${fg.green}✓${reset}` : `${fg.gray}○${reset}`;
    return `${checkbox} ${content}`;
  }

  // Unordered list
  const ulMatch = line.match(/^[-*+]\s+(.+)$/);
  if (ulMatch) {
    const content = renderInlineContent(ulMatch[1]);
    return `${fg.green}• ${content}${reset}`;
  }

  // Ordered list
  const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
  if (olMatch) {
    const num = olMatch[1];
    const content = renderInlineContent(olMatch[2]);
    return `${fg.green}${num}. ${content}${reset}`;
  }

  // Table row (simple pipe-separated)
  if (line.startsWith('|') && line.endsWith('|')) {
    const cells = line.split('|').filter(c => c.trim() !== '');
    // Check if it's a separator row
    if (cells.every(c => /^[-:\s]+$/.test(c))) {
      return `${fg.gray}${'─'.repeat(Math.min(line.length, 80))}${reset}`;
    }
    const rendered = cells.map(c => renderInlineContent(c.trim())).join(` ${fg.gray}|${reset} `);
    return `${fg.gray}|${reset} ${rendered} ${fg.gray}|${reset}`;
  }

  // Normal paragraph
  return renderInlineContent(line);
}

/** Render inline markdown content (bold, italic, code, links) */
function renderInlineContent(text: string): string {
  // ponytail: sequential regex replacements, order matters

  // Inline code: `code` → yellow bg, gray fg
  text = text.replace(/`([^`]+)`/g, `${bg.yellow}${fg.gray}$1${reset}${fg.reset}`);

  // Bold+italic: ***text***
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, `${bold}${italic}$1${reset}`);

  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, `${bold}$1${reset}`);

  // Italic: *text*
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, `${italic}$1${reset}`);

  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, `${dim}$1${reset}`);

  // Images: ![alt](url) → [img: alt] (must check before links)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, `${fg.magenta}[img: $1]${reset}`);

  // Links: [text](url) → text (underline, blue)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `${underline}${fg.blue}$1${reset}`);

  return text;
}
