// components/montree/media/WorkQuickPick.tsx
//
// 🏷️ THE TAG-FIRST WORK PICKER (2026-09-17).
//
// AI photo recognition is retired. The teacher — the only person in the room
// who actually knows what the child was doing — says what the work is BEFORE
// the photo leaves the phone. Everything downstream (tracker, weekly/monthly
// summaries, montages, parent reports) reads montree_media.work_id +
// teacher_confirmed exactly as it always has, so nothing downstream changed.
//
// It has to be FAST on an iPhone in a classroom, one-handed, on school wifi:
//
//   • Suggested row — the child's last 3 works with tracker events plus the
//     classroom's 5 most-tagged works of the last fortnight, from
//     /api/montree/progress/recent-works (≤8 rows, no-store). In practice the
//     work is in this row and the whole interaction is ONE tap.
//   • Search — the slim `view=picker` curriculum projection via
//     useClassroomWorks (module-cached, ~150 KB, never the 34 MB full shape),
//     debounced 180 ms, results grouped by area.
//   • Tag later — an explicit, always-available escape. A teacher in a hurry
//     must never be trapped by this screen; the photo lands in "Photos to tag".
//
// The last pick per child is remembered in localStorage purely as a HINT (it
// is shown first in Suggested, never pre-applied) — a wrong sticky tag would
// be worse than no tag at all.
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClassroomWorks, type ClassroomWork } from '@/lib/montree/hooks/useClassroomWorks';

export interface QuickPickWork {
  id: string;
  name: string;
  area_key: string | null;
}

interface RecentSuggestion {
  id: string;
  name: string;
  area_key: string | null;
  reason: 'child' | 'classroom';
}

interface Props {
  classroomId: string | null;
  /** Children this shot is being saved for. The first one drives suggestions. */
  childIds: string[];
  /** Called with the chosen work. The caller uploads with work_id set. */
  onPick: (work: QuickPickWork) => void;
  /** Called when the teacher chooses to tag it later (no work_id, no AI). */
  onTagLater: () => void;
  /** Optional back affordance (returns to the child tagging step). */
  onBack?: () => void;
  /** Disables every control while the upload is being handed off. */
  busy?: boolean;
  /** Hides the Back / Tag later row — for embedding this picker's Suggested
   *  + search UI somewhere that already has its own escape hatches. */
  hideActions?: boolean;
}

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  serif: 'var(--font-lora), Georgia, serif',
};

const AREA_LABEL: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
  special_events: 'Special Events',
};

const LAST_PICK_PREFIX = 'montree_last_work_';
const MAX_SEARCH_RESULTS = 24;

function readLastPick(childId: string | undefined): QuickPickWork | null {
  if (!childId || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_PICK_PREFIX + childId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuickPickWork;
    return parsed && typeof parsed.id === 'string' && typeof parsed.name === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function rememberLastPick(childIds: string[], work: QuickPickWork): void {
  if (typeof localStorage === 'undefined') return;
  for (const cid of childIds) {
    try {
      localStorage.setItem(LAST_PICK_PREFIX + cid, JSON.stringify(work));
    } catch {
      /* private mode / quota — the hint is optional, never fatal */
    }
  }
}

export default function WorkQuickPick({
  classroomId,
  childIds,
  onPick,
  onTagLater,
  onBack,
  busy = false,
  hideActions = false,
}: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [suggestions, setSuggestions] = useState<RecentSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const primaryChildId = childIds[0];
  const isGroup = childIds.length > 1;

  // Search only loads the (module-cached) classroom list once the teacher
  // actually types — Suggested alone covers most shots with zero network.
  const { works, loading: loadingWorks } = useClassroomWorks(classroomId, true);

  // ── Suggested row ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      setLoadingSuggestions(true);
      try {
        const url = primaryChildId
          ? `/api/montree/progress/recent-works?childId=${encodeURIComponent(primaryChildId)}`
          : '/api/montree/progress/recent-works';
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          console.error('[WorkQuickPick] suggestions failed (non-fatal):', err);
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [primaryChildId]);

  // The remembered pick rides at the FRONT of Suggested — shown, never applied.
  const suggestedRow = useMemo(() => {
    const out: RecentSuggestion[] = [];
    const seen = new Set<string>();
    const last = readLastPick(primaryChildId);
    if (last) {
      out.push({ id: last.id, name: last.name, area_key: last.area_key, reason: 'child' });
      seen.add(last.id);
    }
    for (const s of suggestions) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      out.push(s);
    }
    return out.slice(0, 8);
  }, [suggestions, primaryChildId]);

  // ── Debounced search ──────────────────────────────────────────────────────
  const onQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebounced(value.trim().toLowerCase()), 180);
  }, []);
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const grouped = useMemo(() => {
    if (!debounced) return [] as Array<{ area: string; works: ClassroomWork[] }>;
    const matches = works
      .filter((w) => {
        const n = (w.name || '').toLowerCase();
        const zh = (w.name_chinese || '').toLowerCase();
        return n.includes(debounced) || zh.includes(debounced);
      })
      .slice(0, MAX_SEARCH_RESULTS);
    const byArea = new Map<string, ClassroomWork[]>();
    for (const w of matches) {
      const key = w.area_key || 'other';
      if (!byArea.has(key)) byArea.set(key, []);
      byArea.get(key)!.push(w);
    }
    return [...byArea.entries()].map(([area, list]) => ({ area, works: list }));
  }, [debounced, works]);

  const choose = useCallback(
    (work: QuickPickWork) => {
      if (busy) return;
      rememberLastPick(childIds, work);
      onPick(work);
    },
    [busy, childIds, onPick],
  );

  const chipStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 999,
    border: `1px solid ${T.emeraldStrong}`,
    background: T.emeraldSoft,
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: T.sans,
    textAlign: 'left',
    // 44px min target — one-handed, in a classroom, while holding a phone.
    minHeight: 44,
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.5 : 1,
  };

  return (
    <div style={{ padding: '16px', fontFamily: T.sans, color: T.textPrimary }}>
      <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, margin: '0 0 4px' }}>
        What work is this?
      </h2>
      <p style={{ fontSize: 12.5, color: T.textSecondary, margin: '0 0 14px', lineHeight: 1.4 }}>
        {isGroup
          ? `One work for all ${childIds.length} children in this shot — group presentations are tracked for every child tagged.`
          : 'Tap the work and Montree tracks it from there.'}
      </p>

      {/* ── Suggested ──────────────────────────────────────────────────── */}
      {suggestedRow.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: T.textMuted, marginBottom: 8 }}>
            Suggested
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestedRow.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => choose({ id: s.id, name: s.name, area_key: s.area_key })}
                style={chipStyle}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {suggestedRow.length === 0 && loadingSuggestions && (
        <p style={{ fontSize: 12, color: T.textMuted, margin: '0 0 14px' }}>Loading suggestions…</p>
      )}

      {/* ── Search ─────────────────────────────────────────────────────── */}
      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search all works…"
        aria-label="Search all works"
        disabled={busy}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.06)',
          color: T.textPrimary,
          fontSize: 16, // 16px — anything smaller makes iOS Safari zoom the page
          fontFamily: T.sans,
          outline: 'none',
        }}
      />

      {debounced && (
        <div style={{ marginTop: 12, maxHeight: '38vh', overflowY: 'auto' }}>
          {loadingWorks && works.length === 0 && (
            <p style={{ fontSize: 12, color: T.textMuted }}>Loading the classroom’s works…</p>
          )}
          {!loadingWorks && grouped.length === 0 && (
            <p style={{ fontSize: 12.5, color: T.textSecondary }}>
              No work matches “{query}”. Save it with <strong>Tag later</strong> and name it from Photos to tag.
            </p>
          )}
          {grouped.map(({ area, works: list }) => (
            <div key={area} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: T.textMuted, marginBottom: 6 }}>
                {AREA_LABEL[area] || area.replace(/_/g, ' ')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    disabled={busy}
                    onClick={() => choose({ id: w.id, name: w.name, area_key: w.area_key })}
                    style={{ ...chipStyle, borderRadius: 10, width: '100%' }}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Escape hatches ─────────────────────────────────────────────── */}
      {!hideActions && (
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="btn btn-secondary btn-md"
            style={{ flex: '0 0 auto' }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onTagLater}
          disabled={busy}
          className="btn btn-secondary btn-md"
          style={{ flex: 1 }}
        >
          Tag later
        </button>
      </div>
      )}
      {!hideActions && (
      <p style={{ fontSize: 11, color: T.textMuted, marginTop: 8, lineHeight: 1.4 }}>
        “Tag later” saves the photo straight away — it waits for you in Photos to tag.
      </p>
      )}
    </div>
  );
}
