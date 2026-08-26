// lib/lens/knowledge/montessori-glossary-zh.ts
// The locked EN→ZH Montessori glossary.
//
// 🚨 WHY THIS IS A TABLE AND NOT A PROMPT INSTRUCTION.
// Montessori Chinese terminology is settled in the Chinese-speaking Montessori
// world and a model left to its own devices will produce reasonable-sounding
// alternatives — 常态化 for normalisation, 预备环境 for prepared environment —
// which read to a Chinese Montessori head of school exactly the way "the child
// did an activity on the mat-thing" reads in English. So the terms are LOCKED:
// the translation endpoint hands this table to the model and instructs it to use
// each rendering verbatim, and `findGlossaryViolations` below checks the output.
//
// Where the field genuinely uses two renderings (guide, presentation) BOTH are
// listed, primary first, and either is accepted.
//
// Pure data. No imports.

export interface GlossaryEntry {
  /** The English term as it appears in a report. */
  en: string;
  /** The locked Chinese rendering. First is primary. */
  zh: string[];
  /** Optional note for the model — only when the choice is not obvious. */
  note?: string;
}

/**
 * The locked table. Ordered longest-English-first is NOT required here — the
 * matcher sorts — but keeping related terms together helps a human read it.
 */
export const MONTESSORI_GLOSSARY_ZH: GlossaryEntry[] = [
  // ---- the name and the people
  { en: 'Montessori', zh: ['蒙台梭利'], note: 'Never 蒙特梭利 in this house style, though it is common in Taiwan.' },
  { en: 'guide', zh: ['主教', '引导者'], note: 'The trained adult. 主教 in a school context, 引导者 when the emphasis is on the role rather than the post.' },
  { en: 'directress', zh: ['主教', '引导者'] },
  { en: 'assistant', zh: ['助教'] },
  { en: 'prepared adult', zh: ['有准备的成人'] },
  { en: 'observer', zh: ['观察者'] },
  { en: 'consultant', zh: ['顾问'] },

  // ---- the environment
  { en: 'prepared environment', zh: ['有准备的环境'] },
  { en: 'classroom community', zh: ['班级社群'] },
  { en: 'mixed-age', zh: ['混龄'] },
  { en: 'mixed-age community', zh: ['混龄社群'] },
  { en: 'shelf', zh: ['教具架'] },
  { en: 'material', zh: ['教具'] },
  { en: 'work', zh: ['工作'], note: 'A child’s chosen occupation. Never 活动 or 任务.' },
  { en: 'work cycle', zh: ['工作周期'] },
  { en: 'three-hour work cycle', zh: ['三小时工作周期'] },
  { en: 'work mat', zh: ['工作毯'] },

  // ---- the child
  { en: 'normalization', zh: ['正常化'] },
  { en: 'normalisation', zh: ['正常化'] },
  { en: 'normalized child', zh: ['正常化的儿童'] },
  { en: 'absorbent mind', zh: ['吸收性心智'] },
  { en: 'sensitive periods', zh: ['敏感期'] },
  { en: 'sensitive period', zh: ['敏感期'] },
  { en: 'concentration', zh: ['专注力'] },
  { en: 'false fatigue', zh: ['假性疲劳'] },
  { en: 'independence', zh: ['独立性'] },
  { en: 'freedom within limits', zh: ['有限制的自由'] },
  { en: 'grace and courtesy', zh: ['优雅与礼仪'] },
  { en: 'normalisation indicators', zh: ['正常化指标'] },
  { en: 'planes of development', zh: ['发展阶段'] },

  // ---- teaching
  { en: 'presentation', zh: ['示范', '演示'] },
  { en: 'three-period lesson', zh: ['三段式教学法'] },
  { en: 'control of error', zh: ['错误控制'] },
  { en: 'isolation of difficulty', zh: ['难点孤立'] },
  { en: 'indirect preparation', zh: ['间接准备'] },
  { en: 'point of interest', zh: ['兴趣点'] },
  { en: 'points of interest', zh: ['兴趣点'] },
  { en: 'non-interference', zh: ['不干预'] },
  { en: 'observation', zh: ['观察'] },
  { en: 'record-keeping', zh: ['记录'] },

  // ---- the areas
  { en: 'practical life', zh: ['日常生活'] },
  { en: 'sensorial', zh: ['感官'] },
  { en: 'language', zh: ['语言'] },
  { en: 'mathematics', zh: ['数学'] },
  { en: 'culture', zh: ['文化'] },
  { en: 'cosmic education', zh: ['宇宙教育'] },

  // ---- the levels
  { en: 'Nido', zh: ['婴儿班'] },
  { en: 'Toddler', zh: ['幼儿班'] },
  { en: 'Casa dei Bambini', zh: ['儿童之家'] },
  { en: "Children's House", zh: ['儿童之家'] },
  { en: 'Lower Elementary', zh: ['低小学部'] },
  { en: 'Upper Elementary', zh: ['高小学部'] },
  { en: 'Adolescent', zh: ['青少年部'] },

  // ---- report furniture
  { en: 'commendation', zh: ['表扬事项'] },
  { en: 'commendations', zh: ['表扬事项'] },
  { en: 'recommendation', zh: ['建议事项'] },
  { en: 'recommendations', zh: ['建议事项'] },
  { en: 'required action', zh: ['必须整改事项'] },
  { en: 'required actions', zh: ['必须整改事项'] },
  { en: 'next steps', zh: ['后续步骤'] },
  { en: 'follow-up visit', zh: ['回访'] },
  { en: 'debrief', zh: ['复盘会谈'] },
  { en: 'Exemplary', zh: ['卓越'] },
  { en: 'Established', zh: ['已建立'] },
  { en: 'Emerging', zh: ['发展中'] },
  { en: 'Not yet', zh: ['尚未建立'] },
  { en: 'consultation visit', zh: ['顾问访校'] },
  { en: 'mentoring visit', zh: ['指导访校'] },
  { en: 'internal review', zh: ['内部督导'] },
];

/** The block handed to the model in a translation request. */
export function glossaryPromptBlock(): string {
  const lines = MONTESSORI_GLOSSARY_ZH.map((e) => {
    const alts = e.zh.length > 1 ? ` (also acceptable: ${e.zh.slice(1).join(' / ')})` : '';
    const note = e.note ? `  — ${e.note}` : '';
    return `  ${e.en}  →  ${e.zh[0]}${alts}${note}`;
  });
  return [
    'LOCKED MONTESSORI GLOSSARY (English → Chinese).',
    'Use these renderings VERBATIM. Do not paraphrase them, do not "improve"',
    'them, and do not substitute a synonym that reads more naturally to you —',
    'these are the terms the Chinese-speaking Montessori world actually uses,',
    'and an unfamiliar rendering makes the whole report read as a translation.',
    '',
    ...lines,
  ].join('\n');
}

// --------------------------------------------------------------- enforcement --

/**
 * A small lookup of terms whose WRONG renderings are common and recognisable.
 * Used by findGlossaryViolations to say something specific ("you wrote 常态化;
 * the locked term is 正常化") rather than a vague "check your terminology".
 */
const KNOWN_WRONG: { wrong: string; en: string; right: string }[] = [
  { wrong: '蒙特梭利', en: 'Montessori', right: '蒙台梭利' },
  { wrong: '常态化', en: 'normalisation', right: '正常化' },
  { wrong: '预备环境', en: 'prepared environment', right: '有准备的环境' },
  { wrong: '准备好的环境', en: 'prepared environment', right: '有准备的环境' },
  { wrong: '敏感時期', en: 'sensitive periods', right: '敏感期' },
  { wrong: '三阶段教学', en: 'three-period lesson', right: '三段式教学法' },
  { wrong: '三段式教学', en: 'three-period lesson', right: '三段式教学法' },
  { wrong: '错误纠正', en: 'control of error', right: '错误控制' },
  { wrong: '自我纠错', en: 'control of error', right: '错误控制' },
  { wrong: '工作循环', en: 'work cycle', right: '工作周期' },
  { wrong: '日常生活练习区', en: 'practical life', right: '日常生活' },
  { wrong: '感官教育区', en: 'sensorial', right: '感官' },
  { wrong: '假疲劳', en: 'false fatigue', right: '假性疲劳' },
  { wrong: '有限自由', en: 'freedom within limits', right: '有限制的自由' },
  { wrong: '礼仪与优雅', en: 'grace and courtesy', right: '优雅与礼仪' },
  { wrong: '吸收心智', en: 'absorbent mind', right: '吸收性心智' },
];

export interface GlossaryViolation {
  /** The English term whose rendering is wrong or missing. */
  en: string;
  /** What the locked rendering is. */
  expected: string;
  /** The wrong rendering found in the text, when we recognised one. */
  found?: string;
  message: string;
}

/**
 * Check a translated body against the locked glossary.
 *
 * TWO CHECKS, DELIBERATELY DIFFERENT IN STRICTNESS:
 *
 *  1. KNOWN-WRONG RENDERINGS are reported whenever they appear. This is the
 *     check that earns its keep — 常态化 in a Chinese Montessori report is
 *     unambiguously the wrong word, wherever it appears.
 *
 *  2. MISSING RENDERINGS are reported only when the ENGLISH source used the
 *     term and the Chinese does not contain any of its accepted renderings.
 *     Without that condition every report would be "violating" fifty terms it
 *     had no occasion to use.
 *
 * This is advisory: it surfaces in the editor for her to judge. It never blocks
 * a save, because a legitimate rephrasing can drop a term honestly, and a
 * translation checker that cries wolf gets ignored.
 */
export function findGlossaryViolations(
  sourceEnglish: string,
  translatedChinese: string,
): GlossaryViolation[] {
  const out: GlossaryViolation[] = [];
  const zh = translatedChinese;
  const en = sourceEnglish.toLowerCase();

  for (const { wrong, en: term, right } of KNOWN_WRONG) {
    // 三段式教学 is a prefix of the correct 三段式教学法, so a "wrong" that is a
    // prefix of its own right answer only counts when the right answer is absent.
    if (right.startsWith(wrong) && zh.includes(right)) continue;
    if (zh.includes(wrong)) {
      out.push({
        en: term,
        expected: right,
        found: wrong,
        message: `"${term}" was rendered as ${wrong}. The locked term is ${right}.`,
      });
    }
  }

  for (const entry of MONTESSORI_GLOSSARY_ZH) {
    const needle = entry.en.toLowerCase();
    if (!en.includes(needle)) continue;
    if (entry.zh.some((z) => zh.includes(z))) continue;
    // Already reported as a known-wrong rendering — one message per term.
    if (out.some((v) => v.en.toLowerCase() === needle)) continue;
    out.push({
      en: entry.en,
      expected: entry.zh[0],
      message: `The English uses "${entry.en}" but the Chinese does not contain ${entry.zh[0]}.`,
    });
  }

  return out;
}

/** The primary Chinese rendering for a term, or null if it is not in the table. */
export function zhFor(term: string): string | null {
  const needle = term.trim().toLowerCase();
  const hit = MONTESSORI_GLOSSARY_ZH.find((e) => e.en.toLowerCase() === needle);
  return hit ? hit.zh[0] : null;
}
