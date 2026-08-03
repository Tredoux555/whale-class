// components/montree/satpin/DecodableLedger.tsx
//
// The decodable ledger — the crux of the reader series, surfaced in the
// sequence so it can be scanned week by week. NEW words (this week's book)
// are highlighted in the reader red; everything decodable from earlier
// weeks follows muted, newest first (same order as the book REVIEW lists).
// Blocks before the first decode state that plainly.
//
// Shared by the SATPIN series page (/montree/library/satpin) and the Dark
// Phonics programme page — a styling change here lands on both.
'use client';

import React from 'react';

export type DecodableLedgerProps = {
  /** Words INTRODUCED by this block's reader — the red chips, in book order. */
  newWords: string[];
  /** Everything decodable from earlier blocks, ALREADY newest-first. */
  prior: string[];
  /** Every heart word introduced up to and including this block, oldest-first. */
  hearts: string[];
  /** Optional extra content rendered inside the panel, below the heart line
   *  (the satpin page passes its "Word pictures" grid here). */
  children?: React.ReactNode;
};

export default function DecodableLedger({ newWords, prior, hearts, children }: DecodableLedgerProps) {
  const total = newWords.length + prior.length;

  if (total === 0) {
    return (
      <div className="mt-3 text-left text-[11px] text-white/20">
        Decodable words — none yet · sounds only
      </div>
    );
  }

  return (
    <div
      className="mt-3 rounded-xl border px-4 py-3 text-left"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1.5">
        Decodable so far · {total} {total === 1 ? 'word' : 'words'}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5">
        {newWords.map((w) => (
          <span
            key={w}
            className="px-2 py-0.5 rounded-md text-sm font-semibold"
            style={{
              background: 'rgba(198,40,40,0.16)',
              border: '1px solid rgba(248,113,113,0.35)',
              color: 'rgb(252,165,165)',
            }}
          >
            {w}
          </span>
        ))}
        {prior.length > 0 && (
          <span className="text-sm text-white/45 leading-relaxed">{prior.join(' · ')}</span>
        )}
      </div>
      {hearts.length > 0 && (
        <div className="mt-1.5 text-xs" style={{ color: 'rgba(252,165,165,0.55)' }}>
          ♥ heart {hearts.length === 1 ? 'word' : 'words'} — {hearts.join(' · ')}
        </div>
      )}
      {children}
    </div>
  );
}
