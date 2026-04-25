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
  fr: {
    languageName: 'French (Français)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in French (Français). ' +
      'Every word of your response must be in French. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use formal vous register for all content. ' +
      'Use "votre enfant" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori French terminology: ' +
      'Vie Pratique, Sensoriel, Mathématiques, Langage, Culture.',
    aiShortDirective: 'en français',
    yourChild: 'votre enfant',
    dateFormatHint: 'D mois YYYY',
  },
  pt: {
    languageName: 'Brazilian Portuguese (Português)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Brazilian Portuguese (Português). ' +
      'Every word of your response must be in Portuguese. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use formal você register. ' +
      'Use "seu filho/sua filha" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori Portuguese terminology: ' +
      'Vida Prática, Sensorial, Matemática, Linguagem, Cultural.',
    aiShortDirective: 'em português',
    yourChild: 'seu filho/sua filha',
    dateFormatHint: 'D de mês de YYYY',
  },
  nl: {
    languageName: 'Dutch (Nederlands)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Dutch (Nederlands). ' +
      'Every word of your response must be in Dutch. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use formal u/uw register for all content. ' +
      'Use "uw kind" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori Dutch terminology: ' +
      'Praktisch Leven, Zintuiglijk, Wiskunde, Taal, Cultureel.',
    aiShortDirective: 'in het Nederlands',
    yourChild: 'uw kind',
    dateFormatHint: 'D maand YYYY',
  },
  it: {
    languageName: 'Italian (Italiano)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Italian (Italiano). ' +
      'Every word of your response must be in Italian. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use formal Lei register for all content. ' +
      'Use "Suo figlio/Sua figlia" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori Italian terminology: ' +
      'Vita Pratica, Sensoriale, Matematica, Linguaggio, Culturale.',
    aiShortDirective: 'in italiano',
    yourChild: 'Suo figlio/Sua figlia',
    dateFormatHint: 'D mese YYYY',
  },
  ja: {
    languageName: 'Japanese (日本語)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Japanese (日本語). ' +
      'Every word of your response must be in Japanese. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use polite desu/masu form throughout. ' +
      'Use "お子さま" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori Japanese terminology: ' +
      '日常生活, 感覚, 算数, 言語, 文化.',
    aiShortDirective: '日本語で',
    yourChild: 'お子さま',
    dateFormatHint: 'YYYY年M月D日',
  },
  ko: {
    languageName: 'Korean (한국어)',
    aiLanguageInstruction:
      '\n\nLANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Korean (한국어). ' +
      'Every word of your response must be in Korean. Do not use any English except for ' +
      'proper nouns (like Montessori work names). Use polite 합쇼체 (formal) or 해요체 register. ' +
      'Use "자녀분" for "your child" in parent-facing content. ' +
      'Use standard AMI Montessori Korean terminology: ' +
      '일상생활, 감각, 수학, 언어, 문화.',
    aiShortDirective: '한국어로',
    yourChild: '자녀분',
    dateFormatHint: 'YYYY년 M월 D일',
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
