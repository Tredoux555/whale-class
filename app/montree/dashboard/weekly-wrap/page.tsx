// /montree/dashboard/weekly-wrap/page.tsx
// Weekly Wrap review page — two tabs: Teacher Summary + Parent Reports
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useI18n } from '@/lib/montree/i18n';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import ChildVoiceNote from '@/components/montree/voice-notes/ChildVoiceNote';

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
  work: string;
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
  area_analyses: Array<{ area: string; area_label: string; works_count: number; narrative: string }>;
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

export default function WeeklyWrapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();

  const weekStart = searchParams.get('week') || '';
  const weekEnd = searchParams.get('week_end') || '';

  const [session, setSession] = useState<{ classroom: { id: string; name: string }; school: { id: string } } | null>(null);
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('teacher');
  const [error, setError] = useState('');

  // Teacher Summary state
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [shelfUpdatingId, setShelfUpdatingId] = useState<string | null>(null);
  const [shelfUpdatedIds, setShelfUpdatedIds] = useState<Set<string>>(new Set());
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});

  // Parent Reports state
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [narrativeEdits, setNarrativeEdits] = useState<Record<string, string>>({});
  const [photoEdits, setPhotoEdits] = useState<Record<string, Photo[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendingChildId, setSendingChildId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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

  // Sort alphabetically
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => a.child_name.localeCompare(b.child_name));
  }, [reports]);

  // Stats
  const totalPhotos = reports.reduce((s, r) => s + r.photo_count, 0);
  const totalFlags = reports.reduce((s, r) => s + r.flags_count, 0);
  const approvedCount = approvedIds.size;
  const readyToSend = reports.filter(r => r.parent_narrative && r.report_id).length;

  // Format week display
  const weekDisplay = weekStart
    ? (() => {
        const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
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
    if (!r.teacher_report_id || shelfUpdatingId || r.recommendations.length === 0) return;
    setShelfUpdatingId(r.child_id);
    try {
      const res = await montreeApi('/api/montree/reports/weekly-wrap/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: r.teacher_report_id,
          child_id: r.child_id,
          update_shelf: true,
          recommendations: r.recommendations.map(rec => ({
            area: rec.area,
            work: rec.work,
            reasoning: rec.reasoning,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to update shelf');
      const data = await res.json();
      setShelfUpdatedIds(prev => new Set([...prev, r.child_id]));
      setApprovedIds(prev => new Set([...prev, r.child_id]));
    } catch (err: any) {
      alert(err?.message || 'Failed to update shelf');
    } finally {
      setShelfUpdatingId(null);
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

  // Send all to parents
  const handleSendAll = async () => {
    if (!session || sending) return;
    if (!confirm(locale === 'zh'
      ? `确定要向所有家长发送 ${readyToSend} 份报告吗？`
      : `Send ${readyToSend} reports to all parents?`
    )) return;

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
      alert(locale === 'zh'
        ? `已发送 ${data.published} 份报告，${data.emails_sent} 封邮件`
        : `Published ${data.published} reports, sent ${data.emails_sent} emails`
      );
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

    // Group works by area from parent_works (these are the actual works done this week)
    const worksByArea: Record<string, string[]> = {};
    for (const w of r.parent_works) {
      const area = w.area || 'other';
      if (!worksByArea[area]) worksByArea[area] = [];
      if (!worksByArea[area].includes(w.name)) {
        worksByArea[area].push(w.name);
      }
    }
    const areaEntries = Object.entries(worksByArea);
    const totalWorks = areaEntries.reduce((s, [, ws]) => s + ws.length, 0);

    // Collapsed preview: "Language: X, Y · Practical Life: Z"
    const previewText = areaEntries
      .map(([area, works]) => {
        const style = AREA_COLORS[area] || AREA_COLORS.cultural;
        const label = area.replace('_', ' ');
        return `${label}: ${works.slice(0, 2).join(', ')}${works.length > 2 ? ` +${works.length - 2}` : ''}`;
      })
      .join(' · ');

    return (
      <div key={r.child_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setExpandedTeacher(isExpanded ? null : r.child_id)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {firstName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{r.child_name}</p>
              <span className="text-[10px] text-gray-400">{totalWorks} {locale === 'zh' ? '项活动' : 'works'}</span>
              {isApproved && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✓</span>
              )}
              {r.flags_count > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  {r.flags_count} {r.flags_count === 1 ? 'flag' : 'flags'}
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
          <div className="px-4 pb-4 border-t border-gray-100 space-y-3">
            {/* Works grouped by area */}
            {areaEntries.length > 0 && (
              <div className="mt-3 space-y-2">
                {areaEntries.map(([area, works]) => {
                  const style = AREA_COLORS[area] || AREA_COLORS.cultural;
                  const label = (r.area_analyses.find(a => a.area === area)?.area_label)
                    || area.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={area}>
                      <p className={`text-xs font-semibold ${style.text} mb-1`}>
                        {style.emoji} {label}
                      </p>
                      <p className="text-sm text-gray-700 pl-5">
                        {works.join(', ')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {totalWorks === 0 && (
              <p className="mt-3 text-sm text-gray-400 italic">
                {locale === 'zh' ? '本周无记录活动' : 'No recorded activities this week'}
              </p>
            )}

            {/* Flags — compact */}
            {r.flags.length > 0 && (
              <div className="space-y-1">
                {r.flags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 rounded-lg p-2">
                    <span>{f.level === 'red' ? '🔴' : '🟡'}</span>
                    <p className="text-gray-700">{f.issue}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {r.recommendations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {locale === 'zh' ? '推荐下周' : 'Recommended Next'}
                </p>
                <p className="text-sm text-gray-600 pl-1">
                  {r.recommendations.map(rec => rec.work).join(', ')}
                </p>
              </div>
            )}

            {/* Teacher Notes + Voice */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'zh' ? '教师备注' : 'Teacher Notes'}
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
                placeholder={locale === 'zh' ? '录音或输入备注...' : 'Record or type notes...'}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[60px] resize-y placeholder:text-gray-300"
                rows={2}
              />
            </div>

            {/* Full AI report toggle */}
            {r.teacher_report && (
              <details className="text-xs">
                <summary className="text-emerald-600 cursor-pointer hover:underline font-medium py-1">
                  {locale === 'zh' ? '查看 AI 分析' : 'View AI Analysis'}
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
                  {approvingId === r.child_id ? (locale === 'zh' ? '审批中...' : 'Approving...') : (locale === 'zh' ? '同意' : 'Agree ✓')}
                </button>
              ) : (
                <div className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                  ✓ {locale === 'zh' ? '已同意' : 'Approved'}
                </div>
              )}

              {r.recommendations.length > 0 && !isShelfUpdated && (
                <button
                  onClick={() => handleUpdateShelf(r)}
                  disabled={shelfUpdatingId === r.child_id}
                  className="px-4 py-2 rounded-lg border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                >
                  {shelfUpdatingId === r.child_id ? '...' : (locale === 'zh' ? '更新书架' : 'Update Shelf')}
                </button>
              )}

              {isShelfUpdated && (
                <div className="px-4 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-medium text-center">
                  ✓ {locale === 'zh' ? '书架已更新' : 'Shelf Updated'}
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
      <div key={r.child_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpandedParent(isExpanded ? null : r.child_id)}
          className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
            {firstName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{r.child_name}</p>
              <span className="text-xs text-gray-400">📸 {photos.length}</span>
              {isSent && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                  Sent
                </span>
              )}
              {edited && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                  Edited
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
                  {locale === 'zh' ? '家长叙述' : 'Parent Narrative'}
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
                    {locale === 'zh' ? '编辑' : 'Edit'}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditingNarrative(null)}
                    className="text-xs text-gray-500 font-medium hover:underline"
                  >
                    {locale === 'zh' ? '完成' : 'Done'}
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
                  {locale === 'zh' ? '照片' : 'Photos'} ({photos.length})
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
                            alt={photo.work_name || (locale === 'zh' ? '活动照片' : 'Activity photo')}
                            className="w-full object-contain max-h-[400px] bg-gray-50"
                            loading="lazy"
                          />
                          {/* Reorder / delete controls */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx > 0 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePhoto(r.child_id, photo.id, 'up'); }}
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white"
                                title={locale === 'zh' ? '上移' : 'Move up'}
                              >↑</button>
                            )}
                            {idx < photos.length - 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMovePhoto(r.child_id, photo.id, 'down'); }}
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white"
                                title={locale === 'zh' ? '下移' : 'Move down'}
                              >↓</button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemovePhoto(r.child_id, photo.id); }}
                              className="w-7 h-7 bg-red-500/90 rounded-full flex items-center justify-center text-white text-sm shadow-md hover:bg-red-600"
                              title={locale === 'zh' ? '删除' : 'Remove'}
                            >✕</button>
                          </div>
                        </div>

                        {/* Description below photo */}
                        <div className="px-4 py-3 space-y-1.5">
                          {/* Work name + area badge */}
                          <div className="flex items-center gap-2">
                            {photo.work_name && (
                              <p className="font-semibold text-gray-900 text-sm">{photo.work_name}</p>
                            )}
                            {matchedWork && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${areaStyle.bg} ${areaStyle.text}`}>
                                {areaStyle.emoji} {matchedWork.area.replace('_', ' ')}
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
                {locale === 'zh' ? '打开完整家长报告 →' : 'Open full parent report →'}
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
                  {savingId === r.child_id ? (locale === 'zh' ? '保存中...' : 'Saving...') : (locale === 'zh' ? '保存修改' : 'Save Changes')}
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
                  {sendingChildId === r.child_id ? (locale === 'zh' ? '发送中...' : 'Sending...') : (locale === 'zh' ? '发送给家长' : 'Send to Parent')}
                </button>
              )}
              {isSent && (
                <div className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-semibold text-center">
                  ✓ {locale === 'zh' ? '已发送' : 'Sent'}
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
                ← {locale === 'zh' ? '返回' : 'Back'}
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {locale === 'zh' ? '周报总结' : 'Weekly Wrap'}
                </h1>
                <p className="text-xs text-gray-400">{weekDisplay} · {reports.length} {locale === 'zh' ? '学生' : 'children'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>📸 {totalPhotos}</span>
              {totalFlags > 0 && <span className="text-amber-600 font-medium">{totalFlags} flags</span>}
              <span className="text-emerald-600 font-medium">{approvedCount}/{reports.length} approved</span>
            </div>
          </div>

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
              {locale === 'zh' ? '教师总结' : 'Teacher Summary'}
            </button>
            <button
              onClick={() => setActiveTab('parents')}
              className={`flex-1 text-center py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'parents'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {locale === 'zh' ? '家长报告' : 'Parent Reports'}
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
              {locale === 'zh' ? '没有找到报告' : 'No reports found for this week'}
            </p>
          </div>
        )}

        {/* ─── Teacher Summary Tab ─── */}
        {activeTab === 'teacher' && reports.length > 0 && (
          <>
            {/* Flagged children first */}
            {sortedReports.filter(r => r.flags_count > 0).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                  {locale === 'zh' ? '需要关注' : 'Needs Attention'}
                </p>
                {sortedReports.filter(r => r.flags_count > 0).map(renderTeacherCard)}
              </div>
            )}

            {/* All others */}
            <div className="space-y-2">
              {sortedReports.filter(r => r.flags_count > 0).length > 0 && (
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-4">
                  {locale === 'zh' ? '正常发展' : 'On Track'}
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
                    ? (locale === 'zh' ? '正在审批...' : 'Approving...')
                    : (locale === 'zh' ? `全部同意 (${reports.length - approvedCount} 剩余)` : `Approve All (${reports.length - approvedCount} remaining)`)}
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Parent Reports Tab ─── */}
        {activeTab === 'parents' && reports.length > 0 && (
          <div className="space-y-2">
            {sortedReports.map(renderParentCard)}
          </div>
        )}
      </main>

      {/* Sticky bottom bar — Send All (Parent tab only) */}
      {activeTab === 'parents' && readyToSend > 0 && !sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {locale === 'zh'
                ? `${readyToSend} 份家长报告准备就绪`
                : `${readyToSend} parent reports ready to send`}
            </p>
            <button
              onClick={handleSendAll}
              disabled={sending}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {sending
                ? (locale === 'zh' ? '发送中...' : 'Sending...')
                : (locale === 'zh' ? '发送给所有家长' : 'Send All to Parents')}
            </button>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed bottom-0 left-0 right-0 bg-emerald-600 p-4 z-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white font-semibold">
              ✅ {locale === 'zh' ? '所有报告已发送！' : 'All reports sent to parents!'}
            </p>
            <Link
              href="/montree/dashboard"
              className="text-emerald-100 text-sm underline mt-1 inline-block"
            >
              {locale === 'zh' ? '返回仪表板' : 'Back to Dashboard'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
