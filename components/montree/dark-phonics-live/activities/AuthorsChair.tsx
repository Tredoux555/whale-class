'use client';

/**
 * Tray 7 — Author's Chair, digitised.
 *
 * He talks, you write — WORD FOR WORD, never tidied ("the dog got on the bus"
 * stays exactly as told). The teacher types into the scribe pad and the story
 * appears in big print on both screens: the child watching their own words
 * become print IS the lesson. Nothing is marked or corrected; the audience is
 * the control of error. The drawing underneath happens on paper.
 *
 * Synced cursor: `text` (capped, debounced so typing doesn't spam the wire).
 */

import { useEffect, useRef, useState } from 'react';

import { speakSentence } from '@/lib/montree/dark-phonics/speech';
import { ACTIVITY_TEXT_MAX, type LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

export default function AuthorsChair({
  state,
  role,
  onPatch,
}: {
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  onPatch?: (patch: Partial<LiveActivityState>) => void;
}) {
  const isTeacher = role === 'teacher';
  const synced = state.text ?? '';

  // Teacher types locally; the synced patch trails by a short debounce.
  const [draft, setDraft] = useState(synced);
  const debounceRef = useRef<number | null>(null);
  const lastSyncedRef = useRef(synced);

  // Adopt outside changes (fresh tray, "New story", another device) that we
  // didn't type — and CANCEL any in-flight debounce, or a stale timeout fires
  // afterwards and resurrects the old text (audit finding 1).
  useEffect(() => {
    if (!isTeacher) return;
    if (synced !== lastSyncedRef.current && synced !== draft) {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setDraft(synced);
    }
    lastSyncedRef.current = synced;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- adopt on synced change only
  }, [synced, isTeacher]);

  const type = (value: string) => {
    const next = value.slice(0, ACTIVITY_TEXT_MAX);
    setDraft(next);
    if (!onPatch) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onPatch({ text: next });
    }, 600);
  };

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    },
    []
  );

  const story = isTeacher ? draft : synced;

  return (
    <div className="flex w-full flex-col items-center gap-[20px]">
      {/* the story, in print */}
      <div className="flex min-h-[150px] w-full max-w-[620px] flex-col justify-center rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-bg)] px-[26px] py-[20px]">
        {story ? (
          <p
            className="whitespace-pre-wrap text-[30px] font-bold leading-[1.45] text-[var(--dpl-slide-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {story}
          </p>
        ) : (
          <p className="text-center text-[15px] italic text-[var(--dpl-slide-ink3)]">
            {isTeacher ? 'His words appear here as you scribe them…' : 'The story is coming…'}
          </p>
        )}
      </div>

      {isTeacher ? (
        <textarea
          value={draft}
          onChange={(e) => type(e.target.value)}
          rows={3}
          placeholder='Scribe it word for word — "Tell me the story. I&apos;ll write down exactly what you say."'
          className="w-full max-w-[620px] rounded-[var(--dpl-r-sm)] border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[14px] py-[10px] text-[15px] text-[var(--dpl-slide-ink)]"
        />
      ) : null}

      <div className="flex items-center gap-[10px]">
        {story ? (
          <button
            type="button"
            onClick={() => speakSentence(story)}
            className="rounded-full border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[18px] py-[9px] text-[14px] font-semibold text-[var(--dpl-slide-ink2)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            🔊 Read the story back
          </button>
        ) : null}
        <span className="text-[12px] text-[var(--dpl-slide-ink3)]">
          {story
            ? '🪑 Author to the chair — draw your picture, then cast your actors!'
            : ''}
        </span>
      </div>
    </div>
  );
}
