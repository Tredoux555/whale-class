// app/dark-phonics/l/[n]/opengraph-image.tsx
//
// One lesson's social card: the book's own cover next to its title.
//
// This is the picture a WeChat message or a tweet shows when somebody shares
// "we finished In the Pit!", so it has to carry the BOOK, not a generic logo.
//
// HOW THE ART GETS IN. The cover lives in `public/dark-phonics-books/...` and
// is inlined as a data URI read off the filesystem with `fs`. That is why the
// runtime is nodejs: Railway serves this app as a Next standalone server in a
// Docker image, `public/` is copied into it, and reading a file there is both
// faster and more reliable than this route fetching its own origin over HTTP
// (which needs an absolute URL the container does not always know, and turns
// one image into two requests). If the read fails for any reason the card
// still renders — text only, never a broken 500 in somebody's timeline.

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { ImageResponse } from 'next/og';

import { BOOK_WORKS_LESSON_NUMBERS, getBookWorks } from '@/lib/montree/dark-phonics/book-works';

export const runtime = 'nodejs';
export const alt = 'A Dark Phonics little book';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Read one file out of public/ and return it as a data URI, or null. */
async function inlinePublicImage(webPath: string): Promise<string | null> {
  try {
    // Only ever a path under public/, and never one with a traversal segment.
    const clean = webPath.split('?')[0];
    if (!clean.startsWith('/') || clean.includes('..')) return null;
    const file = path.join(process.cwd(), 'public', clean);
    const buf = await readFile(file);
    const ext = path.extname(clean).toLowerCase();
    const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ n: string }> }) {
  const { n: raw } = await params;
  const n = /^\d{1,2}$/.test(raw) && BOOK_WORKS_LESSON_NUMBERS.includes(Number(raw)) ? Number(raw) : null;
  const lesson = n === null ? null : getBookWorks(n);

  const title = lesson?.bookTitle ?? 'Dark Phonics';
  const letter = lesson?.letter ?? '';
  const cover = lesson ? await inlinePublicImage(lesson.coverImage) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: '64px 72px',
          background: 'linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)',
          color: '#fffaf0',
          fontFamily: 'sans-serif',
        }}
      >
        {cover ? (
          // satori renders this element itself — next/image does not exist inside an
          // ImageResponse, and the src is an inlined data URI, not a network fetch.
          <img
            src={cover}
            alt=""
            width={430}
            height={502}
            style={{
              width: 430,
              height: 502,
              objectFit: 'contain',
              background: '#ffffff',
              borderRadius: 22,
              border: '3px solid rgba(130,217,174,0.35)',
            }}
          />
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, letterSpacing: 5, color: 'rgba(255,250,240,0.5)' }}>
            {n === null ? 'MONTREE · DARK PHONICS' : `DARK PHONICS · LESSON ${n}`}
          </div>

          <div
            style={{
              fontSize: cover ? 62 : 82,
              lineHeight: 1.08,
              fontWeight: 700,
              letterSpacing: -2,
              marginTop: 22,
            }}
          >
            {title}
          </div>

          {letter ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                marginTop: 26,
                width: 86,
                height: 86,
                borderRadius: 999,
                border: '3px solid rgba(130,217,174,0.6)',
                color: '#82d9ae',
                fontSize: 46,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {letter}
            </div>
          ) : null}

          <div style={{ fontSize: 30, lineHeight: 1.4, marginTop: 30, color: 'rgba(255,250,240,0.6)' }}>
            Tap, match, build, trace. Free to play — no signup.
          </div>

          <div style={{ fontSize: 24, marginTop: 24, color: 'rgba(130,217,174,0.85)' }}>
            montree.xyz/dark-phonics
          </div>
        </div>
      </div>
    ),
    size,
  );
}
