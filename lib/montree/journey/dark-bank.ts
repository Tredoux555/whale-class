/**
 * Dark Phonics photo bank — the ONLY picture source for the English Journey
 * player (components/montree/journey/). Every image here is the owner's own
 * photo art (his approved style), hosted in the PUBLIC Supabase `photo-bank`
 * storage bucket under `writing-shelf/<word>.jpg`. No emoji, no
 * MASTER_CVC_WORDS, no BEGINNING_SOUND_OBJECTS — ever, anywhere downstream
 * of this file within the journey.
 *
 * To add a word: shoot/upload writing-shelf/<word>.jpg to the photo-bank
 * bucket (see scripts/curriculum/upload-writing-shelf-photos.mjs and its
 * sibling .dp-scratch/upload-remaining-cvc-photos.mjs), then append the
 * word to DARK_PHOTO_WORDS below. Nothing else needs to change — every
 * consumer (journey-works.ts, JourneyWorks.tsx) derives from DARK_BANK.
 */

// NOTE: firstGrapheme below is a deliberate LOCAL COPY of the leading-digraph
// logic in live-activities.ts's segmentGraphemes, not an import of it. This
// file is imported by writing-shelf-language.ts (seqFrameUrl), which is in
// turn imported by live-activities.ts — importing segmentGraphemes here
// would close that into a module cycle (dark-bank -> live-activities ->
// writing-shelf-language -> dark-bank) and break at load time (a TDZ error
// on SUPABASE_URL). Keep this list in sync with live-activities.ts's
// DIGRAPHS if either changes; none of DARK_PHOTO_WORDS currently starts
// with a listed digraph, so this is a straight passthrough today.
const LEADING_DIGRAPHS = ['sh', 'ch', 'th', 'ck', 'ng', 'qu', 'ee', 'oo', 'ai', 'oa', 'ay', 'll', 'ss', 'ff', 'zz'];
function firstGrapheme(word: string): string {
  const two = word.slice(0, 2).toLowerCase();
  return LEADING_DIGRAPHS.includes(two) ? two : (word[0]?.toLowerCase() ?? '');
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const BUCKET = 'photo-bank';
const PREFIX = 'writing-shelf';

/**
 * The 38 words with real isolated object photos in the bucket (some are
 * still mid-upload — see photoUrl's graceful null return). Alphabetical,
 * matching the owner's shoot list.
 */
export const DARK_PHOTO_WORDS: readonly string[] = [
  'bag', 'bed', 'big', 'bin', 'cat', 'cot', 'croc', 'dog', 'hat', 'jam',
  'kit', 'log', 'mop', 'mug', 'nap', 'nip', 'nut', 'off', 'pad', 'pat',
  'peg', 'pen', 'pig', 'pit', 'rat', 'rug', 'run', 'sap', 'sat', 'sick',
  'sip', 'sit', 'snap', 'spat', 'spit', 'squid', 'stuck', 'under',
];

const DARK_PHOTO_WORD_SET = new Set(DARK_PHOTO_WORDS);

/** Public URL for a word's isolated photo, or null when the word isn't
 *  (yet) one of the owner's Dark Phonics photos. Never an emoji fallback —
 *  callers render a text/word card instead when this is null or the img
 *  itself 404s (upload still pending). */
export function photoUrl(word: string): string | null {
  const key = word.toLowerCase();
  if (!DARK_PHOTO_WORD_SET.has(key) || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${key}.jpg`;
}

/** Public URL for one frame of a 4-frame Story Books sequence (Tray 6 art,
 *  reused here for the journey's Story Books work). */
export function seqFrameUrl(set: 'A' | 'B' | 'C', frame: 1 | 2 | 3 | 4): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/seq-${set}-${frame}.jpg`;
}

export interface DarkPicture {
  word: string;
  imageUrl: string;
  firstSound: string;
}

/** Every Dark Phonics photo word, ready for the match/i-spy/letter works. */
export const DARK_BANK: DarkPicture[] = DARK_PHOTO_WORDS.map((word) => ({
  word,
  imageUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${PREFIX}/${word}.jpg`,
  firstSound: firstGrapheme(word),
}));
