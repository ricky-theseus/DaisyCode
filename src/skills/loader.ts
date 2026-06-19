import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { Skill } from '../types.js';

/**
 * SkillsLoader — 从文件系统加载 SKILL.md
 *
 * 搜索路径（按优先级）：
 *   1. daisy.yml 中 skill.<name>.path 指定的路径
 *   2. .opencode/skills/<name>.md
 *   3. ~/.config/opencode/skills/<name>.md
 *
 * 格式：YAML front-matter + Markdown body
 *   ---
 *   trigger: ["react", "nextjs"]
 *   description: "React/Next.js 开发最佳实践"
 *   ---
 *   ## Skills Content
 *   LLM 注入的 prompt 内容...
 *
 * 文件损坏 / 缺必需字段 → 跳过，记录 warning，不崩溃
 */
export class SkillsLoader {
  private cache: Record<string, Skill> | null = null;

  /**
   * 从 DaisyConfig 的 skill 配置加载所有 skill
   * @param skillsConfig  daisy.yml 中 skill 字段的内容
   * @param projectDir    项目根目录（用于解析相对路径）
   */
  loadAll(
    skillsConfig: Record<string, Skill> | undefined,
    projectDir: string,
  ): Record<string, Skill> {
    if (this.cache) {return this.cache;}

    const result: Record<string, Skill> = {};

    if (!skillsConfig) {
      this.cache = result;
      return result;
    }

    for (const [name, skill] of Object.entries(skillsConfig)) {
      try {
        const loaded = this.loadOne(name, skill, projectDir);
        if (loaded) {
          result[name] = loaded;
        }
      } catch (err) {
        console.warn(`[skills] Warning: failed to load skill "${name}": ${err}`);
      }
    }

    this.cache = result;
    return result;
  }

  /** 清除缓存（测试用） */
  clearCache(): void {
    this.cache = null;
  }

  private loadOne(
    name: string,
    skill: Skill,
    projectDir: string,
  ): Skill | null {
    // 确定文件路径
    const filePath = this.resolvePath(name, skill, projectDir);
    if (!filePath) {
      console.warn(`[skills] Warning: skill "${name}" has no path and no default file found`);
      return null;
    }

    if (!existsSync(filePath)) {
      console.warn(`[skills] Warning: skill "${name}" file not found: ${filePath}`);
      return null;
    }

    const raw = readFileSync(filePath, 'utf-8');
    const parsed = this.parseSkillFile(raw);
    if (!parsed) {
      console.warn(`[skills] Warning: skill "${name}" failed to parse: ${filePath}`);
      return null;
    }

    // 验证必需字段
    const trigger = parsed.trigger ?? skill.trigger;
    if (!trigger || !Array.isArray(trigger) || trigger.length === 0) {
      console.warn(`[skills] Warning: skill "${name}" has no trigger keywords, skipping`);
      return null;
    }

    return {
      name,
      trigger,
      description: parsed.description ?? skill.description,
      prompt: parsed.prompt,
    };
  }

  private resolvePath(name: string, skill: Skill, projectDir: string): string | null {
    // 1. 配置中指定的 path
    if (skill.path) {
      if (skill.path.startsWith('~')) {
        return join(homedir(), skill.path.slice(1));
      }
      if (skill.path.startsWith('/') || /^[A-Za-z]:\\/.test(skill.path)) {
        return skill.path;
      }
      return join(projectDir, skill.path);
    }

    // 2. .opencode/skills/<name>.md
    const projectSkill = join(projectDir, '.opencode', 'skills', `${name}.md`);
    if (existsSync(projectSkill)) {return projectSkill;}

    // 3. ~/.config/opencode/skills/<name>.md
    const userSkill = join(homedir(), '.config', 'opencode', 'skills', `${name}.md`);
    if (existsSync(userSkill)) {return userSkill;}

    return null;
  }

  /**
   * 解析 YAML front-matter + Markdown body
   * 格式：
   *   ---
   *   trigger: ["react"]
   *   description: "..."
   *   ---
   *   body content...
   */
  private parseSkillFile(raw: string): { trigger?: string[]; description?: string; prompt: string } | null {
    // 必须以 --- 开头
    const trimmed = raw.trimStart();
    if (!trimmed.startsWith('---')) {
      // 没有 front-matter，整个文件就是 prompt
      return { prompt: trimmed };
    }

    // 找到第二个 ---
    const endIndex = trimmed.indexOf('---', 3);
    if (endIndex === -1) {
      // 只有开头的 ---，没有闭合，视为无效
      return null;
    }

    const frontMatter = trimmed.slice(3, endIndex).trim();
    const body = trimmed.slice(endIndex + 3).trim();

    // 解析 YAML front-matter（手写解析，零依赖）
    const parsed = this.parseYamlFrontMatter(frontMatter);
    if (!parsed) {return null;}

    return {
      trigger: parsed.trigger,
      description: parsed.description,
      prompt: body,
    };
  }

  /**
   * 手写 YAML front-matter 解析器
   * 只解析需要的字段：trigger（数组）、description（字符串）
   * 零依赖，不引入 js-yaml
   */
  private parseYamlFrontMatter(text: string): { trigger?: string[]; description?: string } | null {
    const result: { trigger?: string[]; description?: string } = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {continue;}

      // trigger: ["react", "nextjs"] 或 trigger: ["react"]
      const triggerMatch = trimmed.match(/^trigger:\s*\[(.*)\]$/);
      if (triggerMatch) {
        const items = triggerMatch[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        if (items.length > 0) {
          result.trigger = items;
        }
        continue;
      }

      // trigger: react 或 trigger: react, nextjs (单值或逗号分隔)
      const triggerSimpleMatch = trimmed.match(/^trigger:\s*(.+)$/);
      if (triggerSimpleMatch) {
        const items = triggerSimpleMatch[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        if (items.length > 0) {
          result.trigger = items;
        }
        continue;
      }

      // description: "..."
      const descMatch = trimmed.match(/^description:\s*(.+)$/);
      if (descMatch) {
        result.description = descMatch[1].trim().replace(/^["']|["']$/g, '');
        continue;
      }
    }

    return result;
  }
}
