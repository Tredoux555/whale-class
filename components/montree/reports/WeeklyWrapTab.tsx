// WeeklyWrapTab — embedded in Photo Audit page as third tab
// Simplified Weekly Wrap: compact teacher cards + continuous parent report scroll
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';

// ─── Types ────────────────────────────────────────────────────

interface ParentWork {
  name: string;
  name_zh?: string | null;
  area: string;
  status: string;
  parent_description?: string;
  why_it_matters?: string;
  photo_url?: string;
}

interface Photo {
  id: string;
  url: string;
  work_name?: string | null;
  caption?: string | null;
  captured_at?: string;
}

interface Flag {
  level: string;
  issue: string;
  recommendation: string;
}

interface Recommendation {
  area: string;
  area_label: string;
  area_label_zh?: string;
  work: string;
  work_zh?: string | null;
  reasoning: string;
}

interface ReportResult {
  child_id: string;
  child_name: string;
  teacher_report: Record<string, unknown> | null;
  teacher_report_id: string | null;
  teacher_status: string | null;
  key_insight: string | null;
  recommendations: Recommendation[];
  area_analyses: Array<{ area: string; area_label: string; area_label_zh?: string; works_count: number; narrative: string }>;
  flags: Flag[];
  flags_count: number;
  parent_narrative: string | null;
  parent_photos: Photo[];
  parent_works: ParentWork[];
  photo_count: number;
  report_id: string | null;
  parent_status: string | null;
}

// ─── Constants ────────────────────────────────────────────────

const AREA_LABELS_ZH: Record<string, string> = {
  practical_life: '日常', sensorial: '感官', mathematics: '数学',
  language: '语言', cultural: '文化',
};
const AREA_LABELS_EN: Record<string, string> = {
  practical_life: 'Practical Life', sensorial: 'Sensorial', mathematics: 'Mathematics',
  language: 'Language', cultural: 'Cultural',
};
const AREA_COLORS: Record<string, { bg: string; text: string }> = {
  practical_life: { bg: 'bg-orange-50', text: 'text-orange-700' },
  sensorial: { bg: 'bg-pink-50', text: 'text-pink-700' },
  mathematics: { bg: 'bg-blue-50', text: 'text-blue-700' },
  language: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  cultural: { bg: 'bg-purple-50', text: 'text-purple-700' },
};
const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'] as const;

// ─── WorkWheelPicker types ──────────────────────────────────
interface PickerWork {
  id: string;
  name: string;
  name_chinese?: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  sequence: number;
}

// ─── Helpers ──────────────────────────────────────────────────

function getCurrentMonday(): string {
  // Must match DashboardHeader's date serialization:
  // local Monday at midnight → toISOString() → YYYY-MM-DD (UTC)
  const now = new Date();
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((dow + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().split('T')[0];
}

function shiftWeek(ws: string, weeks: number): string {
  const d = new Date(`${ws}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(ws: string): string {
  const d = new Date(`${ws}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function toCanonicalArea(raw: string): string {
  if (!raw) return '';
  const lower = raw.toLowerCase().replace(/[\s_-]+/g, '_');
  if (AREA_LABELS_EN[lower]) return lower;
  const n = normalizeArea(raw);
  if (n && AREA_LABELS_EN[n]) return n;
  return lower;
}

function cleanUUIDs(text: string): string {
  return text
    .replace(/\bin\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ─── Component ────────────────────────────────────────────────

interface WeeklyWrapTabProps {
  classroomId: string;
  view?: 'teacher' | 'parents';  // controlled from parent; if set, hides internal sub-view toggle
}

export default function WeeklyWrapTab({ classroomId, view: externalView }: WeeklyWrapTabProps) {
  const { t, locale } = useI18n();

  // Week
  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekDisplay = useMemo(() => {
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
    return `${fmt(new Date(weekStart))} – ${fmt(new Date(weekEnd))}`;
  }, [weekStart, weekEnd, locale]);

  // Data
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sub-view — external prop overrides internal state
  const [internalSubView, setInternalSubView] = useState<'teacher' | 'parents'>('teacher');
  const subView = externalView || internalSubView;
  const setSubView = externalView ? (() => {}) : setInternalSubView;

  // Teacher summary
  const [expandedChild, setExpandedChild] = useState<string | null>(null);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [genDone, setGenDone] = useState(0);
  const [genTotal, setGenTotal] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Parent report edits (session-local)
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({});
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [photoEdits, setPhotoEdits] = useState<Record<string, Photo[]>>({});

  // ─── Shelf state ──────────────────────────────────────────
  const [shelfWorks, setShelfWorks] = useState<Record<string, Array<{ area: string; work: string; work_zh?: string | null; status: string }>>>({});
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const [wheelPickerChildId, setWheelPickerChildId] = useState<string>('');
  const [wheelPickerShelfIdx, setWheelPickerShelfIdx] = useState<number>(-1);
  const [wheelPickerArea, setWheelPickerArea] = useState<string>('');
  const [wheelPickerCurrentWork, setWheelPickerCurrentWork] = useState<string>('');
  const [wheelPickerWorks, setWheelPickerWorks] = useState<PickerWork[]>([]);
  const [curriculumCache, setCurriculumCache] = useState<Record<string, PickerWork[]>>({});

  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
    presented: { label: locale === 'zh' ? '已展示' : 'Presented', bg: 'bg-amber-300', text: 'text-amber-800' },
    practicing: { label: locale === 'zh' ? '练习中' : 'Practicing', bg: 'bg-blue-400', text: 'text-blue-800' },
    mastered: { label: locale === 'zh' ? '已掌握' : 'Mastered', bg: 'bg-emerald-400', text: 'text-emerald-800' },
  };

  const getShelfForChild = (r: ReportResult) => {
    if (shelfWorks[r.child_id]) return shelfWorks[r.child_id];
    const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const shelf: Array<{ area: string; work: string; work_zh?: string | null; status: string }> = AREAS.map(area => ({
      area, work: '', work_zh: null, status: 'not_started',
    }));
    for (const rec of r.recommendations) {
      const canonical = toCanonicalArea(rec.area);
      const slot = shelf.find(s => s.area === canonical && !s.work);
      if (slot) {
        slot.work = rec.work;
        slot.work_zh = rec.work_zh || null;
        slot.status = 'presented';
      }
    }
    return shelf;
  };

  const handleShelfStatusCycle = async (childId: string, idx: number) => {
    const shelf = shelfWorks[childId] || getShelfForChild(reports.find(r => r.child_id === childId)!);
    const work = shelf[idx];
    if (!work.work) return;
    const currentIdx = STATUS_FLOW.indexOf(work.status as typeof STATUS_FLOW[number]) ?? 0;
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];
    const updated = [...shelf];
    updated[idx] = { ...work, status: nextStatus };
    setShelfWorks(prev => ({ ...prev, [childId]: updated }));
    try {
      const res = await montreeApi('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: work.work, area: work.area, status: nextStatus, is_focus: true }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch {
      setShelfWorks(prev => ({ ...prev, [childId]: shelf }));
    }
  };

  const openShelfPicker = async (childId: string, shelfIdx: number, area: string, currentWork: string) => {
    setWheelPickerChildId(childId);
    setWheelPickerShelfIdx(shelfIdx);
    setWheelPickerArea(area);
    setWheelPickerCurrentWork(currentWork);
    if (curriculumCache[area]) {
      setWheelPickerWorks(curriculumCache[area]);
      setWheelPickerOpen(true);
      return;
    }
    try {
      const session = await getSession();
      const cid = session?.classroom?.id || classroomId;
      const url = `/api/montree/works/search?area=${encodeURIComponent(area)}&classroom_id=${cid}`;
      const res = await montreeApi(url);
      if (!res.ok) throw new Error('Failed to load works');
      const data = await res.json();
      const works = (data.works || []).map((w: Record<string, unknown>, i: number) => ({
        id: String(w.id), name: String(w.name),
        name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
        status: 'not_started' as const, sequence: typeof w.sequence === 'number' ? w.sequence : i + 1,
      }));
      setCurriculumCache(prev => ({ ...prev, [area]: works }));
      setWheelPickerWorks(works);
      setWheelPickerOpen(true);
    } catch (err) {
      console.error('Failed to load curriculum works:', err);
    }
  };

  const handleShelfPickerSelect = (work: { id: string; name: string; name_chinese?: string; status?: string; sequence?: number }, _status: string) => {
    const childId = wheelPickerChildId;
    const idx = wheelPickerShelfIdx;
    if (!childId || idx < 0) return;
    const report = reports.find(r => r.child_id === childId);
    if (!report) return;
    const shelf = shelfWorks[childId] || getShelfForChild(report);
    const updated = [...shelf];
    updated[idx] = { ...updated[idx], work: work.name, work_zh: work.name_chinese || null, status: 'presented' };
    setShelfWorks(prev => ({ ...prev, [childId]: updated }));
    setWheelPickerOpen(false);
  };

  const handleRefreshPickerWorks = async () => {
    const area = wheelPickerArea;
    const session = await getSession();
    const cid = session?.classroom?.id || classroomId;
    try {
      const res = await montreeApi(`/api/montree/works/search?area=${encodeURIComponent(area)}&classroom_id=${cid}`);
      if (!res.ok) return;
      const data = await res.json();
      const works = (data.works || []).map((w: Record<string, unknown>, i: number) => ({
        id: String(w.id), name: String(w.name),
        name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
        status: 'not_started' as const, sequence: typeof w.sequence === 'number' ? w.sequence : i + 1,
      }));
      setCurriculumCache(prev => ({ ...prev, [area]: works }));
      setWheelPickerWorks(works);
    } catch (err) {
      console.error('Failed to refresh picker works:', err);
    }
  };

  // ─── Fetch ────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    if (!classroomId || !weekStart) return;
    setLoading(true);
    setError('');
    try {
      const res = await montreeApi(
        `/api/montree/reports/weekly-wrap/review?classroom_id=${classroomId}&week_start=${weekStart}`
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setError(locale === 'zh' ? '加载失败' : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [classroomId, weekStart, locale]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ─── Generate ─────────────────────────────────────────────

  const handleGenerate = async (childIds?: string[]) => {
    if (!classroomId || generating) return;
    setGenerating(true);
    setGenProgress(locale === 'zh' ? '正在准备...' : 'Preparing...');
    setGenDone(0);
    setGenTotal(0);

    try {
      const payload: Record<string, unknown> = {
        classroom_id: classroomId,
        week_start: weekStart,
        week_end: weekEnd,
        locale,
        force_regenerate: reports.length > 0,
        stream: true,
      };
      if (childIds && childIds.length > 0) payload.child_ids = childIds;

      const res = await montreeApi('/api/montree/reports/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Generation failed');
      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'start') setGenTotal(evt.total);
            else if (evt.type === 'child_done') {
              setGenDone(prev => prev + 1);
              setGenProgress(evt.child_name);
            } else if (evt.type === 'complete') {
              setGenProgress('');
            }
          } catch { /* skip bad lines */ }
        }
      }

      // Process any remaining buffer after stream ends
      if (buffer.trim()) {
        try {
          const evt = JSON.parse(buffer);
          if (evt.type === 'complete') setGenProgress('');
        } catch { /* skip */ }
      }

      // Refresh data
      await fetchReports();
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
      setGenProgress('');
    }
  };

  // ─── Send All ─────────────────────────────────────────────

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendAll = async () => {
    if (sending) return;
    if (!confirm(locale === 'zh'
      ? `确定要向所有家长发送 ${readyToSend} 份报告吗？`
      : `Send ${readyToSend} reports to all parents?`
    )) return;

    setSending(true);
    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: classroomId, week_start: weekStart, locale }),
      });
      if (!res.ok) throw new Error('Send failed');
      setSent(true);
      await fetchReports();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // ─── Work / Photo handlers ────────────────────────────────

  const handleRemoveWork = (childId: string, workName: string, area: string) => {
    setReports(prev => prev.map(r => {
      if (r.child_id !== childId) return r;
      return { ...r, parent_works: r.parent_works.filter(w => !(w.name === workName && (w.area || '') === area)) };
    }));
  };

  const getPhotos = (r: ReportResult) => photoEdits[r.child_id] ?? r.parent_photos;
  const getNarrative = (r: ReportResult) => narrativeEdits[r.child_id] ?? r.parent_narrative ?? '';

  const handleRemovePhoto = (childId: string, photoId: string) => {
    const report = reports.find(r => r.child_id === childId);
    if (!report) return;
    const current = photoEdits[childId] ?? [...report.parent_photos];
    setPhotoEdits(prev => ({ ...prev, [childId]: current.filter(p => p.id !== photoId) }));
  };

  // ─── Sorted reports ───────────────────────────────────────

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => a.child_name.localeCompare(b.child_name));
  }, [reports]);

  const flaggedCount = useMemo(() => reports.filter(r => r.flags_count > 0).length, [reports]);
  const readyToSend = useMemo(() => reports.filter(r => r.parent_narrative && r.report_id).length, [reports]);

  // ─── Render Helpers ───────────────────────────────────────

  const getAreaLabel = (area: string) =>
    locale === 'zh' ? (AREA_LABELS_ZH[area] || area) : (AREA_LABELS_EN[area] || area.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));

  const getWorksForChild = (r: ReportResult) => {
    const byArea: Record<string, Array<{ name: string; display: string; area: string }>> = {};
    for (const w of r.parent_works) {
      const area = toCanonicalArea(w.area || 'other');
      if (!byArea[area]) byArea[area] = [];
      const display = (locale === 'zh' && w.name_zh) ? w.name_zh : w.name;
      if (!byArea[area].some(x => x.name === w.name)) {
        byArea[area].push({ name: w.name, display, area: w.area || area });
      }
    }
    return AREA_ORDER
      .filter(a => byArea[a]?.length > 0)
      .map(a => ({ area: a, works: byArea[a] }));
  };

  // ─── RENDER ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Week nav + controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(shiftWeek(weekStart, -1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded text-sm">◀</button>
          <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{weekDisplay}</span>
          <button onClick={() => setWeekStart(shiftWeek(weekStart, 1))} className="px-2 py-1 text-gray-500 hover:bg-gray-100 rounded text-sm">▶</button>
        </div>

        <div className="flex items-center gap-2">
          {/* Selection toggle */}
          {reports.length > 0 && !generating && (
            <button
              onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) setSelectedIds(new Set()); }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectionMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {selectionMode ? (locale === 'zh' ? '取消' : 'Cancel') : (locale === 'zh' ? '选择' : 'Select')}
            </button>
          )}

          {/* Generate buttons */}
          {selectionMode && selectedIds.size > 0 ? (
            <button
              onClick={() => handleGenerate(Array.from(selectedIds))}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {generating
                ? `${genDone}/${genTotal}`
                : locale === 'zh' ? `生成 (${selectedIds.size})` : `Generate (${selectedIds.size})`}
            </button>
          ) : (
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating
                ? `${genProgress || '...'} ${genDone}/${genTotal}`
                : reports.some(r => r.parent_narrative)
                  ? (locale === 'zh' ? '🔄 重新生成' : '🔄 Regenerate All')
                  : (locale === 'zh' ? '✨ 生成' : '✨ Generate')}
            </button>
          )}
        </div>
      </div>

      {/* Sub-view toggle — only shown when view is NOT externally controlled */}
      {!externalView && (
        <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b">
          <button
            onClick={() => setSubView('teacher')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${subView === 'teacher' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {locale === 'zh' ? '教师审查' : 'Teacher Review'}
            {flaggedCount > 0 && <span className="ml-1.5 text-amber-600">{flaggedCount}</span>}
          </button>
          <button
            onClick={() => setSubView('parents')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${subView === 'parents' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {locale === 'zh' ? '家长报告' : 'Parent Reports'}
            {readyToSend > 0 && <span className="ml-1.5 text-emerald-600">{readyToSend}</span>}
          </button>
        </div>
      )}

      {/* Selection bar */}
      {selectionMode && (
        <div className="flex items-center justify-between bg-blue-50 px-4 py-2 border-b">
          <span className="text-xs text-blue-700 font-medium">
            {selectedIds.size > 0
              ? (locale === 'zh' ? `已选择 ${selectedIds.size}` : `${selectedIds.size} selected`)
              : (locale === 'zh' ? '点击选择学生' : 'Tap to select')}
          </span>
          <button
            onClick={() => {
              if (selectedIds.size === reports.length) setSelectedIds(new Set());
              else setSelectedIds(new Set(reports.map(r => r.child_id)));
            }}
            className="text-xs text-blue-600 font-semibold"
          >
            {selectedIds.size === reports.length
              ? (locale === 'zh' ? '取消全选' : 'Deselect All')
              : (locale === 'zh' ? '全选' : 'Select All')}
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {reports.length === 0 && !loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">{locale === 'zh' ? '本周还没有报告' : 'No reports for this week'}</p>
          <p className="text-sm">{locale === 'zh' ? '点击"生成"开始' : 'Click "Generate" to start'}</p>
        </div>
      )}

      {/* ═══ TEACHER REVIEW ═══ */}
      {subView === 'teacher' && reports.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
          {sortedReports.map(r => {
            const firstName = r.child_name.split(' ')[0];
            const isExpanded = expandedChild === r.child_id;
            const hasFlagIssue = r.flags_count > 0;
            const totalWorks = r.parent_works.length;
            const isSelected = selectedIds.has(r.child_id);
            const areaEntries = getWorksForChild(r);

            return (
              <div
                key={r.child_id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isExpanded ? 'col-span-2 sm:col-span-3' : ''
                } ${isSelected ? 'border-blue-400 ring-1 ring-blue-200' : hasFlagIssue ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-white'}`}
              >
                {/* Compact card header */}
                <button
                  onClick={() => {
                    if (selectionMode) {
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(r.child_id)) next.delete(r.child_id); else next.add(r.child_id);
                        return next;
                      });
                      return;
                    }
                    setExpandedChild(isExpanded ? null : r.child_id);
                  }}
                  className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                >
                  {selectionMode && (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 text-[9px] ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                      {isSelected && '✓'}
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${hasFlagIssue ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                    {firstName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-xs truncate">{firstName}</p>
                    <p className="text-[10px] text-gray-400">
                      {totalWorks} {locale === 'zh' ? '项' : 'works'}
                      {hasFlagIssue && <span className="text-amber-600 ml-1">⚠ {r.flags_count}</span>}
                    </p>
                  </div>
                  {isExpanded && <span className="text-gray-300 text-[10px]">▲</span>}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 space-y-3">
                    {/* ── Guru Weekly Summary ── */}
                    {(() => {
                      // Build a concise Montessori-perspective summary
                      const activeAreas = areaEntries.map(e => getAreaLabel(e.area));
                      const missingAreas = AREA_ORDER
                        .filter(a => !areaEntries.some(e => e.area === a))
                        .map(a => getAreaLabel(a));
                      const totalWk = r.parent_works.length;
                      const insight = r.key_insight ? cleanUUIDs(r.key_insight) : null;

                      // Build a short guru-style observation
                      let guruSummary = '';
                      if (insight) {
                        guruSummary = insight;
                      } else if (totalWk > 0) {
                        if (locale === 'zh') {
                          guruSummary = `${firstName} 本周参与了 ${totalWk} 项工作，涵盖${activeAreas.join('、')}。`;
                          if (missingAreas.length > 0 && missingAreas.length <= 3) {
                            guruSummary += `${missingAreas.join('、')}领域本周缺少记录。`;
                          }
                        } else {
                          guruSummary = `${firstName} engaged with ${totalWk} work${totalWk > 1 ? 's' : ''} this week across ${activeAreas.join(', ')}.`;
                          if (missingAreas.length > 0 && missingAreas.length <= 3) {
                            guruSummary += ` No documented engagement in ${missingAreas.join(', ')}.`;
                          }
                        }
                      }

                      return guruSummary ? (
                        <div className="mt-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-100">
                          <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">
                            {locale === 'zh' ? '本周观察' : "This Week's Observation"}
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">{guruSummary}</p>
                        </div>
                      ) : null;
                    })()}

                    {/* Works as chips */}
                    {areaEntries.length > 0 && (
                      <div className="space-y-2">
                        {areaEntries.map(({ area, works }) => (
                          <div key={area}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <AreaBadge area={area} size="sm" />
                              <span className="text-xs font-medium text-gray-600">{getAreaLabel(area)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 pl-6">
                              {works.map(w => (
                                <span key={w.name} className="inline-flex items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 text-[11px] text-gray-700">
                                  {w.display}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveWork(r.child_id, w.name, w.area); }}
                                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 ml-0.5"
                                  >×</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Flags */}
                    {r.flags.length > 0 && (
                      <div className="space-y-1">
                        {r.flags.map((f, i) => (
                          <div key={`${f.level}-${i}-${f.issue.slice(0, 30)}`} className="flex items-start gap-1.5 text-[11px] bg-amber-50 rounded-lg p-2">
                            <span>{f.level === 'red' ? '🔴' : '🟡'}</span>
                            <p className="text-gray-700 leading-relaxed">{cleanUUIDs(f.issue)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Next Week's Focus Shelf ── */}
                    {(() => {
                      const shelf = getShelfForChild(r);
                      return (
                        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                          <h3 className="font-bold text-gray-800 text-xs mb-2">
                            {locale === 'zh' ? '下周重点' : "Next Week's Focus"}
                          </h3>
                          <div className="space-y-1.5">
                            {shelf.map((item, idx) => {
                              const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                              return (
                                <div
                                  key={`${r.child_id}-shelf-${item.area}`}
                                  className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50"
                                >
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openShelfPicker(r.child_id, idx, item.area, item.work); }}
                                    className="flex-shrink-0"
                                  >
                                    <AreaBadge area={item.area} size="md" />
                                  </button>
                                  <button
                                    className="flex-1 text-left min-w-0"
                                    onClick={(e) => { e.stopPropagation(); openShelfPicker(r.child_id, idx, item.area, item.work); }}
                                  >
                                    {item.work ? (
                                      <p className="font-medium text-gray-800 text-xs truncate">
                                        {(locale === 'zh' && item.work_zh) ? item.work_zh : item.work}
                                      </p>
                                    ) : (
                                      <p className="font-medium text-gray-400 text-xs italic">
                                        {locale === 'zh' ? '点击选择' : 'Tap to select'}
                                      </p>
                                    )}
                                  </button>
                                  {item.work ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleShelfStatusCycle(r.child_id, idx); }}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all active:scale-90 ${statusCfg.bg} ${statusCfg.text}`}
                                    >
                                      {statusCfg.label}
                                    </button>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px]">○</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ PARENT REPORTS — beautiful, exactly as parents will see ═══ */}
      {subView === 'parents' && reports.length > 0 && (
        <div className="space-y-0">
          {sortedReports.map(r => {
            const firstName = r.child_name.split(' ')[0];
            const narrative = getNarrative(r);
            const photos = getPhotos(r);
            const isEditing = editingNarrative === r.child_id;

            return (
              <div key={r.child_id} className="bg-white">
                {/* ── Child Header — elegant, warm ── */}
                <div className="px-5 pt-8 pb-4">
                  <div className="flex items-center gap-3">
                    {selectionMode && (
                      <button
                        onClick={() => setSelectedIds(prev => {
                          const next = new Set(prev);
                          if (next.has(r.child_id)) next.delete(r.child_id); else next.add(r.child_id);
                          return next;
                        })}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 text-[11px] ${selectedIds.has(r.child_id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}
                      >
                        {selectedIds.has(r.child_id) && '✓'}
                      </button>
                    )}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                      {firstName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-gray-900 text-lg">{r.child_name}</h2>
                      <p className="text-xs text-gray-400">
                        {weekDisplay}
                        {r.parent_status === 'sent' && <span className="ml-2 text-emerald-600 font-medium">{locale === 'zh' ? '✓ 已发送' : '✓ Sent'}</span>}
                      </p>
                    </div>
                    {narrative && (
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingNarrative(null); }
                          else {
                            setEditingNarrative(r.child_id);
                            if (narrativeEdits[r.child_id] === undefined) {
                              setNarrativeEdits(prev => ({ ...prev, [r.child_id]: narrative }));
                            }
                          }
                        }}
                        className="text-xs text-emerald-600 font-medium px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-50 transition-colors"
                      >
                        {isEditing ? (locale === 'zh' ? '完成' : 'Done') : (locale === 'zh' ? '编辑' : 'Edit')}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Narrative Introduction — warm summary for parents ── */}
                <div className="px-5 pb-4">
                  {narrative ? (
                    isEditing ? (
                      <textarea
                        value={narrativeEdits[r.child_id] ?? narrative}
                        onChange={e => setNarrativeEdits(prev => ({ ...prev, [r.child_id]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl p-4 text-[15px] text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[120px] resize-y"
                      />
                    ) : (
                      <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100">
                        <p className="text-[15px] text-gray-700 leading-[1.8] tracking-wide">{narrative}</p>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-5 border border-dashed border-gray-200">
                      <p className="text-sm text-gray-400 italic text-center">
                        {locale === 'zh' ? '点击"生成"创建家长报告' : 'Click "Generate" to create the parent report'}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Photos — large, vertical, with educational context ── */}
                {photos.length > 0 ? (
                  <div className="px-5 pb-6 space-y-5">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                      {locale === 'zh'
                        ? `${firstName} 的学习瞬间`
                        : `${firstName}'s Learning Moments`}
                    </p>
                    {photos.map(photo => {
                      const matchedWork = photo.work_name
                        ? r.parent_works.find(w =>
                            w.name.toLowerCase().includes(photo.work_name!.toLowerCase()) ||
                            photo.work_name!.toLowerCase().includes(w.name.toLowerCase())
                          )
                        : undefined;
                      const areaColor = matchedWork
                        ? (AREA_COLORS[toCanonicalArea(matchedWork.area)] || AREA_COLORS.cultural)
                        : { bg: 'bg-gray-50', text: 'text-gray-600' };
                      const workDisplay = (locale === 'zh' && matchedWork?.name_zh) ? matchedWork.name_zh : (photo.work_name || '');

                      return (
                        <div key={photo.id} className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm group relative">
                          {/* Large photo */}
                          <div className="relative">
                            <img
                              src={photo.url}
                              alt={workDisplay}
                              className="w-full aspect-[4/3] object-cover bg-gray-100"
                              loading="lazy"
                            />
                            {/* Delete button — teacher only, hover */}
                            <button
                              onClick={() => handleRemovePhoto(r.child_id, photo.id)}
                              className="absolute top-3 right-3 w-7 h-7 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >✕</button>
                          </div>

                          {/* Educational context below photo */}
                          {(photo.work_name || matchedWork) && (
                            <div className="px-4 py-3 bg-white">
                              <div className="flex items-start gap-2">
                                {matchedWork && (
                                  <span className={`flex-shrink-0 mt-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${areaColor.bg} ${areaColor.text}`}>
                                    {getAreaLabel(toCanonicalArea(matchedWork.area))}
                                  </span>
                                )}
                                <h4 className="font-semibold text-gray-800 text-sm leading-snug">
                                  {workDisplay}
                                </h4>
                              </div>
                              {matchedWork?.parent_description && (
                                <p className="text-sm text-gray-600 leading-relaxed mt-2">
                                  {matchedWork.parent_description}
                                </p>
                              )}
                              {matchedWork?.why_it_matters && (
                                <p className="text-xs text-gray-500 leading-relaxed mt-1.5 italic">
                                  {matchedWork.why_it_matters}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 pb-6">
                    <p className="text-sm text-gray-300 italic text-center py-6">
                      {locale === 'zh' ? '本周没有拍摄照片' : `No photos captured for ${firstName} this week`}
                    </p>
                  </div>
                )}

                {/* Divider between children */}
                <div className="mx-8 border-b border-gray-100" />
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky bottom: Send All */}
      {subView === 'parents' && readyToSend > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {locale === 'zh' ? `${readyToSend} 份报告就绪` : `${readyToSend} reports ready`}
            </p>
            <button
              onClick={handleSendAll}
              disabled={sending || sent}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending
                ? (locale === 'zh' ? '发送中...' : 'Sending...')
                : sent
                  ? (locale === 'zh' ? '已发送' : 'Sent!')
                  : (locale === 'zh' ? '发送给家长' : 'Send All to Parents')}
            </button>
          </div>
        </div>
      )}

      {/* WorkWheelPicker modal for shelf */}
      <WorkWheelPicker
        isOpen={wheelPickerOpen}
        onClose={() => setWheelPickerOpen(false)}
        area={wheelPickerArea}
        works={wheelPickerWorks}
        currentWorkName={wheelPickerCurrentWork}
        onSelectWork={handleShelfPickerSelect}
        onWorkAdded={handleRefreshPickerWorks}
      />
    </div>
  );
}
