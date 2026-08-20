// app/play/week/[n]/page.tsx
// One week of DARK PHONICS, for a parent at home. PUBLIC — no login, no
// session: a parent taps a card on /play (or a QR code) and lands here.
// ENGLISH ONLY, on purpose (Tredoux, Aug 20 2026).
//
// 🚨 SERVER COMPONENT ON PURPOSE, and the lock is enforced HERE, server-side,
// from the SERVER's clock. A locked week renders a friendly "opens on…" page
// and NOTHING of the lesson — not the title, not the sound, not a media URL —
// so changing the phone's date, or guessing /play/week/40, reveals nothing.
//
// 🚨 NO CONTENT IS AUTHORED IN THIS FILE. Every word on the page that is about
// a lesson comes from lib/montree/dark-phonics/lessons.ts (via the weekly
// schedule and the live-lesson media helpers). The only prose here is the
// parent coaching, which is about HOW to use the lesson, not what it contains.
//
// MEDIA: the same public bucket + proxy the library page uses —
// /api/montree/media/proxy/<path>?bucket=dark-phonics. That route serves the
// public `dark-phonics` bucket unauthenticated and is never touched by the
// auth middleware (every /api/* path returns early; /api/montree/* is not in
// the admin-JWT list), so these assets load for a signed-out parent.
//
// ROUTING: /play is in middleware.ts publicPaths, and the match is
// `pathname === path || pathname.startsWith(path + '/')` — so /play/week/3
// is public through the '/play' entry. No middleware change was needed.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { nn } from '@/lib/montree/dark-phonics/lessons';
import { getLiveLesson, lessonPictureUrl, mediaProxyUrl } from '@/lib/montree/dark-phonics/live-lesson';
import { TOTAL_WEEKS, formatUnlockDate, weekForLesson } from '@/lib/games/weekly-schedule';
import { BookCover, LessonSong } from '../../_components/LessonMedia';

// The unlock instant must be evaluated per request, never baked into a static
// HTML file at build time.
export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ n: string }> };

/** '3' → 3, and anything else → null (a hand-typed /play/week/abc 404s). */
function parseWeek(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= TOTAL_WEEKS ? n : null;
}

/**
 * 's' → 'Ss', 'sh' → 'Sh sh'. Teaching labels that are not letters
 * ('short A', 'minimal pairs', 'review') are shown as they are, with no
 * phoneme slashes — /minimal pairs/ would be nonsense.
 */
function letterForms(sound: string): { big: string; phoneme: string | null } {
  if (!/^[a-z]{1,2}$/.test(sound)) return { big: sound, phoneme: null };
  const big =
    sound.length === 1
      ? `${sound.toUpperCase()}${sound}`
      : `${sound[0].toUpperCase()}${sound.slice(1)} ${sound}`;
  return { big, phoneme: `/${sound}/` };
}

/** `words` + `decodable`, in that order, deduped case-insensitively. */
function practiceWords(words?: string[], decodable?: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of [...(words ?? []), ...(decodable ?? [])]) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

export async function generateMetadata({ params }: PageProps) {
  const n = parseWeek((await params).n);
  const info = n === null ? null : weekForLesson(n, new Date());
  // A locked week's title is content too — keep it out of the tab, the share
  // card and the search result, exactly as the page body does.
  if (!info || !info.unlocked) {
    return { title: `Week ${n ?? ''} · Whale Class Phonics at Home`.trim() };
  }
  return {
    title: `Week ${info.week}: ${info.title} · Phonics at Home`,
    description: `${info.catchphrase} — the song, the words and the books for week ${info.week}.`,
  };
}

/** The page wash + header, shared by the real page and the locked page. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/play"
            className="w-9 h-9 shrink-0 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg"
            aria-label="All weeks"
          >
            ‹
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">Phonics at Home</p>
            <p className="text-xs text-blue-100">Whale Class · Dark Phonics</p>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

/** A titled white card — every content block on this page is one. */
function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white border border-slate-200 shadow-sm px-5 py-5">
      {title && (
        <h2 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">{title}</h2>
      )}
      {children}
    </section>
  );
}

export default async function PlayWeekPage({ params }: PageProps) {
  const n = parseWeek((await params).n);
  if (n === null) notFound();

  const now = new Date();
  const info = weekForLesson(n, now);
  if (!info) notFound();

  // ── THE GATE ────────────────────────────────────────────────────────────
  // Locked weeks stop here, before a single lesson field is read. Nothing
  // below this line runs, so nothing below it can leak.
  if (!info.unlocked) {
    return (
      <Shell>
        <main className="max-w-2xl mx-auto px-4 py-10 pb-16">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm px-6 py-10 text-center">
            <div className="text-5xl mb-4" aria-hidden="true">
              🔒
            </div>
            <h1 className="text-2xl font-black text-slate-900">Week {info.week} isn’t open yet</h1>
            <p className="mt-3 text-slate-600 leading-relaxed">
              This week opens on{' '}
              <span className="font-bold text-slate-900">
                {info.unlockDate ? formatUnlockDate(info.unlockDate) : 'a later date'}
              </span>
              , the same week your child learns it in class. Come back then — everything will be
              waiting for you.
            </p>
            <Link
              href="/play"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 py-3 shadow-md"
            >
              Go to this week <span aria-hidden="true">→</span>
            </Link>
          </div>
        </main>
      </Shell>
    );
  }

  // ── The lesson ──────────────────────────────────────────────────────────
  // getLiveLesson() takes the DISPLAY number and converts to the curriculum's
  // own `n` internally; media keys use info.rawN (5–53), never info.week.
  const lesson = getLiveLesson(info.week);
  const { big, phoneme } = letterForms(info.sound);
  const words = practiceWords(lesson?.words, lesson?.decodable);
  const heartWords = lesson?.heartWords ?? [];
  const books = lesson?.books ?? [];

  const videoSrc = mediaProxyUrl(`videos/lesson-${nn(info.rawN)}.mp4`);
  const pictureSrc = lessonPictureUrl(info.week);

  const prev = info.week > 1 ? weekForLesson(info.week - 1, now) : null;
  const next = info.week < TOTAL_WEEKS ? weekForLesson(info.week + 1, now) : null;

  return (
    <Shell>
      <main className="max-w-2xl mx-auto px-4 py-6 pb-12 space-y-5">
        {/* Title */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-500">
            Week {info.week} of {TOTAL_WEEKS}
          </p>
          <h1 className="text-3xl font-black text-slate-900 leading-tight">{info.title}</h1>
        </div>

        {/* THE INTERACTIVE PLAYER — weeks 1–4 only, because those are the only
            lessons the player currently ships. Raise the bound as more are
            built.
            🚨 The player has NO URL-based lesson selection — no ?lesson=n, no
            hash route — so every week links to the same front door and the
            parent picks the lesson inside it. If it ever gains a deep-link
            parameter, append it here.
            Plain <a>, not next/link: this is a static file in public/apps, not
            an app-router route. */}
        {info.week <= 4 && (
          <a
            href="/apps/dark-phonics-lesson-player.html"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-800 text-white shadow-lg ring-2 ring-amber-300/70 px-4 py-3 active:scale-[0.99] transition-transform"
          >
            <span
              className="w-10 h-10 shrink-0 rounded-xl bg-amber-300 text-slate-900 flex items-center justify-center text-lg font-black"
              aria-hidden="true"
            >
              ▶
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-snug">
                Play this lesson in the Interactive Player
              </span>
              <span className="block text-sm text-indigo-200">
                The classroom screens, songs and cards — lessons 1–4.
              </span>
            </span>
            <span className="text-amber-300 text-xl shrink-0" aria-hidden="true">
              ›
            </span>
          </a>
        )}

        {/* (a) THE SONG — the hook of Dark Phonics. Falls back to the song
            card picture in the browser if the mp4 isn't uploaded yet. */}
        <Card title="This week’s song">
          <LessonSong
            videoSrc={videoSrc}
            pictureSrc={pictureSrc}
            alt={`Week ${info.week} song card`}
          />
          <p className="mt-3 text-sm text-slate-500 leading-relaxed">
            Play it twice. The second time, sing the catchphrase together — loudly is better.
          </p>
        </Card>

        {/* (b) THE SOUND — big enough to read across a kitchen table. */}
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg px-6 py-8 text-center">
          <div className="text-6xl font-black tracking-tight leading-none">{big}</div>
          {phoneme && <div className="mt-3 text-3xl font-bold text-blue-100">{phoneme}</div>}
          <p className="mt-4 text-lg text-blue-50">{info.catchphrase}</p>
        </section>

        {/* (c) WORDS TO PRACTICE — the lesson's vocab + its new decodable words. */}
        {words.length > 0 && (
          <Card title="Words to practice">
            <div className="flex flex-wrap gap-2">
              {words.map((w) => (
                <span
                  key={w}
                  className="px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100 text-lg font-bold text-blue-800"
                >
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              Say each word slowly, stretching the sounds — s-a-t — then say it fast together.
            </p>
          </Card>
        )}

        {/* (d) HEART WORDS — learned by sight, never sounded out. */}
        {heartWords.length > 0 && (
          <Card title="Heart words">
            <div className="flex flex-wrap gap-2">
              {heartWords.map((w) => (
                <span
                  key={w}
                  className="px-4 py-2 rounded-2xl bg-rose-50 border border-rose-100 text-lg font-bold text-rose-700"
                >
                  {w}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              These ones don’t follow the rules — we learn them by heart <span aria-hidden="true">❤️</span>. Don’t
              sound them out; just read them together until they’re easy.
            </p>
          </Card>
        )}

        {/* (e) THE BOOKS — the ones your child already knows from class. */}
        {books.length > 0 && (
          <Card title={books.length > 1 ? 'This week’s books' : 'This week’s book'}>
            <div className="space-y-4">
              {books.map((book) => (
                <div key={book.slug} className="flex items-start gap-3">
                  <BookCover
                    src={book.cover ?? mediaProxyUrl(`books/covers/${book.slug}.png`, 4)}
                    alt={book.title}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 leading-snug">{book.title}</p>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {book.description ??
                        'Initial-sound pattern book — your child shouts the picture word.'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm text-amber-900 leading-relaxed">
              Ask your child to read it to <span className="font-bold">YOU</span> — they know it
              from class, and reading it to a grown-up is the part they are proud of.
            </p>
          </Card>
        )}

        {/* (f) HOW TO PLAY AT HOME — the only prose on this page that isn't
            curriculum data. Four lines, warm, imperative, no homework. */}
        <Card title="How to play at home">
          <ol className="space-y-3 text-slate-700 leading-relaxed">
            <li className="flex gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">1️⃣</span>
              <span>Play the song twice — once to listen, once to sing along.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">2️⃣</span>
              <span>
                Say the sound together{phoneme ? <> — {phoneme}</> : null}. Make it silly, make it
                loud, make it a whisper.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">3️⃣</span>
              <span>
                Go on a sound hunt around the house — who can find something that starts with it
                first?
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">4️⃣</span>
              <span>Let your child teach YOU. Get it wrong on purpose; they will love it.</span>
            </li>
          </ol>
          <p className="mt-4 text-sm text-slate-500">
            Ten minutes is plenty. Stop while it is still fun.
          </p>
        </Card>

        {/* (g) PREV / NEXT — a locked next week shows its date, never a link. */}
        <nav className="flex items-stretch gap-3 pt-2">
          {prev ? (
            <Link
              href={`/play/week/${prev.week}`}
              className="flex-1 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 text-left active:scale-[0.99] transition-transform"
            >
              <span className="block text-xs text-slate-400">‹ Week {prev.week}</span>
              <span className="block text-sm font-bold text-slate-700 truncate">{prev.title}</span>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {next &&
            (next.unlocked ? (
              <Link
                href={`/play/week/${next.week}`}
                className="flex-1 rounded-2xl bg-white border border-slate-200 shadow-sm px-4 py-3 text-right active:scale-[0.99] transition-transform"
              >
                <span className="block text-xs text-slate-400">Week {next.week} ›</span>
                <span className="block text-sm font-bold text-slate-700 truncate">
                  {next.title}
                </span>
              </Link>
            ) : (
              <div className="flex-1 rounded-2xl bg-white/60 border border-dashed border-slate-200 px-4 py-3 text-right">
                <span className="block text-xs text-slate-400">Week {next.week} 🔒</span>
                <span className="block text-sm font-semibold text-slate-400">
                  {next.unlockDate ? `Opens ${formatUnlockDate(next.unlockDate)}` : 'Opens soon'}
                </span>
              </div>
            ))}
        </nav>

        <div className="text-center pt-2">
          <Link href="/play" className="text-sm font-semibold text-blue-600">
            All weeks
          </Link>
        </div>
      </main>
    </Shell>
  );
}
