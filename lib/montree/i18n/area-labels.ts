/**
 * Centralized area label translations.
 * Single source of truth — import this instead of hardcoding area labels.
 *
 * Canonical reference: WeeklyWrapTab.tsx lines 74-80 (Session 14).
 * Extracted to shared module: Session 45 (Chinese Localization Sweep).
 */

export const AREA_LABELS_ZH: Record<string, string> = {
  practical_life: '日常',
  sensorial: '感官',
  mathematics: '数学',
  language: '语言',
  cultural: '文化',
};

export const AREA_LABELS_EN: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
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
 * Falls back to the raw area key if no translation exists.
 */
export function getAreaLabel(area: string, locale: string): string {
  const map = locale === 'zh' ? AREA_LABELS_ZH : AREA_LABELS_EN;
  return map[area] ?? area;
}

/**
 * Get area labels as a formatted arrow string for AI prompts.
 * E.g. "Practical Life → Sensorial → Language" or "日常 → 感官 → 语言"
 */
export function getAreaArrowExample(locale: string): string {
  const map = locale === 'zh' ? AREA_LABELS_ZH : AREA_LABELS_EN;
  return `${map.practical_life} → ${map.sensorial} → ${map.language}`;
}
