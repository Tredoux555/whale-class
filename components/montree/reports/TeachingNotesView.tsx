// components/montree/reports/TeachingNotesView.tsx
//
// Teacher-only view on the Weekly Admin tab. Collects the distinct works
// planned for the class this week (from the Weekly Plan), fetches each
// work's guide, and renders a printable reference card per work — what it
// is, how to teach it, the materials, why it matters, and which children
// have it on their shelf this week.
//
// Gated by the `weekly_teaching_notes` feature flag (migration 227). The
// guide content comes from /api/montree/works/guide (the same source the
// Quick Guide modal uses), so this view authors nothing new — it gathers
// what already exists and puts it where the teacher plans the week.

'use client';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Printer } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
type AreaKey = (typeof AREA_ORDER)[number];

const AREA_COLOR: Record<string, string> = {
  practical_life: '#10b981',
  sensorial: '#d97706',
  mathematics: '#4f46e5',
  language: '#db2777',
  cultural: '#7c3aed',
};

interface NoteData {
  english_text: string;
  chinese_text: string;
}
type PlanNotes = Record<string, Record<string, NoteData>>;

interface PresentationStep {
  title?: string;
  description?: string;
  tip?: string;
}
interface Guide {
  name?: string;
  quick_guide?: string | null;
  parent_description?: string | null;
  presentation_steps?: Array<PresentationStep | string> | null;
  materials?: string[] | string | null;
  why_it_matters?: string | null;
  message?: string;
}
type GuideState = Guide | 'loading' | 'error';

interface PlannedWork {
  workName: string;
  area: string;
  children: string[];
}

const BODY: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.55, color: '#333' };
const SOFT: CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.5, color: '#8a8a8a', fontStyle: 'italic' };

function normaliseList(v: string[] | string | null | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: '#9a8f78',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function renderStep(s: PresentationStep | string): ReactNode {
  if (typeof s === 'string') return s;
  const parts: ReactNode[] = [];
  if (s.title) parts.push(<strong key="t">{s.title}. </strong>);
  if (s.description) parts.push(<span key="d">{s.description}</span>);
  if (s.tip) parts.push(<em key="tp" style={{ color: '#7a6f55' }}> Tip: {s.tip}</em>);
  return parts.length > 0 ? parts : '';
}

function GuideBody({ g }: { g: GuideState | undefined }) {
  if (!g || g === 'loading') return <p style={SOFT}>Loading the guide…</p>;
  if (g === 'error') return <p style={SOFT}>Couldn&apos;t load this work&apos;s guide — try reopening the tab.</p>;

  const whatItIs = (g.quick_guide || g.parent_description || '').trim();
  const steps = Array.isArray(g.presentation_steps) ? g.presentation_steps : [];
  const materials = normaliseList(g.materials);
  const why = (g.why_it_matters || '').trim();

  if (!whatItIs && steps.length === 0) {
    return (
      <p style={SOFT}>
        No teaching guide on file for this work yet. Open it from the Curriculum page to add one —
        Montree can generate a draft.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {whatItIs && (
        <Section label="What it is">
          <p style={BODY}>{whatItIs}</p>
        </Section>
      )}
      {steps.length > 0 && (
        <Section label="How to teach it">
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((s, i) => (
              <li key={i} style={BODY}>
                {renderStep(s)}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {materials.length > 0 && (
        <Section label="Materials">
          <p style={BODY}>{materials.join(' · ')}</p>
        </Section>
      )}
      {why && (
        <Section label="Why it matters">
          <p style={BODY}>{why}</p>
        </Section>
      )}
    </div>
  );
}

export default function TeachingNotesView({
  planNotes,
  childList,
  classroomId,
  weekStart,
}: {
  planNotes: PlanNotes;
  childList: Array<{ id: string; name: string }>;
  classroomId: string;
  weekStart: string;
}) {
  const { locale } = useI18n();

  // Distinct works planned across the class this week, deduped, each carrying
  // the names of the children who have it on their shelf.
  const works = useMemo<PlannedWork[]>(() => {
    const map = new Map<string, PlannedWork>();
    for (const child of childList) {
      const plan = planNotes[child.id];
      if (!plan) continue;
      for (const areaKey of AREA_ORDER) {
        const name = (plan[areaKey]?.english_text || '').trim();
        if (!name) continue;
        const key = `${areaKey}::${name.toLowerCase()}`;
        const existing = map.get(key);
        if (existing) {
          if (!existing.children.includes(child.name)) existing.children.push(child.name);
        } else {
          map.set(key, { workName: name, area: areaKey, children: [child.name] });
        }
      }
    }
    return [...map.values()].sort(
      (a, b) =>
        AREA_ORDER.indexOf(a.area as AreaKey) - AREA_ORDER.indexOf(b.area as AreaKey) ||
        a.workName.localeCompare(b.workName),
    );
  }, [planNotes, childList]);

  const [guides, setGuides] = useState<Record<string, GuideState>>({});
  const sigRef = useRef('');

  useEffect(() => {
    // Refetch only when the set of work names or the locale actually changes —
    // editing an unrelated plan note must not trigger a guide refetch storm.
    const sig = `${locale}::${works.map((w) => w.workName).join('|')}`;
    if (sig === sigRef.current) return;
    sigRef.current = sig;

    let cancelled = false;
    (async () => {
      // Reset to a clean slate for the new work-set / locale, then fetch.
      setGuides({});
      for (const w of works) {
        const k = w.workName.toLowerCase();
        setGuides((prev) => ({ ...prev, [k]: 'loading' }));
        try {
          const res = await montreeApi(
            `/api/montree/works/guide?name=${encodeURIComponent(w.workName)}` +
              `&classroom_id=${encodeURIComponent(classroomId)}` +
              `&locale=${encodeURIComponent(locale)}`,
          );
          if (cancelled) return;
          if (!res.ok) {
            setGuides((prev) => ({ ...prev, [k]: 'error' }));
            continue;
          }
          const json = (await res.json()) as Guide;
          if (cancelled) return;
          setGuides((prev) => ({ ...prev, [k]: json }));
        } catch {
          if (!cancelled) setGuides((prev) => ({ ...prev, [k]: 'error' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [works, classroomId, locale]);

  return (
    <div id="montree-teaching-notes" style={{ padding: '20px 16px 60px' }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #montree-teaching-notes, #montree-teaching-notes * { visibility: visible !important; }
          #montree-teaching-notes { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .mtn-no-print { display: none !important; }
          .mtn-card { break-inside: avoid; page-break-inside: avoid; box-shadow: none !important; }
        }
        .mtn-print-only { display: none; }
        @media print { .mtn-print-only { display: block !important; } }
      `}</style>

      {/* Print-only header */}
      <h1
        className="mtn-print-only"
        style={{ fontFamily: 'Georgia, serif', fontSize: 20, margin: '0 0 16px', color: '#000' }}
      >
        Teaching Notes — week of {weekStart}
      </h1>

      {/* Screen header */}
      <div
        className="mtn-no-print"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: 22,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: -0.3,
            }}
          >
            Teaching Notes
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.5 }}>
            Every work planned for the class this week — what it is and how to teach it.
            {works.length > 0 ? ` ${works.length} works.` : ''}
          </div>
        </div>
        {works.length > 0 && (
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Printer size={14} strokeWidth={1.75} /> Print
          </button>
        )}
      </div>

      {works.length === 0 ? (
        <div
          style={{
            padding: '50px 24px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.55)',
            fontSize: 13,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
          }}
        >
          No works planned for this week yet. Fill in the Weekly Plan tab first — Teaching Notes
          pulls straight from it.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {works.map((w) => {
            const g = guides[w.workName.toLowerCase()];
            const color = AREA_COLOR[w.area] || '#6b7280';
            return (
              <div
                key={`${w.area}-${w.workName}`}
                className="mtn-card"
                style={{
                  background: '#fdfcf9',
                  border: '1px solid #e6e1d6',
                  borderRadius: 14,
                  padding: '16px 20px',
                  color: '#2c2c2c',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontFamily: 'Georgia, "Lora", serif',
                      fontSize: 18,
                      fontWeight: 600,
                      color: '#1c1c1c',
                    }}
                  >
                    {w.workName}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                      color,
                      border: `1px solid ${color}`,
                      borderRadius: 999,
                      padding: '2px 9px',
                    }}
                  >
                    {getAreaLabel(w.area, locale)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b6b6b', marginTop: 4 }}>
                  On the shelf this week — {w.children.join(', ')}
                </div>
                <div style={{ marginTop: 12, borderTop: '1px solid #ece7da', paddingTop: 12 }}>
                  <GuideBody g={g} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
