/**
 * Montree Milestones — forbidden vocabulary (ARCHITECTURE.md §0).
 *
 * Montessori schools reject the testing register outright, and they are the adopters we
 * need. Adoption risk here is a COPY risk, not a technical one: if any surface reads like
 * a test, the school rejects the system regardless of how good the model underneath is.
 *
 * These terms must never appear in a child-, parent- or teacher-facing string, in any
 * locale. They MAY appear in code identifiers, column names and internal comments —
 * `points_awarded` is a column, not a sentence.
 */

/** Word-boundary matched, case-insensitive. English. */
export const FORBIDDEN_TERMS_EN: readonly string[] = [
  'test', 'testing', 'tested',
  'exam', 'examination',
  'quiz',
  'score', 'scored', 'scoring',
  'grade', 'graded', 'grading',
  'mark', 'marked', 'marks',
  'pass', 'passed', 'failing', 'fail', 'failed',
  'wrong', 'incorrect',
  'percentile',
  'rank', 'ranked', 'ranking',
  'above average', 'below average',
  'iq',
];

/**
 * Context-dependent bans. "behind" is a perfectly good position word a maths milestone needs
 * ("behind, between, next to") — what is banned is the comparative sense. Matching the phrase
 * rather than the word keeps the vocabulary honest without crippling the content.
 */
export const FORBIDDEN_PHRASES_EN: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bbehind (their|his|her|the other|other) \w+/i, label: 'behind their peers' },
  { pattern: /\b(falling|fell|falls) behind\b/i, label: 'falling behind' },
  { pattern: /\bbehind for (their|his|her) age\b/i, label: 'behind for their age' },
  { pattern: /\b\d+\s*months?\s+(ahead|behind)\b/i, label: 'months ahead/behind' },
];

/** Substring matched — Chinese has no word boundaries. */
// '通过' alone is excluded on purpose: in Chinese it usually means "by means of / through"
// ("通过指认或询问表达想做什么"), and only the compounds below carry the pass/fail sense.
export const FORBIDDEN_TERMS_ZH: readonly string[] = [
  '考试', '测试', '测验', '小测', '考核',
  '分数', '打分', '评分', '得分',
  '成绩', '及格', '不及格', '不通过', '未通过', '通过考试',
  '错误', '答错', '做错',
  '百分位', '排名', '名次', '排行',
  '落后', '低于平均', '高于平均',
];

/** Words that are safe in a report even though they look adjacent to the banned set. */
export const ALLOWED_EXCEPTIONS: readonly string[] = [
  'milestone', 'check-in', 'window', 'band', 'secure', 'developing', 'emerging',
  'observed', 'noticed', 'watching', 'next step', 'growth', 'evidence',
];

export interface ForbiddenTermHit {
  term: string;
  locale: string;
  index: number;
  context: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Scan one localized string. Returns every hit — a caller decides whether to throw,
 * warn, or block a commit. Pure, no I/O; safe to call from a lint script or a test.
 */
export function findForbiddenTerms(text: string, locale = 'en'): ForbiddenTermHit[] {
  if (!text) return [];
  const hits: ForbiddenTermHit[] = [];
  const isCjk = locale.startsWith('zh') || locale.startsWith('ja') || locale.startsWith('ko');

  if (!isCjk) {
    for (const { pattern, label } of FORBIDDEN_PHRASES_EN) {
      const m = pattern.exec(text);
      if (m) {
        hits.push({
          term: label,
          locale,
          index: m.index,
          context: text.slice(Math.max(0, m.index - 24), m.index + m[0].length + 24),
        });
      }
    }
    for (const term of FORBIDDEN_TERMS_EN) {
      const re = new RegExp(`\\b${escapeRe(term)}\\b`, 'gi');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        hits.push({
          term,
          locale,
          index: m.index,
          context: text.slice(Math.max(0, m.index - 24), m.index + term.length + 24),
        });
      }
    }
  }

  for (const term of FORBIDDEN_TERMS_ZH) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(term, from);
      if (i === -1) break;
      hits.push({ term, locale, index: i, context: text.slice(Math.max(0, i - 12), i + term.length + 12) });
      from = i + term.length;
    }
  }

  return hits;
}

/** Convenience for a locale map (`{ en, zh, … }`). */
export function scanLocalized(map: Record<string, string | undefined>): ForbiddenTermHit[] {
  const out: ForbiddenTermHit[] = [];
  for (const [locale, text] of Object.entries(map)) {
    if (typeof text === 'string') out.push(...findForbiddenTerms(text, locale));
  }
  return out;
}

export function isCleanCopy(text: string, locale = 'en'): boolean {
  return findForbiddenTerms(text, locale).length === 0;
}
