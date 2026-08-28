'use client';

// app/play/_components/LessonMedia.tsx
//
// The ONLY client code under /play. Both pages are server components on
// purpose (the lock decision must come from the server's clock), so the one
// thing that genuinely needs the browser — "did this media file actually
// load?" — lives here and nowhere else.
//
// WHY IT EXISTS: not every lesson has its song video or its book cover
// uploaded to the dark-phonics bucket yet. The library page solves that with a
// server-side HEAD probe against a manifest; this parent-facing page cannot
// afford a probe per asset per request, so it renders the URL optimistically
// and degrades in the browser: a missing video falls back to the lesson's
// letter picture, a missing cover falls back to a quiet placeholder. A parent
// never sees a broken-image icon or a black dead player.
//
// _components is an underscore-prefixed private folder — Next.js does not
// route it, so this file adds no URL.

import { useState } from 'react';

/* -------------------------------------------------------------------------- */
/* The song                                                                    */
/* -------------------------------------------------------------------------- */

export function LessonSong({
  videoSrc,
  pictureSrc,
  alt,
}: {
  videoSrc: string;
  pictureSrc: string;
  alt: string;
}) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [pictureFailed, setPictureFailed] = useState(false);

  if (videoFailed) {
    // No video for this lesson yet. Show the song-card picture instead — it is
    // the artwork the video animates, so the page still has its hero.
    if (pictureFailed) return null;
    return (
      <div className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pictureSrc}
          alt={alt}
          className="w-full rounded-2xl bg-slate-900"
          style={{ aspectRatio: '1 / 1', objectFit: 'contain' }}
          onError={() => setPictureFailed(true)}
        />
        <p className="text-xs text-slate-500">
          The song video for this week is still on its way — sing the words together from the
          picture for now.
        </p>
      </div>
    );
  }

  return (
    <video
      controls
      playsInline
      preload="none"
      src={videoSrc}
      poster={pictureSrc}
      className="w-full rounded-2xl"
      style={{ aspectRatio: '1 / 1', background: '#000', objectFit: 'contain' }}
      onError={() => setVideoFailed(true)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* A book cover                                                                */
/* -------------------------------------------------------------------------- */

export function BookCover({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="w-20 shrink-0 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl"
        style={{ aspectRatio: '3 / 4' }}
        aria-hidden="true"
      >
        📖
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="w-20 shrink-0 rounded-lg bg-slate-100"
      onError={() => setFailed(true)}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* The voice bank                                                              */
/* -------------------------------------------------------------------------- */
//
// Real recorded words and letter sounds, out of the same public `dark-phonics`
// bucket and through the same media proxy the song video above already uses —
// so the CSP media-src allowance and the China edge cache cover them with no
// new plumbing. Keys live under dark-phonics-audio/{words,letters,phonemes}/.
//
// WHY THE FIRST TAP IS THE PROBE: the bank does not cover every word in every
// one of the 49 lessons, and a word it never recorded 4xxs. We do NOT fetch()
// a HEAD per chip — that would be one request per word on every render of
// every week page, for a control most visitors never touch. Instead the
// <audio> element's own `error` event reports the miss, and the chip quietly
// stops offering itself: no toast, no broken icon, no explanation a parent
// has to read. Same degrade-in-the-browser rule as the song and cover above.

/** Same shape as lib/montree/dark-phonics/live-lesson.ts `mediaProxyUrl`,
 *  restated here so this client bundle does not pull in the curriculum data. */
const bankUrl = (path: string) => `/api/montree/media/proxy/dark-phonics-audio/${path}?bucket=dark-phonics`;

/** A single a–z letter → letters/, the three digraphs → phonemes/, and any
 *  teaching label that is not a letter ('review', 'minimal pairs') → null. */
function soundUrl(sound: string): string | null {
  const k = sound.toLowerCase();
  if (k === 'sh' || k === 'th' || k === 'ch') return bankUrl(`phonemes/${k}.mp3`);
  return /^[a-z]$/.test(k) ? bankUrl(`letters/${k}.mp3`) : null;
}

// ONE element for the whole page, so two quick taps never talk over each other.
let bankAudio: HTMLAudioElement | null = null;

function playBank(src: string, onEnd: () => void, onFail: () => void): void {
  if (bankAudio) {
    try {
      bankAudio.pause();
    } catch {
      /* an element mid-load can throw on pause; nothing to recover */
    }
  }
  const a = (bankAudio = new Audio(src));
  let settled = false;
  const fail = () => {
    if (settled) return;
    settled = true;
    onFail();
  };
  a.addEventListener(
    'ended',
    () => {
      if (settled) return;
      settled = true;
      onEnd();
    },
    { once: true }
  );
  a.addEventListener('error', fail, { once: true });
  a.play().catch(fail);
}

type SpeakState = 'idle' | 'playing' | 'silent';

/**
 * A word chip that says itself. Renders as a plain span once we know the bank
 * has no take for this word, so the affordance never lies.
 *
 * `className` carries the card's own styling and stays the caller's business —
 * this component only adds the speaker mark and the play pulse.
 */
export function SpokenWord({ word, className }: { word: string; className: string }) {
  const [state, setState] = useState<SpeakState>('idle');

  if (state === 'silent') return <span className={className}>{word}</span>;

  return (
    <button
      type="button"
      aria-label={`Hear the word ${word}`}
      onClick={() => {
        setState('playing');
        playBank(
          bankUrl(`words/${encodeURIComponent(word.toLowerCase())}.mp3`),
          () => setState('idle'),
          () => setState('silent')
        );
      }}
      className={`${className} inline-flex items-center gap-1.5 transition-transform active:scale-95 ${
        state === 'playing' ? 'scale-105' : ''
      }`}
    >
      {word}
      <span aria-hidden className="text-xs opacity-40">
        🔊
      </span>
    </button>
  );
}

/**
 * The big letter block, made tappable when the sound is one the bank records.
 * Anything else ('short A', 'review') renders exactly as it did before.
 */
export function SpokenLetter({
  sound,
  className,
  children,
}: {
  sound: string;
  className: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<SpeakState>('idle');
  const src = soundUrl(sound);

  if (!src || state === 'silent') return <div className={className}>{children}</div>;

  return (
    <button
      type="button"
      aria-label={`Hear the sound ${sound}`}
      onClick={() => {
        setState('playing');
        playBank(
          src,
          () => setState('idle'),
          () => setState('silent')
        );
      }}
      className={`${className} block w-full transition-transform active:scale-95 ${
        state === 'playing' ? 'scale-105' : ''
      }`}
    >
      {children}
    </button>
  );
}
