// /montree/library/dark-phonics/page.tsx
// Montree Library — Dark Phonics, the whole programme on one page.
//
// One card per lesson (5–53, 49 lessons): the song, the music video, the song
// card picture, the storybook, the easy reader and the printables — every
// asset that exists for that sound, in teaching order. This is the all-in-one
// replacement for the multi-tab hub at public/dark-phonics.html; the old hub
// stays put and now carries a banner pointing here.
//
// Hardcoded English, deliberately bypassing i18n — the same sanctioned
// exception as app/montree/library/satpin/page.tsx: the content itself IS
// English (the sounds, the catchphrases, the book titles), so translating the
// chrome around it would only make the page disagree with its own assets.
//
// Public: no auth. middleware.ts exempts /montree/library/*.
//
// Data sources, merged into LESSONS below — keep the four in step:
//   public/dark-phonics-playlist.html                                n / sound / title / catchphrase (canonical)
//   lib/montree/english-curriculum/spec/dark-phonics-hardcards.json  vocab words (46 of 49 — 33/34/46 are review/abstract)
//   scripts/curriculum/dark-phonics-storybooks/manifest.json         27 storybooks (book N = lesson N + 4)
//   public/dark-phonics-readers.html                                 the 11 easy readers + their gate lessons
//
// Media lives in the public `dark-phonics` Supabase bucket and is served
// through /api/montree/media/proxy/<path>?bucket=dark-phonics. WHICH lessons
// actually have a video / picture / flashcard is asked once on mount from
// /api/montree/phonics-videos (the same source the playlist page gates on) —
// anything missing shows a dashed placeholder instead of a broken player.
// Every player is preload="none" and every image loading="lazy": 49 cards must
// never pull a hundred media files on load.
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { getProxyUrl, getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

/** Zero-padded lesson number — every media object is named lesson-NN.<ext>. */
const nn = (n: number) => String(n).padStart(2, '0');

/** Media-proxy URL for a path inside the public `dark-phonics` bucket. */
const media = (path: string, v?: number) =>
  `/api/montree/media/proxy/${path}?bucket=dark-phonics${v ? `&v=${v}` : ''}`;

/**
 * Cache-buster for the storybook print PDFs served straight out of
 * public/dark-phonics-books/print/ and public/dark-phonics-materials/ — NOT
 * proxied, so they carry no built-in versioning of their own and are served
 * with a several-hour Cache-Control by both the browser and Cloudflare. Bump
 * this whenever ANY book's print PDF or materials are rebuilt (the curated
 * rebuild project touches every book eventually); a stale value here is
 * exactly the "book still shows the old art" bug filed 2026-08-02.
 */
const STORYBOOK_PRINT_VERSION = 2; // bumped 2026-08-02: Book 1 + Book 2 curated rebuild
const printPdf = (path: string) => `${path}?v=${STORYBOOK_PRINT_VERSION}`;

/** Trimmed-down photo-bank row — only the fields this page renders/forwards. */
interface BankPhoto {
  id: string;
  label: string;
  filename: string;
  storage_path: string;
  public_url: string;
  tags?: string[] | null;
}

/**
 * The 27 storybooks' own vocabulary, straight off
 * scripts/curriculum/dark-phonics-storybooks/manifest.json pages p1–p4 (the
 * picture word each page introduces), plus the frame noun every page repeats
 * — the container the word is dropped into ('sock', 'nest', 'igloo') or the
 * constant actor/object round which the pattern turns ('pig' ate a
 * pineapple/pen/pencil/pan; an owl/otter/ostrich/octopus ate an 'orange').
 * Book num 1 = lesson 5 … book 27 = lesson 31 — keep this in step with the
 * manifest. Two books (letter E, letter X) only have three picture words.
 */
const BOOK_VOCAB: Record<string, string[]> = {
  'snake-in-my-sock': ['snake', 'star', 'sloth', 'sock'],
  'ant-on-my-apple': ['ant', 'alligator', 'anteater', 'apple'],
  'tiger-in-the-taxi': ['turtle', 'tomato', 'toothbrush', 'tiger', 'taxi'],
  'pig-ate-a-pineapple': ['pineapple', 'pen', 'pencil', 'pan', 'pig'],
  'in-the-igloo': ['iguana', 'insect', 'inchworm', 'infant', 'igloo'],
  'not-in-my-nest': ['nut', 'net', 'nail', 'napkin', 'nest'],
  'monkey-in-my-mug': ['mouse', 'mushroom', 'magnet', 'monkey', 'mug'],
  'dinosaur-on-a-drum': ['dog', 'doll', 'duck', 'dinosaur', 'drum'],
  'oh-no-goat': ['grapes', 'gloves', 'gift', 'guitar', 'goat'],
  'owl-ate-an-orange': ['owl', 'otter', 'ostrich', 'octopus', 'orange'],
  'cow-on-the-car': ['cat', 'cup', 'comb', 'cow', 'car'],
  'koala-in-the-pocket': ['key', 'kite', 'kettle', 'koala', 'pocket'],
  'on-a-rock': ['duck', 'chick', 'clock', 'sock', 'rock'],
  'elephant-sat-on-the-egg': ['hen', 'eagle', 'elephant', 'egg'],
  'under-my-umbrella': ['unicorn', 'ukulele', 'unicycle', 'urchin', 'umbrella'],
  'rabbit-in-the-rocket': ['rabbit', 'robot', 'rose', 'ring', 'rocket'],
  'horse-in-my-hat': ['hen', 'hammer', 'heart', 'horse', 'hat'],
  'bear-in-the-boat': ['ball', 'banana', 'bell', 'bear', 'boat'],
  'frog-on-the-fan': ['frog', 'fish', 'feather', 'fork', 'fan'],
  'oh-no-lion': ['lemon', 'leaf', 'ladder', 'lizard', 'lion'],
  'jellyfish-in-the-jar': ['jug', 'jacket', 'jet', 'jellyfish', 'jar'],
  'volcano-in-the-van': ['violin', 'vase', 'vest', 'volcano', 'van'],
  'whale-in-the-wagon': ['worm', 'watch', 'wolf', 'whale', 'wagon'],
  'fox-in-a-box': ['fox', 'ox', 'xylophone', 'box'],
  'yak-on-the-yacht': ['yak', 'yam', 'yoyo', 'yarn', 'yacht'],
  'zzz-at-the-zoo': ['zebra', 'zipper', 'zucchini', 'zeppelin', 'zoo'],
  'queen-on-the-quilt': ['quill', 'quarter', 'quail', 'queen', 'quilt'],
};

/**
 * Each book's page keys, in manifest order — the sort key for the Book
 * Pictures row (label is "<slug> <key>", e.g. "snake-in-my-sock p1-snake",
 * so pN is parsed straight off the label) and the source of BOOK_VOCAB above.
 * scripts/curriculum/upload-dark-phonics-book-art.mjs ingests one photo per
 * key, tagged 'dark-phonics-book' + 'dark-phonics-book-<slug>'.
 */
const BOOK_PAGE_KEYS: Record<string, string[]> = {
  'snake-in-my-sock': ['p1-sock', 'p2-snake', 'p3-star', 'p4-sloth', 'p5-recap'],
  'ant-on-my-apple': ['p1-apple', 'p2-ant', 'p3-alligator', 'p4-anteater', 'p5-recap'],
  'tiger-in-the-taxi': ['p1-turtle', 'p2-tomato', 'p3-toothbrush', 'p4-tiger', 'p5-recap'],
  'pig-ate-a-pineapple': ['p1-pineapple', 'p2-pen', 'p3-pencil', 'p4-pan', 'p5-recap'],
  'in-the-igloo': ['p1-iguana', 'p2-insect', 'p3-inchworm', 'p4-infant', 'p5-recap'],
  'not-in-my-nest': ['p1-nut', 'p2-net', 'p3-nail', 'p4-napkin', 'p5-recap'],
  'monkey-in-my-mug': ['p1-mouse', 'p2-mushroom', 'p3-magnet', 'p4-monkey', 'p5-recap'],
  'dinosaur-on-a-drum': ['p1-dog', 'p2-doll', 'p3-duck', 'p4-dinosaur', 'p5-recap'],
  'oh-no-goat': ['p1-grapes', 'p2-gloves', 'p3-gift', 'p4-guitar', 'p5-recap'],
  'owl-ate-an-orange': ['p1-owl', 'p2-otter', 'p3-ostrich', 'p4-octopus', 'p5-recap'],
  'cow-on-the-car': ['p1-cat', 'p2-cup', 'p3-comb', 'p4-cow', 'p5-recap'],
  'koala-in-the-pocket': ['p1-key', 'p2-kite', 'p3-kettle', 'p4-koala', 'p5-recap'],
  'on-a-rock': ['p1-duck', 'p2-chick', 'p3-clock', 'p4-sock', 'p5-recap'],
  'elephant-sat-on-the-egg': ['p1-hen', 'p2-eagle', 'p3-elephant', 'p4-recap'],
  'under-my-umbrella': ['p1-unicorn', 'p2-ukulele', 'p3-unicycle', 'p4-urchin', 'p5-recap'],
  'rabbit-in-the-rocket': ['p1-rabbit', 'p2-robot', 'p3-rose', 'p4-ring', 'p5-recap'],
  'horse-in-my-hat': ['p1-hen', 'p2-hammer', 'p3-heart', 'p4-horse', 'p5-recap'],
  'bear-in-the-boat': ['p1-ball', 'p2-banana', 'p3-bell', 'p4-bear', 'p5-recap'],
  'frog-on-the-fan': ['p1-frog', 'p2-fish', 'p3-feather', 'p4-fork', 'p5-recap'],
  'oh-no-lion': ['p1-lemon', 'p2-leaf', 'p3-ladder', 'p4-lizard', 'p5-recap'],
  'jellyfish-in-the-jar': ['p1-jug', 'p2-jacket', 'p3-jet', 'p4-jellyfish', 'p5-recap'],
  'volcano-in-the-van': ['p1-violin', 'p2-vase', 'p3-vest', 'p4-volcano', 'p5-recap'],
  'whale-in-the-wagon': ['p1-worm', 'p2-watch', 'p3-wolf', 'p4-whale', 'p5-recap'],
  'fox-in-a-box': ['p1-fox', 'p2-ox', 'p3-xylophone', 'p4-recap'],
  'yak-on-the-yacht': ['p1-yak', 'p2-yam', 'p3-yoyo', 'p4-yarn', 'p5-recap'],
  'zzz-at-the-zoo': ['p1-zebra', 'p2-zipper', 'p3-zucchini', 'p4-zeppelin', 'p5-recap'],
  'queen-on-the-quilt': ['p1-quill', 'p2-quarter', 'p3-quail', 'p4-queen', 'p5-recap'],
};

/** Photo carries the 'dark-phonics-vocab' tag — top preference for a word chip's picture. */
function isDarkPhonicsVocabPhoto(photo: BankPhoto): boolean {
  return (photo.tags || []).some(t => String(t || '').trim().toLowerCase() === 'dark-phonics-vocab');
}

/** Photo is from the clean SATPIN object-basket set — second preference. */
function isSatpinBasketPhoto(photo: BankPhoto): boolean {
  const tagged = (photo.tags || []).some(t => String(t || '').trim().toLowerCase() === 'satpin-basket');
  return tagged || (photo.storage_path || '').startsWith('picture-bank/');
}

/**
 * Look one vocab word up in the Picture Bank and return the best exact-label
 * match: 'dark-phonics-vocab' first, then a SATPIN basket photo, then
 * whatever exact match sorts first.
 */
async function fetchVocabByLabel(word: string): Promise<BankPhoto | null> {
  try {
    const params = new URLSearchParams({ page: '1', limit: '20', kind: 'pictures', q: word });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const target = word.trim().toLowerCase();
    const exact = photos.filter(p => (p.label || '').trim().toLowerCase() === target);
    return exact.find(isDarkPhonicsVocabPhoto) || exact.find(isSatpinBasketPhoto) || exact[0] || null;
  } catch {
    return null;
  }
}

/**
 * A book's scene pictures — searched by slug, kept if tagged
 * 'dark-phonics-book-<slug>', sorted p1→p5 by the page number embedded in
 * the label ("<slug> p1-snake").
 */
async function fetchBookPictures(slug: string): Promise<BankPhoto[]> {
  try {
    const params = new URLSearchParams({ page: '1', limit: '20', kind: 'pictures', q: slug });
    const res = await fetch(`/api/montree/photo-bank?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    const photos: BankPhoto[] = data.photos || [];
    const tag = `dark-phonics-book-${slug}`;
    const matches = photos.filter(p => (p.tags || []).some(t => String(t || '').trim().toLowerCase() === tag));
    const pageNum = (label: string) => {
      const m = /p(\d+)-/.exec(label || '');
      return m ? parseInt(m[1], 10) : 999;
    };
    return matches.sort((a, b) => pageNum(a.label) - pageNum(b.label));
  } catch {
    return [];
  }
}

/** Photo-bank rows are rendered through the Cloudflare-cached proxy, never public_url. */
function photoSrc(photo: BankPhoto, width: number): string {
  if (!photo.storage_path) return photo.public_url || '';
  return getThumbnailUrl(photo.storage_path, width, 70, 'photo-bank');
}

type Book = {
  slug: string;
  title: string;
  /** Row description under the title. Defaults to the standard initial-sound-book blurb. */
  description?: string;
  /** Cover image override — a local /public path for books with no Supabase-bucket cover yet.
   *  Absent means "proxied from the dark-phonics bucket at books/covers/<slug>.png" (the 27-book default). */
  cover?: string;
  /** Set false for books that don't have the paperwork/tracing/three-part-card pack built yet
   *  (only the 27 curated Dark Phonics books do). Defaults to true. */
  materials?: boolean;
};
type Reader = { slug: string; title: string };

type RawLesson = {
  n: number;
  /** Letter, digraph or teaching label shown on the tile ('s', 'ck', 'short A'). */
  sound: string;
  title: string;
  catchphrase: string;
  /** Hard-card vocab. Absent for the three review/abstract lessons (33, 34, 46). */
  words?: string[];
  /** Storybooks — lessons 5–31 always carry at least one (book N of the 27 = lesson N + 4);
   *  a lesson can carry more than one (e.g. lesson 7 also has the hybrid SATPIN reader
   *  "The ___ Sat!"). Up to ~5 is the target once more books exist per lesson. */
  books?: Book[];
  /** Easy Reader gated at this lesson — 11 of the 49 carry one. */
  reader?: Reader;
};

type Lesson = RawLesson & { accent: string; tint: string };

/**
 * Card colours: Tailwind 400-level accent / 200-level tint, walked round the
 * hue wheel and cycled per lesson so no two neighbouring cards share a colour.
 */
const PALETTE: Array<[string, string]> = [
  ['52,211,153', '167,243,208'],   // emerald
  ['244,114,182', '251,207,232'],  // pink
  ['167,139,250', '221,214,254'],  // violet
  ['252,211,77', '253,230,138'],   // amber
  ['96,165,250', '191,219,254'],   // blue
  ['232,121,249', '245,208,254'],  // fuchsia
  ['74,222,128', '187,247,208'],   // green
  ['251,113,133', '254,205,211'],  // rose
  ['34,211,238', '165,243,252'],   // cyan
  ['251,146,60', '254,215,170'],   // orange
  ['129,140,248', '199,210,254'],  // indigo
  ['163,230,53', '217,249,157'],   // lime
];

/** The 49 lessons, in teaching order. Numbers are the curriculum's own (5–53). */
const RAW: RawLesson[] = [
  { n: 5, sound: 's', title: 'The Snake Says Ssss', catchphrase: '“snake in my sock!”', words: ['snake', 'sock'], books: [{ slug: 'snake-in-my-sock', title: 'Snake in My Sock' }] },
  { n: 6, sound: 'a', title: 'A Is for Apple', catchphrase: '“ant on my apple!”', words: ['ant', 'apple'], books: [{ slug: 'ant-on-my-apple', title: 'Ant on My Apple' }] },
  { n: 7, sound: 't', title: 'Tick-Tock, T!', catchphrase: '“tick-tock, stinky sock!”', words: ['clock', 'sock'], books: [
    { slug: 'tiger-in-the-taxi', title: 'A Tiger in the Taxi' },
    { slug: 'the-sat', title: 'The ___ Sat!', description: 'Hybrid decodable — teacher reads the set-up, the child shouts “Sat!” on every page.', cover: '/dark-phonics-books/covers/the-sat.png', materials: false },
  ] },
  { n: 8, sound: 'p', title: 'Pop, Pop, P!', catchphrase: '“pop, pop, puppy poop!”', words: ['pup'], books: [{ slug: 'pig-ate-a-pineapple', title: 'The Pig Ate a Pineapple' }] },
  { n: 9, sound: 'i', title: 'I, I, Itsy I', catchphrase: '“icky, sticky pig!”', words: ['pig'], books: [{ slug: 'in-the-igloo', title: 'In the Igloo' }] },
  { n: 10, sound: 'n', title: 'N for the Nose', catchphrase: '“no-no, nanny goat!”', words: ['goat'], books: [{ slug: 'not-in-my-nest', title: 'Not in My Nest!' }] },
  { n: 11, sound: 'm', title: 'Mmm, That\'s Good!', catchphrase: '“mmm, muddy monkey!”', words: ['monkey'], books: [{ slug: 'monkey-in-my-mug', title: 'A Monkey in My Mug' }] },
  { n: 12, sound: 'd', title: 'D for the Dog', catchphrase: '“dirty dog, dig dig dig!”', words: ['dog'], books: [{ slug: 'dinosaur-on-a-drum', title: 'A Dinosaur on a Drum' }] },
  { n: 13, sound: 'g', title: 'G for the Goat', catchphrase: '“goat got my gum!”', words: ['goat', 'gum'], books: [{ slug: 'oh-no-goat', title: 'Oh No, Goat…' }] },
  { n: 14, sound: 'o', title: 'O for the Octopus', catchphrase: '“hot dog on a log!”', words: ['hotdog', 'log'], books: [{ slug: 'owl-ate-an-orange', title: 'An Owl Ate an Orange' }] },
  { n: 15, sound: 'c', title: 'C for the Cat', catchphrase: '“cat ate my cookie!”', words: ['cat', 'cookie'], books: [{ slug: 'cow-on-the-car', title: 'A Cow on the Car' }] },
  { n: 16, sound: 'k', title: 'K Says It Too', catchphrase: '“kooky king kicks!”', words: ['king'], books: [{ slug: 'koala-in-the-pocket', title: 'A Koala in the Pocket' }] },
  { n: 17, sound: 'ck', title: 'Two Letters, One Kick', catchphrase: '“kick the stinky sock!”', words: ['sock'], books: [{ slug: 'on-a-rock', title: 'On a Rock' }], reader: { slug: 'the-cat-sat', title: 'The Cat Sat' } },
  { n: 18, sound: 'e', title: 'Crack the Egg, E!', catchphrase: '“ten messy hens!”', words: ['hen'], books: [{ slug: 'elephant-sat-on-the-egg', title: 'The Elephant Sat on the Egg' }] },
  { n: 19, sound: 'u', title: 'Up Goes the Umbrella', catchphrase: '“yummy bug in my cup!”', words: ['bug', 'cup'], books: [{ slug: 'under-my-umbrella', title: 'Under My Umbrella' }], reader: { slug: 'mud-pup', title: 'Mud Pup' } },
  { n: 20, sound: 'r', title: 'Rrr Goes the Engine', catchphrase: '“run, run, red rat!”', words: ['rat'], books: [{ slug: 'rabbit-in-the-rocket', title: 'A Rabbit in the Rocket' }] },
  { n: 21, sound: 'h', title: 'H, the Panting Pup', catchphrase: '“ha-ha, hairy hippo!”', words: ['hippo'], books: [{ slug: 'horse-in-my-hat', title: 'A Horse in My Hat' }] },
  { n: 22, sound: 'b', title: 'B for the Bobbing Boat', catchphrase: '“big baby burp!”', words: ['baby'], books: [{ slug: 'bear-in-the-boat', title: 'A Bear in the Boat' }], reader: { slug: 'hen-in-bed', title: 'Hen in Bed' } },
  { n: 23, sound: 'f', title: 'Ffff Like a Fan', catchphrase: '“funny fox in my fan!”', words: ['fox', 'fan'], books: [{ slug: 'frog-on-the-fan', title: 'A Frog on the Fan' }] },
  { n: 24, sound: 'l', title: 'La-La-La Goes L', catchphrase: '“lazy lion licks!”', words: ['lion'], books: [{ slug: 'oh-no-lion', title: 'Oh No, Lion…' }] },
  { n: 25, sound: 'j', title: 'Jump for J', catchphrase: '“jump in the jelly jam!”', words: ['jam'], books: [{ slug: 'jellyfish-in-the-jar', title: 'A Jellyfish in the Jar' }] },
  { n: 26, sound: 'v', title: 'Vvvv Goes the Van', catchphrase: '“vroom-vroom van!”', words: ['van'], books: [{ slug: 'volcano-in-the-van', title: 'A Volcano in the Van' }] },
  { n: 27, sound: 'w', title: 'W for the Windy Day', catchphrase: '“wiggly wet worm!”', words: ['worm'], books: [{ slug: 'whale-in-the-wagon', title: 'A Whale in the Wagon' }] },
  { n: 28, sound: 'x', title: 'X Marks the Box', catchphrase: '“six fox in a box!”', words: ['fox', 'box'], books: [{ slug: 'fox-in-a-box', title: 'A Fox in a Box' }], reader: { slug: 'fox-in-a-box', title: 'Fox in a Box' } },
  { n: 29, sound: 'y', title: 'Yes! Yum! Y!', catchphrase: '“yummy yellow yo-yo!”', words: ['yoyo'], books: [{ slug: 'yak-on-the-yacht', title: 'A Yak on the Yacht' }] },
  { n: 30, sound: 'z', title: 'Zzz Like a Buzzing Bee', catchphrase: '“zippy zebra, zzz!”', words: ['zebra'], books: [{ slug: 'zzz-at-the-zoo', title: 'Zzz at the Zoo' }] },
  { n: 31, sound: 'qu', title: 'The Queen Says Qu', catchphrase: '“quick quacky duck!”', words: ['duck'], books: [{ slug: 'queen-on-the-quilt', title: 'A Queen on the Quilt' }] },
  { n: 32, sound: 'review', title: 'All Our Sounds', catchphrase: '“cat, pig, dog - woof!”', words: ['cat', 'pig', 'dog'] },
  { n: 33, sound: 'review', title: 'The Five Little Vowels', catchphrase: '“a, e, i, o, u... achoo!”' },
  { n: 34, sound: 'review', title: 'We Know the Alphabet', catchphrase: '“a to z, easy-peasy!”' },
  { n: 35, sound: 'short A', title: 'Fast A!', catchphrase: '“fat cat in a hat!”', words: ['cat', 'hat'] },
  { n: 36, sound: 'short I', title: 'Quick Little I', catchphrase: '“big pig did a jig!”', words: ['pig'] },
  { n: 37, sound: 'short O', title: 'Round and Fast, O!', catchphrase: '“hop on a hot log!”', words: ['log'] },
  { n: 38, sound: 'short E', title: 'Steady E', catchphrase: '“wet pet in my bed!”', words: ['pet', 'bed'] },
  { n: 39, sound: 'short U', title: 'Sunny Fast U', catchphrase: '“big bug hug!”', words: ['bug'] },
  { n: 40, sound: 'minimal pairs', title: 'Cat? Cot? Cut?', catchphrase: '“cat? cot? cut? - which one!”', words: ['cat', 'cot', 'cut'], reader: { slug: 'cat-cot-cut', title: 'Cat? Cot? Cut?' } },
  { n: 41, sound: 'FLSZ doubling', title: 'Two at the End', catchphrase: '“buzz off, fuzzy bee!”', words: ['bee'], reader: { slug: 'the-bell-fell', title: 'The Bell Fell' } },
  { n: 42, sound: 'sh', title: 'Sh! Be Still', catchphrase: '“sheep go baba!”', words: ['sheep'] },
  { n: 43, sound: 'ch', title: 'Ch-Ch Goes the Train', catchphrase: '“cheeky little chick!”', words: ['chick'], reader: { slug: 'fish-and-chick', title: 'Fish and Chick' } },
  { n: 44, sound: 'th (voiceless)', title: 'Tongue Peeks Out', catchphrase: '“moth in my bath!”', words: ['moth', 'bath'] },
  { n: 45, sound: 'wh', title: 'the Asking Sound', catchphrase: '“wheee, big fat whale!”', words: ['whale'] },
  { n: 46, sound: 'th (voiced)', title: 'Now It Buzzes', catchphrase: '“this, that, this, that, BOO!”', reader: { slug: 'this-and-that', title: 'This and That' } },
  { n: 47, sound: 'ending blends', title: 'Snap It at the End', catchphrase: '“jump, jump, fast hands!”', words: ['hand'] },
  { n: 48, sound: 'ending blends', title: 'Pink, Tent, Belt', catchphrase: '“pink sock in the sink!”', words: ['sock', 'sink'], reader: { slug: 'jump-in-the-sand', title: 'Jump in the Sand' } },
  { n: 49, sound: 's-blends', title: 'S Blends Off We Go', catchphrase: '“slip, slip, slimy snail!”', words: ['snail'] },
  { n: 50, sound: 'l-blends', title: 'L Blends Hold On', catchphrase: '“clap, clap, silly clown!”', words: ['clown'] },
  { n: 51, sound: 'r-blends', title: 'R Blends, Strong and True', catchphrase: '“green frog on a drum!”', words: ['frog', 'drum'], reader: { slug: 'frog-and-crab', title: 'Frog and Crab' } },
  { n: 52, sound: 'tw / dw blends', title: 'Twist and Twirl', catchphrase: '“two twins twist!”', words: ['twins'] },
  { n: 53, sound: 'triple blends', title: 'Three Sounds Strong', catchphrase: '“big splash, scrub-a-dub!”', words: ['splash'], reader: { slug: 'big-splash', title: 'Big Splash' } },
];

/** Same list, with a colour stamped on each card. */
const LESSONS: Lesson[] = RAW.map((l, i) => ({
  ...l,
  accent: PALETTE[i % PALETTE.length][0],
  tint: PALETTE[i % PALETTE.length][1],
}));

/** The tile holds anything from 's' to 'tw / dw blends' — shrink to fit. */
function soundClass(sound: string): string {
  if (sound.length <= 2) return 'text-3xl font-bold leading-none';
  if (sound.length <= 6) return 'text-base font-bold leading-tight text-center';
  return 'text-[9px] font-bold leading-tight text-center uppercase tracking-wide';
}

/** What /api/montree/phonics-videos hands back: lesson numbers per asset kind. */
type MediaIndex = { uploaded: number[]; pictures: number[]; flashcards: number[] };

export default function DarkPhonicsPage() {
  const router = useRouter();
  /** null until the existence check returns — nothing media-gated renders before then. */
  const [index, setIndex] = useState<MediaIndex | null>(null);
  /** Vocab-word pictures, keyed by lowercase word — one flat map, deduped
   *  across all 27 books' BOOK_VOCAB (a few words like 'sock' and 'hen'
   *  repeat across books and are only ever fetched once). */
  const [vocabPictures, setVocabPictures] = useState<Record<string, BankPhoto>>({});
  const [picturesLoading, setPicturesLoading] = useState(true);
  /** Book scene pictures, keyed by slug — one fetch per book. */
  const [bookPictures, setBookPictures] = useState<Record<string, BankPhoto[]>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/phonics-videos');
        if (!res.ok) return;
        const j = await res.json();
        if (cancelled) return;
        setIndex({
          uploaded: Array.isArray(j?.uploaded) ? j.uploaded : [],
          pictures: Array.isArray(j?.pictures) ? j.pictures : [],
          flashcards: Array.isArray(j?.flashcards) ? j.flashcards : [],
        });
      } catch {
        /* endpoint unreachable — the gated rows just stay as placeholders */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Vocab pictures — one de-duped Set of every word across all 27 books'
  // BOOK_VOCAB, fetched in a single batched Promise.all (same shape as
  // satpin/page.tsx's picture effect).
  useEffect(() => {
    let cancelled = false;
    const labels = Array.from(new Set(Object.values(BOOK_VOCAB).flat().map(w => w.toLowerCase())));
    (async () => {
      const found = await Promise.all(labels.map(async (label) => [label, await fetchVocabByLabel(label)] as const));
      if (cancelled) return;
      const map: Record<string, BankPhoto> = {};
      for (const [label, photo] of found) {
        if (photo) map[label] = photo;
      }
      setVocabPictures(map);
      setPicturesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Book scene pictures — one fetch per book slug, batched.
  useEffect(() => {
    let cancelled = false;
    const slugs = Array.from(new Set(LESSONS.flatMap(l => (l.books ?? []).map(b => b.slug))));
    (async () => {
      const found = await Promise.all(slugs.map(async (slug) => [slug, await fetchBookPictures(slug)] as const));
      if (cancelled) return;
      const map: Record<string, BankPhoto[]> = {};
      for (const [slug, photos] of found) map[slug] = photos;
      setBookPictures(map);
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Hand a set of pictures to the Picture Library hub. Uses the
   * `photoBankPreselect` key — deliberately NOT `photoBankExport`, which the
   * creation tools consume-and-delete on mount. Copied verbatim from
   * app/montree/library/satpin/page.tsx.
   */
  const createMaterials = useCallback((photos: BankPhoto[]) => {
    if (photos.length === 0) return;
    const payload = photos.map(p => ({
      id: p.id,
      label: p.label,
      public_url: p.storage_path ? getProxyUrl(p.storage_path, 'photo-bank') : p.public_url,
      filename: p.filename,
    }));
    try {
      sessionStorage.setItem('photoBankPreselect', JSON.stringify({ photos: payload }));
    } catch (err) {
      console.error('Failed to stage Dark Phonics pictures:', err);
      return;
    }
    router.push('/montree/library/photo-bank');
  }, [router]);

  const has = (kind: keyof MediaIndex, n: number) => !!index && index[kind].includes(n);

  /** Slim dashed row — every "not made yet" slot on the page. */
  const EmptySlot = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-3 rounded-xl border border-dashed border-white/[0.06] px-4 py-2.5 text-center">
      <span className="text-white/20 text-xs">{children}</span>
    </div>
  );

  /** Standard sub-row: accent-tinted shell with an uppercase eyebrow label. */
  const Row = ({ accent, label, right, children }: {
    accent: string;
    label: string;
    right?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div
      className="mt-3 rounded-xl border px-4 py-3 text-left"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: `rgba(${accent},0.16)` }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="text-white/25 text-[10px] tracking-wider uppercase">{label}</div>
        {right}
      </div>
      {children}
    </div>
  );

  /** Neutral pill link — downloads, PDFs, readers. */
  const Pill = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-2 rounded-lg border text-xs transition-all hover:bg-white/[0.06]"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}
    >
      {children}
    </a>
  );

  /** 5-col thumbnail grid + hand-off for a book's own word chips. */
  const VocabPictureRow = ({ words, accent }: { words: string[]; accent: string }) => {
    const photos = words.map(w => vocabPictures[w.toLowerCase()]).filter(Boolean) as BankPhoto[];
    return (
      <div className="mt-4">
        <div className="grid grid-cols-5 gap-2">
          {words.map((w) => {
            const photo = vocabPictures[w.toLowerCase()];
            return (
              <div
                key={w}
                className="rounded-lg overflow-hidden border"
                style={{ borderColor: `rgba(${accent},0.16)`, background: 'rgba(255,255,255,0.04)' }}
                title={w}
              >
                <div className="aspect-square flex items-center justify-center">
                  {photo ? (
                    <img
                      src={photoSrc(photo, 240)}
                      srcSet={photo.storage_path ? getThumbnailSrcSet(photo.storage_path, 120, 70, 'photo-bank') : undefined}
                      sizes="(max-width: 640px) 18vw, 120px"
                      alt={w}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white/15 text-[10px] px-1 text-center leading-tight">
                      {picturesLoading ? '…' : 'no picture'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => createMaterials(photos)}
          disabled={photos.length === 0}
          className="mt-3 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: `rgba(${accent},0.35)`,
            background: `rgba(${accent},0.10)`,
            color: `rgb(${accent})`,
          }}
        >
          Create materials with these pictures →
        </button>
      </div>
    );
  };

  /** 5-col thumbnail grid + hand-off for a book's scene pictures. */
  const BookPictureRow = ({ slug, accent }: { slug: string; accent: string }) => {
    const photos = bookPictures[slug] || [];
    return (
      <div className="mt-4">
        <div className="text-white/30 text-xs mb-2 text-left">Book pictures — from the book</div>
        <div className="grid grid-cols-5 gap-2">
          {photos.length > 0 ? photos.map((photo) => (
            <div
              key={photo.id}
              className="rounded-lg overflow-hidden border"
              style={{ borderColor: `rgba(${accent},0.16)`, background: 'rgba(255,255,255,0.04)' }}
              title={photo.label}
            >
              <div className="aspect-square flex items-center justify-center">
                <img
                  src={photoSrc(photo, 240)}
                  srcSet={photo.storage_path ? getThumbnailSrcSet(photo.storage_path, 120, 70, 'photo-bank') : undefined}
                  sizes="(max-width: 640px) 18vw, 120px"
                  alt={photo.label}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )) : (
            <span className="col-span-5 text-white/15 text-[10px] text-center py-3">
              {picturesLoading ? '…' : 'no pictures yet'}
            </span>
          )}
        </div>
        <button
          onClick={() => createMaterials(photos)}
          disabled={photos.length === 0}
          className="mt-3 w-full px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: `rgba(${accent},0.35)`,
            background: `rgba(${accent},0.10)`,
            color: `rgb(${accent})`,
          }}
        >
          Create materials with these pictures →
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#06140e' }}>

      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
          radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
          linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
        `,
      }} />

      <nav
        className="relative z-10 px-6 pb-5 flex items-center justify-between gap-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <Link href="/montree/library" className="text-white/40 text-sm hover:text-white/70 transition-colors shrink-0">
          ← Library
        </Link>
        <div className="flex items-center gap-3 shrink-0">
          {/* The star of the nav: every song, back to back, no tapping. */}
          <a
            href="/dark-phonics-playlist.html"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, rgba(167,139,250,0.28), rgba(124,58,237,0.16))',
              borderColor: 'rgba(167,139,250,0.45)',
              color: 'rgb(221,214,254)',
            }}
          >
            ▶ Full Playlist
          </a>
          <LanguageToggle />
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex justify-center px-4 sm:px-6 pb-8">
        <div className="max-w-3xl w-full text-center">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-white/50 text-xs tracking-wide uppercase">49 Sound-Songs</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            <span style={{ background: 'linear-gradient(135deg, #c4b5fd, #a78bfa, #ddd6fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Dark Phonics
            </span>
          </h1>

          <p className="text-white/40 mt-5 text-lg max-w-lg mx-auto leading-relaxed">
            The whole programme on one page — lessons 5 to 53, in teaching order.
            Song, music video, song card, storybook, easy reader and printables,
            all in the one card per sound.
          </p>

          <p className="text-white/25 mt-3 text-sm max-w-md mx-auto leading-relaxed">
            Daily rhythm, ten minutes: sing the song &middot; flash the cards &middot; done.
          </p>

          {/* One card per lesson */}
          <div className="mt-8 space-y-4">
            {LESSONS.map((l) => {
              const song = media(`songs/lesson-${nn(l.n)}.mp3`);
              const video = media(`videos/lesson-${nn(l.n)}.mp4`);
              const picture = media(`pictures/lesson-${nn(l.n)}.png`);

              return (
                <div
                  key={l.n}
                  className="rounded-2xl border p-4 sm:p-6"
                  style={{
                    background: `linear-gradient(135deg, rgba(${l.accent},0.09), rgba(${l.accent},0.02))`,
                    borderColor: `rgba(${l.accent},0.18)`,
                  }}
                >
                  {/* Sound tile + lesson line + catchphrase */}
                  <div className="flex items-center gap-4 sm:gap-5">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 px-1"
                      style={{ background: `rgba(${l.accent},0.16)` }}
                    >
                      <span className={soundClass(l.sound)} style={{ color: `rgb(${l.accent})` }}>
                        {l.sound}
                      </span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-white font-semibold text-base sm:text-lg">
                        Lesson {l.n} — {l.title}
                      </div>
                      <div className="text-sm mt-0.5" style={{ color: `rgba(${l.tint},0.5)` }}>
                        {l.catchphrase}
                      </div>
                    </div>
                  </div>

                  {/* Word chips — the book's own picture words + frame noun
                      for lessons 5–31 (BOOK_VOCAB), the hard-card vocab for
                      every other lesson. */}
                  {(() => {
                    const firstBook = l.books?.[0];
                    const chipWords = firstBook ? (BOOK_VOCAB[firstBook.slug] ?? l.words ?? []) : (l.words ?? []);
                    return chipWords.length > 0 ? (
                      <>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {chipWords.map((w) => (
                            <span
                              key={w}
                              className="px-3 py-1.5 rounded-full text-sm"
                              style={{
                                background: `rgba(${l.accent},0.12)`,
                                border: `1px solid rgba(${l.accent},0.22)`,
                                color: `rgba(${l.tint},0.85)`,
                              }}
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                        {/* Vocab pictures — only for the 27 book lessons */}
                        {firstBook && <VocabPictureRow words={chipWords} accent={l.accent} />}
                      </>
                    ) : (
                      <div className="mt-4 text-left text-[11px] text-white/20">
                        Review lesson &middot; no new vocab words
                      </div>
                    );
                  })()}

                  {/* SONG — every lesson has one */}
                  <Row
                    accent={l.accent}
                    label="Song"
                    right={<Pill href={song}>Download</Pill>}
                  >
                    <audio
                      controls
                      preload="none"
                      src={song}
                      className="w-full h-9"
                      style={{ colorScheme: 'dark' }}
                    />
                  </Row>

                  {/* MUSIC VIDEO — only where the mp4 is actually uploaded */}
                  {has('uploaded', l.n) ? (
                    <Row
                      accent={l.accent}
                      label="Music video"
                      right={<Pill href={video}>Download</Pill>}
                    >
                      <video
                        controls
                        playsInline
                        preload="none"
                        src={video}
                        poster={has('pictures', l.n) ? picture : undefined}
                        className="w-full rounded-lg"
                        style={{ aspectRatio: '16 / 9', background: '#000' }}
                      />
                    </Row>
                  ) : (
                    <EmptySlot>Music video — coming soon</EmptySlot>
                  )}

                  {/* SONG CARD — the picture the flashcards are cut from */}
                  {has('pictures', l.n) ? (
                    <Row
                      accent={l.accent}
                      label="Song card"
                      right={<Pill href={picture}>Full size</Pill>}
                    >
                      <a href={picture} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={picture}
                          alt={`Lesson ${l.n} song card`}
                          loading="lazy"
                          className="rounded-lg w-full max-w-[240px]"
                          style={{ background: '#0e0e16' }}
                        />
                      </a>
                    </Row>
                  ) : (
                    <EmptySlot>Song card — coming soon</EmptySlot>
                  )}

                  {/* STORYBOOK(S) — lessons 5–31 always carry at least one; a lesson
                      can carry more than one (target: up to ~5 per lesson). */}
                  {l.books?.map((book, bi) => (
                    <Row
                      key={book.slug}
                      accent={l.accent}
                      label={l.books!.length > 1 ? `Story book ${bi + 1}` : 'Story book'}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={book.cover ?? media(`books/covers/${book.slug}.png`, 3)}
                          alt={book.title}
                          loading="lazy"
                          className="w-16 rounded-md shrink-0"
                          style={{ background: '#0e0e16' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 font-medium text-sm">{book.title}</div>
                          <div className="text-white/35 text-xs mt-0.5 leading-relaxed">
                            {book.description ?? 'Initial-sound pattern book — the child shouts the picture word.'}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Pill href={printPdf(`/dark-phonics-books/print/${book.slug}-A5-reading.pdf`)}>Read-along</Pill>
                            <Pill href={printPdf(`/dark-phonics-books/print/${book.slug}-A5-booklet-print.pdf`)}>Print booklet A5</Pill>
                          </div>
                        </div>
                      </div>

                      {/* Book scene pictures + their own hand-off */}
                      <BookPictureRow slug={book.slug} accent={l.accent} />
                    </Row>
                  ))}

                  {/* EASY READER — only on the 11 gate lessons */}
                  {l.reader && (
                    <Row accent={l.accent} label="Easy reader · 100% decodable">
                      <div className="flex flex-wrap gap-2">
                        <Pill href={media(`readers/${l.reader.slug}.pdf`, 3)}>
                          📗 {l.reader.title}
                        </Pill>
                      </div>
                    </Row>
                  )}

                  {/* PRINTABLES — flashcard deck + vocab card pack, plus the
                      full paperwork/three-part-card family for the 27 book
                      lessons (public/dark-phonics-materials/<slug>/, built
                      by the satpin printable generators). */}
                  {has('flashcards', l.n) || (l.words && l.words.length > 0) || (l.books && l.books.length > 0) ? (
                    <Row accent={l.accent} label="Printables">
                      <div className="flex flex-wrap gap-2">
                        {has('flashcards', l.n) && (
                          <Pill href={media(`flashcards/lesson-${nn(l.n)}.pdf`)}>Letter card PDF</Pill>
                        )}
                        {l.words && l.words.length > 0 && (
                          <Pill href={media(`vocab-packs/lesson-${nn(l.n)}.pdf`)}>Vocab cards</Pill>
                        )}
                        {l.books?.filter(b => b.materials !== false).map(book => (
                          <React.Fragment key={book.slug}>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/paperwork-pack.pdf`)}>Paperwork pack</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/build-it-sheet.pdf`)}>Build-it sheet</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/tracing-workbook.pdf`)}>Tracing workbook</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/sentence-strips.pdf`)}>Sentence strips</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/three-part-cards-control.pdf`)}>Three-part cards · Control</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/three-part-cards-pictures.pdf`)}>Three-part cards · Pictures</Pill>
                            <Pill href={printPdf(`/dark-phonics-materials/${book.slug}/three-part-cards-labels.pdf`)}>Three-part cards · Labels</Pill>
                          </React.Fragment>
                        ))}
                      </div>
                    </Row>
                  ) : (
                    <EmptySlot>Printables — coming soon</EmptySlot>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-white/30 mt-12 text-sm leading-relaxed max-w-md mx-auto">
            One silly song per sound, in teaching order. Sing it every day for a week —
            the repetition is the whole trick.
          </p>

        </div>
      </div>

      <div className="relative z-10 px-6 py-5 text-center">
        <p className="text-white/20 text-xs tracking-wider uppercase">
          Sound first &middot; Letters follow
        </p>
      </div>
    </div>
  );
}
