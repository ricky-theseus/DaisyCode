import type { Skill } from '../types.js';

/**
 * SkillsMatcher — 根据用户输入匹配 skill
 *
 * 匹配规则：
 *   - 大小写不敏感
 *   - 词边界匹配：/\bkeyword\b/i
 *   - 多个匹配 → 全部返回（按 skills 配置顺序）
 *   - 无匹配 → 空数组
 */
export class SkillsMatcher {
  private skills: Record<string, Skill>;

  constructor(skills: Record<string, Skill>) {
    this.skills = skills;
  }

  /**
   * 匹配用户输入，返回命中的 skill 列表
   * 顺序保持 skills 配置的插入顺序
   */
  match(input: string): Skill[] {
    if (!input || Object.keys(this.skills).length === 0) {return [];}

    const matched: Skill[] = [];

    for (const skill of Object.values(this.skills)) {
      if (this.matches(input, skill)) {
        matched.push(skill);
      }
    }

    return matched;
  }

  /**
   * 将匹配的 skill prompt 拼接为 system prompt 追加内容
   * 格式：
   *   ---
   *   <skill.name> skill activated:
   *   <skill.prompt>
   *   ---
   */
  buildSkillPrompt(matched: Skill[]): string {
    if (matched.length === 0) {return '';}

    const parts = matched.map(skill => {
      const prompt = skill.prompt ?? '';
      return `---\n${skill.name} skill activated:\n${prompt}\n---`;
    });

    return parts.join('\n\n');
  }

  private matches(input: string, skill: Skill): boolean {
    const triggers = skill.trigger;
    if (!triggers || triggers.length === 0) {return false;}

    for (const keyword of triggers) {
      // 词边界匹配，避免 "reactor" 匹配 "react"
      const escaped = this.escapeRegex(keyword);
      const re = new RegExp(`\\b${escaped}\\b`, 'i');
      if (re.test(input)) {return true;}
    }

    return false;
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
