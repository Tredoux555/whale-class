// components/montree/reports/WeeklyAdminTab.tsx
// Embeddable Weekly Admin Docs tab for Photo Audit
// Extracted from app/montree/dashboard/weekly-admin-docs/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';

const AREAS = [
  { key: 'practical_life', label: 'Practical Life', zh: '日常' },
  { key: 'sensorial', label: 'Sensorial', zh: '感官' },
  { key: 'mathematics', label: 'Mathematics', zh: '数学' },
  { key: 'language', label: 'Language', zh: '语言' },
  { key: 'cultural', label: 'Cultural', zh: '文化' },
] as const;

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
  const [activeTab, setActiveTab] = useState<'summary' | 'plan'>('summary');
  const [summaryNotes, setSummaryNotes] = useState<SummaryNotes>({});
  const [planNotes, setPlanNotes] = useState<PlanNotes>({});

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
        `/api/montree/weekly-admin-docs/auto-fill?classroom_id=${classroomId}&week_start=${requestedWeek}&locale=${locale}`
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
    <div className="pb-20">
      {/* Week selector + tabs + actions */}
      <div className="px-4 py-3 bg-white border-b">
        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-gray-600 font-medium">{t('weeklyAdmin.week')}:</span>
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
          >◀</button>
          <span className="text-sm font-mono font-medium min-w-[130px] text-center">{weekStart}</span>
          <button
            onClick={() => {
              const next = shiftWeek(weekStart, 1);
              const maxWeek = activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday();
              if (next <= maxWeek) setWeekStart(next);
            }}
            disabled={weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday())}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
          >▶</button>
        </div>

        {/* Tab selector + action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('weeklyAdmin.summaryTab')}
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'plan' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('weeklyAdmin.planTab')}
          </button>

          <div className="flex-1" />

          <button
            onClick={handleAutoFill}
            disabled={autoFilling}
            className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded-full disabled:opacity-50 font-medium"
          >
            {autoFilling ? '...' : t('weeklyAdmin.autoFill')}
          </button>

          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={generating !== null}
            className={`px-3 py-1.5 text-white text-xs rounded-full disabled:opacity-50 font-medium ${
              activeTab === 'summary' ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          >
            {generating === activeTab ? t('weeklyAdmin.generating') : t('weeklyAdmin.generate')}
          </button>

          <button
            onClick={() => saveNotes(false)}
            disabled={saving}
            className="px-3 py-1.5 bg-emerald-600 text-white text-xs rounded-full disabled:opacity-50 font-medium"
          >
            {saving ? '...' : t('common.save')}
          </button>
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
          <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <span className="text-amber-800 text-xs flex-1">
              {t('weeklyAdmin.staleBanner')}
            </span>
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              className="px-3 py-1 bg-amber-600 text-white text-xs rounded-full disabled:opacity-50 font-medium whitespace-nowrap"
            >
              {t('weeklyAdmin.refreshAutoFill')}
            </button>
          </div>
        );
      })()}

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-gray-400 text-sm">{t('common.loading')}</div>
        </div>
      )}

      {/* Children Cards */}
      {!loading && (
        <div className="px-4 py-4 space-y-4">
          {children.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">{t('weeklyAdmin.noChildren')}</div>
          )}

          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-sm mb-2">{child.name}</h3>

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
  const { locale } = useI18n();
  const displayField = locale === 'zh' ? 'chinese_text' : 'english_text';
  const displayValue = notes[displayField] || '';
  const placeholder = locale === 'zh'
    ? '日常生活：...\n感官：...\n数学：...\n语言：...\n文化：...'
    : 'Practical Life: ...\nSensorial: ...\nMathematics: ...\nLanguage: ...\nCultural: ...';

  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">
        {locale === 'zh' ? '本周活动' : "This Week's Activities"}
      </label>
      <textarea
        value={displayValue}
        onChange={(e) => onUpdate(childId, displayField, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg text-xs resize-none"
        rows={5}
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

  // Show Chinese work names when locale is zh, English otherwise
  const displayField = locale === 'zh' ? 'chinese_text' : 'english_text';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {AREAS.map((area) => {
          const areaNote = notes[area.key] || { english_text: '', chinese_text: '' };
          const displayValue = areaNote[displayField] || areaNote.english_text || '';
          return (
            <div key={area.key}>
              <div className="text-[10px] font-semibold text-gray-500 mb-1 text-center">
                {locale === 'zh' ? area.zh : area.label}
              </div>
              <input
                type="text"
                value={displayValue}
                onChange={(e) => onUpdate(childId, area.key, displayField, e.target.value)}
                placeholder={locale === 'zh' ? area.zh : area.label}
                className="w-full px-2 py-1.5 border rounded text-xs"
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">
            {locale === 'zh' ? '中文备注' : 'Developmental Note'}
          </label>
          <textarea
            value={chineseNote.chinese_text}
            onChange={(e) => onUpdate(childId, '_chinese', 'chinese_text', e.target.value)}
            placeholder={locale === 'zh' ? '本周重点...' : 'Weekly focus...'}
            className="w-full px-2 py-1.5 border rounded text-xs resize-none"
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">
            {locale === 'zh' ? '备注' : 'Notes'}
          </label>
          <textarea
            value={notesEntry.english_text}
            onChange={(e) => onUpdate(childId, '_notes', 'english_text', e.target.value)}
            placeholder={locale === 'zh' ? '如：上周因为写数字卷，计划未变' : 'e.g. No change from last week'}
            className="w-full px-2 py-1.5 border rounded text-xs resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
