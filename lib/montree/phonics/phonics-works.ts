// lib/montree/phonics/phonics-works.ts
//
// "Dark Phonics" — the Pink phase (UFLI lessons 5–53) exposed as Language-area
// curriculum WORKS, so a teacher tags + tracks them exactly like any other work
// (progress flows through montree_child_progress by work_name, unchanged).
//
// These are VIRTUAL works: never written to montree_classroom_curriculum_works.
// The /api/montree/works route appends them to a classroom's work list ONLY when
// the per-school `phonics_works` feature flag is ON, so on/off is perfectly clean
// (no orphaned rows). Pink only for now.

const AUDIO_BASE =
  'https://dmfncjjtsoxrnvcdnvjq.supabase.co/storage/v1/object/public/dark-phonics/songs/';
const SONGBOOK_URL = 'https://montree.xyz/dark-phonics.html';
const LANGUAGE_AREA_KEY = 'language';
const LANGUAGE_AREA_NAME = 'Language';
const LANGUAGE_AREA_COLOR = '#16a34a';

export interface PhonicsLesson {
  lesson: number; // UFLI lesson number (5–53)
  grapheme: string; // the letter(s) taught, e.g. "s", "ck", "sh"
  sound: string; // the phoneme, e.g. "s", "k", "sh"
  words: string[]; // a few target words
}

// Pink phase, lessons 5–53. Sound + sample words mirror the song/curriculum set.
const LESSONS: PhonicsLesson[] = [
  { lesson: 5, grapheme: 's', sound: 's', words: ['snake', 'sun', 'sock'] },
  { lesson: 6, grapheme: 'a', sound: 'ă', words: ['ant', 'apple'] },
  { lesson: 7, grapheme: 't', sound: 't', words: ['top', 'tap', 'sat'] },
  { lesson: 8, grapheme: 'p', sound: 'p', words: ['pat', 'pup', 'pop'] },
  { lesson: 9, grapheme: 'i', sound: 'ĭ', words: ['sit', 'tip', 'sip'] },
  { lesson: 10, grapheme: 'n', sound: 'n', words: ['nap', 'pin', 'pan'] },
  { lesson: 11, grapheme: 'm', sound: 'm', words: ['map', 'mat', 'man'] },
  { lesson: 12, grapheme: 'd', sound: 'd', words: ['dog', 'dad', 'dip'] },
  { lesson: 13, grapheme: 'g', sound: 'g', words: ['goat', 'pig', 'dig'] },
  { lesson: 14, grapheme: 'o', sound: 'ŏ', words: ['pot', 'top', 'dog'] },
  { lesson: 15, grapheme: 'c', sound: 'k', words: ['cat', 'can', 'cap'] },
  { lesson: 16, grapheme: 'k', sound: 'k', words: ['kid', 'kit', 'kite'] },
  { lesson: 17, grapheme: 'ck', sound: 'k', words: ['kick', 'sock', 'pick'] },
  { lesson: 18, grapheme: 'e', sound: 'ĕ', words: ['pen', 'ten', 'get'] },
  { lesson: 19, grapheme: 'u', sound: 'ŭ', words: ['up', 'cup', 'pup'] },
  { lesson: 20, grapheme: 'r', sound: 'r', words: ['run', 'red', 'rat'] },
  { lesson: 21, grapheme: 'h', sound: 'h', words: ['hat', 'hop', 'hot'] },
  { lesson: 22, grapheme: 'b', sound: 'b', words: ['boat', 'big', 'bed'] },
  { lesson: 23, grapheme: 'f', sound: 'f', words: ['fan', 'fun', 'fox'] },
  { lesson: 24, grapheme: 'l', sound: 'l', words: ['lap', 'leg', 'log'] },
  { lesson: 25, grapheme: 'j', sound: 'j', words: ['jump', 'jam', 'jar'] },
  { lesson: 26, grapheme: 'v', sound: 'v', words: ['van', 'vet', 'vine'] },
  { lesson: 27, grapheme: 'w', sound: 'w', words: ['wind', 'wet', 'web'] },
  { lesson: 28, grapheme: 'x', sound: 'ks', words: ['box', 'fox', 'six'] },
  { lesson: 29, grapheme: 'y', sound: 'y', words: ['yes', 'yum', 'yam'] },
  { lesson: 30, grapheme: 'z', sound: 'z', words: ['zip', 'zap', 'zoo'] },
  { lesson: 31, grapheme: 'qu', sound: 'kw', words: ['queen', 'quick', 'quiz'] },
  { lesson: 32, grapheme: 'review', sound: 'review', words: ['cat', 'pig', 'dog'] },
  { lesson: 33, grapheme: 'vowels', sound: 'vowels', words: ['cat', 'pet', 'pig', 'pot', 'cup'] },
  { lesson: 34, grapheme: 'review', sound: 'review', words: ['cat', 'dog', 'sun'] },
  { lesson: 35, grapheme: 'short a', sound: 'ă', words: ['cat', 'hat', 'man'] },
  { lesson: 36, grapheme: 'short i', sound: 'ĭ', words: ['pig', 'big', 'sit'] },
  { lesson: 37, grapheme: 'short o', sound: 'ŏ', words: ['dog', 'hot', 'box'] },
  { lesson: 38, grapheme: 'short e', sound: 'ĕ', words: ['bed', 'ten', 'pet'] },
  { lesson: 39, grapheme: 'short u', sound: 'ŭ', words: ['sun', 'fun', 'bug'] },
  { lesson: 40, grapheme: 'minimal pairs', sound: 'vowels', words: ['cat', 'cot', 'cut'] },
  { lesson: 41, grapheme: 'll ff ss zz', sound: 'doubling', words: ['bell', 'hill', 'doll'] },
  { lesson: 42, grapheme: 'sh', sound: 'sh', words: ['ship', 'fish', 'shop'] },
  { lesson: 43, grapheme: 'ch', sound: 'ch', words: ['chick', 'chop', 'chin'] },
  { lesson: 44, grapheme: 'th', sound: 'th', words: ['thin', 'thick', 'bath'] },
  { lesson: 45, grapheme: 'wh', sound: 'wh', words: ['when', 'whale', 'wheel'] },
  { lesson: 46, grapheme: 'th', sound: 'th', words: ['this', 'that', 'them'] },
  { lesson: 47, grapheme: 'st nd mp', sound: 'end blends', words: ['fast', 'hand', 'jump'] },
  { lesson: 48, grapheme: 'nk nt lt', sound: 'end blends', words: ['pink', 'sink', 'tent'] },
  { lesson: 49, grapheme: 's-blends', sound: 's-blends', words: ['slip', 'sled', 'snap'] },
  { lesson: 50, grapheme: 'l-blends', sound: 'l-blends', words: ['clap', 'flag', 'glass'] },
  { lesson: 51, grapheme: 'r-blends', sound: 'r-blends', words: ['frog', 'crab', 'drum'] },
  { lesson: 52, grapheme: 'tw dw', sound: 'tw-blends', words: ['twin', 'twist', 'twig'] },
  { lesson: 53, grapheme: 'triple blends', sound: 'triple blends', words: ['splash', 'sprint', 'strap'] },
];

export interface PhonicsWorkRow {
  id: string;
  work_key: string;
  name: string;
  description: string;
  area: string;
  area_name: string;
  area_color: string;
  sequence: number;
  is_phonics: true;
  song_url: string;
  songbook_url: string;
}

function workName(l: PhonicsLesson): string {
  const sound = /review|vowels|blends|doubling|pairs/.test(l.sound) ? l.grapheme : `${l.grapheme} /${l.sound}/`;
  return `Phonics ${String(l.lesson).padStart(2, '0')}: ${sound} — ${l.words.join(', ')}`;
}

/** The 49 Pink phonics works in the exact shape /api/montree/works returns. */
export function phonicsWorkRows(): PhonicsWorkRow[] {
  return LESSONS.map((l) => {
    const nn = String(l.lesson).padStart(2, '0');
    return {
      id: `phonics_${nn}`,
      work_key: `phonics_${nn}`,
      name: workName(l),
      description: `Dark Phonics — lesson ${l.lesson} (${l.grapheme}). Sing the song, read the book, then capture the child doing the work. 🎵 Songs, cards, books & readers: montree.xyz/dark-phonics.html`,
      area: LANGUAGE_AREA_KEY,
      area_name: LANGUAGE_AREA_NAME,
      area_color: LANGUAGE_AREA_COLOR,
      sequence: l.lesson, // 5–53, keeps them in phonics order within Language
      is_phonics: true as const,
      song_url: `${AUDIO_BASE}lesson-${nn}.mp3`,
      songbook_url: SONGBOOK_URL,
    };
  });
}

/** True if a work_key/name belongs to the phonics pack (for media on the work detail). */
export function isPhonicsWork(workKeyOrName: string | null | undefined): boolean {
  if (!workKeyOrName) return false;
  return /^phonics_\d{2}$/.test(workKeyOrName) || /^Phonics \d{2}:/.test(workKeyOrName);
}

/** Media for a phonics work, matched by work_key or by name. Null if not a phonics work. */
export function phonicsMediaForWork(
  workKeyOrName: string | null | undefined
): { song_url: string; songbook_url: string } | null {
  if (!workKeyOrName) return null;
  const keyMatch = workKeyOrName.match(/^phonics_(\d{2})$/);
  const nameMatch = workKeyOrName.match(/^Phonics (\d{2}):/);
  const nn = keyMatch?.[1] ?? nameMatch?.[1];
  if (!nn) return null;
  return { song_url: `${AUDIO_BASE}lesson-${nn}.mp3`, songbook_url: SONGBOOK_URL };
}
