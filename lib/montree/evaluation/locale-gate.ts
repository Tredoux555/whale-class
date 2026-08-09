/**
 * Montree Milestones — language-of-assessment gate.
 *
 * THE RULE (research: k-standards.md §6, step 1)
 *
 *   With the single exception of a construct that IS English — the EFL track (E1–E6) —
 *   nothing in this instrument may depend on a child understanding or speaking English.
 *   Two CORE strands break that rule by construction:
 *
 *     LCL-C  Phonological awareness   — its rhyme and sound targets are English words
 *     LCL-D  Print & alphabet         — its alphabet is the Roman alphabet, SATPIN order
 *
 *   Administering those in a Chinese-medium sitting does not measure "core literacy"; it
 *   measures English proficiency wearing a Chinese carrier sentence, which is precisely the
 *   anti-pattern IDELA's adaptation guide warns against. So under a non-English assessment
 *   locale these two strands are NOT SCHEDULED AT ALL, and their milestones are reported as
 *   `unassessed` with an explicit reason — the same "unassessed is first-class data, always
 *   shown with its denominator" mechanism `scoring.ts` already uses for MAP% suppression.
 *
 *   This is deliberately NOT a translation. The correct long-term fix is a genuine
 *   Mandarin item set (syllable/tone segmentation; Pinyin initials/finals; Hanzi components)
 *   crosswalked to `chinaMoe` rather than ELOF/EYFS. Until that content exists, an honest
 *   gap beats a misleading figure.
 *
 * WHY IT LIVES HERE
 *   The runner engine runs in the browser and must not import `./bank` (1.6 MB of JSON), so
 *   this module is pure and takes strand records as an argument. `item-bank.json` already
 *   marks both strands `englishMedium: true`, so the flag in the DATA is the source of
 *   truth and `ENGLISH_MEDIUM_CORE_STRANDS` is the named, greppable mirror of it — used
 *   when only a strand id is to hand (a stored result row, say) and the record is not.
 */
import type { Strand } from './types';

/** The core strands whose evidence only makes sense under English-medium instruction. */
export const ENGLISH_MEDIUM_CORE_STRANDS: readonly string[] = ['LCL-C', 'LCL-D'];

/** Reason code stored/reported against a milestone the locale gate stood down. */
export const LOCALE_SUPPRESSION_REASON = 'locale_not_supported';

/** The one assessment locale in which the English-medium strands may be administered. */
export const ENGLISH_LOCALE_PREFIX = 'en';

/** `en`, `en-GB`, `en_US` → true. `zh`, `zh-CN` → false. Empty/missing → true (legacy rows). */
export function isEnglishAssessmentLocale(assessmentLocale: string | null | undefined): boolean {
  if (!assessmentLocale) return true;  // pre-locale rows were all English-medium sittings
  return assessmentLocale.toLowerCase().startsWith(ENGLISH_LOCALE_PREFIX);
}

/** The data flag first; the named list as the fallback when no record is available. */
export function isEnglishMediumStrand(strand: Pick<Strand, 'id' | 'englishMedium'> | undefined, strandId?: string): boolean {
  if (strand) return strand.englishMedium === true;
  return !!strandId && ENGLISH_MEDIUM_CORE_STRANDS.includes(strandId);
}

/**
 * Strand ids this sitting must not administer. Empty for every English sitting, so the
 * `en` path through every caller is byte-for-byte what it was before this gate existed.
 */
export function localeSuppressedStrandIds(
  strands: ReadonlyArray<Pick<Strand, 'id' | 'englishMedium'>>,
  assessmentLocale: string | null | undefined,
): Set<string> {
  if (isEnglishAssessmentLocale(assessmentLocale)) return new Set<string>();
  const out = new Set<string>();
  for (const s of strands) if (s.englishMedium === true) out.add(s.id);
  // Belt and braces: the named list is honoured even if a bank edit ever drops the flag.
  for (const id of ENGLISH_MEDIUM_CORE_STRANDS) out.add(id);
  return out;
}

/** Single-strand form of the above, for callers holding one id rather than the bank. */
export function isStrandLocaleSuppressed(
  strandId: string,
  assessmentLocale: string | null | undefined,
  strand?: Pick<Strand, 'id' | 'englishMedium'>,
): boolean {
  if (isEnglishAssessmentLocale(assessmentLocale)) return false;
  return isEnglishMediumStrand(strand, strandId);
}
