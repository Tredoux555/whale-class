// components/montree/reports/WeeklyAdminTab.tsx
// Embeddable Weekly Admin Docs tab for Photo Audit
// Extracted from app/montree/dashboard/weekly-admin-docs/page.tsx
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';
import { useFeatures } from '@/hooks/useFeatures';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import { ChevronLeft, ChevronRight, FileText, ClipboardList, Sparkles, Download, Save, AlertTriangle, Minus, Plus, BookOpen } from 'lucide-react';
import TeachingNotesView from './TeachingNotesView';

const AREAS = [
  { key: 'practical_life', label: 'Practical Life', zh: '日常' },
  { key: 'sensorial', label: 'Sensorial', zh: '感官' },
  { key: 'mathematics', label: 'Mathematics', zh: '数学' },
  { key: 'language', label: 'Language', zh: '语言' },
  { key: 'cultural', label: 'Cultural', zh: '文化' },
] as const;

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  violet: '#c4b5fd',
  violetSoft: 'rgba(139,92,246,0.18)',
  violetBorder: 'rgba(139,92,246,0.45)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.25)',
  inputBorder: 'rgba(52,211,153,0.18)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", Menlo, Consolas, monospace',
};

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
};

const ctaViolet: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: T.violetSoft,
  border: `1px solid ${T.violetBorder}`,
  color: T.violet,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ctaAmber: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: T.amberSoft,
  border: `1px solid ${T.amberBorder}`,
  color: T.amber,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '6px 10px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: T.textPrimary,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

interface Child {
  id: string;
  name: string;
}

interface NoteData {
  english_text: string;
  chinese_text: string;
}

type SummaryNotes = Record<string, NoteData>;
type PlanNotes = Record<string, Record<string, NoteData>>;

interface WeeklyAdminTabProps {
  classroomId: string;
}

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentMonday(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = beijing.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  beijing.setUTCDate(beijing.getUTCDate() + diff);
  return beijing.toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

// ─── Component ───────────────────────────────────────────────

export default function WeeklyAdminTab({ classroomId }: WeeklyAdminTabProps) {
  const { t, locale } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const [activeTab, setActiveTab] = useState<'summary' | 'plan' | 'teaching'>('summary');
  const [summaryNotes, setSummaryNotes] = useState<SummaryNotes>({});
  const [planNotes, setPlanNotes] = useState<PlanNotes>({});

  // Custom date range — pull data from N academic weeks back instead of just
  // the displayed week. Default 1 (current week only). Max 8.
  // Notes still SAVE to the displayed weekStart — this only widens the
  // window the auto-fill pulls from for richer multi-week summaries.
  // Plan tab is unaffected (focus shelf is current state, not historical).
  const [weeksBack, setWeeksBack] = useState<number>(1);
  const MAX_WEEKS_BACK = 8;

  // Staleness detection — see CLAUDE.md Session 29/30.
  // staleChildren = children whose expected work set (what Auto-fill would
  // produce right now) contains works not present in their saved summary
  // note. The server computes this via semantic diff, which correctly
  // handles the Session 29 edge case where a photo's identification flips
  // pending_review → confirmed AFTER the teacher saved (timestamp-based
  // heuristics missed this because captured_at predated updated_at).
  const [staleChildren, setStaleChildren] = useState<Array<{
    child_id: string;
    child_name: string;
    missing_works: string[];
  }>>([]);

  // ─── Init ──────────────────────────────────────────────────

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const weekRef = useRef(weekStart);  // Track current week to guard stale auto-fill responses
  weekRef.current = weekStart;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch children + existing notes (auto-fills only when no saved notes exist)
  const fetchData = useCallback(async () => {
    if (!classroomId) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const [childrenRes, notesRes] = await Promise.all([
        montreeApi(`/api/montree/children?classroom_id=${classroomId}`),
        montreeApi(`/api/montree/weekly-admin-docs/notes?classroom_id=${classroomId}&week_start=${weekStart}`),
      ]);

      // Bail if aborted (tab switched away mid-fetch)
      if (controller.signal.aborted) return;

      const childrenData = await childrenRes.json();
      const notesData = notesRes.ok ? await notesRes.json() : { notes: [] };

      if (controller.signal.aborted) return;

      if (childrenData.children) {
        // Custom classroom order (matches physical seating arrangement)
        const sorted = sortChildrenByCustomOrder(childrenData.children as Child[]);
        setChildren(sorted);
      }

      // Parse notes into state. Staleness is a pure server-side semantic diff
      // now (stale_children array) — client just reads + renders the banner.
      const sNotes: SummaryNotes = {};
      const pNotes: PlanNotes = {};

      if (notesData.notes) {
        for (const note of notesData.notes) {
          if (note.doc_type === 'summary') {
            sNotes[note.child_id] = {
              english_text: note.english_text || '',
              chinese_text: note.chinese_text || '',
            };
          } else if (note.doc_type === 'plan') {
            if (!pNotes[note.child_id]) pNotes[note.child_id] = {};
            if (note.area === null) {
              pNotes[note.child_id]['_chinese'] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            } else if (note.area === 'notes') {
              pNotes[note.child_id]['_notes'] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            } else {
              pNotes[note.child_id][note.area] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            }
          }
        }
      }

      setSummaryNotes(sNotes);
      setPlanNotes(pNotes);
      setStaleChildren(notesData.stale_children || []);
      setLoading(false);

      // Auto-fill ONLY when no saved notes exist (first visit for this week)
      // Teacher clicks Auto-fill manually to refresh with latest data
      const hasNotes = notesData.notes && notesData.notes.length > 0;
      if (!controller.signal.aborted && !hasNotes) {
        handleAutoFill();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError('Failed to load data');
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, weekStart]);

  useEffect(() => {
    fetchData();
    return () => { abortRef.current?.abort(); };
  }, [fetchData]);

  // ─── Save Notes ────────────────────────────────────────────

  const saveNotes = async (silent = false): Promise<boolean> => {
    if (!classroomId) return false;
    if (!silent) { setSaving(true); setError(''); setSuccess(''); }

    try {
      const notes: Array<{
        child_id: string;
        doc_type: string;
        area: string | null;
        english_text: string | null;
        chinese_text: string | null;
      }> = [];

      for (const child of children) {
        const sn = summaryNotes[child.id];
        if (sn && (sn.english_text || sn.chinese_text)) {
          notes.push({
            child_id: child.id,
            doc_type: 'summary',
            area: null,
            english_text: sn.english_text || null,
            chinese_text: sn.chinese_text || null,
          });
        }
      }

      for (const child of children) {
        const pn = planNotes[child.id];
        if (pn) {
          for (const area of AREAS) {
            const an = pn[area.key];
            if (an && an.english_text) {
              notes.push({
                child_id: child.id,
                doc_type: 'plan',
                area: area.key,
                english_text: an.english_text || null,
                chinese_text: null,
              });
            }
          }
          const chNote = pn['_chinese'];
          if (chNote && chNote.chinese_text) {
            notes.push({
              child_id: child.id,
              doc_type: 'plan',
              area: null,
              english_text: null,
              chinese_text: chNote.chinese_text || null,
            });
          }
          const notesEntry = pn['_notes'];
          if (notesEntry && notesEntry.english_text) {
            notes.push({
              child_id: child.id,
              doc_type: 'plan',
              area: 'notes',
              english_text: notesEntry.english_text || null,
              chinese_text: null,
            });
          }
        }
      }

      if (notes.length === 0) {
        if (!silent) { setError(t('weeklyAdmin.noNotes')); setSaving(false); }
        return false;
      }

      const res = await montreeApi('/api/montree/weekly-admin-docs/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start: weekStart,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!silent) { setSuccess(t('weeklyAdmin.saved')); setTimeout(() => setSuccess(''), 3000); }
        return true;
      } else {
        if (!silent) setError(data.error || t('weeklyAdmin.saveFailed'));
        return false;
      }
    } catch {
      if (!silent) setError(t('weeklyAdmin.saveFailed'));
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // ─── Generate & Download ───────────────────────────────────

  const handleGenerate = async (docType: 'summary' | 'plan') => {
    if (!classroomId) return;
    setGenerating(docType);
    setError('');

    await saveNotes(true);

    try {
      const res = await fetch('/api/montree/weekly-admin-docs/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start: weekStart,
          doc_type: docType,
          locale,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || t('weeklyAdmin.generateFailed'));
        return;
      }

      const blob = await res.blob();
      const filename = docType === 'summary'
        ? `Weekly_Summary_${weekStart}.docx`
        : `Weekly_Plan_${weekStart}.docx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`${t('weeklyAdmin.downloaded')} ${filename}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('weeklyAdmin.generateFailed'));
    } finally {
      setGenerating(null);
    }
  };

  // ─── Auto-fill ─────────────────────────────────────────────

  const handleAutoFill = async () => {
    if (!classroomId) return;
    const requestedWeek = weekStart;  // Capture at call time
    setAutoFilling(true);
    setError('');
    setSuccess('');

    try {
      const res = await montreeApi(
        `/api/montree/weekly-admin-docs/auto-fill?classroom_id=${classroomId}&week_start=${requestedWeek}&locale=${locale}&weeks_back=${weeksBack}`
      );

      // Bail if unmounted or user navigated to a different week
      if (!mountedRef.current || weekRef.current !== requestedWeek) return;

      if (!res.ok) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      const data = await res.json();
      if (!mountedRef.current || weekRef.current !== requestedWeek) return;

      if (!data.children || !Array.isArray(data.children)) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      let filledCount = 0;
      const NO_DATA_PHRASES = ['No recorded activities', '没有记录到活动'];

      // Build new state — only include children with real area-grouped data
      // Never overwrite existing notes with "No recorded activities"
      const newSummary: SummaryNotes = {};
      for (const suggestion of data.children) {
        const en = suggestion.summaryEnglish || '';
        const zh = suggestion.summaryChinese || '';
        const hasRealData = (en || zh) && !NO_DATA_PHRASES.some(p => en.includes(p) || zh.includes(p));
        if (hasRealData) {
          filledCount++;
          newSummary[suggestion.childId] = {
            english_text: en,
            chinese_text: zh,
          };
        }
      }

      const newPlan: PlanNotes = {};
      for (const suggestion of data.children) {
        if (!newPlan[suggestion.childId]) newPlan[suggestion.childId] = {};
        const zhAreas = suggestion.planAreasZh || {};
        for (const [area, workName] of Object.entries(suggestion.planAreas || {})) {
          if (workName) filledCount++;
          newPlan[suggestion.childId][area] = {
            english_text: workName as string,
            chinese_text: (zhAreas[area] as string) || '',
          };
        }
      }

      // Merge with existing — only overwrites children that have real auto-fill data
      setSummaryNotes((prev) => ({ ...prev, ...newSummary }));
      setPlanNotes((prev) => {
        const merged = { ...prev };
        for (const [childId, areas] of Object.entries(newPlan)) {
          merged[childId] = { ...(merged[childId] || {}), ...areas };
        }
        return merged;
      });

      // Hide the stale banner immediately — the on-screen notes now reflect
      // what Auto-fill just produced, so there's no diff until the teacher
      // next touches + saves + the server recomputes on the next GET.
      setStaleChildren([]);

      setSuccess(`${t('weeklyAdmin.autoFilled')} (${filledCount})`);
      setTimeout(() => { if (mountedRef.current) setSuccess(''); }, 3000);
    } catch {
      if (mountedRef.current) setError(t('weeklyAdmin.autoFillFailed'));
    } finally {
      if (mountedRef.current) setAutoFilling(false);
    }
  };

  // ─── Note Update Helpers ───────────────────────────────────

  const updateSummaryNote = (childId: string, field: 'english_text' | 'chinese_text', value: string) => {
    setSummaryNotes((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || { english_text: '', chinese_text: '' }),
        [field]: value,
      },
    }));
  };

  const updatePlanNote = (childId: string, area: string, field: 'english_text' | 'chinese_text', value: string) => {
    setPlanNotes((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [area]: {
          ...(prev[childId]?.[area] || { english_text: '', chinese_text: '' }),
          [field]: value,
        },
      },
    }));
  };

  // ─── Render ────────────────────────────────────────────────

  // Health Check #17 — standalone page checks this flag but the embedded tab didn't.
  // A school with the feature disabled could still see the tab inside Photo Audit.
  if (!featuresLoading && !isEnabled('weekly_admin_docs')) {
    return null;
  }

  return (
    <div style={{ paddingBottom: 80, color: T.textPrimary, fontFamily: T.sans }}>
      <style>{`.wat-textarea::placeholder, .wat-input::placeholder { color: rgba(255,255,255,0.30); }`}</style>

      {/* Week selector + tabs + actions */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(7,18,12,0.55)',
        borderBottom: '1px solid rgba(52,211,153,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            fontFamily: T.sans,
            fontSize: 12,
            fontWeight: 600,
            color: T.textSecondary,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}>
            {t('weeklyAdmin.week')}:
          </label>
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            aria-label="Previous week"
            style={{
              ...ghostBtn,
              width: 28,
              height: 28,
              padding: 0,
            }}
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <span style={{
            minWidth: 130,
            textAlign: 'center',
            fontFamily: T.mono,
            fontSize: 13,
            fontWeight: 500,
            color: T.textPrimary,
            padding: '5px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            {weekStart}
          </span>
          <button
            onClick={() => {
              const next = shiftWeek(weekStart, 1);
              const maxWeek = activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday();
              if (next <= maxWeek) setWeekStart(next);
            }}
            disabled={weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday())}
            aria-label="Next week"
            style={{
              ...ghostBtn,
              width: 28,
              height: 28,
              padding: 0,
              opacity: weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday()) ? 0.30 : 1,
              cursor: weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday()) ? 'not-allowed' : 'pointer',
            }}
          >
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>

          {/* ── Custom date range stepper ───────────────────────────────
              Pull the auto-fill data from N academic weeks BACK from the
              displayed week (default 1, max 8). Plan tab is unaffected —
              the focus shelf is current state, not historical. Notes still
              save to the displayed week_start regardless of range. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
            <span
              title={t('weeklyAdmin.rangeHint')}
              style={{
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 600,
                color: T.textSecondary,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              {t('weeklyAdmin.range')}:
            </span>
            <button
              onClick={() => setWeeksBack(w => Math.max(1, w - 1))}
              disabled={weeksBack <= 1}
              aria-label={t('weeklyAdmin.rangeFewer')}
              style={{
                ...ghostBtn,
                width: 24,
                height: 24,
                padding: 0,
                opacity: weeksBack <= 1 ? 0.30 : 1,
                cursor: weeksBack <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <Minus size={12} strokeWidth={1.75} />
            </button>
            <span
              style={{
                minWidth: 70,
                textAlign: 'center',
                fontFamily: T.mono,
                fontSize: 12,
                fontWeight: 500,
                color: weeksBack > 1 ? T.amber : T.textPrimary,
                padding: '4px 8px',
                borderRadius: 6,
                background: weeksBack > 1 ? T.amberSoft : 'rgba(255,255,255,0.05)',
                border: `1px solid ${weeksBack > 1 ? T.amberBorder : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {weeksBack === 1
                ? t('weeklyAdmin.rangeOneWeek')
                : t('weeklyAdmin.rangeNWeeks').replace('{n}', String(weeksBack))}
            </span>
            <button
              onClick={() => setWeeksBack(w => Math.min(MAX_WEEKS_BACK, w + 1))}
              disabled={weeksBack >= MAX_WEEKS_BACK}
              aria-label={t('weeklyAdmin.rangeMore')}
              style={{
                ...ghostBtn,
                width: 24,
                height: 24,
                padding: 0,
                opacity: weeksBack >= MAX_WEEKS_BACK ? 0.30 : 1,
                cursor: weeksBack >= MAX_WEEKS_BACK ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={12} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Tab selector + action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'summary' as const, label: t('weeklyAdmin.summaryTab'), icon: FileText },
            { id: 'plan' as const, label: t('weeklyAdmin.planTab'), icon: ClipboardList },
            ...(isEnabled('weekly_teaching_notes')
              ? [{ id: 'teaching' as const, label: 'Teaching Notes', icon: BookOpen }]
              : []),
          ].map(opt => {
            const active = activeTab === opt.id;
            const Icon = opt.icon;
            const isViolet = opt.id === 'plan';
            return (
              <button
                key={opt.id}
                onClick={() => setActiveTab(opt.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  background: active
                    ? (isViolet ? T.violetSoft : T.emeraldStrong)
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${active
                    ? (isViolet ? T.violetBorder : 'rgba(52,211,153,0.45)')
                    : 'rgba(255,255,255,0.10)'}`,
                  color: active
                    ? (isViolet ? T.violet : T.emerald)
                    : T.textSecondary,
                  fontFamily: T.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {opt.label}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {activeTab !== 'teaching' && (
            <>
              <button
                onClick={handleAutoFill}
                disabled={autoFilling}
                style={{
                  ...ctaAmber,
                  opacity: autoFilling ? 0.55 : 1,
                  cursor: autoFilling ? 'not-allowed' : 'pointer',
                }}
              >
                <Sparkles size={12} strokeWidth={1.75} />
                {autoFilling ? '...' : t('weeklyAdmin.autoFill')}
              </button>

              <button
                onClick={() => handleGenerate(activeTab === 'plan' ? 'plan' : 'summary')}
                disabled={generating !== null}
                style={{
                  ...(activeTab === 'plan' ? ctaViolet : ctaPrimary),
                  opacity: generating !== null ? 0.55 : 1,
                  cursor: generating !== null ? 'not-allowed' : 'pointer',
                }}
              >
                <Download size={12} strokeWidth={2} />
                {generating === activeTab ? t('weeklyAdmin.generating') : t('weeklyAdmin.generate')}
              </button>

              <button
                onClick={() => saveNotes(false)}
                disabled={saving}
                style={{
                  ...ctaPrimary,
                  opacity: saving ? 0.55 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={12} strokeWidth={2} />
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stale-notes banner — server-side semantic diff fired at least one
          child whose expected work set (what Auto-fill would produce now)
          contains works missing from their saved summary note. DOCX
          generation reads only from saved notes, so missing works yield a
          stale Weekly Summary. Tapping "Refresh Auto-fill" reruns the same
          handleAutoFill the manual button uses. See CLAUDE.md Session 29/30. */}
      {(() => {
        if (loading || autoFilling) return null;
        if (staleChildren.length === 0) return null;
        return (
          <div style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            background: T.amberSoft,
            border: `1px solid ${T.amberBorder}`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertTriangle size={15} strokeWidth={1.75} color={T.amber} style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1,
              fontFamily: T.sans,
              fontSize: 12,
              color: T.amber,
              lineHeight: 1.4,
            }}>
              {t('weeklyAdmin.staleBanner')}
            </span>
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                background: T.amber,
                border: 'none',
                borderRadius: 999,
                color: '#1a1206',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                cursor: autoFilling ? 'not-allowed' : 'pointer',
                opacity: autoFilling ? 0.55 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={11} strokeWidth={1.75} />
              {t('weeklyAdmin.refreshAutoFill')}
            </button>
          </div>
        );
      })()}

      {/* Messages */}
      {error && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: T.redSoft,
          border: `1px solid ${T.redBorder}`,
          color: T.red,
          fontFamily: T.sans,
          fontSize: 13,
          borderRadius: 12,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.40)',
          color: T.emerald,
          fontFamily: T.sans,
          fontSize: 13,
          borderRadius: 12,
        }}>
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '60px 0',
          color: T.textMuted,
          fontFamily: T.sans,
          fontSize: 13,
        }}>
          {t('common.loading')}
        </div>
      )}

      {/* Teaching Notes — printable per-work guide for the planned week */}
      {!loading && activeTab === 'teaching' && (
        <TeachingNotesView
          planNotes={planNotes}
          childList={children}
          classroomId={classroomId}
          weekStart={weekStart}
        />
      )}

      {/* Children Cards */}
      {!loading && activeTab !== 'teaching' && (
        <div style={{
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {children.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: T.textMuted,
              fontFamily: T.sans,
              fontSize: 14,
              padding: '40px 0',
            }}>
              {t('weeklyAdmin.noChildren')}
            </div>
          )}

          {children.map((child) => (
            <div
              key={child.id}
              style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: T.cardRadius,
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                padding: 16,
              }}
            >
              <h3 style={{
                margin: '0 0 12px',
                fontFamily: T.serif,
                fontSize: 17,
                fontWeight: 500,
                color: T.textPrimary,
                letterSpacing: -0.2,
              }}>
                {child.name}
              </h3>

              {activeTab === 'summary' ? (
                <SummaryCard
                  childId={child.id}
                  notes={summaryNotes[child.id] || { english_text: '', chinese_text: '' }}
                  onUpdate={updateSummaryNote}
                />
              ) : (
                <PlanCard
                  childId={child.id}
                  notes={planNotes[child.id] || {}}
                  onUpdate={updatePlanNote}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────

function SummaryCard({
  childId,
  notes,
  onUpdate,
}: {
  childId: string;
  notes: NoteData;
  onUpdate: (childId: string, field: 'english_text' | 'chinese_text', value: string) => void;
}) {
  const { t, locale } = useI18n();
  const LOCALE_FIELD: Record<string, 'chinese_text' | 'english_text'> = { zh: 'chinese_text' };
  const displayField = LOCALE_FIELD[locale] || 'english_text';
  const displayValue = notes[displayField] || '';

  return (
    <div>
      <label style={{
        fontFamily: T.sans,
        fontSize: 11,
        fontWeight: 700,
        color: T.textMuted,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        display: 'block',
        marginBottom: 6,
      }}>
        {t('weeklyAdmin.thisWeekActivities')}
      </label>
      <textarea
        className="wat-textarea"
        value={displayValue}
        onChange={(e) => onUpdate(childId, displayField, e.target.value)}
        placeholder={t('weeklyAdmin.summaryPlaceholder')}
        rows={5}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          background: T.inputBg,
          border: `1px solid ${T.inputBorder}`,
          color: T.textPrimary,
          fontFamily: T.sans,
          fontSize: 13,
          lineHeight: 1.5,
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── Plan Card ───────────────────────────────────────────────

function PlanCard({
  childId,
  notes,
  onUpdate,
}: {
  childId: string;
  notes: Record<string, NoteData>;
  onUpdate: (childId: string, area: string, field: 'english_text' | 'chinese_text', value: string) => void;
}) {
  const { t, locale } = useI18n();
  const chineseNote = notes['_chinese'] || { english_text: '', chinese_text: '' };
  const notesEntry = notes['_notes'] || { english_text: '', chinese_text: '' };

  // Show localized work names based on current locale
  const LOCALE_FIELD: Record<string, 'chinese_text' | 'english_text'> = { zh: 'chinese_text' };
  const displayField = LOCALE_FIELD[locale] || 'english_text';

  const labelStyle: CSSProperties = {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    color: T.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
      }}>
        {AREAS.map((area) => {
          const areaNote = notes[area.key] || { english_text: '', chinese_text: '' };
          const displayValue = areaNote[displayField] || areaNote.english_text || '';
          const areaLabel = getAreaLabel(area.key, locale);
          return (
            <div key={area.key}>
              <div style={{
                ...labelStyle,
                fontSize: 10,
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {areaLabel}
              </div>
              <input
                className="wat-input"
                type="text"
                value={displayValue}
                onChange={(e) => onUpdate(childId, area.key, displayField, e.target.value)}
                placeholder={areaLabel}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: T.inputBg,
                  border: `1px solid ${T.inputBorder}`,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 12,
                  lineHeight: 1.4,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        <div>
          <label style={{
            ...labelStyle,
            display: 'block',
            marginBottom: 5,
          }}>
            {t('weeklyAdmin.developmentalNote')}
          </label>
          <textarea
            className="wat-textarea"
            value={chineseNote.chinese_text}
            onChange={(e) => onUpdate(childId, '_chinese', 'chinese_text', e.target.value)}
            placeholder={t('weeklyAdmin.developmentalNotePlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{
            ...labelStyle,
            display: 'block',
            marginBottom: 5,
          }}>
            {t('weeklyAdmin.notes')}
          </label>
          <textarea
            className="wat-textarea"
            value={notesEntry.english_text}
            onChange={(e) => onUpdate(childId, '_notes', 'english_text', e.target.value)}
            placeholder={t('weeklyAdmin.notesPlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}
