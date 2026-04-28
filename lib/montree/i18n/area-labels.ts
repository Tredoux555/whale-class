/**
 * Centralized area label translations.
 * Single source of truth — import this instead of hardcoding area labels.
 *
 * Canonical reference: WeeklyWrapTab.tsx lines 74-80 (Session 14).
 * Extracted to shared module: Session 45 (Chinese Localization Sweep).
 * Multilingual upgrade: Session 58 (Any-Language Architecture).
 */

// Per-locale area label maps — add new languages here.
export const AREA_LABELS_EN: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

export const AREA_LABELS_ZH: Record<string, string> = {
  practical_life: '日常',
  sensorial: '感官',
  mathematics: '数学',
  language: '语言',
  cultural: '文化',
};

export const AREA_LABELS_ES: Record<string, string> = {
  practical_life: 'Vida Práctica',
  sensorial: 'Sensorial',
  mathematics: 'Matemáticas',
  language: 'Lenguaje',
  cultural: 'Cultural',
};

export const AREA_LABELS_DE: Record<string, string> = {
  practical_life: 'Praktisches Leben',
  sensorial: 'Sinnesmaterial',
  mathematics: 'Mathematik',
  language: 'Sprache',
  cultural: 'Kulturelles',
};

export const AREA_LABELS_FR: Record<string, string> = {
  practical_life: 'Vie Pratique',
  sensorial: 'Sensoriel',
  mathematics: 'Mathématiques',
  language: 'Langage',
  cultural: 'Culture',
};

export const AREA_LABELS_PT: Record<string, string> = {
  practical_life: 'Vida Prática',
  sensorial: 'Sensorial',
  mathematics: 'Matemática',
  language: 'Linguagem',
  cultural: 'Cultural',
};

export const AREA_LABELS_NL: Record<string, string> = {
  practical_life: 'Praktisch Leven',
  sensorial: 'Zintuiglijk',
  mathematics: 'Wiskunde',
  language: 'Taal',
  cultural: 'Cultureel',
};

export const AREA_LABELS_IT: Record<string, string> = {
  practical_life: 'Vita Pratica',
  sensorial: 'Sensoriale',
  mathematics: 'Matematica',
  language: 'Linguaggio',
  cultural: 'Culturale',
};

export const AREA_LABELS_JA: Record<string, string> = {
  practical_life: '日常生活',
  sensorial: '感覚',
  mathematics: '算数',
  language: '言語',
  cultural: '文化',
};

export const AREA_LABELS_KO: Record<string, string> = {
  practical_life: '일상생활',
  sensorial: '감각',
  mathematics: '수학',
  language: '언어',
  cultural: '문화',
};

export const AREA_LABELS_UK: Record<string, string> = {
  practical_life: 'Практичне Життя',
  sensorial: 'Сенсорний',
  mathematics: 'Математика',
  language: 'Мова',
  cultural: 'Культура',
};

export const AREA_LABELS_RU: Record<string, string> = {
  practical_life: 'Практическая Жизнь',
  sensorial: 'Сенсорика',
  mathematics: 'Математика',
  language: 'Язык',
  cultural: 'Культура',
};

/** Map of all locale → area labels. Keyed by locale string. */
export const AREA_LABELS: Record<string, Record<string, string>> = {
  en: AREA_LABELS_EN,
  zh: AREA_LABELS_ZH,
  es: AREA_LABELS_ES,
  de: AREA_LABELS_DE,
  fr: AREA_LABELS_FR,
  pt: AREA_LABELS_PT,
  nl: AREA_LABELS_NL,
  it: AREA_LABELS_IT,
  ja: AREA_LABELS_JA,
  ko: AREA_LABELS_KO,
  uk: AREA_LABELS_UK,
  ru: AREA_LABELS_RU,
};

/** Ordered area keys (Montessori canonical sequence). */
export const AREA_KEYS = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
] as const;

export type AreaKey = (typeof AREA_KEYS)[number];

/**
 * Get the localized area label.
 * Falls back to English, then to the raw area key if no translation exists.
 */
export function getAreaLabel(area: string, locale: string): string {
  const map = AREA_LABELS[locale] || AREA_LABELS_EN;
  return map[area] ?? AREA_LABELS_EN[area] ?? area;
}

/**
 * Get area labels as a formatted arrow string for AI prompts.
 * E.g. "Practical Life → Sensorial → Language" or "日常 → 感官 → 语言"
 */
export function getAreaArrowExample(locale: string): string {
  const map = AREA_LABELS[locale] || AREA_LABELS_EN;
  return `${map.practical_life} → ${map.sensorial} → ${map.language}`;
}
