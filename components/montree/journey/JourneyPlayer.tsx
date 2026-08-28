'use client';

/**
 * JourneyPlayer — the English Journey as a PLATFORM, not a directory.
 *
 * The Writing Shelf model applied end-to-end: dark Midnight Studio chrome,
 * one lit cream slide, one work on stage at a time. The rail above the slide
 * is the whole navigation: six stages, then that stage's steps. Every step
 * renders INSIDE the slide (songs, letter cards, matching, I Spy, books,
 * heart words, the eight writing trays); nothing links out to old games.
 * Shelf-setup and printables live behind two small footer toggles.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';

import ActivityStage from '@/components/montree/dark-phonics-live/activities/ActivityStage';
import {
  BooksWork,
  GuideWork,
  HeartsWork,
  ISpyWork,
  LetterWork,
  MatchWork,
  SongWork,
} from '@/components/montree/journey/JourneyWorks';
import {
  DEFAULT_ACTIVITY_STATE,
  getWritingShelfActivity,
  type ActivityType,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';
import { JOURNEY, type JourneyStep } from '@/lib/montree/journey/journey-data';

export default function JourneyPlayer() {
  const [stageIndex, setStageIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [showShelf, setShowShelf] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const stage = JOURNEY[stageIndex];
  const step = stage.steps[Math.min(stepIndex, stage.steps.length - 1)];

  const pickStage = (i: number) => {
    setStageIndex(i);
    setStepIndex(0);
    setShowShelf(false);
    setShowPrint(false);
  };
  const pickStep = (i: number) => {
    setStepIndex(i);
    setShowShelf(false);
    setShowPrint(false);
  };

  /** Flat prev/next across the whole journey. */
  const go = (delta: number) => {
    let s = stageIndex;
    let t = stepIndex + delta;
    while (t < 0 && s > 0) {
      s -= 1;
      t = JOURNEY[s].steps.length - 1;
    }
    while (s < JOURNEY.length && t >= JOURNEY[s].steps.length) {
      if (s === JOURNEY.length - 1) return;
      s += 1;
      t = 0;
    }
    if (t < 0) return;
    setStageIndex(s);
    setStepIndex(t);
    setShowShelf(false);
    setShowPrint(false);
  };

  return (
    <div
      className="flex min-h-screen flex-col gap-[12px] bg-[var(--dpl-chrome)] p-[16px]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {/* chrome header */}
      <div className="flex flex-wrap items-center gap-[12px]">
        <span className="text-[15px] font-bold text-[var(--dpl-ink)]" style={{ fontFamily: 'var(--dpl-font-display)' }}>
          The English Journey
        </span>
        <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--dpl-ink3)]">
          matching → sounds → words → reading → writing
        </span>
      </div>

      {/* stage rail */}
      <div
        className="flex flex-wrap items-center gap-[8px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[12px] py-[9px]"
        style={{ boxShadow: 'var(--dpl-shadow)' }}
      >
        {JOURNEY.map((s, i) => (
          <RailButton
            key={s.slug}
            label={`${s.number} · ${s.title}`}
            sub={s.ages}
            active={i === stageIndex}
            onClick={() => pickStage(i)}
          />
        ))}
      </div>

      {/* step rail */}
      <div className="flex flex-wrap items-center gap-[8px] px-[4px]">
        {stage.steps.map((st, i) => (
          <button
            key={st.slug}
            type="button"
            onClick={() => pickStep(i)}
            className={[
              'rounded-full border px-[14px] py-[7px] text-[12px] font-semibold transition-all',
              i === Math.min(stepIndex, stage.steps.length - 1)
                ? 'border-[var(--dpl-accent2)] text-[var(--dpl-accent2)]'
                : 'border-[var(--dpl-line)] text-[var(--dpl-ink3)] hover:text-[var(--dpl-ink2)]',
            ].join(' ')}
            style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
          >
            {i + 1} · {st.title}
          </button>
        ))}
      </div>

      {/* the lit stage */}
      <section
        className="flex min-h-0 flex-1 flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[14px]"
        style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
      >
        <div className="flex items-center gap-[6px] px-[6px]">
          <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-1)]" />
          <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-2)]" />
          <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-3)]" />
          <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--dpl-ink3)]">
            stage {stage.number} · {stage.title} · step {Math.min(stepIndex, stage.steps.length - 1) + 1} of {stage.steps.length}
          </span>
        </div>

        {/* cream slide */}
        <div
          className="flex min-h-[440px] flex-1 flex-col gap-[16px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-edge)] bg-[var(--dpl-slide-bg)] px-[28px] pb-6 pt-[22px] text-[var(--dpl-slide-ink)]"
          style={{ boxShadow: 'var(--dpl-slide-shadow)' }}
        >
          <div>
            <h2 className="text-[22px] font-bold" style={{ fontFamily: 'var(--dpl-font-display)' }}>
              {step.title}
            </h2>
            <p className="mt-0.5 max-w-[560px] text-[13.5px] text-[var(--dpl-slide-ink2)]">{step.goal}</p>
            {step.script ? (
              <p className="mt-1 text-[12.5px] italic text-[var(--dpl-slide-ink3)]">
                You say, once: &ldquo;{step.script}&rdquo;
              </p>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <WorkBody key={`${stage.slug}-${step.slug}`} step={step} />
          </div>
        </div>

        {/* footer: journey prev/next + the two quiet toggles */}
        <div className="flex flex-wrap items-center gap-[8px] px-[4px]">
          <FooterButton label="◀ Back" onClick={() => go(-1)} />
          <FooterButton label="Next ▶" onClick={() => go(1)} accent />
          <span className="mx-2 h-[16px] w-px bg-[var(--dpl-line)]" />
          {step.shelf ? (
            <FooterButton label={showShelf ? '🧺 shelf ▾' : '🧺 shelf'} onClick={() => setShowShelf(!showShelf)} active={showShelf} />
          ) : null}
          {step.print?.length ? (
            <FooterButton label={showPrint ? '🖨️ print ▾' : '🖨️ print'} onClick={() => setShowPrint(!showPrint)} active={showPrint} />
          ) : null}
        </div>

        {showShelf && step.shelf ? (
          <div className="rounded-[var(--dpl-r-md)] border border-dashed border-[var(--dpl-line-2,var(--dpl-line))] bg-[var(--dpl-chrome2)] px-[14px] py-[10px] text-[12.5px] text-[var(--dpl-ink2)]">
            <b className="text-[var(--dpl-ink)]">On the physical shelf: </b>
            {step.shelf.tray}
            {step.shelf.make?.length ? (
              <span>
                {' · print: '}
                {step.shelf.make.map((l, i) => (
                  <span key={l.href}>
                    {i > 0 ? ' · ' : ''}
                    <Link href={l.href} className="font-semibold text-[var(--dpl-accent2)] underline underline-offset-2">
                      {l.label}
                    </Link>
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        ) : null}

        {showPrint && step.print?.length ? (
          <div className="rounded-[var(--dpl-r-md)] border border-dashed border-[var(--dpl-line-2,var(--dpl-line))] bg-[var(--dpl-chrome2)] px-[14px] py-[10px] text-[12.5px] text-[var(--dpl-ink2)]">
            <b className="text-[var(--dpl-ink)]">For home: </b>
            {step.print.map((l, i) => (
              <span key={l.href}>
                {i > 0 ? ' · ' : ''}
                <Link href={l.href} className="font-semibold text-[var(--dpl-accent2)] underline underline-offset-2">
                  {l.label}
                </Link>
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function WorkBody({ step }: { step: JourneyStep }) {
  const w = step.work;
  switch (w.kind) {
    case 'song':
      return <SongWork lessons={w.lessons} />;
    case 'letter':
      return <LetterWork lessons={w.lessons} />;
    case 'match':
      return <MatchWork />;
    case 'i-spy':
      return <ISpyWork />;
    case 'hearts':
      return <HeartsWork />;
    case 'books':
      return <BooksWork which={w.which} lessons={w.lessons} />;
    case 'guide':
      return <GuideWork lines={w.lines} />;
    case 'tray':
      return <TrayWork tray={w.tray} />;
  }
}

/** One Writing Shelf tray, local state — the same components the live
 *  classroom syncs, embedded in the journey slide. */
function TrayWork({ tray }: { tray: Exclude<ActivityType, 'none'> }) {
  const [lesson, setLesson] = useState(10);
  const [state, setState] = useState<LiveActivityState>({ ...DEFAULT_ACTIVITY_STATE });
  const activity = useMemo(() => getWritingShelfActivity(tray, lesson), [tray, lesson]);

  return (
    <div className="flex w-full flex-col gap-[12px]">
      {activity ? (
        <ActivityStage
          key={`${tray}-${lesson}`}
          activity={activity}
          state={state}
          role="teacher"
          onPatch={(patch) => setState((s) => ({ ...s, ...patch }))}
        />
      ) : (
        <p className="text-center text-[13.5px] text-[var(--dpl-slide-ink3)]">
          Not enough words at lesson {lesson} yet — move the lesson forward.
        </p>
      )}
      <div className="flex items-center justify-center gap-[10px] text-[12px] text-[var(--dpl-slide-ink3)]">
        <FooterButton label="−" onClick={() => { setLesson(Math.max(1, lesson - 1)); setState({ ...DEFAULT_ACTIVITY_STATE }); }} />
        <span className="font-semibold uppercase tracking-[0.12em]">words from lesson {lesson}</span>
        <FooterButton label="+" onClick={() => { setLesson(Math.min(49, lesson + 1)); setState({ ...DEFAULT_ACTIVITY_STATE }); }} />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RailButton({ label, sub, active, onClick }: { label: string; sub: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-start rounded-[var(--dpl-r-sm)] border px-[13px] py-[7px] transition-all',
        active ? 'border-[var(--dpl-accent2)]' : 'border-[var(--dpl-line)] hover:border-[var(--dpl-line-2,var(--dpl-line))]',
      ].join(' ')}
      style={{ background: 'var(--dpl-timer-bg)' }}
    >
      <span
        className={['text-[12px] font-bold', active ? 'text-[var(--dpl-accent2)]' : 'text-[var(--dpl-ink2)]'].join(' ')}
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {label}
      </span>
      <span className="text-[9.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">{sub}</span>
    </button>
  );
}

function FooterButton({ label, onClick, accent, active }: { label: string; onClick: () => void; accent?: boolean; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[13px] py-[7px] text-[11.5px] font-semibold',
        accent
          ? 'border-[var(--dpl-accent2)] text-[var(--dpl-accent2)]'
          : active
            ? 'border-[var(--dpl-line-2,var(--dpl-line))] text-[var(--dpl-ink)]'
            : 'border-[var(--dpl-line)] text-[var(--dpl-ink2)]',
      ].join(' ')}
      style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}
