// lib/montree/dark-phonics/share.ts
//
// The one place that knows what a shared lesson link looks like.
//
// Every share leaves through /dark-phonics/l/<n> — the deep link that opens the
// hub on Play with that lesson already open, and the URL that owns the OG
// image. The medium rides along as utm_medium so the funnel can tell a
// native-share tap from a copied link.
//
// Pure: no next/*, no window. The component passes `origin` in when it has one.

export const DP_SHARE_SOURCE = 'share';
export type DpShareMedium = 'share' | 'copy';

/** The canonical path for one lesson, with no query. */
export function lessonPath(n: number): string {
  return `/dark-phonics/l/${Math.round(n)}`;
}

/** The link a person actually sends. Relative when no origin is known. */
export function shareUrl(n: number, medium: DpShareMedium, origin?: string | null): string {
  const path = `${lessonPath(n)}?utm_source=${DP_SHARE_SOURCE}&utm_medium=${medium}`;
  if (!origin) return path;
  return `${origin.replace(/\/+$/, '')}${path}`;
}

/**
 * "We finished In the Pit!" — the sentence the share sheet carries.
 *
 * Most Dark Phonics books END in an exclamation mark ("In the Pit!", "The ___
 * Naps!"), so the sentence supplies one only when the title has not already:
 * "We finished In the Pit!!" reads like a typo, which is not the tone of the
 * moment a four-year-old just finished their first book.
 */
export function shareTitle(bookTitle: string, lang: 'en' | 'zh' = 'en'): string {
  const title = bookTitle.trim();
  const punctuated = /[!?.！？。]$/.test(title);
  if (lang === 'zh') return `我们读完了《${title}》${punctuated ? '' : '！'}`;
  return `We finished ${title}${punctuated ? '' : '!'}`;
}

export function shareText(bookTitle: string, lang: 'en' | 'zh' = 'en'): string {
  return lang === 'zh'
    ? `${shareTitle(bookTitle, 'zh')} Dark Phonics 的小书，可以点、可以拖、可以描。免费试读。`
    : `${shareTitle(bookTitle, 'en')} A little Dark Phonics book you can tap, drag and trace. Free to try.`;
}

/** Lesson numbers a deep link may carry: the shelf's own 21 books, 1–21. */
export function isShareableLesson(n: unknown, available: readonly number[]): boolean {
  const num = Number(n);
  return Number.isInteger(num) && available.includes(num);
}
