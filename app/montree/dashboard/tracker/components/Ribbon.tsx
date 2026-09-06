'use client';

// The ribbon: one small block per Dark Phonics letter, in book order.
//
// Rule 8 — it is DERIVED. The server sends `ribbon` already computed from the
// journal (derive.ts ribbon()); this component only paints it. Gold = the
// letter's five works are mastered. Emerald = started. Muted = untouched.
// Dashed = a book that is not published yet, so it is not a gap, it is a
// "coming".

import { TRACKER_LETTERS } from '@/lib/montree/dark-phonics/tracker-works';
import { RIBBON_STYLE, T } from './theme';
import type { RibbonState } from './types';

export default function Ribbon({
  ribbon,
  size = 'tiny',
  highlight,
}: {
  ribbon: Record<string, RibbonState>;
  size?: 'tiny' | 'big';
  highlight?: string | null;
}) {
  const box = size === 'big' ? 44 : 22;
  const font = size === 'big' ? 17 : 11;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: size === 'big' ? 7 : 3 }}>
      {TRACKER_LETTERS.map((l) => {
        const state = ribbon[l.letter] ?? (l.status === 'coming' ? 'coming' : 'not-started');
        const isHi = highlight === l.letter;
        return (
          <span
            key={l.letter}
            title={`${l.letter} · ${l.bookTitle} · ${state.replace('-', ' ')}`}
            style={{
              ...RIBBON_STYLE[state],
              width: box,
              height: box,
              borderRadius: size === 'big' ? 10 : 5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T.serif,
              fontSize: font,
              fontWeight: 600,
              lineHeight: 1,
              outline: isHi ? `2px solid ${T.gold}` : undefined,
              outlineOffset: 2,
            }}
          >
            {l.letter}
          </span>
        );
      })}
    </div>
  );
}
