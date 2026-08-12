// lib/montree/cms-bridge/catalogue.ts
// ============================================================================
// What the six documents are CALLED on the Montree side, and which language the
// paper speaks. CMS phase 6.
// ============================================================================
// The SLUGS are not redefined here — they are imported from
// `components/cms/documents/catalogue`, so `/montree/dashboard/class-documents/
// allergy-poster` and `/cms/teacher/documents/allergy-poster` can never drift
// into meaning two different things. What IS defined here is the montree i18n
// key for each card, because the screen is Montree's and speaks Montree's
// twelve languages.
//
// 🚨 TWO LANGUAGES ON ONE PAGE, DELIBERATELY.
//   · SCREEN chrome (the index, the toolbar, the empty states) → Montree i18n,
//     all 12 locales, via useI18n().
//   · PAPER (the sheet itself) → the CMS labels mechanism, because the paper
//     components are CMS's and their strings are CMS translation keys.
// CMS ships en/ru/ar complete and fr/es/sw/zh as English stubs. So a Russian
// teacher gets Russian paper; a German, Japanese or Korean teacher gets a
// German/Japanese/Korean SCREEN and ENGLISH paper, because no German document
// dictionary exists yet. That is a stated, documented fallback rather than a
// bug — and the index page says so on the page, in the teacher's own language.

import { documentBySlug, DOCUMENTS } from '@/components/cms/documents/catalogue';
import type { DocumentKind } from '@/lib/cms/engine/doc-generator';
import { isLocale, type Locale as CmsLocale } from '@/lib/cms/i18n/config';
// Type-only: the montree key union, so a typo in a label key is a build error.
import type { TranslationKey } from '@/lib/montree/i18n/en';

export { documentBySlug, DOCUMENTS };

export interface MontreeDocumentLabels {
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** What the empty state tells the teacher to go and do. */
  needKey: TranslationKey;
}

/** Montree i18n keys per document. Titles are the room's own words for these
 *  sheets — "Allergy Poster", not "Allergy Document". */
export const MONTREE_DOCUMENT_LABELS: Record<DocumentKind, MontreeDocumentLabels> = {
  class_list: {
    titleKey: 'classDocs.doc.classList',
    descKey: 'classDocs.doc.classList.desc',
    needKey: 'classDocs.need.children',
  },
  pickup_sheet: {
    titleKey: 'classDocs.doc.pickupSheet',
    descKey: 'classDocs.doc.pickupSheet.desc',
    needKey: 'classDocs.need.intake',
  },
  allergy_poster: {
    titleKey: 'classDocs.doc.allergyPoster',
    descKey: 'classDocs.doc.allergyPoster.desc',
    needKey: 'classDocs.need.intake',
  },
  dietary_sheet: {
    titleKey: 'classDocs.doc.dietarySheet',
    descKey: 'classDocs.doc.dietarySheet.desc',
    needKey: 'classDocs.need.intake',
  },
  emergency_contacts: {
    titleKey: 'classDocs.doc.emergencyContacts',
    descKey: 'classDocs.doc.emergencyContacts.desc',
    needKey: 'classDocs.need.intake',
  },
  name_labels: {
    titleKey: 'classDocs.doc.labels',
    descKey: 'classDocs.doc.labels.desc',
    needKey: 'classDocs.need.children',
  },
};

/**
 * Montree locale → the locale the PAPER prints in.
 *
 * Only the codes CMS actually has a dictionary for are passed through; every
 * other Montree locale falls back to English on paper. `zh`, `es` and `fr` map
 * through even though those CMS dictionaries are English stubs today — the day
 * somebody writes them, Chinese paper starts working with no code change here.
 */
export function paperLocaleFor(montreeLocale: string | null | undefined): CmsLocale {
  const raw = (montreeLocale || '').trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(raw) ? raw : 'en';
}

/** Does the paper speak the teacher's language, or is it falling back to
 *  English? Drives one honest line on the index page. */
export function paperMatchesScreen(montreeLocale: string | null | undefined): boolean {
  const raw = (montreeLocale || '').trim().toLowerCase().split(/[-_]/)[0];
  // en and ru are the only Montree locales with a COMPLETE CMS dictionary.
  return raw === 'en' || raw === 'ru';
}
