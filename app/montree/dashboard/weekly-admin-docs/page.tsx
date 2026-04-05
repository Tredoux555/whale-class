// Weekly Admin Documents — Generate pixel-perfect Summary & Plan .docx files
// Teachers input English + Chinese notes per child, then generate & download.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';

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

// Summary: one overall note per child (area=null)
// Plan: per-area English work names + overall Chinese note + additional notes
type SummaryNotes = Record<string, NoteData>; // childId -> note
type PlanNotes = Record<string, Record<string, NoteData>>; // childId -> area|'_chinese'|'_notes' -> note

export default function WeeklyAdminDocsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null); // 'summary' | 'plan' | null
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Week selection
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());

  // Tab: 'summary' or 'plan'
  const [activeTab, setActiveTab] = useState<'summary' | 'plan'>('summary');

  // Notes state
  const [summaryNotes, setSummaryNotes] = useState<SummaryNotes>({});
  const [planNotes, setPlanNotes] = useState<PlanNotes>({});

  // ─── Init ──────────────────────────────────────────────────

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (isHomeschoolParent(sess)) {
      router.push('/montree/dashboard');
      return;
    }
    // Gate: redirect if feature not enabled (wait for features to load first)
    if (!featuresLoading && !isEnabled('weekly_admin_docs')) {
      router.push('/montree/dashboard');
      return;
    }
    setSession(sess);
  }, [router, featuresLoading, isEnabled]);

  // Fetch children + existing notes when session or week changes
  const fetchData = useCallback(async () => {
    if (!session?.classroom?.id) return;
    setLoading(true);
    setError('');

    try {
      const [childrenRes, notesRes] = await Promise.all([
        montreeApi(`/api/montree/children?classroom_id=${session.classroom?.id}`),
        montreeApi(`/api/montree/weekly-admin-docs/notes?classroom_id=${session.classroom?.id}&week_start=${weekStart}`),
      ]);

      const childrenData = await childrenRes.json();
      const notesData = notesRes.ok ? await notesRes.json() : { notes: [] };

      if (childrenData.children) {
        const sorted = childrenData.children.sort((a: Child, b: Child) =>
          a.name.localeCompare(b.name)
        );
        setChildren(sorted);
      }

      // Parse notes into state
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
              // Overall Chinese developmental note (stored with area=null)
              pNotes[note.child_id]['_chinese'] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            } else if (note.area === 'notes') {
              // Additional notes text
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

      // Auto-fill if no saved notes exist (first visit for this week)
      const hasAnyNotes = notesData.notes && notesData.notes.length > 0;
      return hasAnyNotes;
    } catch {
      setError(t('weeklyAdmin.fetchError'));
      return true; // Don't auto-fill on error
    } finally {
      setLoading(false);
    }
  }, [session?.classroom?.id, weekStart, t]);

  useEffect(() => {
    // Wait for features to load and verify enabled before fetching data
    if (featuresLoading || !isEnabled('weekly_admin_docs')) return;
    fetchData().then((hasNotes) => {
      // Auto-fill from data if no saved notes (saves teacher a click)
      if (hasNotes === false) {
        handleAutoFill();
      }
    });
  }, [fetchData, featuresLoading, isEnabled]);

  // ─── Save Notes (reusable — silent=true skips UI feedback) ─

  const saveNotes = async (silent = false): Promise<boolean> => {
    if (!session?.classroom?.id) return false;
    if (!silent) { setSaving(true); setError(''); setSuccess(''); }

    try {
      const notes: Array<{
        child_id: string;
        doc_type: string;
        area: string | null;
        english_text: string | null;
        chinese_text: string | null;
      }> = [];

      // Collect summary notes
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

      // Collect plan notes
      for (const child of children) {
        const pn = planNotes[child.id];
        if (pn) {
          // Per-area English work names
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
          // Overall Chinese developmental note (area=null)
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
          // Additional notes text (area='notes')
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
          classroom_id: session.classroom?.id,
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

  const handleSave = () => saveNotes(false);

  // ─── Generate & Download ───────────────────────────────────

  const handleGenerate = async (docType: 'summary' | 'plan') => {
    if (!session?.classroom?.id) return;
    setGenerating(docType);
    setError('');

    // Auto-save current notes to DB before generating (prevents empty DOCX)
    const saved = await saveNotes(true);
    if (!saved) {
      // If nothing to save, still try generate (DB may have notes from earlier)
    }

    try {
      const res = await fetch('/api/montree/weekly-admin-docs/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom?.id,
          week_start: weekStart,
          doc_type: docType,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || t('weeklyAdmin.generateFailed'));
        return;
      }

      // Download blob as .docx
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

  // ─── Auto-fill from Data ──────────────────────────────────

  const handleAutoFill = async () => {
    if (!session?.classroom?.id) return;
    setAutoFilling(true);
    setError('');

    try {
      const res = await montreeApi(
        `/api/montree/weekly-admin-docs/auto-fill?classroom_id=${session.classroom?.id}&week_start=${weekStart}`
      );

      if (!res.ok) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      const data = await res.json();

      if (!data.children || !Array.isArray(data.children)) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      // Compute filled count BEFORE setState (avoid React batching issue)
      let filledCount = 0;

      if (activeTab === 'summary') {
        // Count how many empty fields will be filled
        for (const suggestion of data.children) {
          const existing = summaryNotes[suggestion.childId];
          if (!existing?.english_text && suggestion.summaryEnglish) filledCount++;
        }
        // Fill only EMPTY summary English fields
        setSummaryNotes((prev) => {
          const next = { ...prev };
          for (const suggestion of data.children) {
            const existing = next[suggestion.childId];
            if (!existing?.english_text) {
              next[suggestion.childId] = {
                english_text: suggestion.summaryEnglish || '',
                chinese_text: existing?.chinese_text || '',
              };
            }
          }
          return next;
        });
      } else {
        // Count how many empty fields will be filled
        for (const suggestion of data.children) {
          for (const [area, workName] of Object.entries(suggestion.planAreas || {})) {
            const existing = planNotes[suggestion.childId]?.[area];
            if (!existing?.english_text && workName) filledCount++;
          }
        }
        // Fill only EMPTY plan area cells
        setPlanNotes((prev) => {
          const next = { ...prev };
          for (const suggestion of data.children) {
            if (!next[suggestion.childId]) next[suggestion.childId] = {};
            for (const [area, workName] of Object.entries(suggestion.planAreas || {})) {
              const existing = next[suggestion.childId][area];
              if (!existing?.english_text && workName) {
                next[suggestion.childId][area] = {
                  english_text: workName as string,
                  chinese_text: existing?.chinese_text || '',
                };
              }
            }
          }
          return next;
        });
      }

      setSuccess(`${t('weeklyAdmin.autoFilled')} (${filledCount})`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('weeklyAdmin.autoFillFailed'));
    } finally {
      setAutoFilling(false);
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

  if (!session) return null;

  // Feature gate removed — weekly admin docs always accessible for teachers

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/montree/dashboard')} className="text-gray-500 text-xl">
            ←
          </button>
          <h1 className="text-lg font-semibold">{t('weeklyAdmin.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>

      {/* Week Selector */}
      <div className="px-4 py-3 bg-white border-b flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">{t('weeklyAdmin.week')}:</label>
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
        >
          ◀
        </button>
        <span className="text-sm font-mono font-medium min-w-[130px] text-center">{weekStart}</span>
        <button
          onClick={() => {
            const next = shiftWeek(weekStart, 1);
            const maxWeek = activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday();
            if (next <= maxWeek) setWeekStart(next);
          }}
          disabled={weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday())}
          className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
        >
          ▶
        </button>
      </div>

      {/* Tab Selector */}
      <div className="px-4 py-2 bg-white border-b flex gap-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'summary' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t('weeklyAdmin.summaryTab')}
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'plan' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {t('weeklyAdmin.planTab')}
        </button>

        <div className="flex-1" />

        {/* Auto-fill button */}
        <button
          onClick={handleAutoFill}
          disabled={autoFilling}
          className="px-3 py-2 bg-amber-500 text-white text-sm rounded-lg disabled:opacity-50"
        >
          {autoFilling ? '...' : t('weeklyAdmin.autoFill')}
        </button>

        {/* Generate buttons */}
        <button
          onClick={() => handleGenerate(activeTab)}
          disabled={generating !== null}
          className={`px-3 py-2 text-white text-sm rounded-lg disabled:opacity-50 ${
            activeTab === 'summary' ? 'bg-blue-600' : 'bg-purple-600'
          }`}
        >
          {generating === activeTab ? t('weeklyAdmin.generating') : t('weeklyAdmin.generate')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="text-gray-400">{t('common.loading')}</div>
        </div>
      )}

      {/* Children Cards */}
      {!loading && (
        <div className="px-4 py-4 space-y-4">
          {children.length === 0 && (
            <div className="text-center text-gray-400 py-8">{t('weeklyAdmin.noChildren')}</div>
          )}

          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border p-4">
              <h3 className="font-semibold text-base mb-3">{child.name}</h3>

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
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">
          {t('weeklyAdmin.englishSummary')}
        </label>
        <textarea
          value={notes.english_text}
          onChange={(e) => onUpdate(childId, 'english_text', e.target.value)}
          placeholder="e.g. worked on Sandpaper Letters and Bingo this week..."
          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          rows={2}
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">
          {t('weeklyAdmin.chineseSummary')}
        </label>
        <textarea
          value={notes.chinese_text}
          onChange={(e) => onUpdate(childId, 'chinese_text', e.target.value)}
          placeholder={'日常：...\n感官：...\n数学：...\n语言：...\n文化：...'}
          className="w-full px-3 py-2 border rounded-lg text-sm resize-none"
          rows={5}
        />
      </div>
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
  const { t } = useI18n();
  const chineseNote = notes['_chinese'] || { english_text: '', chinese_text: '' };
  const notesEntry = notes['_notes'] || { english_text: '', chinese_text: '' };

  return (
    <div className="space-y-3">
      {/* Per-area English work names */}
      <div className="grid grid-cols-5 gap-2">
        {AREAS.map((area) => {
          const areaNote = notes[area.key] || { english_text: '', chinese_text: '' };
          return (
            <div key={area.key}>
              <div className="text-[10px] font-semibold text-gray-500 mb-1 text-center">
                {area.label}
              </div>
              <input
                type="text"
                value={areaNote.english_text}
                onChange={(e) => onUpdate(childId, area.key, 'english_text', e.target.value)}
                placeholder={area.zh}
                className="w-full px-2 py-1.5 border rounded text-xs"
              />
            </div>
          );
        })}
      </div>

      {/* Overall Chinese developmental note + additional notes */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">
            {t('weeklyAdmin.chineseNote')}
          </label>
          <textarea
            value={chineseNote.chinese_text}
            onChange={(e) => onUpdate(childId, '_chinese', 'chinese_text', e.target.value)}
            placeholder="本周重点..."
            className="w-full px-2 py-1.5 border rounded text-xs resize-none"
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">
            {t('weeklyAdmin.additionalNotes')}
          </label>
          <textarea
            value={notesEntry.english_text}
            onChange={(e) => onUpdate(childId, '_notes', 'english_text', e.target.value)}
            placeholder="e.g. 上周因为写数字卷，计划未变"
            className="w-full px-2 py-1.5 border rounded text-xs resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentMonday(): string {
  const now = new Date();
  // Beijing time: UTC+8
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
