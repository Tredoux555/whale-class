// WeeklyWrapTab — embedded in Photo Audit page as third tab
// Teacher Review: clean list with expand. Parent Reports: child list → click to preview one.
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useMemo, useCallback, CSSProperties } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { getAreaLabel as getAreaLabelI18n, AREA_LABELS_EN } from '@/lib/montree/i18n/area-labels';
import { getIntlLocale } from '@/lib/montree/i18n/locales';
import WorkWheelPicker from '@/components/montree/WorkWheelPicker';
import InviteParentModal from '@/components/montree/InviteParentModal';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

interface ParentWork {
  name: string;
  name_zh?: string | null;
  area: string;
  status: string;
  parent_description?: string;
  why_it_matters?: string;
  parent_description_zh?: string | null;
  why_it_matters_zh?: string | null;
  photo_url?: string;
}

interface Photo {
  id: string;
  url: string;
  work_name?: string | null;
  work_name_zh?: string | null;
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
  teacher_report_id: string | null;
  teacher_status: string | null;
  key_insight: string | null;
  teacher_guidance: string | null;
  recommendations: Recommendation[];
  area_analyses: Array<{ area: string; area_label: string; area_label_zh?: string; works_count: number; narrative: string }>;
  flags: Flag[];
  flags_count: number;
  parent_narrative: string | null;
  parent_photos: Photo[];
  // Canonical focus works from montree_child_focus_works — single source of truth
  focus_works: Array<{ area: string; work_name: string; work_name_zh: string | null; status: string }>;
  parent_works: ParentWork[];
  photo_count: number;
  report_id: string | null;
  parent_status: string | null;
}

// ─── Constants ────────────────────────────────────────────────

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  violet: '#c4b5fd',
  violetSoft: 'rgba(139,92,246,0.18)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  blue: '#60a5fa',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  blur: 'blur(16px) saturate(140%)',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  serif: '"Lora", Georgia, serif',
};

// AREA_LABELS_ZH and AREA_LABELS_EN imported from @/lib/montree/i18n/area-labels
const AREA_COLORS: Record<string, { bg: string; text: string; rgb: string }> = {
  practical_life: { bg: 'rgba(236,72,153,0.15)', text: 'rgb(236, 72, 153)', rgb: '236, 72, 153' },
  sensorial: { bg: 'rgba(20,184,166,0.15)', text: 'rgb(20, 184, 166)', rgb: '20, 184, 166' },
  mathematics: { bg: 'rgba(168,85,247,0.15)', text: 'rgb(168, 85, 247)', rgb: '168, 85, 247' },
  language: { bg: 'rgba(74,222,128,0.15)', text: 'rgb(74, 222, 128)', rgb: '74, 222, 128' },
  cultural: { bg: 'rgba(249,115,22,0.15)', text: 'rgb(249, 115, 22)', rgb: '249, 115, 22' },
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

// ─── Parent Photos Grouped by Area ────────────────────────────

function ParentPhotosGrouped({ photos, parentWorks, childId, firstName, locale, getAreaLabel, handleRemovePhoto }: {
  photos: Photo[];
  parentWorks: ParentWork[];
  childId: string;
  firstName: string;
  locale: string;
  getAreaLabel: (area: string) => string;
  handleRemovePhoto: (childId: string, photoId: string) => void;
}) {
  const { t } = useI18n();
  if (photos.length === 0) {
    return (
      <div style={{ padding: '0 20px 24px' }}>
        <p style={{
          fontSize: 14,
          color: T.textSecondary,
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '24px 0',
          fontFamily: T.sans,
        }}>
          {t('weeklyWrap.noPhotos', { name: firstName })}
        </p>
      </div>
    );
  }

  // Match each photo to its work & resolve area
  const enriched = photos.map(photo => {
    const matchedWork = photo.work_name
      ? parentWorks.find(w =>
          w.name.toLowerCase().includes(photo.work_name!.toLowerCase()) ||
          photo.work_name!.toLowerCase().includes(w.name.toLowerCase())
        )
      : undefined;
    const canonicalArea = matchedWork ? toCanonicalArea(matchedWork.area) : null;
    return { photo, matchedWork, canonicalArea };
  });

  // Group by area — shelf order first, then 'other' for unmatched
  const grouped: Record<string, typeof enriched> = {};
  for (const area of AREA_ORDER) grouped[area] = [];
  grouped['other'] = [];
  for (const item of enriched) {
    const key = item.canonicalArea && AREA_ORDER.includes(item.canonicalArea)
      ? item.canonicalArea : 'other';
    grouped[key].push(item);
  }

  // Shelf order + other at end, skip empties
  const orderedKeys = [...AREA_ORDER, 'other'].filter(k => grouped[k].length > 0);

  return (
    <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p style={{
        fontSize: 11,
        color: T.textMuted,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        fontFamily: T.sans,
      }}>
        {t('weeklyWrap.learningMoments', { name: firstName })}
      </p>
      {orderedKeys.map(areaKey => {
        const areaColor = AREA_COLORS[areaKey] || { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.60)', rgb: '255,255,255' };
        const areaLabel = areaKey === 'other'
          ? t('weeklyWrap.other')
          : getAreaLabel(areaKey);

        return (
          <div key={areaKey}>
            {/* Area section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: 999,
                fontWeight: 600,
                fontFamily: T.sans,
                backgroundColor: areaColor.bg,
                color: areaColor.text,
              }}>
                {areaLabel}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>

            {/* Photos in this area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {grouped[areaKey].map(({ photo, matchedWork }) => {
                const workDisplay = locale === 'zh'
                  ? (matchedWork?.name_zh || photo.work_name_zh || photo.work_name || '')
                  : (photo.work_name || '');
                const descDisplay = locale === 'zh'
                  ? (matchedWork?.parent_description_zh || matchedWork?.parent_description)
                  : matchedWork?.parent_description;
                const whyDisplay = locale === 'zh'
                  ? (matchedWork?.why_it_matters_zh || matchedWork?.why_it_matters)
                  : matchedWork?.why_it_matters;

                return (
                  <div
                    key={photo.id}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: T.cardBorder,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      position: 'relative',
                      group: true,
                    } as any}
                  >
                    <div style={{ position: 'relative' }}>
                      <img
                        src={photo.url}
                        alt={workDisplay || 'Learning moment photo'}
                        style={{
                          width: '100%',
                          aspectRatio: '4/3',
                          objectFit: 'cover',
                          backgroundColor: 'rgba(255,255,255,0.05)',
                          display: 'block',
                        }}
                        loading="lazy"
                      />
                      <button
                        onClick={() => handleRemovePhoto(childId, photo.id)}
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          width: 28,
                          height: 28,
                          background: 'rgba(0,0,0,0.40)',
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 12,
                          opacity: 0,
                          transition: 'opacity 200ms ease',
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
                      >✕</button>
                    </div>

                    {(photo.work_name || matchedWork) && (
                      <div style={{
                        padding: '12px 16px',
                        background: T.card,
                        borderTop: T.cardBorder,
                      }}>
                        <h4 style={{
                          fontWeight: 600,
                          color: T.textPrimary,
                          fontSize: 14,
                          lineHeight: 1.4,
                          margin: 0,
                          fontFamily: T.sans,
                        }}>
                          {workDisplay}
                        </h4>
                        {descDisplay && (
                          <p style={{
                            fontSize: 13,
                            color: T.textSecondary,
                            lineHeight: 1.5,
                            marginTop: 8,
                            margin: 0,
                            fontFamily: T.sans,
                          }}>
                            {descDisplay}
                          </p>
                        )}
                        {whyDisplay && (
                          <p style={{
                            fontSize: 12,
                            color: T.textMuted,
                            lineHeight: 1.4,
                            marginTop: 6,
                            fontStyle: 'italic',
                            margin: 0,
                            fontFamily: T.sans,
                          }}>
                            {whyDisplay}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
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
    const dateLocale = getIntlLocale(locale);
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

  // Parent report preview — click a child to preview their report
  const [previewChild, setPreviewChild] = useState<string | null>(null);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [genDone, setGenDone] = useState(0);
  const [genTotal, setGenTotal] = useState(0);

  // Selection — always active, checkboxes always visible
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Parent report edits (session-local)
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({});
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [photoEdits, setPhotoEdits] = useState<Record<string, Photo[]>>({});

  // Invite parent modal
  const [inviteChildId, setInviteChildId] = useState<string | null>(null);
  const [inviteChildName, setInviteChildName] = useState('');

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
    presented: { label: t('status.presented'), bg: 'bg-amber-300', text: 'text-amber-800' },
    practicing: { label: t('status.practicing'), bg: 'bg-blue-400', text: 'text-blue-800' },
    mastered: { label: t('status.mastered'), bg: 'bg-emerald-400', text: 'text-emerald-800' },
  };

  const getShelfForChild = (r: ReportResult) => {
    if (shelfWorks[r.child_id]) return shelfWorks[r.child_id];
    const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const shelf: Array<{ area: string; work: string; work_zh?: string | null; status: string }> = AREAS.map(area => ({
      area, work: '', work_zh: null, status: 'not_started',
    }));

    // Primary source: montree_child_focus_works (the single source of truth)
    if (r.focus_works && r.focus_works.length > 0) {
      for (const fw of r.focus_works) {
        const slot = shelf.find(s => s.area === fw.area && !s.work);
        if (slot) {
          slot.work = fw.work_name;
          slot.work_zh = fw.work_name_zh || null;
          slot.status = fw.status || 'presented';
        }
      }
    } else {
      // Fallback: old reports before this fix — use recommendations from teacher report
      for (const rec of r.recommendations) {
        const canonical = toCanonicalArea(rec.area);
        const slot = shelf.find(s => s.area === canonical && !s.work);
        if (slot) {
          slot.work = rec.work;
          slot.work_zh = rec.work_zh || null;
          slot.status = 'presented';
        }
      }
    }
    return shelf;
  };

  const handleShelfStatusCycle = async (childId: string, idx: number) => {
    const report = reports.find(r => r.child_id === childId);
    if (!report) return;
    const shelf = shelfWorks[childId] || getShelfForChild(report);
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
      const session = getSession();
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

  const handleShelfPickerSelect = async (work: { id: string; name: string; name_chinese?: string; status?: string; sequence?: number }, _status: string) => {
    const childId = wheelPickerChildId;
    const idx = wheelPickerShelfIdx;
    if (!childId || idx < 0) return;
    const report = reports.find(r => r.child_id === childId);
    if (!report) return;
    const shelf = shelfWorks[childId] || getShelfForChild(report);
    const oldShelf = [...shelf];
    const updated = [...shelf];
    const area = updated[idx].area;
    updated[idx] = { ...updated[idx], work: work.name, work_zh: work.name_chinese || null, status: 'presented' };
    setShelfWorks(prev => ({ ...prev, [childId]: updated }));
    setWheelPickerOpen(false);

    // Persist to montree_child_focus_works (single source of truth) + progress
    try {
      await montreeApi('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: work.name, area, status: 'presented', is_focus: true }),
      });
    } catch (err) {
      console.error('Failed to save shelf work:', err);
      setShelfWorks(prev => ({ ...prev, [childId]: oldShelf }));
    }
  };

  const handleRefreshPickerWorks = async () => {
    const area = wheelPickerArea;
    const session = getSession();
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

  const fetchReports = useCallback(async (signal?: AbortSignal) => {
    if (!classroomId || !weekStart) return;
    setLoading(true);
    setError('');
    try {
      const res = await montreeApi(
        `/api/montree/reports/weekly-wrap/review?classroom_id=${classroomId}&week_start=${weekStart}`,
        { signal }
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (!signal?.aborted) setReports(data.reports || []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(t('weeklyWrap.loadFailed'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [classroomId, weekStart, locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);
    return () => controller.abort();
  }, [fetchReports]);

  // ─── Generate ─────────────────────────────────────────────

  const handleGenerate = async (childIds?: string[]) => {
    if (!classroomId || generating) return;
    setGenerating(true);
    setGenProgress(t('weeklyWrap.preparing'));
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
    if (!confirm(t('weeklyWrap.confirmSendAll', { count: readyToSend }))) return;

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
      const updatedWorks = r.parent_works.filter(w => !(w.name === workName && (w.area || '') === area));
      // Persist to DB so removal survives page reload
      if (r.report_id) {
        montreeApi(`/api/montree/reports/weekly-wrap/edit`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ report_id: r.report_id, works: updatedWorks }),
        }).catch(err => console.error('[WeeklyWrap] Failed to persist work removal:', err));
      }
      return { ...r, parent_works: updatedWorks };
    }));
  };

  const getPhotos = (r: ReportResult) => photoEdits[r.child_id] ?? r.parent_photos;
  const getNarrative = (r: ReportResult) => narrativeEdits[r.child_id] ?? r.parent_narrative ?? '';

  const handleRemovePhoto = (childId: string, photoId: string) => {
    const report = reports.find(r => r.child_id === childId);
    if (!report) return;
    const current = photoEdits[childId] ?? [...report.parent_photos];
    const updatedPhotos = current.filter(p => p.id !== photoId);
    setPhotoEdits(prev => ({ ...prev, [childId]: updatedPhotos }));
    // Persist to DB so removal survives page reload
    if (report.report_id) {
      montreeApi(`/api/montree/reports/weekly-wrap/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: report.report_id, photos: updatedPhotos }),
      }).catch(err => console.error('[WeeklyWrap] Failed to persist photo removal:', err));
    }
  };

  // ─── Sorted reports ───────────────────────────────────────

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => a.child_name.localeCompare(b.child_name));
  }, [reports]);

  const flaggedCount = useMemo(() => reports.filter(r => r.flags_count > 0).length, [reports]);
  const readyToSend = useMemo(() => reports.filter(r => r.parent_narrative && r.report_id).length, [reports]);

  // ─── Render Helpers ───────────────────────────────────────

  const getAreaLabel = (area: string) => getAreaLabelI18n(area, locale);

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 0',
      }}>
        <Loader2 size={24} strokeWidth={1.75} color={T.emerald} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 96, color: T.textPrimary, fontFamily: T.sans }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Week nav + controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(7,18,12,0.55)',
        borderBottom: '1px solid rgba(52,211,153,0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: T.sans,
            }}
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <span style={{
            fontSize: 13,
            fontWeight: 500,
            color: T.textPrimary,
            minWidth: 140,
            textAlign: 'center',
            fontFamily: T.sans,
          }}>
            {weekDisplay}
          </span>
          <button
            onClick={() => setWeekStart(shiftWeek(weekStart, 1))}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: T.sans,
            }}
          >
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Generate selected OR all */}
          {selectedIds.size > 0 ? (
            <button
              onClick={() => handleGenerate(Array.from(selectedIds))}
              disabled={generating}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: T.blue,
                color: '#0a0a0a',
                fontSize: 12,
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.55 : 1,
                border: 'none',
                fontFamily: T.sans,
              }}
            >
              {generating
                ? `${genDone}/${genTotal}`
                : t('weeklyWrap.generateCount', { count: selectedIds.size })}
            </button>
          ) : (
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: T.emerald,
                color: '#06281a',
                fontSize: 12,
                fontWeight: 600,
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.55 : 1,
                border: 'none',
                fontFamily: T.sans,
              }}
            >
              {generating
                ? `${genProgress || '...'} ${genDone}/${genTotal}`
                : reports.some(r => r.parent_narrative)
                  ? t('weeklyWrap.regenerateAll')
                  : t('weeklyWrap.generateAll')}
            </button>
          )}
        </div>
      </div>

      {/* Sub-view toggle — only shown when view is NOT externally controlled */}
      {!externalView && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '10px 16px',
          background: 'rgba(7,18,12,0.40)',
          borderBottom: '1px solid rgba(52,211,153,0.15)',
        }}>
          <button
            onClick={() => setSubView('teacher')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.sans,
              background: subView === 'teacher' ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: subView === 'teacher' ? T.emerald : T.textSecondary,
              border: subView === 'teacher' ? `1px solid rgba(52,211,153,0.30)` : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            {t('weeklyWrap.teacherReview')}
          </button>
          <button
            onClick={() => setSubView('parents')}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: T.sans,
              background: subView === 'parents' ? 'rgba(255,255,255,0.10)' : 'transparent',
              color: subView === 'parents' ? T.emerald : T.textSecondary,
              border: subView === 'parents' ? `1px solid rgba(52,211,153,0.30)` : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t('weeklyWrap.parentReports')}
            {readyToSend > 0 && <span style={{ color: T.emerald, fontSize: 11 }}>{readyToSend}</span>}
          </button>
        </div>
      )}

      {/* Selection bar — always visible when reports exist */}
      {reports.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(96,165,250,0.08)',
          padding: '8px 16px',
          borderBottom: '1px solid rgba(96,165,250,0.15)',
        }}>
          <span style={{
            fontSize: 11,
            color: T.blue,
            fontFamily: T.sans,
          }}>
            {selectedIds.size > 0
              ? t('weeklyWrap.selectedCount', { count: selectedIds.size })
              : t('weeklyWrap.selectPrompt')}
          </span>
          <button
            onClick={() => {
              if (selectedIds.size === reports.length) setSelectedIds(new Set());
              else setSelectedIds(new Set(reports.map(r => r.child_id)));
            }}
            style={{
              fontSize: 11,
              color: T.blue,
              fontWeight: 600,
              fontFamily: T.sans,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {selectedIds.size === reports.length
              ? t('weeklyWrap.deselectAll')
              : t('weeklyWrap.selectAll')}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: T.redSoft,
          border: `1px solid ${T.redBorder}`,
          color: T.red,
          fontSize: 13,
          borderRadius: 12,
          fontFamily: T.sans,
        }}>
          {error}
        </div>
      )}

      {reports.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '64px 16px',
          color: T.textMuted,
          fontFamily: T.sans,
        }}>
          <p style={{ fontSize: 18, marginBottom: 8, margin: 0, marginBottom: 8 }}>{t('weeklyWrap.noReports')}</p>
          <p style={{ fontSize: 13, margin: 0 }}>{t('weeklyWrap.clickGenerateToStart')}</p>
        </div>
      )}

      {/* ═══ TEACHER REVIEW — clean list, click to expand ═══ */}
      {subView === 'teacher' && reports.length > 0 && (
        <div>
          {sortedReports.map(r => {
            const firstName = r.child_name.split(' ')[0];
            const isExpanded = expandedChild === r.child_id;
            const hasFlagIssue = r.flags_count > 0;
            const totalWorks = r.parent_works.length;
            const isSelected = selectedIds.has(r.child_id);
            const areaEntries = getWorksForChild(r);
            const hasReport = !!r.parent_narrative;

            return (
              <div
                key={r.child_id}
                style={{
                  background: isSelected ? 'rgba(96,165,250,0.08)' : T.card,
                  borderBottom: '1px solid rgba(52,211,153,0.10)',
                }}
              >
                {/* ── Row: checkbox + avatar + name + stats + chevron ── */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                }}>
                  {/* Checkbox */}
                  <button
                    onClick={() => setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(r.child_id)) next.delete(r.child_id); else next.add(r.child_id);
                      return next;
                    })}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? T.blue : 'rgba(255,255,255,0.20)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 10,
                      transition: 'all 120ms ease',
                      background: isSelected ? T.blue : 'transparent',
                      color: isSelected ? '#0a0a0a' : 'transparent',
                      cursor: 'pointer',
                      fontFamily: T.sans,
                    }}
                  >
                    {isSelected && '✓'}
                  </button>

                  {/* Click area for expand/collapse */}
                  <button
                    onClick={() => setExpandedChild(isExpanded ? null : r.child_id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      textAlign: 'left',
                      minWidth: 0,
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontFamily: T.sans,
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: 12,
                      flexShrink: 0,
                      background: `linear-gradient(135deg, ${T.emerald}, #0d9488)`,
                    }}>
                      {firstName.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontWeight: 600,
                        color: T.textPrimary,
                        fontSize: 14,
                        margin: 0,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        fontFamily: T.sans,
                      }}>
                        {r.child_name}
                      </p>
                    </div>

                    {/* Status pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {totalWorks > 0 && (
                        <span style={{
                          fontSize: 10,
                          color: T.textMuted,
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: 999,
                          padding: '2px 8px',
                          fontFamily: T.sans,
                        }}>
                          {totalWorks} {t('weeklyWrap.worksCount')}
                        </span>
                      )}
                      {hasReport && (
                        <span style={{
                          fontSize: 10,
                          color: T.emerald,
                          background: 'rgba(52,211,153,0.15)',
                          borderRadius: 999,
                          padding: '2px 6px',
                          fontFamily: T.sans,
                        }}>
                          ✓
                        </span>
                      )}
                      <span style={{
                        color: T.textMuted,
                        fontSize: 12,
                        transition: 'transform 200ms ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}>
                        ▼
                      </span>
                    </div>
                  </button>
                </div>

                {/* ── Expanded details ── */}
                {isExpanded && (
                  <div className="px-4 pb-4 pl-[52px] space-y-3 border-t border-gray-50">
                    {/* ── Guru Weekly Summary ── */}
                    {(() => {
                      const activeAreas = areaEntries.map(e => getAreaLabel(e.area));
                      const missingAreas = AREA_ORDER
                        .filter(a => !areaEntries.some(e => e.area === a))
                        .map(a => getAreaLabel(a));
                      const totalWk = r.parent_works.length;
                      const insight = r.key_insight ? cleanUUIDs(r.key_insight) : null;

                      let guruSummary = '';
                      if (insight) {
                        guruSummary = insight;
                      } else if (totalWk > 0) {
                        const LIST_SEP: Record<string, string> = { zh: '、' };
                        const sep = LIST_SEP[locale] || ', ';
                        guruSummary = t('weeklyWrap.guruSummaryEn', { name: firstName, count: totalWk, areas: activeAreas.join(sep) });
                        if (missingAreas.length > 0 && missingAreas.length <= 3) {
                          guruSummary += t('weeklyWrap.guruMissingEn', { areas: missingAreas.join(sep) });
                        }
                      }

                      return guruSummary ? (
                        <div className="mt-2 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-100">
                          <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider mb-1">
                            {t('weeklyWrap.thisWeekObservation')}
                          </p>
                          <p className="text-xs text-gray-700 leading-relaxed">{guruSummary}</p>
                        </div>
                      ) : null;
                    })()}

                    {/* ── Developmental Guidance ── */}
                    {r.teacher_guidance && (
                      <div className="mt-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-100">
                        <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                          {t('weeklyWrap.developmentalGuidance')}
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed">{r.teacher_guidance}</p>
                      </div>
                    )}

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

                    {/* Flags — deduplicate: if red flag mentions an area, skip yellow for same area */}
                    {r.flags.length > 0 && (() => {
                      const AREA_KEYWORDS = ['practical life', 'sensorial', 'mathematics', 'language', 'cultural'];
                      const redAreas = new Set<string>();
                      for (const f of r.flags) {
                        if (f.level === 'red') {
                          const lower = (f.issue || '').toLowerCase();
                          for (const kw of AREA_KEYWORDS) {
                            if (lower.includes(kw)) redAreas.add(kw);
                          }
                        }
                      }
                      const deduped = r.flags.filter(f => {
                        if (f.level !== 'yellow' || redAreas.size === 0) return true;
                        const lower = (f.issue || '').toLowerCase();
                        return !AREA_KEYWORDS.some(kw => redAreas.has(kw) && lower.includes(kw));
                      });
                      return deduped.length > 0 ? (
                        <div className="space-y-1">
                          {deduped.map((f, i) => (
                            <div key={`${f.level}-${i}-${f.issue.slice(0, 30)}`} className="flex items-start gap-1.5 text-[11px] bg-amber-50 rounded-lg p-2">
                              <span>{f.level === 'red' ? '🔴' : '🟡'}</span>
                              <p className="text-gray-700 leading-relaxed">{cleanUUIDs(f.issue)}</p>
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* ── Next Week's Focus Shelf ── */}
                    {(() => {
                      const shelf = getShelfForChild(r);
                      return (
                        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                          <h3 className="font-bold text-gray-800 text-xs mb-2">
                            {t('weeklyWrap.nextWeekFocus')}
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
                                        {t('weeklyWrap.tapToSelect')}
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

      {/* ═══ PARENT REPORTS — child list, click to preview one child's report ═══ */}
      {subView === 'parents' && reports.length > 0 && (
        <div>
          {/* Parent invite info banner */}
          <div className="px-4 py-2 bg-emerald-50/60 border-b">
            <p className="text-[11px] text-emerald-700">
              {t('weeklyWrap.parentInviteInfo')}
            </p>
          </div>

          {!previewChild ? (
            /* ── Child List — click to preview ── */
            <div className="divide-y divide-gray-100">
              {sortedReports.map(r => {
                const firstName = r.child_name.split(' ')[0];
                const hasNarrative = !!r.parent_narrative;
                const photoCount = r.photo_count || r.parent_photos.length;
                const isSelected = selectedIds.has(r.child_id);

                return (
                  <div key={r.child_id} className={`flex items-center gap-2 px-4 py-2.5 ${isSelected ? 'bg-blue-50/40' : 'bg-white'}`}>
                    {/* Checkbox */}
                    <button
                      onClick={() => setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(r.child_id)) next.delete(r.child_id); else next.add(r.child_id);
                        return next;
                      })}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 text-[10px] transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      {isSelected && '✓'}
                    </button>

                    {/* Click to preview */}
                    <button
                      onClick={() => setPreviewChild(r.child_id)}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {firstName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{r.child_name}</p>
                        <p className="text-[10px] text-gray-400">
                          {hasNarrative
                            ? t('weeklyWrap.photoCount', { count: photoCount })
                            : t('weeklyWrap.notGenerated')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {hasNarrative && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                            {t('weeklyWrap.ready')}
                          </span>
                        )}
                        {r.parent_status === 'sent' && (
                          <span className="text-[10px] text-blue-700 bg-blue-100 rounded-full px-2 py-0.5">
                            {t('weeklyWrap.sent')}
                          </span>
                        )}
                        <span className="text-gray-300 text-xs">›</span>
                      </div>
                    </button>
                    {/* Invite parent — subtle key icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInviteChildId(r.child_id);
                        setInviteChildName(r.child_name);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50 rounded-full flex-shrink-0 transition-colors"
                      title={t('weeklyWrap.inviteParent')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Single child preview — exactly as parents will see ── */
            (() => {
              const r = reports.find(x => x.child_id === previewChild);
              if (!r) {
                return (
                  <div className="bg-white">
                    <button
                      onClick={() => setPreviewChild(null)}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-emerald-600 font-medium hover:bg-emerald-50/50 w-full text-left border-b"
                    >
                      <span>←</span> {t('weeklyWrap.backToList')}
                    </button>
                    <p className="text-center py-12 text-gray-400 text-sm">{t('weeklyWrap.reportUnavailable')}</p>
                  </div>
                );
              }
              const firstName = r.child_name.split(' ')[0];
              const narrative = getNarrative(r);
              const photos = getPhotos(r);
              const isEditing = editingNarrative === r.child_id;

              return (
                <div className="bg-white">
                  {/* Back button */}
                  <button
                    onClick={() => { setPreviewChild(null); setEditingNarrative(null); }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-emerald-600 font-medium hover:bg-emerald-50/50 w-full text-left border-b"
                  >
                    <span>←</span> {t('weeklyWrap.backToList')}
                  </button>

                  {/* Child Header — elegant, warm */}
                  <div className="px-5 pt-6 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md">
                        {firstName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h2 className="font-bold text-gray-900 text-lg">{r.child_name}</h2>
                        <p className="text-xs text-gray-400">
                          {weekDisplay}
                          {r.parent_status === 'sent' && <span className="ml-2 text-emerald-600 font-medium">{t('weeklyWrap.sentCheck')}</span>}
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
                          {isEditing ? t('common.done') : t('common.edit')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Narrative Introduction */}
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
                          {t('weeklyWrap.clickGenerate')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Photos — grouped by curriculum area in shelf order */}
                  <ParentPhotosGrouped
                    photos={photos}
                    parentWorks={r.parent_works}
                    childId={r.child_id}
                    firstName={firstName}
                    locale={locale}
                    getAreaLabel={getAreaLabel}
                    handleRemovePhoto={handleRemovePhoto}
                  />
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Sticky bottom: Send All (only when viewing child list, not single preview) */}
      {subView === 'parents' && readyToSend > 0 && !previewChild && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {t('weeklyWrap.reportsReady', { count: readyToSend })}
            </p>
            <button
              onClick={handleSendAll}
              disabled={sending || sent}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending
                ? t('weeklyWrap.sending')
                : sent
                  ? t('weeklyWrap.sentDone')
                  : t('weeklyWrap.sendAll')}
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

      {/* Invite Parent Modal */}
      <InviteParentModal
        childId={inviteChildId || ''}
        childName={inviteChildName}
        teacherId={getSession()?.teacher?.id}
        isOpen={!!inviteChildId}
        onClose={() => setInviteChildId(null)}
      />
    </div>
  );
}
