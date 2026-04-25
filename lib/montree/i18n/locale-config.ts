// Locale-specific configuration for AI pipelines, prompts, and system behavior.
// Centralizes all language-specific instructions that were previously hardcoded
// as `if (locale === 'zh')` conditionals scattered across ~8 AI pipeline files.

import type { Locale } from './locales';

// ---------------------------------------------------------------------------
// AI language configuration per locale
// ---------------------------------------------------------------------------

export interface LocaleAIConfig {
  /** Full language name for AI prompt instructions (e.g., "Simplified Chinese (中文)") */
  languageName: string;

  /** Instruction appended to AI system prompts when generating content in this locale. */
  aiLanguageInstruction: string;

  /** Short language directive for tool schema descriptions (e.g., "in Chinese") */
  aiShortDirective: string;

  /** Polite address for "your child" in parent-facing content */
  yourChild: string;

  /** Date format hint for AI-generated content */
  dateFormatHint: string;
}

export const LOCALE_AI_CONFIG: Record<Locale, LocaleAIConfig> = {
  de: {
    languageName: 'German (Deutsch)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in German (Deutsch). ' +
      'Every word of your response must be in German. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use formal Sie register for all content. ' +
      'Use "Ihr Kind" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori German terminology: ' +
      'Praktisches Leben, Sinnesmaterial, Mathematik, Sprache, Kulturelles.',
    aiShortDirective: 'auf Deutsch',
    yourChild: 'Ihr Kind',
    dateFormatHint: 'D. Monat YYYY',
  },
  en: {
    languageName: 'English',
    aiLanguageInstruction: '',  // No instruction needed — English is the default
    aiShortDirective: 'in English',
    yourChild: 'your child',
    dateFormatHint: 'Month Day, Year',
  },
  zh: {
    languageName: 'Simplified Chinese (中文)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Simplified Chinese (中文). ' +
      'Every word of your response must be in Chinese. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use "您的孩子" for "your child".',
    aiShortDirective: '用中文',
    yourChild: '您的孩子',
    dateFormatHint: 'YYYY年M月D日',
  },
  es: {
    languageName: 'Argentine Spanish (Español rioplatense)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Argentine Spanish (Español rioplatense). ' +
      'Every word of your response must be in Spanish. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use VOSEO: "vos tenés" (not "tú tienes"), ' +
      '"vos podés" (not "tú puedes"). Use "ustedes" for plural (not "vosotros"). ' +
      'Use "su hijo/a" for "your child" in formal contexts. ' +
      'Use AMI-standard Montessori terminology: Vida Práctica, Sensorial, Matemáticas, Lenguaje, Áreas Culturales.',
    aiShortDirective: 'en español argentino',
    yourChild: 'su hijo/a',
    dateFormatHint: 'D de mes de YYYY',
  },
};

/** Get the AI language instruction for a locale. Returns empty string for English. */
export function getAILanguageInstruction(locale: string): string {
  return LOCALE_AI_CONFIG[locale as Locale]?.aiLanguageInstruction || '';
}

/** Get the full language name for a locale (for use in AI prompts). */
export function getLanguageName(locale: string): string {
  return LOCALE_AI_CONFIG[locale as Locale]?.languageName || 'English';
}
