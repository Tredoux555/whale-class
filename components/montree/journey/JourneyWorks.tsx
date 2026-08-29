'use client';

/**
 * The in-stage works of the English Journey player — each renders INSIDE the
 * cream slide, in the Writing Shelf's visual language. One work per step,
 * one thing on stage at a time. All state local; TTS via the shared speech
 * lib; media via the dark-phonics bucket proxy with graceful fallbacks.
 */

import { useEffect, useRef, useState } from 'react';

import { speakPhoneme, speakSentence, speakWord } from '@/lib/montree/dark-phonics/speech';
import { heartWordsSoFar } from '@/lib/montree/dark-phonics/live-activities';
import {
  getISpyRound,
  getJourneySong,
  getMatchRound,
  startsWith,
  type PictureWord,
} from '@/lib/montree/journey/journey-works';
import { getJourneyBooks } from '@/lib/montree/journey/journey-works';

/* ---------------------------------------------------------------- shared -- */

function BigButton({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[16px] py-[9px] text-[13px] font-semibold',
        accent
          ? 'border-[var(--dpl-slide-accent)] bg-[var(--dpl-slide-accent)] text-[var(--dpl-slide-on-accent)]'
          : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] text-[var(--dpl-slide-ink2)]',
      ].join(' ')}
      style={{ fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ song -- */

export function SongWork({ lessons }: { lessons: [number, number] }) {
  const [displayN, setDisplayN] = useState(lessons[0]);
  // Media ladder: video → still picture → the letter card. A missing object in
  // the bucket (e.g. a dev database without the media) must NEVER render a
  // broken player — the last rung is always a designed card.
  const [mediaStep, setMediaStep] = useState<'video' | 'picture' | 'card'>('video');
  useEffect(() => setMediaStep('video'), [displayN]);

  const song = getJourneySong(displayN);
  if (!song) return null;
  const isSingle = song.sound.length === 1;

  return (
    <div className="flex w-full flex-col items-center gap-[18px]">
      <div className="flex items-center gap-[14px]">
        <span
          className="text-[64px] font-bold leading-none text-[var(--dpl-slide-accent)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {isSingle ? `${song.sound.toUpperCase()}${song.sound.toLowerCase()}` : song.sound.length === 2 ? song.sound : ''}
        </span>
        <div>
          <p className="text-[22px] font-bold text-[var(--dpl-slide-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            {song.title}
          </p>
          <p className="text-[15px] italic text-[var(--dpl-slide-ink2)]">{song.catchphrase}</p>
        </div>
      </div>

      {mediaStep === 'video' ? (
        <video
          key={song.videoUrl}
          src={song.videoUrl}
          controls
          playsInline
          poster={song.pictureUrl}
          onError={() => setMediaStep('picture')}
          className="max-h-[340px] w-full max-w-[560px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-black object-contain"
        />
      ) : mediaStep === 'picture' ? (
        // eslint-disable-next-line @next/next/no-img-element -- media-proxy asset
        <img
          src={song.pictureUrl}
          alt={song.title}
          onError={() => setMediaStep('card')}
          className="max-h-[340px] w-full max-w-[560px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => speakPhoneme(song.sound)}
          className="flex w-full max-w-[560px] flex-col items-center gap-[6px] rounded-[var(--dpl-r-md)] border-2 border-[var(--dpl-lc-line)] bg-[var(--dpl-lc-bg)] px-[24px] py-[34px]"
          style={{ boxShadow: 'var(--dpl-lc-shadow)' }}
          title="hear the sound"
        >
          <span
            className="text-[110px] font-bold leading-none text-[var(--dpl-slide-accent)]"
            style={{ fontFamily: 'var(--dpl-font-display)', textShadow: '0 6px 18px rgba(109,40,217,.18)' }}
          >
            {isSingle ? `${song.sound.toUpperCase()}${song.sound.toLowerCase()}` : song.sound}
          </span>
          <span className="text-[17px] font-semibold text-[var(--dpl-slide-accent-2)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            /{song.sound}/ 🔊
          </span>
          <span className="mt-2 text-[12px] text-[var(--dpl-slide-ink3)]">
            song plays here on the live site — sing it from the catchphrase for now
          </span>
        </button>
      )}

      <div className="flex items-center gap-[10px]">
        <BigButton label="◀ Prev song" onClick={() => setDisplayN(Math.max(lessons[0], displayN - 1))} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--dpl-slide-ink3)]">
          lesson {displayN} · {lessons[0]}–{lessons[1]}
        </span>
        <BigButton label="Next song ▶" onClick={() => setDisplayN(Math.min(lessons[1], displayN + 1))} accent />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- letter -- */

export function LetterWork({ lessons }: { lessons: [number, number] }) {
  const [displayN, setDisplayN] = useState(lessons[0]);
  const song = getJourneySong(displayN);
  if (!song) return null;
  const objects = startsWith(song.sound);
  const isSingle = song.sound.length === 1;

  return (
    <div className="flex w-full flex-col items-center gap-[20px]">
      <button
        type="button"
        onClick={() => speakPhoneme(song.sound)}
        title="hear the sound"
        className="rounded-[var(--dpl-r-md)] border-2 border-[var(--dpl-lc-line)] bg-[var(--dpl-lc-bg)] px-[60px] py-[16px]"
        style={{ boxShadow: 'var(--dpl-lc-shadow)' }}
      >
        <span
          className="block text-[150px] font-bold leading-none text-[var(--dpl-slide-accent)]"
          style={{ fontFamily: 'var(--dpl-font-display)', textShadow: '0 6px 18px rgba(109,40,217,.18)' }}
        >
          {isSingle ? `${song.sound.toUpperCase()}${song.sound.toLowerCase()}` : song.sound}
        </span>
        <span className="mt-1 block text-[18px] font-semibold text-[var(--dpl-slide-accent-2)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
          /{song.sound}/ 🔊
        </span>
      </button>

      {objects.length > 0 ? (
        <div className="flex items-center gap-[12px]">
          {objects.map((o) => (
            <button
              key={o.word}
              type="button"
              onClick={() => speakWord(o.word)}
              className="flex flex-col items-center gap-[2px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] px-[16px] py-[10px]"
            >
              <span className="text-[44px] leading-none">{o.emoji}</span>
              <span className="text-[12px] font-semibold text-[var(--dpl-slide-ink3)]">🔊</span>
            </button>
          ))}
          <span className="ml-2 max-w-[130px] text-[12.5px] text-[var(--dpl-slide-ink3)]">
            things that start with /{song.sound}/ — tap to hear
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-[10px]">
        <BigButton label="◀ Prev" onClick={() => setDisplayN(Math.max(lessons[0], displayN - 1))} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--dpl-slide-ink3)]">
          sound {displayN} of {lessons[1]}
        </span>
        <BigButton label="Next ▶" onClick={() => setDisplayN(Math.min(lessons[1], displayN + 1))} accent />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- match -- */

export function MatchWork() {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<number[] | null>(null);

  const { words, layout } = getMatchRound(round);
  const done = matched.size === layout.length;

  const tap = (slot: number) => {
    if (matched.has(slot) || wrongPair || slot === picked) return;
    if (picked === null) {
      setPicked(slot);
      speakWord(words[layout[slot]].word);
      return;
    }
    if (layout[picked] === layout[slot]) {
      const next = new Set(matched);
      next.add(picked);
      next.add(slot);
      setMatched(next);
      setPicked(null);
      speakWord(words[layout[slot]].word);
    } else {
      setWrongPair([picked, slot]);
      setPicked(null);
      window.setTimeout(() => setWrongPair(null), 650);
    }
  };

  const nextRound = () => {
    setRound(round + 1);
    setPicked(null);
    setMatched(new Set());
    setWrongPair(null);
  };

  return (
    <div className="flex w-full flex-col items-center gap-[22px]">
      <div className="grid grid-cols-3 gap-[14px]">
        {layout.map((wordIndex, slot) => {
          const isMatched = matched.has(slot);
          const isPicked = picked === slot;
          const isWrong = wrongPair?.includes(slot);
          return (
            <button
              key={slot}
              type="button"
              onClick={() => tap(slot)}
              className={[
                'flex h-[120px] w-[120px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 text-[56px] transition-all',
                isMatched
                  ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] opacity-80'
                  : isPicked
                    ? 'border-[var(--dpl-slide-accent)] bg-[var(--dpl-chip-bg)] shadow-lg'
                    : isWrong
                      ? 'translate-x-[3px] border-[var(--dpl-danger-line,#c33)] bg-[var(--dpl-chip-bg)]'
                      : 'border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] hover:-translate-y-[2px]',
              ].join(' ')}
            >
              {words[wordIndex].emoji}
            </button>
          );
        })}
      </div>

      {done ? (
        <div className="flex items-center gap-[12px]">
          <span className="text-[18px] font-bold text-[var(--dpl-slide-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            ✨ All matched!
          </span>
          <BigButton label="New round ▶" onClick={nextRound} accent />
        </div>
      ) : (
        <p className="text-[13.5px] text-[var(--dpl-slide-ink3)]">Find the one that is the same.</p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- i-spy -- */

export function ISpyWork() {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<'right' | 'wrong' | null>(null);

  // Pending timers: the wrong-flash reset and the delayed phoneme. Both are
  // cleared on new taps/rounds/unmount so a stale timeout can never wipe a
  // just-earned "right" (audit finding 1) or speak on another screen.
  const wrongTimer = useRef<number | null>(null);
  const phonemeTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
      if (phonemeTimer.current !== null) window.clearTimeout(phonemeTimer.current);
    },
    []
  );

  const { target, options } = getISpyRound(round);

  const spy = () => {
    speakSentence('I spy, with my little eye, something that begins with');
    if (phonemeTimer.current !== null) window.clearTimeout(phonemeTimer.current);
    phonemeTimer.current = window.setTimeout(() => speakPhoneme(target.firstSound), 2600);
  };

  const pick = (o: PictureWord) => {
    if (result !== null) return; // blocked during BOTH the win state and the wrong flash
    if (o.word === target.word) {
      setResult('right');
      speakWord(o.word);
    } else {
      setResult('wrong');
      if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
      wrongTimer.current = window.setTimeout(() => setResult(null), 700);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-[22px]">
      <BigButton label={`🔊 I spy… something that begins with /${target.firstSound}/`} onClick={spy} accent />

      <div className="flex items-center gap-[16px]">
        {options.map((o) => (
          <button
            key={o.word}
            type="button"
            onClick={() => pick(o)}
            className={[
              'flex h-[130px] w-[130px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 text-[62px] transition-all',
              result === 'right' && o.word === target.word
                ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] shadow-lg'
                : 'border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] hover:-translate-y-[2px]',
            ].join(' ')}
          >
            {o.emoji}
          </button>
        ))}
      </div>

      {result === 'right' ? (
        <div className="flex items-center gap-[12px]">
          <span className="text-[18px] font-bold text-[var(--dpl-slide-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            ✨ {target.emoji} {target.word}!
          </span>
          <BigButton
            label="Play again ▶"
            onClick={() => {
              setRound(round + 1);
              setResult(null);
            }}
            accent
          />
        </div>
      ) : (
        <p className="text-[13.5px] text-[var(--dpl-slide-ink3)]">Ears only — no letters anywhere.</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- hearts -- */

export function HeartsWork() {
  const [lesson, setLesson] = useState(13);
  const hearts = heartWordsSoFar(lesson);

  return (
    <div className="flex w-full flex-col items-center gap-[22px]">
      <div className="flex flex-wrap items-center justify-center gap-[14px]">
        {hearts.length === 0 ? (
          <p className="text-[15px] italic text-[var(--dpl-slide-ink3)]">
            No heart words yet at this lesson — the first one arrives with the readers.
          </p>
        ) : null}
        {hearts.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => speakWord(w)}
            className="flex flex-col items-center rounded-[var(--dpl-r-md)] border-2 border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] px-[30px] py-[16px]"
          >
            <span className="text-[13px]">🖤</span>
            <span className="text-[42px] font-bold text-[var(--dpl-chip-on-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
              {w}
            </span>
          </button>
        ))}
      </div>
      <p className="max-w-[420px] text-center text-[13.5px] text-[var(--dpl-slide-ink3)]">
        Learned by heart, never sounded out. Tap to hear — the ring grows with the lessons.
      </p>
      <div className="flex items-center gap-[10px]">
        <BigButton label="◀ Earlier" onClick={() => setLesson(Math.max(1, lesson - 6))} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--dpl-slide-ink3)]">by lesson {lesson}</span>
        <BigButton label="Later ▶" onClick={() => setLesson(Math.min(49, lesson + 6))} accent />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- books -- */

export function BooksWork({ which, lessons }: { which: 'books' | 'readers'; lessons: [number, number] }) {
  const items = getJourneyBooks(which, lessons);
  const [failed, setFailed] = useState<Set<string>>(new Set());

  return (
    <div className="flex w-full flex-col items-center gap-[18px]">
      <div className="grid max-h-[380px] grid-cols-3 gap-[14px] overflow-y-auto p-1 sm:grid-cols-4">
        {items.map((b) => {
          const cover = !failed.has(b.slug) ? (
            // eslint-disable-next-line @next/next/no-img-element -- cover asset with designed fallback
            <img
              src={b.coverUrl}
              alt={b.title}
              onError={() => setFailed((f) => new Set(f).add(b.slug))}
              className="h-[150px] w-[120px] rounded-[var(--dpl-r-sm)] border border-[var(--dpl-slide-line)] bg-white object-cover shadow-md"
            />
          ) : (
            /* No cover art in the bucket (readers ship as PDFs) — render a
               DESIGNED cover, never a placeholder. */
            <span className="flex h-[150px] w-[120px] flex-col justify-between rounded-[var(--dpl-r-sm)] border border-[var(--dpl-slide-line)] bg-white px-[10px] py-[10px] text-left shadow-md">
              <span className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[var(--dpl-slide-accent)]">
                {b.kind === 'reader' ? 'Easy Reader' : 'Letter Book'}
              </span>
              <span
                className="text-[16px] font-bold leading-[1.15] text-[var(--dpl-slide-ink)]"
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {b.title}
              </span>
              <span className="h-[5px] w-[38px] rounded-full bg-[var(--dpl-slide-accent)] opacity-70" />
            </span>
          );
          return (
            <figure key={b.slug + b.displayN} className="flex w-[128px] flex-col items-center gap-[6px]">
              {b.pdfUrl ? (
                <a href={b.pdfUrl} target="_blank" rel="noreferrer" title={`open ${b.title} — read it now`} className="transition-transform hover:-translate-y-[2px]">
                  {cover}
                </a>
              ) : (
                cover
              )}
              <figcaption className="text-center text-[11.5px] font-semibold leading-tight text-[var(--dpl-slide-ink2)]">
                {b.title}
                <span className="block text-[10px] font-normal text-[var(--dpl-slide-ink3)]">
                  lesson {b.displayN}
                  {b.pdfUrl ? ' · tap to read' : ''}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="text-[13px] text-[var(--dpl-slide-ink3)]">
        {which === 'books' ? 'Unlocked in lesson order — I read the words, you shout the pictures.' : 'Each one 100% decodable the day it appears — tap a book to open and read it.'}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- guide -- */

export function GuideWork({ lines }: { lines: string[] }) {
  return (
    <div className="flex w-full flex-col items-center gap-[10px]">
      {lines.map((line, i) => (
        <p
          key={i}
          className={
            i === lines.length - 1
              ? 'mt-3 text-[15px] italic text-[var(--dpl-slide-ink3)]'
              : 'text-[24px] font-bold text-[var(--dpl-slide-ink)]'
          }
          style={i === lines.length - 1 ? undefined : { fontFamily: 'var(--dpl-font-display)' }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}
