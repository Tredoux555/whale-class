// tests/lens-glossary.test.ts
// The locked EN→ZH Montessori glossary and its enforcement helper.
//
// Why this is worth a test file: Montessori Chinese terminology is SETTLED, and
// a model left to itself produces reasonable-sounding alternatives — 常态化 for
// normalisation, 预备环境 for prepared environment — which read to a Chinese
// Montessori head of school the way jargon-soup reads in English. The helper is
// what turns "please use the glossary" from a hope in a prompt into something
// the editor can show her.

import { describe, expect, it } from 'vitest';
import {
  MONTESSORI_GLOSSARY_ZH,
  findGlossaryViolations,
  glossaryPromptBlock,
  zhFor,
} from '@/lib/lens/knowledge/montessori-glossary-zh';

describe('the locked table', () => {
  it('carries every term the spec names, with the spec’s rendering', () => {
    const required: [string, string][] = [
      ['Montessori', '蒙台梭利'],
      ['guide', '主教'],
      ['prepared environment', '有准备的环境'],
      ['normalization', '正常化'],
      ['work cycle', '工作周期'],
      ['three-period lesson', '三段式教学法'],
      ['control of error', '错误控制'],
      ['isolation of difficulty', '难点孤立'],
      ['indirect preparation', '间接准备'],
      ['sensitive periods', '敏感期'],
      ['freedom within limits', '有限制的自由'],
      ['grace and courtesy', '优雅与礼仪'],
      ['practical life', '日常生活'],
      ['sensorial', '感官'],
      ['language', '语言'],
      ['mathematics', '数学'],
      ['culture', '文化'],
      ['absorbent mind', '吸收性心智'],
      ['mixed-age', '混龄'],
      ['presentation', '示范'],
      ['false fatigue', '假性疲劳'],
    ];
    for (const [en, zh] of required) {
      expect(zhFor(en), `missing or wrong: ${en}`).toBe(zh);
    }
  });

  it('offers the second accepted rendering where the field genuinely uses two', () => {
    const guide = MONTESSORI_GLOSSARY_ZH.find((e) => e.en === 'guide');
    expect(guide?.zh).toContain('引导者');
    const presentation = MONTESSORI_GLOSSARY_ZH.find((e) => e.en === 'presentation');
    expect(presentation?.zh).toContain('演示');
  });

  it('has no entry with an empty rendering', () => {
    for (const entry of MONTESSORI_GLOSSARY_ZH) {
      expect(entry.zh.length, entry.en).toBeGreaterThan(0);
      for (const zh of entry.zh) expect(zh.trim().length, entry.en).toBeGreaterThan(0);
    }
  });

  it('renders a prompt block that names every term', () => {
    const block = glossaryPromptBlock();
    expect(block).toContain('LOCKED MONTESSORI GLOSSARY');
    for (const entry of MONTESSORI_GLOSSARY_ZH) {
      expect(block).toContain(entry.en);
      expect(block).toContain(entry.zh[0]);
    }
  });

  it('answers null for a term it does not hold', () => {
    expect(zhFor('trapezoid')).toBeNull();
  });
});

describe('findGlossaryViolations', () => {
  it('says nothing when the locked terms were used', () => {
    const en = 'The prepared environment supports normalization and the work cycle.';
    const zh = '有准备的环境支持正常化与工作周期。';
    expect(findGlossaryViolations(en, zh)).toEqual([]);
  });

  it('catches a known-wrong rendering and names the right one', () => {
    const en = 'Normalization was evident throughout.';
    const zh = '整个过程中都体现出常态化。';
    const found = findGlossaryViolations(en, zh);
    const hit = found.find((v) => v.found === '常态化');
    expect(hit).toBeDefined();
    expect(hit!.expected).toBe('正常化');
    expect(hit!.message).toContain('正常化');
  });

  it('catches 蒙特梭利, the single most common wrong rendering', () => {
    const found = findGlossaryViolations('Montessori practice', '蒙特梭利实践');
    expect(found.some((v) => v.found === '蒙特梭利' && v.expected === '蒙台梭利')).toBe(true);
  });

  it('does NOT flag a prefix-of-the-right-answer when the right answer is present', () => {
    // 三段式教学 is a prefix of 三段式教学法. Flagging it whenever the correct
    // term appears would make the checker cry wolf on every correct translation,
    // and a checker that cries wolf gets ignored.
    const found = findGlossaryViolations(
      'The three-period lesson was given.',
      '进行了三段式教学法的示范。',
    );
    expect(found.some((v) => v.found === '三段式教学')).toBe(false);
  });

  it('flags a term the English used and the Chinese simply dropped', () => {
    const found = findGlossaryViolations(
      'The control of error was intact.',
      '材料完好无损。', // says nothing about control of error
    );
    expect(found.some((v) => v.en === 'control of error')).toBe(true);
  });

  it('does not flag a term the English never used', () => {
    const found = findGlossaryViolations('The shelves were tidy.', '教具架整洁。');
    expect(found.some((v) => v.en === 'cosmic education')).toBe(false);
  });

  it('reports a term once, not twice, when it is both wrong and missing', () => {
    const found = findGlossaryViolations('normalization', '常态化');
    const normalisation = found.filter((v) => v.en.toLowerCase() === 'normalization');
    expect(normalisation).toHaveLength(1);
  });

  it('accepts EITHER locked rendering where two are allowed', () => {
    const withZhuJiao = findGlossaryViolations('The guide observed.', '主教进行了观察。');
    const withYinDao = findGlossaryViolations('The guide observed.', '引导者进行了观察。');
    expect(withZhuJiao.some((v) => v.en === 'guide')).toBe(false);
    expect(withYinDao.some((v) => v.en === 'guide')).toBe(false);
  });

  it('is case-insensitive about the English side', () => {
    const found = findGlossaryViolations('PREPARED ENVIRONMENT', '有准备的环境');
    expect(found.some((v) => v.en === 'prepared environment')).toBe(false);
  });

  it('survives empty input', () => {
    expect(findGlossaryViolations('', '')).toEqual([]);
  });
});
