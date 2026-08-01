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

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import LanguageToggle from '@/components/montree/LanguageToggle';

/** Zero-padded lesson number — every media object is named lesson-NN.<ext>. */
const nn = (n: number) => String(n).padStart(2, '0');

/** Media-proxy URL for a path inside the public `dark-phonics` bucket. */
const media = (path: string, v?: number) =>
  `/api/montree/media/proxy/${path}?bucket=dark-phonics${v ? `&v=${v}` : ''}`;

type Book = { slug: string; title: string };
type Reader = { slug: string; title: string };

type RawLesson = {
  n: number;
  /** Letter, digraph or teaching label shown on the tile ('s', 'ck', 'short A'). */
  sound: string;
  title: string;
  catchphrase: string;
  /** Hard-card vocab. Absent for the three review/abstract lessons (33, 34, 46). */
  words?: string[];
  /** Storybook — lessons 5–31 only (book N of the 27 = lesson N + 4). */
  book?: Book;
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
  { n: 5, sound: 's', title: 'The Snake Says Ssss', catchphrase: '“snake in my sock!”', words: ['snake', 'sock'], book: { slug: 'snake-in-my-sock', title: 'Snake in My Sock' } },
  { n: 6, sound: 'a', title: 'A Is for Apple', catchphrase: '“ant on my apple!”', words: ['ant', 'apple'], book: { slug: 'ant-on-my-apple', title: 'Ant on My Apple' } },
  { n: 7, sound: 't', title: 'Tick-Tock, T!', catchphrase: '“tick-tock, stinky sock!”', words: ['clock', 'sock'], book: { slug: 'tiger-in-the-taxi', title: 'A Tiger in the Taxi' } },
  { n: 8, sound: 'p', title: 'Pop, Pop, P!', catchphrase: '“pop, pop, puppy poop!”', words: ['pup'], book: { slug: 'pig-ate-a-pineapple', title: 'The Pig Ate a Pineapple' } },
  { n: 9, sound: 'i', title: 'I, I, Itsy I', catchphrase: '“icky, sticky pig!”', words: ['pig'], book: { slug: 'in-the-igloo', title: 'In the Igloo' } },
  { n: 10, sound: 'n', title: 'N for the Nose', catchphrase: '“no-no, nanny goat!”', words: ['goat'], book: { slug: 'not-in-my-nest', title: 'Not in My Nest!' } },
  { n: 11, sound: 'm', title: 'Mmm, That\'s Good!', catchphrase: '“mmm, muddy monkey!”', words: ['monkey'], book: { slug: 'monkey-in-my-mug', title: 'A Monkey in My Mug' } },
  { n: 12, sound: 'd', title: 'D for the Dog', catchphrase: '“dirty dog, dig dig dig!”', words: ['dog'], book: { slug: 'dinosaur-on-a-drum', title: 'A Dinosaur on a Drum' } },
  { n: 13, sound: 'g', title: 'G for the Goat', catchphrase: '“goat got my gum!”', words: ['goat', 'gum'], book: { slug: 'oh-no-goat', title: 'Oh No, Goat…' } },
  { n: 14, sound: 'o', title: 'O for the Octopus', catchphrase: '“hot dog on a log!”', words: ['hotdog', 'log'], book: { slug: 'owl-ate-an-orange', title: 'An Owl Ate an Orange' } },
  { n: 15, sound: 'c', title: 'C for the Cat', catchphrase: '“cat ate my cookie!”', words: ['cat', 'cookie'], book: { slug: 'cow-on-the-car', title: 'A Cow on the Car' } },
  { n: 16, sound: 'k', title: 'K Says It Too', catchphrase: '“kooky king kicks!”', words: ['king'], book: { slug: 'koala-in-the-pocket', title: 'A Koala in the Pocket' } },
  { n: 17, sound: 'ck', title: 'Two Letters, One Kick', catchphrase: '“kick the stinky sock!”', words: ['sock'], book: { slug: 'on-a-rock', title: 'On a Rock' }, reader: { slug: 'the-cat-sat', title: 'The Cat Sat' } },
  { n: 18, sound: 'e', title: 'Crack the Egg, E!', catchphrase: '“ten messy hens!”', words: ['hen'], book: { slug: 'elephant-sat-on-the-egg', title: 'The Elephant Sat on the Egg' } },
  { n: 19, sound: 'u', title: 'Up Goes the Umbrella', catchphrase: '“yummy bug in my cup!”', words: ['bug', 'cup'], book: { slug: 'under-my-umbrella', title: 'Under My Umbrella' }, reader: { slug: 'mud-pup', title: 'Mud Pup' } },
  { n: 20, sound: 'r', title: 'Rrr Goes the Engine', catchphrase: '“run, run, red rat!”', words: ['rat'], book: { slug: 'rabbit-in-the-rocket', title: 'A Rabbit in the Rocket' } },
  { n: 21, sound: 'h', title: 'H, the Panting Pup', catchphrase: '“ha-ha, hairy hippo!”', words: ['hippo'], book: { slug: 'horse-in-my-hat', title: 'A Horse in My Hat' } },
  { n: 22, sound: 'b', title: 'B for the Bobbing Boat', catchphrase: '“big baby burp!”', words: ['baby'], book: { slug: 'bear-in-the-boat', title: 'A Bear in the Boat' }, reader: { slug: 'hen-in-bed', title: 'Hen in Bed' } },
  { n: 23, sound: 'f', title: 'Ffff Like a Fan', catchphrase: '“funny fox in my fan!”', words: ['fox', 'fan'], book: { slug: 'frog-on-the-fan', title: 'A Frog on the Fan' } },
  { n: 24, sound: 'l', title: 'La-La-La Goes L', catchphrase: '“lazy lion licks!”', words: ['lion'], book: { slug: 'oh-no-lion', title: 'Oh No, Lion…' } },
  { n: 25, sound: 'j', title: 'Jump for J', catchphrase: '“jump in the jelly jam!”', words: ['jam'], book: { slug: 'jellyfish-in-the-jar', title: 'A Jellyfish in the Jar' } },
  { n: 26, sound: 'v', title: 'Vvvv Goes the Van', catchphrase: '“vroom-vroom van!”', words: ['van'], book: { slug: 'volcano-in-the-van', title: 'A Volcano in the Van' } },
  { n: 27, sound: 'w', title: 'W for the Windy Day', catchphrase: '“wiggly wet worm!”', words: ['worm'], book: { slug: 'whale-in-the-wagon', title: 'A Whale in the Wagon' } },
  { n: 28, sound: 'x', title: 'X Marks the Box', catchphrase: '“six fox in a box!”', words: ['fox', 'box'], book: { slug: 'fox-in-a-box', title: 'A Fox in a Box' }, reader: { slug: 'fox-in-a-box', title: 'Fox in a Box' } },
  { n: 29, sound: 'y', title: 'Yes! Yum! Y!', catchphrase: '“yummy yellow yo-yo!”', words: ['yoyo'], book: { slug: 'yak-on-the-yacht', title: 'A Yak on the Yacht' } },
  { n: 30, sound: 'z', title: 'Zzz Like a Buzzing Bee', catchphrase: '“zippy zebra, zzz!”', words: ['zebra'], book: { slug: 'zzz-at-the-zoo', title: 'Zzz at the Zoo' } },
  { n: 31, sound: 'qu', title: 'The Queen Says Qu', catchphrase: '“quick quacky duck!”', words: ['duck'], book: { slug: 'queen-on-the-quilt', title: 'A Queen on the Quilt' } },
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
  /** null until the existence check returns — nothing media-gated renders before then. */
  const [index, setIndex] = useState<MediaIndex | null>(null);

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

                  {/* Word chips — the lesson's hard-card vocab */}
                  {l.words && l.words.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {l.words.map((w) => (
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
                  ) : (
                    <div className="mt-4 text-left text-[11px] text-white/20">
                      Review lesson &middot; no new vocab words
                    </div>
                  )}

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

                  {/* STORYBOOK — lessons 5–31 only */}
                  {l.book && (
                    <Row accent={l.accent} label="Story book">
                      <div className="flex items-start gap-3">
                        <img
                          src={media(`books/covers/${l.book.slug}.png`, 3)}
                          alt={l.book.title}
                          loading="lazy"
                          className="w-16 rounded-md shrink-0"
                          style={{ background: '#0e0e16' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/90 font-medium text-sm">{l.book.title}</div>
                          <div className="text-white/35 text-xs mt-0.5 leading-relaxed">
                            Initial-sound pattern book — the child shouts the picture word.
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Pill href={`/dark-phonics-books/print/${l.book.slug}-A5-reading.pdf`}>Read-along</Pill>
                            <Pill href={`/dark-phonics-books/print/${l.book.slug}-A5-booklet-print.pdf`}>Print booklet A5</Pill>
                          </div>
                        </div>
                      </div>
                    </Row>
                  )}

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

                  {/* PRINTABLES — flashcard deck + vocab card pack */}
                  {has('flashcards', l.n) || (l.words && l.words.length > 0) ? (
                    <Row accent={l.accent} label="Printables">
                      <div className="flex flex-wrap gap-2">
                        {has('flashcards', l.n) && (
                          <Pill href={media(`flashcards/lesson-${nn(l.n)}.pdf`)}>Letter card PDF</Pill>
                        )}
                        {l.words && l.words.length > 0 && (
                          <Pill href={media(`vocab-packs/lesson-${nn(l.n)}.pdf`)}>Vocab cards</Pill>
                        )}
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
