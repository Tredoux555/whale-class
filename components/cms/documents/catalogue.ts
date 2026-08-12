// components/cms/documents/catalogue.ts
// The one list that says what documents exist, what each is called, what it
// needs, and what its URL is. The index page and the print page both read it,
// so a document cannot appear on one and not the other, and a slug cannot mean
// two different things.
//
// It lives HERE and not in `lib/cms/engine/doc-generator` on purpose: the
// engine is locale-free by law, and every field below except `kind` is either a
// translation key or a URL. The engine says what a document IS; this says what
// a document is CALLED and where it lives.

import type { DocumentCounts, DocumentKind } from '@/lib/cms/engine/doc-generator';
import { DOCUMENT_KINDS, hasData } from '@/lib/cms/engine/doc-generator';
import type { TranslationKey } from '@/lib/cms/i18n/t';

export interface DocumentEntry {
  kind: DocumentKind;
  /** URL segment. Human-readable and stable — a teacher bookmarks these. */
  slug: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  /** What the empty state tells them to go and add. */
  needsKey: TranslationKey;
}

const BY_KIND: Record<DocumentKind, DocumentEntry> = {
  class_list: {
    kind: 'class_list',
    slug: 'class-list',
    titleKey: 'doc.classList',
    descKey: 'doc.classList.desc',
    needsKey: 'teacher.documents.need.children',
  },
  pickup_sheet: {
    kind: 'pickup_sheet',
    slug: 'pickup-sheet',
    titleKey: 'doc.pickupSheet',
    descKey: 'doc.pickupSheet.desc',
    needsKey: 'teacher.documents.need.contacts',
  },
  allergy_poster: {
    kind: 'allergy_poster',
    slug: 'allergy-poster',
    titleKey: 'doc.allergyPoster',
    descKey: 'doc.allergyPoster.desc',
    needsKey: 'teacher.documents.need.allergies',
  },
  dietary_sheet: {
    kind: 'dietary_sheet',
    slug: 'dietary-sheet',
    titleKey: 'doc.dietarySheet',
    descKey: 'doc.dietarySheet.desc',
    needsKey: 'teacher.documents.need.dietary',
  },
  emergency_contacts: {
    kind: 'emergency_contacts',
    slug: 'emergency-contacts',
    titleKey: 'doc.emergencyContacts',
    descKey: 'doc.emergencyContacts.desc',
    needsKey: 'teacher.documents.need.contacts',
  },
  name_labels: {
    kind: 'name_labels',
    slug: 'labels',
    titleKey: 'doc.labels',
    descKey: 'doc.labels.desc',
    needsKey: 'teacher.documents.need.children',
  },
};

/** In the order the index lists them — commonest first (DOCUMENT_KINDS). */
export const DOCUMENTS: readonly DocumentEntry[] = DOCUMENT_KINDS.map((kind) => BY_KIND[kind]);

/** A URL segment → the document it names, or null. An unknown slug is a 404,
 *  never a guess: `/documents/allergyposter` must not quietly render a poster. */
export function documentBySlug(slug: string): DocumentEntry | null {
  return DOCUMENTS.find((d) => d.slug === slug) ?? null;
}

/** One count line per card: "3 allergies · 1 EpiPen". */
export interface CountChip {
  key: TranslationKey;
  count: number;
}

export function chipsFor(kind: DocumentKind, counts: DocumentCounts): CountChip[] {
  switch (kind) {
    case 'class_list':
      return [
        { key: 'teacher.documents.count.children', count: counts.children },
        { key: 'teacher.documents.count.allergies', count: counts.allergies },
        { key: 'teacher.documents.count.dietary', count: counts.dietaryRequirements },
      ];
    case 'pickup_sheet':
      return [
        { key: 'teacher.documents.count.collectors', count: counts.collectors },
        {
          key: 'teacher.documents.count.missingCollector',
          count: counts.childrenWithoutCollector,
        },
      ];
    case 'allergy_poster':
      return [
        { key: 'teacher.documents.count.allergies', count: counts.posterAllergies },
        { key: 'teacher.documents.count.epipen', count: counts.epipens },
      ];
    case 'dietary_sheet':
      return [{ key: 'teacher.documents.count.dietary', count: counts.dietaryRequirements }];
    case 'emergency_contacts':
      return [{ key: 'teacher.documents.count.contacts', count: counts.contacts }];
    case 'name_labels':
      return [{ key: 'teacher.documents.count.children', count: counts.children }];
  }
}

export { hasData };
