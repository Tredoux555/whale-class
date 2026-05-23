// /montree/dashboard/weekly-wrap/page.tsx
// Weekly Wrap review page — two tabs: Teacher Summary + Parent Reports
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/montree/i18n';
import { AREA_LABELS_ZH, AREA_LABELS_EN, getAreaLabel as getAreaLabelI18n } from '@/lib/montree/i18n/area-labels';
import { getIntlLocale } from '@/lib/montree/i18n/locales';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';

// Tier 7 perf: modal-gated, code-split.
const PhotoCropper = dynamic(() => import('@/components/montree/shared/PhotoCropper'), { ssr: false });
const WorkWheelPicker = dynamic(() => import('@/components/montree/WorkWheelPicker'), { ssr: false });
const TeacherReportView = dynamic(
  () => import('@/components/montree/reports/TeacherReportView'),
  { ssr: false }
);

// ─── Types ───

interface Photo {
  id: string;
  url: string;
  work_name?: string;
  caption?: string;
  captured_at?: string;
}

interface ParentWork {
  name: string;
  name_zh?: string | null;
  area: string;
  status: string;
  parent_description?: string;
  why_it_matters?: string;
  photo_url?: string;
  photo_caption?: string;
}

interface Recommendation {
  area: string;
  area_label: string;
  area_label_zh?: string;
  work: string;
  work_zh?: string | null;
  reasoning: string;
}

interface Flag {
  level: string;
  issue: string;
  recommendation: string;
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

type Tab = 'teacher' | 'parents';

// ─── Area styling ───

// Strip raw UUIDs from AI-generated text (e.g. "in 8ed822b1-1968-..." → "")
function cleanUUIDs(text: string): string {
  // Remove UUIDs and surrounding "in <UUID>" patterns
  return text
    .replace(/\s+in\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*\./g, '.')
    .trim();
}

const AREA_COLORS: Record<string, { emoji: string; bg: string; text: string }> = {
  practical_life: { emoji: '🧹', bg: 'bg-pink-50', text: 'text-pink-700' },
  sensorial: { emoji: '👁️', bg: 'bg-purple-50', text: 'text-purple-700' },
  mathematics: { emoji: '🔢', bg: 'bg-blue-50', text: 'text-blue-700' },
  language: { emoji: '📚', bg: 'bg-amber-50', text: 'text-amber-700' },
  cultural: { emoji: '🌍', bg: 'bg-green-50', text: 'text-green-700' },
};

// AREA_LABELS_ZH and AREA_LABELS_EN imported from @/lib/montree/i18n/area-labels

export default function WeeklyWrapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  // Default to the current (Monday-start) week when the URL carries no — or a
  // malformed — ?week= param. Without a default, weekStart was '' → loadReports()
  // bailed on the `!weekStart` guard and the page sat on its skeleton forever,
  // never firing an XHR (handoff bug #4). The strict YYYY-MM-DD check also stops
  // a garbage param (e.g. a hand-typed/stale bookmark) reaching `new Date(...)`
  // → Invalid Date → `.toISOString()` RangeError → render crash.
  const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  const weekParam = searchParams.get('week');
  const weekEndParam = searchParams.get('week_end');
  const weekStart = (weekParam && ISO_DATE.test(weekParam)) ? weekParam : (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // back to Monday
    return d.toISOString().slice(0, 10);
  })();
  const weekEnd = (weekEndParam && ISO_DATE.test(weekEndParam)) ? weekEndParam : (() => {
    const d = new Date(`${weekStart}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const [session, setSession] = useState<{ classroom: { id: string; name: string }; school: { id: string } } | null>(null);
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('teacher');
  const [error, setError] = useState('');

  // Generate/regenerate state
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState('');
  const [genDone, setGenDone] = useState(0);
  const [genTotal, setGenTotal] = useState(0);

  // Child selection for selective generation
  const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Teacher Summary state
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [shelfUpdatingId, setShelfUpdatingId] = useState<string | null>(null);
  const [shelfUpdatedIds, setShelfUpdatedIds] = useState<Set<string>>(new Set());
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});
  // Interactive shelf state: child_id → array of {area, work, work_zh, status}
  const [shelfWorks, setShelfWorks] = useState<Record<string, Array<{ area: string; work: string; work_zh?: string | null; status: string }>>>({});

  // Parent Reports state
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({});
  const [photoEdits, setPhotoEdits] = useState<Record<string, Photo[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingChildId, setSendingChildId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // Crop state
  const [croppingPhoto, setCroppingPhoto] = useState<{ childId: string; photo: Photo } | null>(null);

  // Work picker state (for shelf editing)
  type PickerWork = { id: string; name: string; name_chinese?: string; status?: 'not_started' | 'presented' | 'practicing' | 'mastered' | 'completed'; sequence?: number };
  const [wheelPickerOpen, setWheelPickerOpen] = useState(false);
  const [wheelPickerArea, setWheelPickerArea] = useState('');
  const [wheelPickerWorks, setWheelPickerWorks] = useState<PickerWork[]>([]);
  const [wheelPickerCurrentWork, setWheelPickerCurrentWork] = useState('');
  const [wheelPickerChildId, setWheelPickerChildId] = useState('');
  const [wheelPickerShelfIdx, setWheelPickerShelfIdx] = useState(-1);
  const [curriculumCache, setCurriculumCache] = useState<Record<string, PickerWork[]>>({});

  // Load session
  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess as any);
  }, [router]);

  // Load reports for this week
  const loadReports = useCallback(async () => {
    if (!session || !weekStart) return;
    setLoading(true);
    setError('');
    try {
      const res = await montreeApi(
        `/api/montree/reports/weekly-wrap/review?classroom_id=${session.classroom.id}&week_start=${weekStart}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load reports');
      }
      const data = await res.json();
      const reps = (data.reports || []) as ReportResult[];
      setReports(reps);

      // Pre-populate approved state from DB
      const alreadyApproved = new Set<string>();
      for (const r of reps) {
        if (r.teacher_status === 'approved') {
          alreadyApproved.add(r.child_id);
        }
      }
      setApprovedIds(alreadyApproved);
    } catch (err: any) {
      console.error('Load reports error:', err);
      setError(err?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [session, weekStart]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Generate/regenerate reports (optionally for specific child IDs)
  const handleGenerate = async (forceRegenerate = false, childIds?: string[]) => {
    if (!session || generating) return;
    setGenerating(true);
    setGenProgress(t('weeklyWrap.preparing'));
    setGenDone(0);
    setGenTotal(0);

    try {
      const payload: Record<string, unknown> = {
        classroom_id: session.classroom.id,
        week_start: weekStart,
        week_end: weekEnd,
        locale,
        force_regenerate: forceRegenerate,
        stream: true,
      };
      if (childIds && childIds.length > 0) {
        payload.child_ids = childIds;
      }

      const res = await fetch('/api/montree/reports/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        const reader = res.body!.getReader();
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
              const event = JSON.parse(line);
              if (event.type === 'start') {
                setGenTotal(event.total);
                setGenProgress(t('common.generating'));
              } else if (event.type === 'child_start') {
                const firstName = event.child_name?.split(' ')[0] || '';
                setGenProgress(`${firstName}... (${event.index}/${event.total})`);
              } else if (event.type === 'child_done') {
                setGenDone(d => d + 1);
              } else if (event.type === 'complete') {
                setGenProgress('');
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Generation failed');
              }
            } catch { /* skip malformed lines */ }
          }
        }
      }

      // Reload reports after generation
      await loadReports();
    } catch (err: any) {
      setError(err?.message || 'Failed to generate');
    } finally {
      setGenerating(false);
      setGenProgress('');
      setSelectionMode(false);
      setSelectedChildIds(new Set());
    }
  };

  // Sort alphabetically
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => a.child_name.localeCompare(b.child_name));
  }, [reports]);

  // Stats
  const totalPhotos = reports.reduce((s, r) => s + r.photo_count, 0);
  const totalFlags = reports.reduce((s, r) => s + r.flags_count, 0);
  const approvedCount = approvedIds.size;
  const readyToSend = reports.filter(r => r.parent_narrative && r.report_id).length;

  // Week navigation helpers
  const shiftWeek = (ws: string, weeks: number) => {
    const d = new Date(`${ws}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + weeks * 7);
    return d.toISOString().slice(0, 10);
  };

  const getWeekEnd = (ws: string) => {
    const d = new Date(`${ws}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
  };

  const navigateWeek = (direction: number) => {
    const newStart = shiftWeek(weekStart, direction);
    const newEnd = getWeekEnd(newStart);
    router.push(`/montree/dashboard/weekly-wrap?week=${newStart}&week_end=${newEnd}`);
  };

  // Format week display
  const weekDisplay = weekStart
    ? (() => {
        const dateLocale = getIntlLocale(locale);
        const start = new Date(weekStart);
        const end = weekEnd ? new Date(weekEnd) : start;
        const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
        return `${fmt(start)} – ${fmt(end)}`;
      })()
    : weekStart;

  // ─── Teacher Summary Actions ───

  const handleApprove = async (r: ReportResult) => {
    if (!r.teacher_report_id || approvingId) return;
    setApprovingId(r.child_id);
    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: r.teacher_report_id,
          child_id: r.child_id,
          update_shelf: false,
        }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      setApprovedIds(prev => new Set([...prev, r.child_id]));
    } catch (err: any) {
      alert(err?.message || 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  const handleUpdateShelf = async (r: ReportResult) => {
    if (!r.teacher_report_id || shelfUpdatingId) return;
    // Use interactive shelf state if available, otherwise fall back to raw recommendations
    const currentShelf = shelfWorks[r.child_id];
    const worksToUpdate = currentShelf
      ? currentShelf.filter(w => w.work) // Only push works that have a name
      : r.recommendations.map(rec => ({ area: rec.area, work: rec.work, status: 'presented' }));
    if (worksToUpdate.length === 0) return;

    setShelfUpdatingId(r.child_id);
    try {
      // Push each shelf work to child progress with its current status
      const results = await Promise.allSettled(
        worksToUpdate.map(w =>
          montreeApi('/api/montree/progress/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: r.child_id,
              work_name: w.work,
              area: w.area,
              status: w.status || 'presented',
              is_focus: true,
            }),
          })
        )
      );
      // Also approve the teacher report
      await montreeApi('/api/montree/reports/weekly-wrap/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: r.teacher_report_id,
          child_id: r.child_id,
          update_shelf: false, // We already pushed via progress/update
        }),
      });
      setShelfUpdatedIds(prev => new Set([...prev, r.child_id]));
      setApprovedIds(prev => new Set([...prev, r.child_id]));
    } catch (err: any) {
      alert(err?.message || 'Failed to update shelf');
    } finally {
      setShelfUpdatingId(null);
    }
  };

  // ─── Shelf helpers ───

  const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'] as const;
  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    not_started: { label: '○', bg: 'bg-gray-200', text: 'text-gray-600' },
    presented: { label: t('status.presented'), bg: 'bg-amber-300', text: 'text-amber-800' },
    practicing: { label: t('status.practicing'), bg: 'bg-blue-400', text: 'text-blue-800' },
    mastered: { label: t('status.mastered'), bg: 'bg-emerald-400', text: 'text-emerald-800' },
  };

  // Aggressively normalize area strings to canonical keys
  const toCanonicalArea = (raw: string): string => {
    if (!raw) return '';
    const n = normalizeArea(raw); // handles 'math', 'culture', 'Practical Life' etc.
    const CANONICAL = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    if (CANONICAL.includes(n)) return n;
    // Fuzzy match: check if the raw string contains an area keyword
    const lower = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (lower.includes('practical') || lower.includes('life')) return 'practical_life';
    if (lower.includes('sensor')) return 'sensorial';
    if (lower.includes('math') || lower.includes('number') || lower.includes('arith')) return 'mathematics';
    if (lower.includes('lang') || lower.includes('reading') || lower.includes('writing') || lower.includes('phonics')) return 'language';
    if (lower.includes('cultur') || lower.includes('science') || lower.includes('geography') || lower.includes('history')) return 'cultural';
    return n; // fallback
  };

  // Initialize shelf: ALWAYS exactly 5 rows, one per area, first recommendation per area wins
  const getShelfForChild = (r: ReportResult) => {
    if (shelfWorks[r.child_id]) return shelfWorks[r.child_id];
    const AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const shelf: Array<{ area: string; work: string; work_zh?: string | null; status: string }> = AREAS.map(area => ({
      area,
      work: '',
      work_zh: null,
      status: 'not_started',
    }));
    // Fill from recommendations — first match per area wins
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
    if (!work.work) return; // No work assigned, can't cycle

    const currentIdx = STATUS_FLOW.indexOf(work.status as any) ?? 0;
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];

    // Optimistic update
    const updated = [...shelf];
    updated[idx] = { ...work, status: nextStatus };
    setShelfWorks(prev => ({ ...prev, [childId]: updated }));

    // Persist to DB
    try {
      const res = await montreeApi('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: work.work,
          area: work.area,
          status: nextStatus,
          is_focus: true,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch {
      // Revert on failure
      setShelfWorks(prev => ({ ...prev, [childId]: shelf }));
    }
  };

  // ─── Shelf Work Picker ───

  const openShelfPicker = async (childId: string, shelfIdx: number, area: string, currentWork: string) => {
    setWheelPickerChildId(childId);
    setWheelPickerShelfIdx(shelfIdx);
    setWheelPickerArea(area);
    setWheelPickerCurrentWork(currentWork);

    // Load works for this area (cached)
    if (curriculumCache[area]) {
      setWheelPickerWorks(curriculumCache[area]);
      setWheelPickerOpen(true);
      return;
    }

    try {
      const classroomId = session?.classroom?.id;
      const url = classroomId
        ? `/api/montree/works/search?area=${encodeURIComponent(area)}&classroom_id=${classroomId}`
        : `/api/montree/works/search?area=${encodeURIComponent(area)}`;
      const res = await montreeApi(url);
      if (!res.ok) throw new Error('Failed to load works');
      const data = await res.json();
      const works = (data.works || []).map((w: Record<string, unknown>, idx: number) => ({
        id: String(w.id),
        name: String(w.name),
        name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
        status: 'not_started' as const,
        sequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
      }));
      setCurriculumCache(prev => ({ ...prev, [area]: works }));
      setWheelPickerWorks(works);
      setWheelPickerOpen(true);
    } catch (err) {
      console.error('Failed to load curriculum works:', err);
    }
  };

  const handleShelfPickerSelect = (work: PickerWork, _status: string) => {
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
    // Refresh after adding a custom work
    const area = wheelPickerArea;
    const classroomId = session?.classroom?.id;
    try {
      const url = classroomId
        ? `/api/montree/works/search?area=${encodeURIComponent(area)}&classroom_id=${classroomId}`
        : `/api/montree/works/search?area=${encodeURIComponent(area)}`;
      const res = await montreeApi(url);
      if (!res.ok) return;
      const data = await res.json();
      const works = (data.works || []).map((w: Record<string, unknown>, idx: number) => ({
        id: String(w.id),
        name: String(w.name),
        name_chinese: w.chinese_name ? String(w.chinese_name) : undefined,
        status: 'not_started' as const,
        sequence: typeof w.sequence === 'number' ? w.sequence : idx + 1,
      }));
      setCurriculumCache(prev => ({ ...prev, [area]: works }));
      setWheelPickerWorks(works);
    } catch (err) {
      console.error('Failed to refresh works:', err);
    }
  };

  // ─── Parent Reports Actions ───

  const getEffectiveNarrative = (r: ReportResult) => {
    return narrativeEdits[r.child_id] ?? r.parent_narrative ?? '';
  };

  const getEffectivePhotos = (r: ReportResult) => {
    return photoEdits[r.child_id] ?? r.parent_photos;
  };

  const handleRemovePhoto = (childId: string, photoId: string) => {
    const current = photoEdits[childId] ?? reports.find(r => r.child_id === childId)?.parent_photos ?? [];
    setPhotoEdits(prev => ({
      ...prev,
      [childId]: current.filter(p => p.id !== photoId),
    }));
  };

  // Remove a work from a child's report (local state only — affects display)
  const handleRemoveWork = (childId: string, workName: string, area: string) => {
    setReports(prev => prev.map(r => {
      if (r.child_id !== childId) return r;
      return {
        ...r,
        parent_works: r.parent_works.filter(w => !(w.name === workName && (w.area || '') === area)),
      };
    }));
  };

  const handleMovePhoto = (childId: string, photoId: string, direction: 'up' | 'down') => {
    const current = [...(photoEdits[childId] ?? reports.find(r => r.child_id === childId)?.parent_photos ?? [])];
    const idx = current.findIndex(p => p.id === photoId);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    [current[idx], current[targetIdx]] = [current[targetIdx], current[idx]];
    setPhotoEdits(prev => ({ ...prev, [childId]: current }));
  };

  const handleSaveEdits = async (r: ReportResult) => {
    if (!r.report_id || savingId) return;
    setSavingId(r.child_id);
    try {
      const body: Record<string, unknown> = { report_id: r.report_id };
      if (narrativeEdits[r.child_id] !== undefined) {
        body.narrative = narrativeEdits[r.child_id];
      }
      if (photoEdits[r.child_id]) {
        body.photos = photoEdits[r.child_id];
      }
      const res = await montreeApi('/api/montree/reports/weekly-wrap/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      // Clear edits after save
      setNarrativeEdits(prev => { const n = { ...prev }; delete n[r.child_id]; return n; });
      setPhotoEdits(prev => { const n = { ...prev }; delete n[r.child_id]; return n; });
      // Refresh data
      await loadReports();
    } catch (err: any) {
      alert(err?.message || 'Failed to save edits');
    } finally {
      setSavingId(null);
    }
  };

  const hasEdits = (childId: string) => {
    return narrativeEdits[childId] !== undefined || photoEdits[childId] !== undefined;
  };

  // Crop a photo — uploads cropped version to NEW path (original preserved)
  const handleCropComplete = async (blob: Blob, width: number, height: number) => {
    if (!croppingPhoto) return;
    const { childId, photo } = croppingPhoto;
    setCroppingPhoto(null);

    try {
      const formData = new FormData();
      formData.append('file', blob, 'cropped.jpg');
      formData.append('media_id', photo.id);
      formData.append('width', String(width));
      formData.append('height', String(height));

      const res = await montreeApi('/api/montree/media/crop', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Crop failed');
      const data = await res.json();

      // Use the new cropped URL from the API (original photo untouched)
      const newUrl = data.media?.cropped_url || (photo.url.split('?')[0] + `?t=${Date.now()}`);

      // Update in photoEdits (or create edit entry)
      const current = photoEdits[childId] ?? reports.find(r => r.child_id === childId)?.parent_photos ?? [];
      const updated = current.map(p => p.id === photo.id ? { ...p, url: newUrl } : p);
      setPhotoEdits(prev => ({ ...prev, [childId]: updated }));
    } catch (err: any) {
      alert(err?.message || 'Failed to crop photo');
    }
  };

  // Send all to parents
  const handleSendAll = async () => {
    if (!session || sending) return;
    if (!confirm(t('weeklyWrap.confirmSendAll', { count: String(readyToSend) }))) return;

    setSending(true);
    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom.id,
          week_start: weekStart,
          locale,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Send failed');
      }
      const data = await res.json();
      setSent(true);
      const sentMsg: Record<string, string> = {
        zh: `已发送 ${data.published} 份报告，${data.emails_sent} 封邮件`,
        es: `Publicados ${data.published} informes, ${data.emails_sent} correos enviados`,
      };
      alert(sentMsg[locale] || `Published ${data.published} reports, sent ${data.emails_sent} emails`);
    } catch (err: any) {
      alert(err?.message || 'Failed to send reports');
    } finally {
      setSending(false);
    }
  };

  // ─── Render: Teacher Summary Card ───

  const renderTeacherCard = (r: ReportResult) => {
    const firstName = r.child_name.split(' ')[0];
    const isExpanded = expandedTeacher === r.child_id;
    const isApproved = approvedIds.has(r.child_id);
    const isShelfUpdated = shelfUpdatedIds.has(r.child_id);

    // Group works by area from parent_works (actual works done this week)
    const worksByArea: Record<string, Array<{ name: string; display: string; area: string }>> = {};
    for (const w of r.parent_works) {
      const area = toCanonicalArea(w.area || 'other') || normalizeArea(w.area || 'other');
      if (!worksByArea[area]) worksByArea[area] = [];
      const displayName = (locale === 'zh' && w.name_zh) ? w.name_zh : w.name;
      if (!worksByArea[area].some(x => x.name === w.name)) {
        worksByArea[area].push({ name: w.name, display: displayName, area: w.area || area });
      }
    }
    const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const areaEntries = AREA_ORDER
      .filter(a => worksByArea[a] && worksByArea[a].length > 0)
      .map(a => [a, worksByArea[a]] as [string, Array<{ name: string; display: string; area: string }>]);
    // Add any "other" areas
    for (const [a, ws] of Object.entries(worksByArea)) {
      if (!AREA_ORDER.includes(a)) areaEntries.push([a, ws]);
    }
    const totalWorks = areaEntries.reduce((s, [, ws]) => s + ws.length, 0);

    // Shelf for this child
    const shelf = getShelfForChild(r);

    // Collapsed preview
    const getAreaLabel = (area: string) => getAreaLabelI18n(area, locale);

    const previewText = areaEntries
      .map(([area, works]) => {
        const names = works.map(w => w.display);
        return `${getAreaLabel(area)}: ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}`;
      })
      .join(' · ');

    // Build recommendation sentence (fully localized)
    const recAreas: Record<string, string[]> = {};
    for (const rec of r.recommendations) {
      const a = toCanonicalArea(rec.area);
      if (!a) continue;
      if (!recAreas[a]) recAreas[a] = [];
      const workDisplay = rec.work_zh && locale === 'zh' ? rec.work_zh : rec.work;
      recAreas[a].push(workDisplay);
    }
    const recSentenceParts: string[] = [];
    for (const [area, works] of Object.entries(recAreas)) {
      const areaLabel = getAreaLabel(area);
      const joinSep: Record<string, string> = { zh: '和', es: ' y ' };
      const joined = works.join(joinSep[locale] || ' and ');
      const tmpl: Record<string, string> = {
        zh: `${areaLabel}的${joined}`,
        es: `trabajos de ${areaLabel} como ${joined}`,
      };
      recSentenceParts.push(tmpl[locale] || `${areaLabel} works such as ${joined}`);
    }

    return (
      <div key={r.child_id} className={`bg-white rounded-xl border overflow-hidden ${selectionMode && selectedChildIds.has(r.child_id) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
        {/* Header row */}
        <button
          onClick={() => {
            if (selectionMode) {
              // Toggle selection
              setSelectedChildIds(prev => {
                const next = new Set(prev);
                if (next.has(r.child_id)) next.delete(r.child_id);
                else next.add(r.child_id);
                return next;
              });
              return;
            }
            const next = isExpanded ? null : r.child_id;
            setExpandedTeacher(next);
            // Init shelf on first expand
            if (next && !shelfWorks[r.child_id]) {
              setShelfWorks(prev => ({ ...prev, [r.child_id]: getShelfForChild(r) }));
            }
          }}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          {selectionMode && (
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selectedChildIds.has(r.child_id)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 bg-white'
            }`}>
              {selectedChildIds.has(r.child_id) && <span className="text-[11px]">✓</span>}
            </div>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {firstName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{r.child_name}</p>
              <span className="text-[10px] text-gray-400">{totalWorks} {t('weeklyWrap.worksCount')}</span>
              {isApproved && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✓</span>
              )}
              {r.flags_count > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {r.flags_count === 1 ? t('weeklyWrap.flagsCountOne', { count: String(r.flags_count) }) : t('weeklyWrap.flagsCount', { count: String(r.flags_count) })}
                </span>
              )}
            </div>
            {!isExpanded && previewText && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{previewText}</p>
            )}
          </div>

          <span className={`text-gray-300 transition-transform text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Expanded */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 space-y-4">

            {/* ── This Week Summary ── */}
            <div className="mt-3">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                {t('weeklyWrap.thisWeekDid', { name: firstName })}
              </p>
              {areaEntries.length > 0 ? (
                <div className="space-y-2 pl-1">
                  {areaEntries.map(([area, works]) => {
                    const label = getAreaLabelI18n(area, locale);
                    return (
                      <div key={area}>
                        <div className="flex items-center gap-2 mb-1">
                          <AreaBadge area={area} size="sm" />
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pl-7">
                          {works.map((w) => (
                            <span
                              key={w.name}
                              className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-xs text-gray-700 group/chip hover:border-gray-300 transition-colors"
                            >
                              {w.display}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveWork(r.child_id, w.name, w.area);
                                }}
                                className="w-4 h-4 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-0.5"
                                title={t('common.delete')}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic pl-1">
                  {t('weeklyWrap.noRecordedActivities')}
                </p>
              )}
            </div>

            {/* Flags */}
            {r.flags.length > 0 && (
              <div className="space-y-1">
                {r.flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 rounded-lg p-2">
                    <span>{f.level === 'red' ? '🔴' : '🟡'}</span>
                    <p className="text-gray-700">{cleanUUIDs(f.issue)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Recommendation Sentence ── */}
            {recSentenceParts.length > 0 && (
              <p className="text-sm text-gray-600 italic leading-relaxed">
                {t('weeklyWrap.recommendNextWeek', { name: firstName, areas: recSentenceParts.join({ zh: '、', es: ', ' }[locale] || ', ') })}
              </p>
            )}

            {/* ── Next Week's Focus (mirrors child week view exactly) ── */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-800 mb-3">
                {t('weeklyWrap.nextWeeksFocus')}
              </h2>
              <div className="space-y-2">
                {shelf.map((item, idx) => {
                  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                  return (
                    <div
                      key={`${r.child_id}-shelf-${item.area}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50"
                    >
                      <button
                        onClick={() => openShelfPicker(r.child_id, idx, item.area, item.work)}
                        className="flex-shrink-0"
                      >
                        <AreaBadge area={item.area} size="lg" />
                      </button>

                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => openShelfPicker(r.child_id, idx, item.area, item.work)}
                      >
                        {item.work ? (
                          <p className="font-medium text-gray-800 text-sm">
                            {(locale === 'zh' && item.work_zh) ? item.work_zh : item.work}
                          </p>
                        ) : (
                          <p className="font-medium text-gray-400 text-sm italic">
                            {t('weeklyWrap.tapToSelect')}
                          </p>
                        )}
                      </button>

                      {/* Status badge — tap to cycle (only if work assigned) */}
                      {item.work ? (
                        <button
                          onClick={() => handleShelfStatusCycle(r.child_id, idx)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all active:scale-90 ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </button>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">○</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Teacher Notes + Voice ── */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('weeklyWrap.teacherNotes')}
                </p>
                <ChildVoiceNote
                  childId={r.child_id}
                  childName={r.child_name}
                  onTranscript={(text) => setTeacherNotes(prev => ({
                    ...prev,
                    [r.child_id]: prev[r.child_id] ? `${prev[r.child_id]}\n${text}` : text,
                  }))}
                />
              </div>
              <textarea
                value={teacherNotes[r.child_id] || ''}
                onChange={(e) => setTeacherNotes(prev => ({ ...prev, [r.child_id]: e.target.value }))}
                placeholder={t('weeklyWrap.recordOrType')}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px] resize-y placeholder:text-gray-300"
                rows={2}
              />
            </div>

            {/* Full AI report toggle */}
            {r.teacher_report && (
              <details className="text-xs">
                <summary className="text-emerald-600 cursor-pointer hover:underline font-medium py-1">
                  {t('weeklyWrap.viewAiAnalysis')}
                </summary>
                <div className="mt-2">
                  <TeacherReportView report={r.teacher_report as any} childName={r.child_name} />
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {!isApproved ? (
                <button
                  onClick={() => handleApprove(r)}
                  disabled={approvingId === r.child_id}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {approvingId === r.child_id ? t('weeklyWrap.approving') : t('weeklyWrap.agree')}
                </button>
              ) : (
                <div className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                  ✓ {t('weeklyWrap.approved')}
                </div>
              )}

              {r.recommendations.length > 0 && !isShelfUpdated && (
                <button
                  onClick={() => handleUpdateShelf(r)}
                  disabled={shelfUpdatingId === r.child_id}
                  className="px-4 py-2 rounded-lg border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {shelfUpdatingId === r.child_id ? '...' : t('weeklyWrap.updateShelf')}
                </button>
              )}

              {isShelfUpdated && (
                <div className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium text-center">
                  ✓ {t('weeklyWrap.shelfUpdated')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Parent Report Card ───

  const renderParentCard = (r: ReportResult) => {
    const firstName = r.child_name.split(' ')[0];
    const isExpanded = expandedParent === r.child_id;
    const narrative = getEffectiveNarrative(r);
    const photos = getEffectivePhotos(r);
    const isEditing = editingNarrative === r.child_id;
    const edited = hasEdits(r.child_id);
    const isSent = r.parent_status === 'sent';

    return (
      <div key={r.child_id} className={`bg-white rounded-xl border overflow-hidden ${selectionMode && selectedChildIds.has(r.child_id) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
        {/* Header */}
        <button
          onClick={() => {
            if (selectionMode) {
              setSelectedChildIds(prev => {
                const next = new Set(prev);
                if (next.has(r.child_id)) next.delete(r.child_id);
                else next.add(r.child_id);
                return next;
              });
              return;
            }
            setExpandedParent(isExpanded ? null : r.child_id);
          }}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          {selectionMode && (
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              selectedChildIds.has(r.child_id)
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 bg-white'
            }`}>
              {selectedChildIds.has(r.child_id) && <span className="text-[11px]">✓</span>}
            </div>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {firstName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{r.child_name}</p>
              <span className="text-xs text-gray-400">📸 {photos.length}</span>
              {isSent && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                  {t('weeklyWrap.sentDone')}
                </span>
              )}
              {edited && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {t('weeklyWrap.edited')}
                </span>
              )}
            </div>
            {narrative && !isExpanded && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{narrative}</p>
            )}
          </div>

          <span className={`text-gray-300 transition-transform text-xs ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Expanded: full parent report preview */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 space-y-4">
            {/* Narrative section */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('weeklyWrap.parentNarrative')}
                </p>
                {!isEditing ? (
                  <button
                    onClick={() => {
                      setEditingNarrative(r.child_id);
                      if (narrativeEdits[r.child_id] === undefined) {
                        setNarrativeEdits(prev => ({ ...prev, [r.child_id]: narrative }));
                      }
                    }}
                    className="text-xs text-emerald-600 font-medium hover:underline"
                  >
                    {t('common.edit')}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingNarrative(null)}
                    className="text-xs text-gray-500 font-medium hover:underline"
                  >
                    {t('common.done')}
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  value={narrativeEdits[r.child_id] ?? narrative}
                  onChange={(e) => setNarrativeEdits(prev => ({ ...prev, [r.child_id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] resize-y"
                />
              ) : (
                <div className="border-l-4 border-emerald-300 pl-3 bg-emerald-50/30 py-2 rounded-r-lg">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    &ldquo;{narrative}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Photos — full width, vertical stack, with descriptions */}
            {photos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('weeklyWrap.photos')} ({photos.length})
                </p>
                <div className="space-y-4">
                  {photos.map((photo, idx) => {
                    // Match photo to its work description
                    const matchedWork = photo.work_name
                      ? r.parent_works.find(w =>
                          w.name.toLowerCase() === photo.work_name!.toLowerCase() ||
                          w.name.toLowerCase().includes(photo.work_name!.toLowerCase()) ||
                          photo.work_name!.toLowerCase().includes(w.name.toLowerCase())
                        )
                      : undefined;
                    const areaStyle = matchedWork
                      ? (AREA_COLORS[matchedWork.area] || AREA_COLORS.cultural)
                      : { emoji: '📸', bg: 'bg-gray-50', text: 'text-gray-600' };

                    return (
                      <div key={photo.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                        {/* Full-width photo */}
                        <div className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.work_name || t('weeklyWrap.activityPhoto')}
                            className="w-full object-contain max-h-[400px] bg-gray-50"
                            loading="lazy"
                          />
                          {/* Crop / reorder / delete controls */}
                          <div className="absolute top-2 right-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCroppingPhoto({ childId: r.child_id, photo }); }}
                              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white"
                              title={t('weeklyWrap.crop')}
                            >✂️</button>
                            {idx > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePhoto(r.child_id, photo.id, 'up'); }}
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white"
                                title={t('weeklyWrap.moveUp')}
                              >↑</button>
                            )}
                            {idx < photos.length - 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePhoto(r.child_id, photo.id, 'down'); }}
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white"
                                title={t('weeklyWrap.moveDown')}
                              >↓</button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePhoto(r.child_id, photo.id); }}
                              className="w-7 h-7 bg-red-500/90 rounded-full flex items-center justify-center text-white text-sm shadow-md hover:bg-red-600"
                              title={t('common.delete')}
                            >✕</button>
                          </div>
                        </div>

                        {/* Description below photo */}
                        <div className="px-4 py-3 space-y-1.5">
                          {/* Work name + area badge */}
                          <div className="flex items-center gap-2">
                            {photo.work_name && (
                              <p className="font-semibold text-gray-900 text-sm">
                                {(locale === 'zh' && matchedWork?.name_zh) ? matchedWork.name_zh : photo.work_name}
                              </p>
                            )}
                            {matchedWork && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${areaStyle.bg} ${areaStyle.text}`}>
                                {areaStyle.emoji} {getAreaLabelI18n(matchedWork.area, locale) || matchedWork.area.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                            )}
                          </div>

                          {/* Parent-friendly description: what the child is doing */}
                          {matchedWork?.parent_description && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {matchedWork.parent_description}
                            </p>
                          )}

                          {/* Why it matters */}
                          {matchedWork?.why_it_matters && (
                            <p className="text-xs text-emerald-700 leading-relaxed italic">
                              {matchedWork.why_it_matters}
                            </p>
                          )}

                          {/* Teacher caption */}
                          {photo.caption && (
                            <p className="text-xs text-gray-400 italic mt-1">
                              {photo.caption}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preview link */}
            {r.report_id && (
              <a
                href={`/montree/parent/report/${r.report_id}?teacher_preview=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-emerald-600 font-medium hover:underline"
              >
                {t('weeklyWrap.openFullReport')}
              </a>
            )}

            {/* Save + Send buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              {edited && (
                <button
                  onClick={() => handleSaveEdits(r)}
                  disabled={savingId === r.child_id}
                  className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {savingId === r.child_id ? t('common.saving') : t('weeklyWrap.saveChanges')}
                </button>
              )}
              {!isSent && !edited && r.report_id && (
                <button
                  onClick={async () => {
                    if (!session) return;
                    setSendingChildId(r.child_id);
                    try {
                      const res = await montreeApi('/api/montree/reports/weekly-wrap/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          classroom_id: session.classroom.id,
                          week_start: weekStart,
                          child_ids: [r.child_id],
                          locale,
                        }),
                      });
                      if (!res.ok) throw new Error('Send failed');
                      await loadReports();
                    } catch (err: any) {
                      alert(err?.message || 'Failed to send');
                    } finally {
                      setSendingChildId(null);
                    }
                  }}
                  disabled={sendingChildId === r.child_id}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {sendingChildId === r.child_id ? t('weeklyWrap.sending') : t('weeklyWrap.sendToParent')}
                </button>
              )}
              {isSent && (
                <div className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                  ✓ {t('weeklyWrap.sentDone')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ───

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link
                href="/montree/dashboard"
                className="text-emerald-600 text-sm font-medium hover:underline"
              >
                ← {t('common.back')}
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {t('weeklyWrap.weeklyWrap')}
                </h1>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => navigateWeek(-1)}
                    className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 rounded text-xs"
                  >
                    ◀
                  </button>
                  <p className="text-xs text-gray-400">{weekDisplay} · {reports.length} {t('weeklyWrap.children')}</p>
                  <button
                    onClick={() => navigateWeek(1)}
                    className="px-1.5 py-0.5 text-gray-400 hover:bg-gray-100 rounded text-xs"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Stats */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 mr-1">
                <span>📸 {totalPhotos}</span>
                {totalFlags > 0 && <span className="text-amber-600 font-medium">{totalFlags}</span>}
                <span className="text-emerald-600 font-medium">{approvedCount}/{reports.length}</span>
              </div>

              {/* Select mode toggle */}
              {reports.length > 0 && !generating && (
                <button
                  onClick={() => {
                    setSelectionMode(!selectionMode);
                    if (selectionMode) setSelectedChildIds(new Set());
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectionMode
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {selectionMode
                    ? t('weeklyWrap.cancelSelect')
                    : t('weeklyWrap.tapToSelect')}
                </button>
              )}

              {/* Generate Selected button (when in selection mode) */}
              {selectionMode && selectedChildIds.size > 0 && (
                <button
                  onClick={() => handleGenerate(true, Array.from(selectedChildIds))}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {generating ? (
                    <>
                      <span className="animate-spin text-[10px]">⏳</span>
                      <span>{genProgress || t('common.generating')}</span>
                    </>
                  ) : (
                    t('weeklyWrap.regenerateSelected', { count: String(selectedChildIds.size) })
                  )}
                </button>
              )}

              {/* Generate All / Regenerate All button */}
              {!selectionMode && (
                <button
                  onClick={() => handleGenerate(reports.length > 0)}
                  disabled={generating}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {generating ? (
                    <>
                      <span className="animate-spin text-[10px]">⏳</span>
                      <span>{genProgress || t('common.generating')}</span>
                    </>
                  ) : reports.length > 0 ? (
                    t('weeklyWrap.regenerateAll')
                  ) : (
                    t('weeklyWrap.generate')
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Generation progress bar */}
          {generating && genTotal > 0 && (
            <div className="mb-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((genDone / genTotal) * 100)}%` }}
              />
            </div>
          )}

          {/* Tab bar */}
          <div className="flex border-b border-gray-200 -mb-px">
            <button
              onClick={() => setActiveTab('teacher')}
              className={`flex-1 text-center py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'teacher'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t('weeklyWrap.teacherSummary')}
            </button>
            <button
              onClick={() => setActiveTab('parents')}
              className={`flex-1 text-center py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'parents'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t('weeklyWrap.parentReports')}
              {readyToSend > 0 && (
                <span className="ml-1.5 bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {readyToSend}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {reports.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400">
              {t('weeklyWrap.noReportsFound')}
            </p>
          </div>
        )}

        {/* ─── Teacher Summary Tab ─── */}
        {activeTab === 'teacher' && reports.length > 0 && (
          <>
            {/* Selection bar */}
            {selectionMode && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-700 font-medium">
                  {selectedChildIds.size > 0
                    ? t('weeklyWrap.selected', { count: String(selectedChildIds.size) })
                    : t('weeklyWrap.tapToSelectChildren')}
                </span>
                <button
                  onClick={() => {
                    if (selectedChildIds.size === reports.length) {
                      setSelectedChildIds(new Set());
                    } else {
                      setSelectedChildIds(new Set(reports.map(r => r.child_id)));
                    }
                  }}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  {selectedChildIds.size === reports.length
                    ? t('weeklyWrap.deselectAll')
                    : t('weeklyWrap.selectAll')}
                </button>
              </div>
            )}

            {/* Flagged children first */}
            {sortedReports.filter(r => r.flags_count > 0).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  {t('weeklyWrap.needsAttention')}
                </p>
                {sortedReports.filter(r => r.flags_count > 0).map(renderTeacherCard)}
              </div>
            )}

            {/* All others */}
            <div className="space-y-2">
              {sortedReports.filter(r => r.flags_count > 0).length > 0 && (
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-4">
                  {t('weeklyWrap.onTrack')}
                </p>
              )}
              {sortedReports.filter(r => r.flags_count === 0).map(renderTeacherCard)}
            </div>

            {/* Approve all button */}
            {approvedCount < reports.length && (
              <div className="pt-4">
                <button
                  disabled={!!approvingId}
                  onClick={async () => {
                    const toApprove = sortedReports.filter(
                      r => !approvedIds.has(r.child_id) && r.teacher_report_id
                    );
                    for (const r of toApprove) {
                      setApprovingId(r.child_id);
                      try {
                        const res = await montreeApi('/api/montree/reports/weekly-wrap/approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            report_id: r.teacher_report_id,
                            child_id: r.child_id,
                            update_shelf: false,
                          }),
                        });
                        if (res.ok) {
                          setApprovedIds(prev => new Set([...prev, r.child_id]));
                        }
                      } catch { /* continue to next */ }
                    }
                    setApprovingId(null);
                  }}
                  className="w-full py-3 rounded-lg border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {approvingId
                    ? t('weeklyWrap.approvingAll')
                    : t('weeklyWrap.approveAll', { count: String(reports.length - approvedCount) })}
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Parent Reports Tab ─── */}
        {activeTab === 'parents' && reports.length > 0 && (
          <div className="space-y-2">
            {selectionMode && (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <span className="text-xs text-blue-700 font-medium">
                  {selectedChildIds.size > 0
                    ? t('weeklyWrap.selected', { count: String(selectedChildIds.size) })
                    : t('weeklyWrap.tapToSelectChildren')}
                </span>
                <button
                  onClick={() => {
                    if (selectedChildIds.size === reports.length) {
                      setSelectedChildIds(new Set());
                    } else {
                      setSelectedChildIds(new Set(reports.map(r => r.child_id)));
                    }
                  }}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  {selectedChildIds.size === reports.length
                    ? t('weeklyWrap.deselectAll')
                    : t('weeklyWrap.selectAll')}
                </button>
              </div>
            )}
            {sortedReports.map(renderParentCard)}
          </div>
        )}
      </main>

      {/* Sticky bottom bar — Send All (Parent tab only) */}
      {activeTab === 'parents' && readyToSend > 0 && !sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {t('weeklyWrap.reportsReadyToSend', { count: String(readyToSend) })}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/montree/dashboard/students"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                ✉️ {t('weeklyWrap.inviteParents')}
              </Link>
              <button
                onClick={handleSendAll}
                disabled={sending}
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {sending
                  ? t('weeklyWrap.sending')
                  : t('weeklyWrap.sendAllToParents')}
              </button>
            </div>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-emerald-600 p-4 z-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white font-semibold">
              ✅ {t('weeklyWrap.allReportsSent')}
            </p>
            <Link
              href="/montree/dashboard"
              className="text-emerald-100 text-sm underline mt-1 inline-block"
            >
              {t('weeklyWrap.backToDashboard')}
            </Link>
          </div>
        </div>
      )}

      {/* Photo cropper modal */}
      {croppingPhoto && (
        <PhotoCropper
          imageUrl={croppingPhoto.photo.url}
          onCrop={handleCropComplete}
          onCancel={() => setCroppingPhoto(null)}
        />
      )}

      {/* Work Wheel Picker for shelf editing */}
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
