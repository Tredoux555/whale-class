'use client';

// components/montree/GroupLessonCard.tsx
//
// ✨ Group Lesson Suggester (Jun 10, 2026) — the first cross-child
// intelligence surface on the teacher dashboard.
//
//   "Amy, Leo and Kayla are all ready for the Teen Board —
//    group presentation Tuesday?"
//
// Reads /api/montree/dashboard/group-lessons (deterministic, no AI cost).
// HIDE-WHEN-EMPTY: renders null when there are no suggestions — never
// clutters the dashboard with empty chrome (PendingAppointmentsBanner rule).
// Dismissible per-day via localStorage so it doesn't nag.
//
// i18n: v1 ships English-only (standard v1 deferral — flagged for the next
// Haiku batch sweep; ~8 keys).
//
// Jul 2026: the work name in each row opens the shared Quick Guide →
// Full Details pair (same experience as the shelf / child profile).

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Users, X, Sparkles } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { getClassroomId } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/montree/i18n/locales';
import type { QuickGuideData } from '@/components/montree/curriculum/types';

// Tier 4 perf: code-split the guide modals — same ssr:false pattern as
// [childId]/page.tsx:30-31 and the dashboard's own dynamic imports.
const QuickGuideModal = dynamic(() => import('@/components/montree/child/QuickGuideModal'), { ssr: false });
const FullDetailsModal = dynamic(() => import('@/components/montree/child/FullDetailsModal'), { ssr: false });

const T = {
  cardBg: 'rgba(8,20,12,0.55)',
  border: '1px solid rgba(52,211,153,0.28)',
  emerald: '#34d399',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Canonical area dot colors (FocusWorksSection palette)
const AREA_DOT: Record<string, string> = {
  practical_life: '#f472b6',
  sensorial: '#2dd4bf',
  mathematics: '#a78bfa',
  language: '#4ade80',
  cultural: '#fb923c',
};

interface Suggestion {
  type: 'present' | 'practice';
  work_id: string;
  work_name: string;
  area_key: string;
  area_name: string;
  children: Array<{ id: string; name: string }>;
}

function dismissKey(): string {
  // Per-day dismiss — reappears tomorrow with fresh data.
  return `montree.groupLessons.dismissed.${new Date().toISOString().slice(0, 10)}`;
}

function joinNames(children: Suggestion['children']): string {
  const names = children.map(c => c.name);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function GroupLessonCard() {
  const { locale } = useI18n();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState(true); // assume dismissed until checked

  // Quick Guide modal state — same shape as [childId]/page.tsx:239-244.
  // (No displayName twin: the group-lessons payload carries only the English
  // work_name, so the modal header shows that.)
  const [quickGuideOpen, setQuickGuideOpen] = useState(false);
  const [quickGuideWork, setQuickGuideWork] = useState<string>('');
  const [quickGuideData, setQuickGuideData] = useState<QuickGuideData | null>(null);
  const [quickGuideLoading, setQuickGuideLoading] = useState(false);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissKey()) === '1');
    } catch {
      setDismissed(false);
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/dashboard/group-lessons', {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return; // 401/403/404/500 → render nothing
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch {
        // network error → render nothing
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if ((dismissed || suggestions.length === 0) && !quickGuideOpen && !fullDetailsOpen) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(dismissKey(), '1'); } catch { /* ignore */ }
  };

  // Open the Quick Guide for a work — identical wiring to
  // [childId]/page.tsx:256-292 and ShelfView.tsx:231-256.
  const openQuickGuide = async (workName: string) => {
    setQuickGuideWork(workName);
    setQuickGuideOpen(true);
    setQuickGuideLoading(true);
    setQuickGuideData(null);

    try {
      // classroom_id matters: /api/montree/works/guide only checks the
      // classroom's customised curriculum when the param is present (the route
      // has NO JWT fallback), so omitting it would show a different guide than
      // the shelf does.
      const classroomId = getClassroomId();
      let url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      // Pass locale for translated guide content; anything else falls back to
      // English server-side.
      if (locale !== DEFAULT_LOCALE && (SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
        url += `&locale=${locale}`;
      }
      const res = await montreeApi(url);
      if (!res.ok) {
        console.error('Guide fetch failed:', res.status);
        setQuickGuideData({ error: true });
        setQuickGuideLoading(false);
        return;
      }
      const data = await res.json();
      setQuickGuideData(data);
    } catch (err) {
      console.error('Failed to fetch guide:', err);
      setQuickGuideData({ error: true });
    }
    setQuickGuideLoading(false);
  };

  return (
    <div
      style={{
        background: T.cardBg,
        border: T.border,
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 14,
        fontFamily: T.sans,
      }}
    >
      {/* Scoped hover/focus styles — same inline <style> + class-prefix pattern
          as QuickGuideModal.tsx:118-122 (inline styles can't express :hover). */}
      <style>{`
        /* !important is required: the button carries an inline
           textDecorationColor, and inline styles outrank any class selector.
           Same reason QuickGuideModal.tsx:114 marks its .qg-sheet overrides. */
        .glc-work-btn:hover { text-decoration-color: ${T.gold} !important; }
        .glc-work-btn:focus-visible { outline: 2px solid ${T.gold}; outline-offset: 2px; border-radius: 3px; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Users size={16} color={T.emerald} strokeWidth={1.75} />
        <span
          style={{
            fontFamily: T.serif,
            fontSize: 15,
            color: T.textPrimary,
            letterSpacing: '-0.2px',
            flex: 1,
          }}
        >
          Group lesson opportunities
        </span>
        <Sparkles size={13} color={T.gold} strokeWidth={1.75} />
        <button
          onClick={handleDismiss}
          aria-label="Dismiss group lesson suggestions for today"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            color: T.textMuted,
          }}
        >
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {suggestions.map(s => (
          <div
            key={`${s.type}-${s.work_id}`}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                marginTop: 5,
                flexShrink: 0,
                background: AREA_DOT[s.area_key] || T.emerald,
                boxShadow: `0 0 6px ${AREA_DOT[s.area_key] || T.emerald}55`,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, color: T.textPrimary, lineHeight: 1.45 }}>
                <strong style={{ fontWeight: 600 }}>{joinNames(s.children)}</strong>
                {s.type === 'present'
                  ? ' are all ready for '
                  : ' are all working on '}
                <button
                  type="button"
                  className="glc-work-btn"
                  onClick={() => openQuickGuide(s.work_name)}
                  aria-label={`Open quick guide for ${s.work_name}`}
                  style={{
                    display: 'inline',
                    margin: 0,
                    padding: 0,
                    background: 'none',
                    border: 'none',
                    font: 'inherit',
                    fontWeight: 600,
                    color: T.gold,
                    textAlign: 'left',
                    textDecoration: 'underline',
                    textDecorationColor: 'rgba(232,201,106,0.40)',
                    textUnderlineOffset: 2,
                    cursor: 'pointer',
                  }}
                >
                  {s.work_name}
                </button>
                {s.type === 'present'
                  ? ' — group presentation?'
                  : ' — joint practice circle?'}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                {s.area_name}
                {' · '}
                {s.children.length} children
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Guide → Full Details — identical chaining to
          [childId]/page.tsx:945-966 and ShelfView.tsx:605-620. */}
      <QuickGuideModal
        isOpen={quickGuideOpen}
        onClose={() => setQuickGuideOpen(false)}
        workName={quickGuideWork}
        guideData={quickGuideData}
        loading={quickGuideLoading}
        onOpenFullDetails={() => { setQuickGuideOpen(false); setFullDetailsOpen(true); }}
      />
      <FullDetailsModal
        isOpen={fullDetailsOpen}
        onClose={() => setFullDetailsOpen(false)}
        workName={quickGuideWork}
        guideData={quickGuideData}
        loading={quickGuideLoading}
      />
    </div>
  );
}
