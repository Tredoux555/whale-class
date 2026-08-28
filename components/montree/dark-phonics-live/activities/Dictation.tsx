'use client';

/**
 * Tray 4 — Dictation, digitised.
 *
 * Encoding's finish line: the child HEARS the word, says it back, and writes
 * it on real paper at home (watched over the video call — same philosophy as
 * the tracing step: paper + camera, not a screen keyboard). The screen shows
 * only a listening card until the teacher reveals the answer for self-check.
 */

import { speakSegmented, speakSlow, speakWord } from '@/lib/montree/dark-phonics/speech';
import type { ActivityWord, LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

export default function Dictation({
  word,
  state,
  role,
}: {
  word: ActivityWord;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
}) {
  return (
    <div className="flex flex-col items-center gap-[26px]">
      {state.revealed ? (
        <div className="flex flex-col items-center gap-[16px]">
          <span
            className="rounded-[var(--dpl-r-md)] border-2 border-[var(--dpl-chip-on-line)] bg-[var(--dpl-chip-on-bg)] px-[44px] py-[20px] text-[64px] font-bold text-[var(--dpl-chip-on-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)', boxShadow: 'var(--dpl-chip-on-shadow)' }}
          >
            {word.word}
          </span>
          <p className="text-[14px] text-[var(--dpl-slide-ink3)]">
            Check your paper — every sound there? Fix it if not, that&rsquo;s the work!
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-[16px]">
          <span className="flex h-[150px] w-[290px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 border-dashed border-[var(--dpl-slide-line)] bg-[var(--dpl-trace-bg)] text-[54px]">
            👂 ✏️
          </span>
          <p className="max-w-[380px] text-center text-[14px] text-[var(--dpl-slide-ink3)]">
            Listen… say it back… now write it on your paper. Sound boxes in your head!
          </p>
        </div>
      )}

      {/* local hear-again buttons — a gesture, so TTS always allowed */}
      <div className="flex items-center gap-[10px]">
        <SpeakButton label="🔊 Hear it" onClick={() => speakWord(word.word)} />
        <SpeakButton label="🐌 Slowly" onClick={() => speakSlow(word.word)} />
        {state.revealed ? (
          <SpeakButton label="🧩 Sound by sound" onClick={() => speakSegmented(word.graphemes, word.word)} />
        ) : null}
      </div>
      {role === 'parent' ? (
        <p className="text-[11.5px] text-[var(--dpl-slide-ink3)]">Tap a button any time — the robot voice never gets tired.</p>
      ) : null}
    </div>
  );
}

function SpeakButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[18px] py-[9px] text-[14px] font-semibold text-[var(--dpl-slide-ink2)] hover:-translate-y-[1px]"
      style={{ fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}
