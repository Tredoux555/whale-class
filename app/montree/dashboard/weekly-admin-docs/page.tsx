// Weekly Admin Documents — Generate pixel-perfect Summary & Plan .docx files
// Teachers input English + Chinese notes per child, then generate & download.
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

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
// Plan: one note per child per area
type SummaryNotes = Record<string, NoteData>; // childId -> note
type PlanNotes = Record<string, Record<string, NoteData>>; // childId -> area -> note

export default function WeeklyAdminDocsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    setSession(sess);
  }, [router]);

  // Fetch children + existing notes when session or week changes
  const fetchData = useCallback(async () => {
    if (!session?.classroomId) return;
    setLoading(true);
    setError('');

    try {
      const [childrenRes, notesRes] = await Promise.all([
        montreeApi(`/api/montree/children?classroom_id=${session.classroomId}`),
        montreeApi(`/api/montree/weekly-admin-docs/notes?classroom_id=${session.classroomId}&week_start=${weekStart}`),
      ]);

      const childrenData = await childrenRes.json();
      const notesData = await notesRes.json();

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
            pNotes[note.child_id][note.area || ''] = {
              english_text: note.english_text || '',
              chinese_text: note.chinese_text || '',
            };
          }
        }
      }

      setSummaryNotes(sNotes);
      setPlanNotes(pNotes);
    } catch {
      setError(t('weeklyAdmin.fetchError'));
    } finally {
      setLoading(false);
    }
  }, [session?.classroomId, weekStart, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Save Notes ────────────────────────────────────────────

  const handleSave = async () => {
    if (!session?.classroomId) return;
    setSaving(true);
    setError('');
    setSuccess('');

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
          for (const area of AREAS) {
            const an = pn[area.key];
            if (an && (an.english_text || an.chinese_text)) {
              notes.push({
                child_id: child.id,
                doc_type: 'plan',
                area: area.key,
                english_text: an.english_text || null,
                chinese_text: an.chinese_text || null,
              });
            }
          }
        }
      }

      if (notes.length === 0) {
        setError(t('weeklyAdmin.noNotes'));
        setSaving(false);
        return;
      }

      const res = await montreeApi('/api/montree/weekly-admin-docs/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroomId,
          week_start: weekStart,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(t('weeklyAdmin.saved'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || t('weeklyAdmin.saveFailed'));
      }
    } catch {
      setError(t('weeklyAdmin.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ─── Generate & Download ───────────────────────────────────

  const handleGenerate = async (docType: 'summary' | 'plan') => {
    if (!session?.classroomId) return;
    setGenerating(docType);
    setError('');

    try {
      const res = await fetch('/api/montree/weekly-admin-docs/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroomId,
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
            if (next <= getCurrentMonday()) setWeekStart(next);
          }}
          disabled={weekStart >= getCurrentMonday()}
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

  return (
    <div className="space-y-3">
      {AREAS.map((area) => {
        const areaNote = notes[area.key] || { english_text: '', chinese_text: '' };
        return (
          <div key={area.key} className="border rounded-lg p-3 bg-gray-50">
            <div className="text-xs font-semibold text-gray-600 mb-2">
              {area.label} / {area.zh}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <textarea
                value={areaNote.english_text}
                onChange={(e) => onUpdate(childId, area.key, 'english_text', e.target.value)}
                placeholder={t('weeklyAdmin.englishPlan')}
                className="px-2 py-1.5 border rounded text-xs resize-none"
                rows={2}
              />
              <textarea
                value={areaNote.chinese_text}
                onChange={(e) => onUpdate(childId, area.key, 'chinese_text', e.target.value)}
                placeholder={t('weeklyAdmin.chinesePlan')}
                className="px-2 py-1.5 border rounded text-xs resize-none"
                rows={2}
              />
            </div>
          </div>
        );
      })}
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
