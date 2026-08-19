'use client';

/**
 * Stage — the light/cream courseware surface that sits inside the near-black chrome.
 *
 * This is the "lit stage" of the Midnight Studio skin: everything around it is
 * #0B0B12, the slide itself stays #FFFCF4 so the courseware reads like paper.
 *
 * Renders the ACTIVE scene generically from `scenes` — nothing about the letter
 * `s` is hardcoded; the snake drawing is only a fallback illustration used when
 * the hero scene has no resolved `mediaUrl` yet.
 *
 * Visual source of truth: mockups/draft-a-midnight-studio.html (.stage/.slide).
 */

import { useEffect, useState, type ReactNode } from 'react';

/* -------------------------------------------------------------------------- */
/* Scene types                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The scene union now comes from the adapter itself (Phase 2 integration — the
 * local re-declaration that used to live here is gone). Re-exported so the
 * pages/components that imported the type FROM Stage keep compiling.
 */
export type { LiveLessonScene } from '@/lib/montree/dark-phonics/live-lesson';
import type { LiveLessonScene } from '@/lib/montree/dark-phonics/live-lesson';

export interface StageProps {
  scenes: LiveLessonScene[];
  /** Index into `scenes` of the scene currently on the board. */
  activeSceneIndex: number;
  lessonNumber: number;
  /** Which word chip the teacher is currently circling. -1 / undefined = none. */
  activeWordIndex?: number;
  /**
   * Tracing happens on a paper worksheet at home, watched over the video
   * call — not a whiteboard scene (no such asset exists in the real bucket).
   * The teacher toggles this step manually; it's independent of `scenes`.
   */
  tracingStepActive?: boolean;
  /** Tracing cells the teacher has marked complete via the video call. */
  tracingCompleted?: number;
  /**
   * Still image to fall back to when the hero VIDEO can't play (missing object
   * in the bucket, unsupported codec, offline). Normally the lesson's own song
   * card: `lessonPictureUrl(lessonNumber)` from the adapter. When this fails
   * too, the snake drawing is the last resort — a lesson never renders a broken
   * media box mid-class.
   */
  heroFallbackUrl?: string;
  /** Parent view drops the teacher-only micro-copy. */
  role?: 'teacher' | 'parent';
}

/* -------------------------------------------------------------------------- */
/* Small visual primitives lifted from the mockup                              */
/* -------------------------------------------------------------------------- */

/** Hand-drawn squiggle underline next to a block title. */
function Squiggle() {
  return (
    <svg
      className="h-[9px] w-[64px] flex-none text-[var(--dpl-squig)]"
      style={{ opacity: 'var(--dpl-squig-op)' }}
      viewBox="0 0 180 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M3 8.4c22-6.4 44-6.6 66-1.2 22 5.4 44 5.2 66-1.4 15-4.6 30-5 45-1.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * The hand-drawn annotation circle. Rendered as an absolutely-positioned layer
 * over whichever chip is active, so it can move without re-laying-out the row.
 */
function AnnotationCircle() {
  return (
    <svg
      className="pointer-events-none absolute -left-[14px] -top-[13px] h-[calc(100%+26px)] w-[calc(100%+28px)] text-[var(--dpl-annot)]"
      viewBox="0 0 200 92"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 20C42 6 152 4 180 22c22 14 12 52-16 62-30 11-124 12-148-4C-3 68 0 34 22 22"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M28 16C56 3 158 6 184 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

/** Fallback illustration for a letter card with no resolved media asset. */
function SnakeFallback() {
  return (
    <svg className="mt-[14px] h-[112px] w-[176px]" viewBox="0 0 150 96" fill="none" aria-hidden="true">
      <path
        d="M104 24C88 12 58 16 58 32c0 17 42 14 42 32 0 15-30 20-52 10"
        stroke="var(--dpl-snake-2)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M104 24C88 12 58 16 58 32c0 17 42 14 42 32 0 15-30 20-52 10"
        stroke="var(--dpl-snake-1)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <circle cx="72" cy="30" r="2.4" fill="var(--dpl-snake-2)" />
      <circle cx="88" cy="46" r="2.4" fill="var(--dpl-snake-2)" />
      <circle cx="82" cy="70" r="2.4" fill="var(--dpl-snake-2)" />
      <ellipse cx="110" cy="20" rx="14" ry="11.5" fill="var(--dpl-snake-1)" />
      <circle cx="115" cy="16.5" r="2.6" fill="#1b1720" />
      <circle cx="116" cy="15.6" r=".9" fill="#fff" />
      <path d="M123 22l8 3.2M131 19.6l-8 2.4" stroke="var(--dpl-snake-3)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The hero asset in the letter-card column, with a graceful ladder:
 *   video → still picture → the snake drawing.
 *
 * Media lives in a Supabase bucket behind the media proxy and is NOT guaranteed
 * to exist for every one of the 49 lessons (the library page gates on a
 * /api/montree/phonics-videos probe for exactly this reason). A live class must
 * never show a broken player, so each step demotes itself on `onError`.
 */
function HeroMedia({
  scene,
  fallbackUrl,
  showControls,
}: {
  scene?: Extract<LiveLessonScene, { type: 'hero' }>;
  fallbackUrl?: string;
  showControls?: boolean;
}) {
  type Step = 'primary' | 'still' | 'drawing';
  const [step, setStep] = useState<Step>('primary');

  // A new lesson (or a scene swap) re-arms the ladder.
  useEffect(() => {
    setStep('primary');
  }, [scene?.mediaUrl, fallbackUrl]);

  const frame = 'mt-[14px] h-[112px] w-[176px] rounded-[var(--dpl-r-sm)]';

  if (scene && step === 'primary' && scene.mediaUrl) {
    if (scene.kind === 'video') {
      return (
        // Trap-beat song video for this lesson — the actual hook of Dark
        // Phonics. Muted by default; the teacher unmutes to play it live.
        <video
          src={scene.mediaUrl}
          muted
          playsInline
          controls={showControls}
          onError={() => setStep(fallbackUrl ? 'still' : 'drawing')}
          className={`${frame} object-cover`}
        />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element -- media-proxy asset
      <img
        src={scene.mediaUrl}
        alt={scene.title}
        onError={() => setStep(fallbackUrl ? 'still' : 'drawing')}
        className={`${frame} object-contain`}
      />
    );
  }

  if (step !== 'drawing' && fallbackUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- media-proxy asset
      <img
        src={fallbackUrl}
        alt={scene?.title ?? ''}
        onError={() => setStep('drawing')}
        className={`${frame} object-contain`}
      />
    );
  }

  return <SnakeFallback />;
}

function BlockHead({ title, note }: { title: string; note?: string }) {
  return (
    <div className="flex items-center gap-[10px]">
      <span
        className="flex-none text-[13px] font-bold tracking-[0.02em] text-[var(--dpl-slide-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {title}
      </span>
      <Squiggle />
      {note ? <span className="ml-auto text-[11px] tracking-[0.04em] text-[var(--dpl-slide-ink3)]">{note}</span> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Scene bodies                                                                */
/* -------------------------------------------------------------------------- */

function WordChips({ words, activeWordIndex }: { words: string[]; activeWordIndex?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {words.map((word, i) => {
        const active = i === activeWordIndex;
        return (
          <span key={`${word}-${i}`} className="relative inline-flex">
            <span
              className={[
                'inline-flex min-w-[122px] items-center justify-center rounded-[var(--dpl-r-md)] border px-[22px] py-4',
                'text-[32px] font-bold tracking-[0.01em]',
                active
                  ? 'border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] text-[var(--dpl-chip-on-ink)]'
                  : 'border-[var(--dpl-chip-line)] bg-[var(--dpl-chip-bg)] text-[var(--dpl-slide-ink)]',
              ].join(' ')}
              style={{
                fontFamily: 'var(--dpl-font-display)',
                boxShadow: active ? 'var(--dpl-chip-on-shadow)' : undefined,
              }}
            >
              {word}
            </span>
            {active ? <AnnotationCircle /> : null}
          </span>
        );
      })}
    </div>
  );
}

function TracingStrip({
  letter,
  completed = 0,
  cells = 3,
  showHint = true,
}: {
  letter: string;
  completed?: number;
  cells?: number;
  showHint?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--dpl-r-md)] border border-dashed border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-bg)] px-5 py-4">
      {Array.from({ length: cells }, (_, i) => {
        const done = i < completed;
        return (
          <div
            key={i}
            className={[
              'relative h-[104px] w-[96px] rounded-[var(--dpl-r-sm)] border',
              done
                ? 'border-[var(--dpl-trace-done-line)] bg-[var(--dpl-trace-cell-done)]'
                : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-cell)]',
            ].join(' ')}
          >
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 96 104" fill="none">
              <text
                x="48"
                y="82"
                textAnchor="middle"
                fill="none"
                stroke="var(--dpl-trace-ghost)"
                strokeWidth="2.6"
                strokeDasharray="2.6 7.4"
                strokeLinecap="round"
                style={{ fontFamily: 'var(--dpl-font-display)', fontSize: '132px', fontWeight: 700 }}
              >
                {letter}
              </text>
              {done ? (
                <g transform="rotate(-1.6 48 62)">
                  <text
                    x="48"
                    y="82"
                    textAnchor="middle"
                    fill="var(--dpl-trace-ink)"
                    stroke="var(--dpl-trace-ink)"
                    strokeWidth="3.4"
                    strokeLinejoin="round"
                    opacity=".9"
                    style={{ fontFamily: 'var(--dpl-font-display)', fontSize: '132px', fontWeight: 700 }}
                  >
                    {letter}
                  </text>
                </g>
              ) : null}
              <circle cx="66" cy="36" r="3.8" fill="var(--dpl-trace-ink)" opacity={done ? 1 : 0.55} />
            </svg>
            {done ? (
              <span className="absolute -right-[7px] -top-[7px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--dpl-ok)] text-[var(--dpl-ok-ink)]">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4.5 12.6l4.8 4.8 10-11" />
                </svg>
              </span>
            ) : null}
          </div>
        );
      })}
      {showHint ? (
        <div className="ml-auto flex flex-col items-end gap-[3px] pr-1 text-right">
          <span
            className="text-[20px] font-bold tracking-[0.14em] text-[var(--dpl-slide-ink2)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {[letter, letter, letter].join(' — ')}
          </span>
          <span className="text-[11px] text-[var(--dpl-slide-ink3)]">{cells} tries, then the snake wins</span>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stage                                                                       */
/* -------------------------------------------------------------------------- */

const STEP_FOR_SCENE: Record<LiveLessonScene['type'], 'Say it' | 'Read it'> = {
  hero: 'Say it',
  'word-chips': 'Read it',
  'decodable-words': 'Read it',
  'heart-words': 'Read it',
  'book-cover': 'Read it',
};

const STEPS = ['Say it', 'Read it', 'Trace it'] as const;

export default function Stage({
  scenes,
  activeSceneIndex,
  lessonNumber,
  activeWordIndex,
  tracingStepActive = false,
  tracingCompleted = 0,
  heroFallbackUrl,
  role = 'teacher',
}: StageProps) {
  const active = scenes[activeSceneIndex];
  // The hero scene stays pinned in the left column for the whole lesson, as in
  // the mockup — it is the lesson's anchor, not just one slide.
  const heroScene = scenes.find((s): s is Extract<LiveLessonScene, { type: 'hero' }> => s.type === 'hero');
  // Tracing is a teacher-toggled step, not scene-driven — there is no digital
  // tracing asset (it happens on paper via the video call). When toggled on,
  // it overrides whatever the active scene would otherwise imply.
  const currentStep = tracingStepActive ? 'Trace it' : active ? STEP_FOR_SCENE[active.type] : 'Say it';

  let body: ReactNode = null;
  if (tracingStepActive) {
    body = (
      <div className="flex flex-col gap-[14px]">
        <BlockHead title="Trace it" note="on paper — watch over the call" />
        <TracingStrip letter={heroScene?.sound ?? '?'} completed={tracingCompleted} />
      </div>
    );
  } else if (!active) {
    body = (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--dpl-slide-ink3)]">
        No scenes resolved for lesson {lessonNumber}.
      </div>
    );
  } else if (active.type === 'hero') {
    body = (
      <div className="flex flex-col gap-[14px]">
        <BlockHead title="Say the sound" note={role === 'teacher' ? 'model it twice, then they echo' : undefined} />
        <p className="text-[26px] font-bold leading-tight text-[var(--dpl-slide-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
          {active.catchphrase}
        </p>
        <p className="text-[13px] text-[var(--dpl-slide-ink2)]">{active.title}</p>
      </div>
    );
  } else if (active.type === 'word-chips' || active.type === 'heart-words' || active.type === 'decodable-words') {
    const heading =
      active.type === 'word-chips' ? 'Read the words' : active.type === 'decodable-words' ? 'New decodable words' : 'Heart words';
    const note = active.type === 'heart-words' ? 'learn these by heart' : `${active.words.length} words`;
    body = (
      <div className="flex flex-col gap-[14px]">
        <BlockHead title={heading} note={note} />
        <WordChips words={active.words} activeWordIndex={activeWordIndex} />
      </div>
    );
  } else {
    body = (
      <div className="flex min-h-0 flex-1 flex-col gap-[14px]">
        <BlockHead title={active.title} note={active.kind === 'reader' ? 'Easy Reader' : 'Letter book'} />
        {/* eslint-disable-next-line @next/next/no-img-element -- media-proxy asset, no known intrinsic size */}
        <img
          src={active.coverUrl}
          alt={active.title}
          className="min-h-0 flex-1 rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain"
        />
      </div>
    );
  }

  return (
    <section
      className="flex min-h-0 flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
      style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
    >
      {/* window-chrome dots + scene counter */}
      <div className="flex items-center gap-[6px] px-[6px]">
        <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-1)]" />
        <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-2)]" />
        <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-3)]" />
        <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--dpl-ink3)]">
          courseware · slide {Math.min(activeSceneIndex + 1, scenes.length)} of {scenes.length}
        </span>
      </div>

      {/* the cream slide */}
      <div
        className="flex min-h-0 flex-1 flex-col gap-[var(--dpl-s3)] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-edge)] bg-[var(--dpl-slide-bg)] px-[30px] pb-7 pt-[26px] text-[var(--dpl-slide-ink)]"
        style={{ boxShadow: 'var(--dpl-slide-shadow)' }}
      >
        <div className="flex items-center justify-between">
          <div
            className="text-[12px] uppercase tracking-[0.16em] text-[var(--dpl-slide-ink2)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            Lesson {lessonNumber} <b className="text-[var(--dpl-slide-accent)]">·</b> Sound of the day
          </div>
          <div className="flex items-center gap-[6px]">
            {STEPS.map((step) => {
              const now = step === currentStep;
              const done = STEPS.indexOf(step) < STEPS.indexOf(currentStep);
              return (
                <span
                  key={step}
                  className={[
                    'rounded-full border px-[13px] py-[6px] text-[11.5px] font-semibold',
                    now
                      ? 'border-[var(--dpl-slide-accent)] bg-[var(--dpl-slide-accent)] text-[var(--dpl-slide-on-accent)]'
                      : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] text-[var(--dpl-slide-ink2)]',
                    done ? 'opacity-75' : '',
                  ].join(' ')}
                >
                  {step}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,286px)_minmax(0,1fr)] gap-7">
          {/* ---- left: letter card ---- */}
          <div
            className="relative flex flex-col items-center justify-center gap-[2px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-lc-line)] bg-[var(--dpl-lc-bg)] px-4 pb-[22px] pt-[18px]"
            style={{ boxShadow: 'var(--dpl-lc-shadow)' }}
          >
            <div className="text-[9.5px] uppercase tracking-[0.18em] text-[var(--dpl-slide-ink3)]">
              letter card {String(lessonNumber).padStart(2, '0')}
            </div>
            <div
              className="mt-[6px] text-[118px] font-bold leading-none tracking-[-0.02em] text-[var(--dpl-slide-accent)]"
              style={{ fontFamily: 'var(--dpl-font-display)', textShadow: '0 6px 18px rgba(109,40,217,.18)' }}
            >
              {heroScene ? `${heroScene.sound.toUpperCase()}${heroScene.sound.toLowerCase()}` : '—'}
            </div>
            <div
              className="text-[16px] font-semibold text-[var(--dpl-slide-accent-2)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              /{heroScene?.sound ?? ''}/
            </div>
            <HeroMedia
              scene={heroScene}
              fallbackUrl={heroFallbackUrl}
              showControls={role === 'teacher'}
            />
            <div className="mt-1 text-[13px] font-semibold uppercase tracking-[0.2em] text-[var(--dpl-slide-ink2)]">
              {heroScene?.title ?? ''}
            </div>
          </div>

          {/* ---- right: active scene ---- */}
          <div className="flex min-w-0 flex-col justify-evenly gap-[30px]">{body}</div>
        </div>
      </div>
    </section>
  );
}
