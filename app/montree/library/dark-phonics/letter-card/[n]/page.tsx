// /montree/library/dark-phonics/letter-card/[n]/page.tsx
// The Dark Phonics LETTER CARD — a print-ready, two-page-per-book card set for
// one lesson.
//
//   page 1 : the cover of that lesson's letter book, big and centred
//   page 2 : the letter of the week, enormous, with the catchphrase beneath
//
// A lesson carrying more than one book (n=7 the-sat + the-tall, n=8 the-spat +
// the-pat) gets one cover page per book, then the single letter page last, so
// the letter always closes the set.
//
// There is no PDF pipeline for this — it is a print route. @page gives it A4
// portrait with no margin, each .lc-page breaks after itself, and the on-screen
// chrome (back link + Print button) is hidden in @media print. "Save as PDF" in
// the browser print dialog produces exactly the same file a generator would.
//
// 🚨 The print CSS lives in a <style dangerouslySetInnerHTML> tag, NOT styled-jsx
// and NOT globals.css: Turbopack rejects nested <style jsx>, and @page cannot be
// scoped to a selector, so a global A4 rule would hijack every print in the app.
//
// Public: no auth — /montree/library/** is exempt in middleware.ts.
// Hardcoded English, the same sanctioned exception as the library page itself.
'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Lora } from 'next/font/google';
import { RAW, displayN, type Book } from '@/lib/montree/dark-phonics/lessons';

// Lora is the Montree brand serif (see MONTREE_BRAND_PALETTE.md) and is already
// loaded by the root layout, so this adds no new font fetch to the build.
const lora = Lora({ subsets: ['latin'], weight: ['400', '600', '700'], style: ['normal', 'italic'] });

/** Cover URL for a book — the local /public path where set, else the bucket. */
const coverUrl = (book: Book) =>
  book.cover ?? `/api/montree/media/proxy/books/covers/${book.slug}.png?bucket=dark-phonics`;

/**
 * The display letter fills the page, so its size has to come off the string,
 * not the page: one glyph goes huge, a digraph ('ck', 'qu') a little smaller,
 * a teaching label ('short A') smaller again so it still fits one line.
 */
function letterSize(sound: string): string {
  if (sound.length <= 1) return '15cm';
  if (sound.length <= 2) return '10cm';
  if (sound.length <= 4) return '6cm';
  return '3.2cm';
}

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 0; }

  .lc-page {
    width: 21cm;
    height: 29.7cm;
    background: #ffffff;
    color: #101a12;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2.2cm 2cm 1.6cm;
    box-sizing: border-box;
    break-after: page;
    page-break-after: always;
  }
  .lc-page:last-of-type { break-after: auto; page-break-after: auto; }

  .lc-eyebrow {
    position: absolute;
    top: 1.5cm;
    left: 0; right: 0;
    text-align: center;
    font-size: 10pt;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: #9aa79d;
  }
  .lc-foot {
    position: absolute;
    bottom: 1.2cm;
    left: 0; right: 0;
    text-align: center;
    font-size: 9pt;
    letter-spacing: 0.24em;
    text-transform: lowercase;
    color: #b3bdb6;
  }

  .lc-cover-img {
    max-width: 14.5cm;
    max-height: 18.5cm;
    width: auto;
    height: auto;
    display: block;
    border-radius: 2px;
    box-shadow: 0 0.5cm 1.4cm rgba(16, 26, 18, 0.18);
  }
  .lc-cover-title {
    margin-top: 1.3cm;
    font-size: 21pt;
    font-weight: 600;
    text-align: center;
    line-height: 1.25;
  }
  .lc-cover-sub {
    margin-top: 0.35cm;
    font-size: 11pt;
    font-style: italic;
    color: #7e8c83;
    text-align: center;
  }
  .lc-cover-missing {
    width: 14.5cm; height: 18.5cm;
    border: 1px dashed #cfd8d2;
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: #b3bdb6; font-size: 12pt; font-style: italic;
  }

  .lc-letter {
    font-weight: 600;
    line-height: 0.82;
    letter-spacing: -0.01em;
    text-align: center;
    color: #0f1f14;
  }
  .lc-rule {
    width: 3.4cm;
    height: 1px;
    background: #d8e0da;
    margin: 1.5cm 0 0.9cm;
  }
  .lc-catch {
    font-size: 15pt;
    font-style: italic;
    color: #5d6b62;
    text-align: center;
    max-width: 15cm;
    line-height: 1.45;
  }
  .lc-lesson {
    margin-top: 0.5cm;
    font-size: 10pt;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #a9b4ac;
    text-align: center;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { background: #ffffff !important; }
    .lc-screen-only { display: none !important; }
    .lc-stage { padding: 0 !important; background: #ffffff !important; }
    .lc-page { box-shadow: none !important; margin: 0 !important; }
  }
`;

export default function DarkPhonicsLetterCardPage() {
  const params = useParams<{ n: string }>();
  const n = Number(Array.isArray(params?.n) ? params.n[0] : params?.n);
  const lesson = RAW.find(l => l.n === n);

  if (!lesson) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-white/70">That lesson doesn&apos;t exist.</p>
        <Link href="/montree/library/dark-phonics" className="text-emerald-300 underline text-sm">
          ← Back to Dark Phonics
        </Link>
      </div>
    );
  }

  const books = lesson.books ?? [];

  return (
    <div className={`${lora.className} min-h-screen bg-[#0a1a0f]`}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Screen chrome — never printed. */}
      <div className="lc-screen-only sticky top-0 z-20 flex items-center justify-between gap-4 px-5 py-3 border-b border-white/10 bg-[#0a1a0f]/95 backdrop-blur">
        <Link href="/montree/library/dark-phonics" className="text-white/50 hover:text-white/80 text-sm transition-colors">
          ← Dark Phonics
        </Link>
        <div className="text-white/40 text-xs tracking-[0.22em] uppercase hidden sm:block">
          Letter card &middot; Lesson {displayN(lesson.n)}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#34D399,#1D6B48)', color: '#06140C' }}
        >
          Print / Save PDF
        </button>
      </div>

      <div className="lc-stage flex flex-col items-center gap-8 py-8 px-4">
        {books.map(book => (
          <section key={book.slug} className="lc-page shadow-2xl">
            <div className="lc-eyebrow">Dark Phonics &middot; Lesson {displayN(lesson.n)}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="lc-cover-img" src={coverUrl(book)} alt={book.title} />
            <div className="lc-cover-title">{book.title}</div>
            <div className="lc-cover-sub">{lesson.title}</div>
            <div className="lc-foot">montree.xyz</div>
          </section>
        ))}

        {books.length === 0 && (
          <section className="lc-page shadow-2xl">
            <div className="lc-eyebrow">Dark Phonics &middot; Lesson {displayN(lesson.n)}</div>
            <div className="lc-cover-missing">No letter book for this lesson yet</div>
            <div className="lc-cover-title">{lesson.title}</div>
            <div className="lc-foot">montree.xyz</div>
          </section>
        )}

        <section className="lc-page shadow-2xl">
          <div className="lc-eyebrow">Dark Phonics &middot; Lesson {displayN(lesson.n)}</div>
          <div className="lc-letter" style={{ fontSize: letterSize(lesson.sound) }}>
            {lesson.sound}
          </div>
          <div className="lc-rule" />
          <div className="lc-catch">{lesson.catchphrase}</div>
          <div className="lc-lesson">{lesson.title}</div>
          <div className="lc-foot">montree.xyz</div>
        </section>
      </div>
    </div>
  );
}
