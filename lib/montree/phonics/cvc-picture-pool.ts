// lib/montree/phonics/cvc-picture-pool.ts
// ============================================================================
// CVC + PICTURE BANK — the word pool behind "CVC Bingo".
// ============================================================================
// CVC Bingo is not its own generator: it is a WORD SOURCE for the existing
// phonics bingo pipeline (app/montree/library/tools/phonics-fast/bingo). This
// module answers the only question that source has to answer:
//
//   "Which CVC words does this school actually have a PICTURE for?"
//
// Everything else — boards, duplex calling cards (picture front / word back),
// geometry, print CSS — is the pipeline's, untouched.
//
// 🚨 PICTURES ONLY, NEVER EMOJI. A pool item exists only when a real photo
// backs it: the curated Photo Bank first (that is the bank the owner curates
// for bingo), the Dark Phonics writing-shelf bank only to fill gaps.
//
// Kept out of the page component so the classifier is testable on its own.

import { WORD_CLASSES } from '@/lib/montree/dark-phonics/writing-shelf-language';
import { MASTER_CVC_WORDS } from '@/lib/data/master-words';
import { ALL_PHASES } from '@/lib/montree/phonics/phonics-data';
import { DARK_PHOTO_WORDS, photoUrl as darkPhotoUrl } from '@/lib/montree/journey/dark-bank';

/** One picture-backed CVC word, ready to be adapted into a PhonicsWord. */
export interface CvcPoolItem {
  word: string;
  imageUrl: string;
  /** Distinct letters of the word — the unit "letters covered" is measured in. */
  letters: string[];
}

/** The shape the photo-bank route returns (only the fields we need). */
export interface CvcBankItem {
  label: string;
  public_url: string;
}

/** Plain 3-letter consonant-vowel-consonant. */
const CVC_RE = /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/;

/**
 * Words that are in one of the ledgers but are NOT picturable CVC words —
 * articles, prepositions, pronouns and the to-be verbs. WORD_CLASSES marks
 * exactly these as 'little' ("a", "I", "the", "in", "it", "under"…), so the
 * ledger classifies them out for us rather than us keeping a second hand-list.
 */
const LITTLE_WORDS = new Set(
  Object.entries(WORD_CLASSES)
    .filter(([, cls]) => cls === 'little')
    .map(([w]) => w.toLowerCase())
);

function buildLedger(): Set<string> {
  const set = new Set<string>();

  // 1. The decodable ledger the writing shelf teaches from.
  for (const w of Object.keys(WORD_CLASSES)) set.add(w.toLowerCase());

  // 2. The master CVC list used by the I Spy baskets and English Guide.
  for (const group of MASTER_CVC_WORDS) {
    for (const w of group.words) set.add(w.word.toLowerCase());
  }

  // 3. The CVC entries of the phonics phases — the Pink series IS the CVC
  //    series in phonics-data (pink1 trays, pink2 short-vowel groups).
  for (const phase of ALL_PHASES) {
    if (!phase.id.startsWith('pink')) continue;
    for (const group of phase.groups) {
      for (const w of group.words) set.add(w.word.toLowerCase());
    }
  }

  // 4. The owner's own Dark Phonics photo words.
  for (const w of DARK_PHOTO_WORDS) set.add(w.toLowerCase());

  return set;
}

const CVC_LEDGER = buildLedger();

/**
 * Normalise a photo-bank label into a candidate word: lowercase, trimmed,
 * with a file extension, a trailing copy-number ("cat 2", "cat_03") and any
 * surrounding punctuation stripped. Returns '' when nothing word-like is left.
 */
export function normaliseBankLabel(label: string): string {
  let s = (label || '').toLowerCase().trim();
  s = s.replace(/\.(jpe?g|png|webp|gif|svg|heic|avif)$/i, '');
  s = s.replace(/[_-]+/g, ' ');
  s = s.replace(/\(\s*\d+\s*\)$/, '');   // "cat (2)"
  s = s.replace(/\s+\d+$/, '');          // "cat 2"
  s = s.replace(/\d+$/, '');             // "cat02"
  s = s.replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

/** Is this a CVC word we would put on a bingo board? */
export function isCvcWord(word: string): boolean {
  const w = (word || '').toLowerCase().trim();
  if (!w || w.includes(' ')) return false;
  if (w.length < 3 || w.length > 5) return false;
  if (!/^[a-z]+$/.test(w)) return false;
  if (LITTLE_WORDS.has(w)) return false;      // "the", "under", "it" — not board words
  if (!/[aeiou]/.test(w)) return false;
  return CVC_RE.test(w) || CVC_LEDGER.has(w);
}

function toItem(word: string, imageUrl: string): CvcPoolItem {
  return {
    word,
    imageUrl,
    letters: Array.from(new Set(word.split(''))),
  };
}

/**
 * Build the pool: every CVC word that has a picture.
 *
 * Precedence is deliberate — the general Photo Bank is the bank the teacher
 * curates for bingo, so it WINS; the Dark Phonics writing-shelf bank only
 * fills words the general bank has no picture for.
 */
export function buildCvcPicturePool(bankItems: CvcBankItem[]): CvcPoolItem[] {
  const byWord = new Map<string, CvcPoolItem>();

  for (const item of bankItems || []) {
    if (!item?.public_url) continue;
    const word = normaliseBankLabel(item.label);
    if (!isCvcWord(word)) continue;
    if (byWord.has(word)) continue;          // first match wins, as elsewhere
    byWord.set(word, toItem(word, item.public_url));
  }

  for (const raw of DARK_PHOTO_WORDS) {
    const word = raw.toLowerCase();
    if (byWord.has(word)) continue;          // general bank already covers it
    if (!isCvcWord(word)) continue;
    const url = darkPhotoUrl(word);
    if (!url) continue;
    byWord.set(word, toItem(word, url));
  }

  return Array.from(byWord.values()).sort((a, b) => a.word.localeCompare(b.word));
}

/**
 * Walk the picture side of the photo bank. Same pagination contract the
 * shared photo-bank resolver uses (limit=200, page=N until a short page),
 * with a hard page cap so a bank that grows unexpectedly can never spin.
 */
export async function fetchPictureBankItems(signal?: AbortSignal): Promise<CvcBankItem[]> {
  const out: CvcBankItem[] = [];
  const LIMIT = 200;
  const MAX_PAGES = 25; // 5,000 photos — far past today's bank

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`/api/montree/photo-bank?kind=pictures&page=${page}&limit=${LIMIT}`, { signal });
    if (!res.ok) break;
    const data = await res.json();
    const photos: CvcBankItem[] = data?.photos || [];
    out.push(...photos);
    if (photos.length < LIMIT) break;
    if (typeof data?.totalPages === 'number' && page >= data.totalPages) break;
  }

  return out;
}
