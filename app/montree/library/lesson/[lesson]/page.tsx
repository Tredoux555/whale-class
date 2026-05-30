'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';
import { getLesson, getPhaseFor, type EnglishPhase } from '@/lib/montree/english-sequence/lesson-map';
import { hasLessonMaterials } from '@/lib/montree/english-sequence/lesson-coverage';

// /montree/library/lesson/[lesson] — the per-lesson MATERIALS LAUNCHER.
//
// The teacher's one-stop for a single lesson: every printable material the
// generators can make for it (each deep-linked with ?lesson=N so it opens
// pre-scoped to exactly this lesson's words), plus the reference resources —
// the Library word bank, the sound song, the decodable reader.
//
// Deliberately LEAN: imports only lesson-map (lesson label/phase) and
// lesson-coverage (the tiny has-materials set) — NOT phonics-data. The
// generators themselves resolve the word groups via ?lesson=N, so this page
// stays a fast set of links with no heavy word data in its bundle.

const TOOLS = '/montree/library/tools/phonics-fast';

const PHASE_COLOR: Record<EnglishPhase, string> = {
  pink: '#ec4899',
  blue: '#3b82f6',
  green: '#10b981',
};

interface ToolLink {
  label: string;
  sub: string;
  href: (n: number, band: EnglishPhase) => string;
  show: (band: EnglishPhase) => boolean;
}

// Material generators — each opens pre-scoped to ?lesson=N.
const MAKE_TOOLS: ToolLink[] = [
  {
    label: 'Three-part cards',
    sub: 'Picture · word · control card',
    href: (n) => `${TOOLS}/three-part-cards?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Object box',
    sub: 'Miniatures + word labels',
    href: (n, band) => `${TOOLS}/${band === 'blue' ? 'blue-box' : 'pink-box'}?lesson=${n}`,
    show: (band) => band === 'pink' || band === 'blue',
  },
  {
    label: 'Bingo',
    sub: 'Phonics bingo boards',
    href: (n) => `${TOOLS}/bingo?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Reverse bingo',
    sub: 'Sound-to-picture bingo',
    href: (n) => `${TOOLS}/reverse-bingo?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Labels',
    sub: 'Printable word labels',
    href: (n) => `${TOOLS}/labels?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Command cards',
    sub: 'Read-and-do action cards',
    href: (n) => `${TOOLS}/command-cards?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Sentence cards',
    sub: 'Decodable sentences to read',
    href: (n) => `${TOOLS}/sentence-cards?lesson=${n}`,
    show: () => true,
  },
  {
    label: 'Little readers',
    sub: 'Decodable stories to print',
    href: (n) => `${TOOLS}/stories?lesson=${n}`,
    show: () => true,
  },
];

// Reference resources (the Library content, not generated).
function lessonPageHref(band: EnglishPhase, n: number): string {
  const file =
    band === 'blue' ? 'language-area-blue'
    : band === 'green' ? 'language-area-green'
    : 'language-area-lessons';
  return `/${file}.html#lesson-${n}`;
}

export default function LessonLauncherPage() {
  const params = useParams();
  const raw = Array.isArray(params.lesson) ? params.lesson[0] : params.lesson;
  const lessonNum = raw ? parseInt(raw, 10) : NaN;
  const lesson = Number.isInteger(lessonNum) ? getLesson(lessonNum) : null;
  const band: EnglishPhase = (lesson?.phase ?? getPhaseFor(lessonNum) ?? 'pink') as EnglishPhase;
  const color = PHASE_COLOR[band];
  const hasMats = Number.isInteger(lessonNum) && hasLessonMaterials(lessonNum);
  const songAvailable = band === 'pink' && lessonNum >= 5 && lessonNum <= 53;
  const readerAvailable = band === 'pink';

  return (
    <>
      <style jsx global>{`
        * { box-sizing: border-box; }
        .ll-bg {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.5), rgba(39,129,90,0) 55%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%);
        }
        .ll-wrap {
          position: relative; z-index: 1; max-width: 920px; margin: 0 auto;
          padding: 0 24px 80px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: rgba(255,255,255,0.85);
        }
        .ll-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0 8px;
        }
        .ll-nav-left { display: inline-flex; align-items: center; gap: 18px; }
        .ll-logo { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; }
        .ll-logo-word {
          font-family: var(--font-lora), Georgia, serif; font-weight: 500; font-size: 1.05rem;
          background: linear-gradient(90deg, #62C396, #47AB7E);
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        }
        .ll-back { font-size: 0.85rem; color: rgba(255,255,255,0.5); text-decoration: none; }
        .ll-back:hover { color: rgba(255,255,255,0.8); }
        .ll-head { padding: 40px 0 28px; }
        .ll-chip {
          display: inline-block; font-size: 11px; text-transform: uppercase;
          letter-spacing: 0.12em; font-weight: 600; padding: 5px 12px; border-radius: 999px;
          margin-bottom: 16px;
        }
        .ll-head h1 {
          font-family: var(--font-lora), Georgia, serif; font-weight: 400;
          font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -0.02em; color: #fff; margin: 0 0 8px;
        }
        .ll-head-label { font-size: 1.0625rem; color: rgba(255,255,255,0.6); }
        .ll-section-label {
          font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
          color: #E8C96A; font-weight: 600; margin: 36px 0 16px; display: block;
        }
        .ll-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px;
        }
        .ll-card {
          display: block; text-decoration: none; padding: 18px 18px;
          background: rgba(12,36,25,0.55); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }
        .ll-card:hover { transform: translateY(-2px); border-color: rgba(130,217,174,0.35); background: rgba(16,46,32,0.7); }
        .ll-card-title { font-size: 1rem; font-weight: 500; color: #fff; margin: 0 0 4px; }
        .ll-card-sub { font-size: 0.82rem; color: rgba(255,255,255,0.5); margin: 0; }
        .ll-note {
          font-size: 0.95rem; color: rgba(255,255,255,0.55); line-height: 1.6;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px; padding: 16px 18px;
        }
        .ll-foot { margin-top: 48px; font-size: 0.78rem; color: rgba(255,255,255,0.3); }
        @media (max-width: 560px) { .ll-grid { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div aria-hidden="true" className="ll-bg" />
      <div className="ll-wrap">
        <nav className="ll-nav">
          <div className="ll-nav-left">
            <Link className="ll-logo" href="/montree/library">
              <MontreeLogo size={24} />
              <span className="ll-logo-word">Library</span>
            </Link>
            <Link className="ll-back" href="/montree/dashboard/classroom-overview">← Class progress</Link>
          </div>
          <LanguageToggle />
        </nav>

        <header className="ll-head">
          <span className="ll-chip" style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}>
            {band} phase
          </span>
          <h1>Lesson {Number.isInteger(lessonNum) ? lessonNum : '—'}</h1>
          <div className="ll-head-label">{lesson ? lesson.label : 'Unknown lesson'}</div>
        </header>

        {hasMats ? (
          <>
            <span className="ll-section-label">Make materials for this lesson</span>
            <div className="ll-grid">
              {MAKE_TOOLS.filter((t) => t.show(band)).map((t) => (
                <a key={t.label} className="ll-card" href={t.href(lessonNum, band)} target="_blank" rel="noopener noreferrer">
                  <p className="ll-card-title">{t.label}</p>
                  <p className="ll-card-sub">{t.sub}</p>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div className="ll-note">
            This lesson is oral or review — there&apos;s no printable word bank for it yet.
            Use the lesson reference below for the spoken-language and review activities.
          </div>
        )}

        <span className="ll-section-label">Reference for this lesson</span>
        <div className="ll-grid">
          {lesson && (
            <a className="ll-card" href={lessonPageHref(band, lessonNum)} target="_blank" rel="noopener noreferrer">
              <p className="ll-card-title">Lesson page</p>
              <p className="ll-card-sub">Word bank · phrases · heart words</p>
            </a>
          )}
          {songAvailable && (
            <a className="ll-card" href="/pink-phase-songs.html" target="_blank" rel="noopener noreferrer">
              <p className="ll-card-title">Sound song</p>
              <p className="ll-card-sub">Circle-time song for this sound</p>
            </a>
          )}
          {readerAvailable && (
            <a className="ll-card" href="/pink-readers.html" target="_blank" rel="noopener noreferrer">
              <p className="ll-card-title">Decodable readers</p>
              <p className="ll-card-sub">Little storybooks for this phase</p>
            </a>
          )}
        </div>

        <p className="ll-foot">Montree · materials scoped to a child&apos;s exact lesson</p>
      </div>
    </>
  );
}
