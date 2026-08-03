/**
 * Read one child-facing string out of the item bank.
 *
 * Every user-visible string in the bank is a locale map with `en` always present
 * (`LocalizedText` in lib/montree/evaluation/types.ts). The repo's own
 * `resolveLocalized()` takes `Record<string, string>`, which `LocalizedText`'s
 * `string | undefined` index signature does not satisfy — so this is the bank's own
 * reader, with the same fallback chain: exact locale → en → first present → ''.
 *
 * Falling back rather than showing a key matters here: a missing translation on an item
 * prompt must degrade to English wording a teacher can read aloud, never to `LCL.A4.03`.
 */
import type { LocalizedText } from '@/lib/montree/evaluation/types';

export function bankText(
  value: LocalizedText | Record<string, string | undefined> | undefined | null,
  locale: string,
): string {
  if (!value) return '';
  const exact = value[locale];
  if (exact) return exact;
  // zh-CN / zh-TW style tags fall back to the base language before English.
  const base = locale.split('-')[0];
  if (base !== locale && value[base]) return value[base] as string;
  if (value.en) return value.en;
  const first = Object.values(value).find((v) => typeof v === 'string' && v.length > 0);
  return (first as string) ?? '';
}

export default bankText;
