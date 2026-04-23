// Shared types and resolvers for locale-keyed JSONB values.
// Extracted from GamePlanCard.tsx for reuse across the codebase.
// Used for game plan fields (nudge, works, direction) and any future
// AI-generated content stored as { en: "...", zh: "...", es: "..." } objects.

/**
 * A value that can be either a plain string (legacy) or a locale-keyed object.
 * Use resolveLocalized(value, locale) to read.
 */
export type LocalizedString = string | Record<string, string>;

/**
 * An array value that can be either a plain string[] (legacy) or a locale-keyed object.
 * Use resolveLocalizedArray(value, locale) to read.
 */
export type LocalizedStringArray = string[] | Record<string, string[]>;

/**
 * Resolve a potentially-localized value to a string for the given locale.
 * Fallback chain: exact locale → 'en' → first available value → empty string.
 * Handles legacy plain strings seamlessly (returns them as-is).
 */
export function resolveLocalized(val: LocalizedString | undefined, locale: string): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return val[locale] || val.en || Object.values(val)[0] || '';
}

/**
 * Resolve a potentially-localized array to string[] for the given locale.
 * Same fallback chain as resolveLocalized.
 */
export function resolveLocalizedArray(val: LocalizedStringArray | undefined, locale: string): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return val[locale] || val.en || Object.values(val)[0] || [];
}
