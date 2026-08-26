// components/lens/EvidenceChips.tsx
// The chips under a section that say what it rests on — and, when tapped, show
// the moment itself.
//
// 🚨 THIS IS THE ANTI-FABRICATION SURFACE. The Guru is told every judgement
// must cite a moment; the schema validator throws away ids that do not resolve.
// What makes both of those real for HER is being able to tap a chip and read
// the observation, in her own words, at the time she made it. A citation nobody
// can follow is decoration.
//
// A section with NO chips is marked, deliberately and visibly. That is not an
// error state — some sections legitimately have nothing to cite — but an
// uncited JUDGEMENT is the thing she has to look at before she signs.

'use client';

import { useState } from 'react';
import { clockLocal } from '@/lib/lens/ui';
import { AREA_LABELS, SUBJECT_LABELS, type LensMoment } from '@/lib/lens/types';

export interface MomentWithUrl extends LensMoment {
  media_url?: string | null;
}

export function EvidenceChips({
  evidence,
  moments,
  emptyNote,
}: {
  evidence: string[];
  moments: MomentWithUrl[];
  /** Shown when there is nothing cited. Omit to render nothing at all. */
  emptyNote?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const byId = new Map(moments.map((m) => [m.id, m]));

  if (evidence.length === 0) {
    return emptyNote ? (
      <p className="mt-1.5 text-[12px] text-forest-gold">{emptyNote}</p>
    ) : null;
  }

  const open = openId ? byId.get(openId) : null;

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap gap-1.5">
        {evidence.map((momentId) => {
          const moment = byId.get(momentId);
          if (!moment) {
            // Should not happen — the validator drops unresolvable ids — but a
            // hand-edited row or a deleted moment could produce one, and a
            // silently missing chip would hide it.
            return (
              <span
                key={momentId}
                className="rounded-full border border-[rgba(248,113,113,0.35)] px-2.5 py-1 text-[11px] text-forest-danger"
              >
                missing moment
              </span>
            );
          }
          const active = openId === momentId;
          return (
            <button
              key={momentId}
              type="button"
              className="ln-chip !py-1 !text-[11px]"
              data-on={active ? '1' : '0'}
              onClick={() => setOpenId(active ? null : momentId)}
              title="Show this moment"
            >
              {clockLocal(moment.ts)} · {moment.kind}
            </button>
          );
        })}
      </div>

      {open && (
        <div className="mt-2 rounded-xl border border-[rgba(52,211,153,0.25)] bg-[rgba(8,20,12,0.7)] p-3">
          <p className="text-[11px] uppercase tracking-wide text-forest-muted">
            {[
              clockLocal(open.ts),
              open.kind,
              open.subject ? SUBJECT_LABELS[open.subject] : null,
              open.area ? AREA_LABELS[open.area] : null,
              open.child_alias,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {open.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={open.media_url}
              alt={open.caption || 'Observation photograph'}
              loading="lazy"
              className="mt-2 max-h-48 w-full rounded-lg object-cover"
            />
          )}
          {(open.transcript || open.body) && (
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-snug text-forest-text">
              {open.transcript || open.body}
            </p>
          )}
          {open.caption && (
            <p className="mt-1 text-[12px] italic text-forest-muted">{open.caption}</p>
          )}
        </div>
      )}
    </div>
  );
}
