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
