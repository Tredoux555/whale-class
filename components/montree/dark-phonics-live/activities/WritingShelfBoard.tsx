'use client';

/**
 * WritingShelfBoard — the whole 8-tray Writing Shelf on ONE screen, driven by
 * LOCAL state. This is the classroom/teacher surface: a teacher at school
 * opens it on the big screen or a tablet next to the PHYSICAL shelf and works
 * a tray with the class — no login-bound appointment, no syncing, nothing
 * saved. The live 1-on-1 classroom uses the same tray components with the
 * synced cursor instead; this board and that stage can never drift apart
 * because they render identical components.
 *
 * Used by:
 *   - /montree/dashboard/games/writing-shelf  (the teachers' tool)
 *   - /montree/dev/writing-shelf-preview      (no-auth preview of the same)
 */

import { useMemo, useState } from 'react';

import Stage from '@/components/montree/dark-phonics-live/Stage';
import {
  DARK_PHONICS_LESSON_COUNT,
  getLiveLessonScenes,
  lessonPictureUrl,
} from '@/lib/montree/dark-phonics/live-lesson';
import {
  DEFAULT_ACTIVITY_STATE,
  getWritingShelf,
  type ActivityType,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';
import { TRAY_LABELS } from '@/lib/montree/dark-phonics/writing-shelf-language';

export default function WritingShelfBoard({
  subtitle = 'work a tray with the class · nothing is saved',
  initialLesson = 10,
  initialTray = 'sound-boxes',
}: {
  subtitle?: string;
  initialLesson?: number;
  initialTray?: ActivityType;
}) {
  const [lessonNumber, setLessonNumber] = useState(initialLesson);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [activityType, setActivityType] = useState<ActivityType>(initialTray);
  const [activityState, setActivityState] = useState<LiveActivityState>({ ...DEFAULT_ACTIVITY_STATE });

  const scenes = useMemo(() => getLiveLessonScenes(lessonNumber), [lessonNumber]);
  const shelf = useMemo(() => getWritingShelf(lessonNumber), [lessonNumber]);
  const heroFallbackUrl = useMemo(() => lessonPictureUrl(lessonNumber), [lessonNumber]);
  const clampedScene = Math.min(sceneIndex, Math.max(scenes.length - 1, 0));

  const pickLesson = (n: number) => {
    setLessonNumber(n);
    setSceneIndex(0);
    setActiveWordIndex(-1);
    setActivityState({ ...DEFAULT_ACTIVITY_STATE });
  };

  /** Tray switch. The Tray-5 sentence FOLLOWS the child onto Tray 8 —
   *  the physical shelf's own rule ("6 sentence strips the children built
   *  on Tray 5" live on the grammar tray). */
  const pickTray = (type: ActivityType) => {
    if (type === activityType) return; // re-clicking the active tray must not wipe work
    const carry =
      type === 'grammar-symbols' &&
      activityType === 'sentence-builder' &&
      (activityState.laid?.length ?? 0) > 0
        ? { laid: activityState.laid, punct: activityState.punct }
        : {};
    setActivityType(type);
    setActivityState({ ...DEFAULT_ACTIVITY_STATE, ...carry });
  };

  return (
    <div
      className="flex min-h-screen flex-col gap-[14px] bg-[var(--dpl-chrome)] p-[18px]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {/* header */}
      <div className="flex flex-wrap items-center gap-[12px]">
        <span
          className="text-[15px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          The Writing Shelf
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">{subtitle}</span>
        <label className="ml-auto flex items-center gap-[8px] text-[12px] text-[var(--dpl-ink2)]">
          Lesson
          <select
            value={lessonNumber}
            onChange={(e) => pickLesson(Number(e.target.value))}
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[10px] py-[6px] text-[13px] text-[var(--dpl-ink)]"
          >
            {Array.from({ length: DARK_PHONICS_LESSON_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* the shelf — two rows of four, like the cupboard */}
      <div
        className="flex flex-col gap-[8px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] py-[10px]"
        style={{ boxShadow: 'var(--dpl-shadow)' }}
      >
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="w-[70px] text-[10px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">shelf 1</span>
          {shelf.slice(0, 4).map(({ type, activity }, i) => (
            <BoardButton
              key={type}
              label={`${i + 1} · ${TRAY_LABELS[type]}`}
              active={activityType === type}
              disabled={!activity}
              onClick={() => pickTray(type)}
            />
          ))}
          <span className="ml-auto">
            <BoardButton label="Lesson slides" active={activityType === 'none'} onClick={() => pickTray('none')} />
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className="w-[70px] text-[10px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">shelf 2</span>
          {shelf.slice(4).map(({ type, activity }, i) => (
            <BoardButton
              key={type}
              label={`${i + 5} · ${TRAY_LABELS[type]}`}
              active={activityType === type}
              disabled={!activity}
              onClick={() => pickTray(type)}
            />
          ))}
          {activityType === 'none' ? (
            <span className="ml-auto flex items-center gap-[8px]">
              <BoardButton label="◀" onClick={() => setSceneIndex(Math.max(0, clampedScene - 1))} disabled={clampedScene <= 0} />
              <span className="text-[11px] text-[var(--dpl-ink3)]">
                slide {scenes.length === 0 ? 0 : clampedScene + 1}/{scenes.length}
              </span>
              <BoardButton
                label="▶"
                onClick={() => setSceneIndex(Math.min(scenes.length - 1, clampedScene + 1))}
                disabled={clampedScene >= scenes.length - 1}
              />
              <BoardButton label="word +" onClick={() => setActiveWordIndex((w) => w + 1)} />
            </span>
          ) : null}
        </div>
      </div>

      {/* the real Stage, real trays, local state */}
      <div className="min-h-0 flex-1">
        <Stage
          scenes={scenes}
          activeSceneIndex={clampedScene}
          lessonNumber={lessonNumber}
          activeWordIndex={activeWordIndex}
          heroFallbackUrl={heroFallbackUrl}
          role="teacher"
          activityType={activityType}
          activityState={activityState}
          onActivityPatch={(patch) => setActivityState((s) => ({ ...s, ...patch }))}
        />
      </div>
    </div>
  );
}

function BoardButton({
  label,
  onClick,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[12px] py-[7px] text-[11.5px] font-semibold transition-opacity disabled:opacity-40',
        active
          ? 'border-[var(--dpl-accent2)] text-[var(--dpl-accent2)]'
          : 'border-[var(--dpl-line)] text-[var(--dpl-ink2)]',
      ].join(' ')}
      style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}
