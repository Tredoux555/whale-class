// /montree/dashboard/[childId]/reports/page.tsx
// Reports tab — Teacher Summary + Parent Report preview/send + Invite Parent
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { AREA_CONFIG } from '@/lib/montree/types';
import InviteParentModal from '@/components/montree/InviteParentModal';
import PhotoSelectionModal from '@/components/montree/PhotoSelectionModal';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

interface ReportItem {
  work_id: string | null;
  work_name: string;
  chineseName?: string | null;
  area: string;
  status: string;
  photo_url: string | null;
  photo_id: string | null;
  photo_caption: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
  has_description: boolean;
  source: 'progress' | 'photo';
}

interface ReportStats {
  total: number;
  with_photos: number;
  with_descriptions: number;
  mastered: number;
  practicing: number;
  presented: number;
  documented: number;
  unassigned_photos?: number;
  from_progress: number;
  from_photos: number;
  has_selections: boolean;
}

interface UnassignedPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  work_name?: string;
}

interface ReportWork {
  name: string;
  status: string;
  status_label?: string;
  photo_url?: string | null;
  photo_caption?: string | null;
  parent_description?: string | null;
  why_it_matters?: string | null;
}

interface ReportPhoto {
  id: string;
  url?: string;
  thumbnail_url?: string;
  caption?: string | null;
  work_name?: string | null;
}

interface ReportChild {
  name?: string;
}

interface ReportSummary {
  works_this_week?: number;
  photos_this_week?: number;
  overall_progress?: {
    mastered?: number;
  };
}

interface SentReport {
  id?: string;
  sent_at?: string;
  published_at?: string;
  created_at: string;
  week_start: string;
  content: {
    child?: ReportChild;
    summary?: ReportSummary;
    works?: ReportWork[];
    photos?: ReportPhoto[];
  };
}

export default function ReportsPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const childId = params.childId as string;
  const session = getSession();

  // Report view toggle
  const [reportView, setReportView] = useState<'teacher' | 'parent'>('teacher');

  // Invite Parent modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [childName, setChildName] = useState('');
  const [items, setItems] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [unassignedPhotos, setUnassignedPhotos] = useState<UnassignedPhoto[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [showLastReport, setShowLastReport] = useState(false);
  const [lastReport, setLastReport] = useState<SentReport | null>(null);
  const [loadingLastReport, setLoadingLastReport] = useState(false);

  // Preview modal Gallery-style state
  const [previewSelectedArea, setPreviewSelectedArea] = useState<string | null>(null);
  const [previewExpandedCard, setPreviewExpandedCard] = useState<string | null>(null);

  // Lightbox for zoomable photos
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Fetch report preview
  const fetchPreview = async (signal?: AbortSignal) => {
    try {
      const [previewRes, photosRes] = await Promise.all([
        fetch(`/api/montree/reports/preview?child_id=${childId}&locale=${locale}`, { signal }),
        fetch(`/api/montree/reports/available-photos?child_id=${childId}&locale=${locale}`, { signal }),
      ]);

      if (!previewRes.ok || !photosRes.ok) {
        throw new Error(`Fetch failed: preview=${previewRes.status}, photos=${photosRes.status}`);
      }

      const previewData = await previewRes.json();
      const photosData = await photosRes.json();

      if (signal?.aborted) return;

      if (previewData.success && photosData.success) {
        setChildName(previewData.child_name || 'Student');
        setItems(previewData.items || []);
        setStats(previewData.stats || null);
        setLastReportDate(previewData.last_report_date);
        setUnassignedPhotos(previewData.unassigned_photos || []);

        // Build photo lists for modal using actual media photos
        const allAvailablePhotos = photosData.photos || [];
        const reportedWorkNames = new Set(
          (previewData.items || [])
            .filter((item: ReportItem) => item.photo_url)
            .map((item: ReportItem) => item.work_name)
        );

        // Find which photos are currently selected (by matching work_name)
        const reportedPhotos = allAvailablePhotos.filter((p: Photo) =>
          p.work_name && reportedWorkNames.has(p.work_name)
        );

        setCurrentPhotos(reportedPhotos);
        setAllPhotos(allAvailablePhotos);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch:', err);
      toast.error(t('reports.loadError'));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!childId) return;
    const controller = new AbortController();
    fetchPreview(controller.signal);
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, locale]);

  // Fetch the last sent report
  const fetchLastReport = async () => {
    if (!lastReportDate) return;

    setLoadingLastReport(true);
    try {
      const res = await fetch(`/api/montree/reports?child_id=${childId}&status=sent&limit=1&locale=${locale}`);
      if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
      const data = await res.json();

      if (data.success && data.reports && data.reports.length > 0) {
        setLastReport(data.reports[0]);
        setShowLastReport(true);
      } else {
        toast.error(t('reports.noReportsFound'));
      }
    } catch (err) {
      console.error('Failed to fetch last report:', err);
      toast.error(t('reports.loadLastReportError'));
    }
    setLoadingLastReport(false);
  };

  // Update selected photos for the report
  const handlePhotoSelectionSave = async (selectedMediaIds: string[]) => {
    try {
      const res = await fetch('/api/montree/reports/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          selected_media_ids: selectedMediaIds,
        }),
      });
      if (!res.ok) throw new Error(`Photo update failed: ${res.status}`);
      const data = await res.json();

      if (data.success) {
        // Refresh preview to show updated photos
        await fetchPreview();
      } else {
        throw new Error(data.error || 'Failed to update photos');
      }
    } catch (err) {
      console.error('Failed to update photos:', err);
      toast.error(t('reports.photoUpdateFailed'));
      throw err;
    }
  };

  // Send report to parents
  const sendReport = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/montree/reports/send?locale=${locale}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
      const data = await res.json();

      if (data.success) {
        toast.success(t('reports.published'));
        setItems([]);
        setStats(null);
        setLastReportDate(new Date().toISOString());
        setShowPreview(false);
      } else {
        toast.error(data.error || t('common.failedToSend'));
      }
    } catch {
      toast.error(t('common.failedToSend'));
    }
    setSending(false);
  };

  // Memoize available photos for photo selection modal (Set-based O(n) dedup)
  // ALL hooks MUST be above early returns to satisfy React Rules of Hooks
  const availableForSelection = useMemo(() => {
    const ids = new Set(currentPhotos.map(cp => cp.id));
    return allPhotos.filter(p => !ids.has(p.id));
  }, [currentPhotos, allPhotos]);

  // Memoize area grouping to avoid re-computing on every render
  // MUST be above the loading early-return to maintain consistent hook ordering
  const groupedByArea = useMemo(() => {
    const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
    const grouped = items.reduce((acc, item) => {
      const area = item.area || 'other';
      if (!acc[area]) acc[area] = [];
      acc[area].push(item);
      return acc;
    }, {} as Record<string, ReportItem[]>);
    const sortedAreas = Object.keys(grouped).sort((a, b) => {
      const ai = AREA_ORDER.indexOf(a);
      const bi = AREA_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sortedAreas.map(area => [area, grouped[area]] as [string, ReportItem[]]);
  }, [items]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />

      {/* Report View Toggle */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex">
          <button
            onClick={() => setReportView('teacher')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              reportView === 'teacher'
                ? 'bg-violet-100 text-violet-700 border-b-2 border-violet-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            📋 {t('reports.teacherReport' as any) || 'Teacher Report'}
          </button>
          <button
            onClick={() => setReportView('parent')}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              reportView === 'parent'
                ? 'bg-emerald-100 text-emerald-700 border-b-2 border-emerald-500'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            👨‍👩‍👧 {t('reports.parentReport' as any) || 'Parent Report'}
          </button>
        </div>
      </div>

      {/* ── TEACHER REPORT ── */}
      {reportView === 'teacher' && (
        <>
          {/* Teacher Report Header */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-800">
              {childName ? `${childName}'s ` : ''}{t('reports.teacherWeeklyReport' as any) || 'Weekly Report'}
            </h2>

            {/* Achievement Stats */}
            {stats && hasItems && (
              <div className="grid grid-cols-3 gap-2">
                <StatCard icon="⭐" value={stats.mastered} label={t('reports.mastered')} color="emerald" />
                <StatCard icon="🔄" value={stats.practicing} label={t('reports.practicing' as any) || 'Practicing'} color="blue" />
                <StatCard icon="🌱" value={stats.presented} label={t('reports.presented' as any) || 'Introduced'} color="gray" />
              </div>
            )}

            {/* Section 1: What the child did this week — grouped by area, most recent first */}
            {hasItems ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-600">{t('reports.whatChildDid' as any) || 'What They Did This Week'}</h3>
                {groupedByArea.map(([area, areaItems]) => {
                  const areaConf = AREA_CONFIG[area];
                  return (
                    <div key={area} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        {areaConf && (
                          <span className={`text-[10px] font-medium ${areaConf.text} ${areaConf.bg} px-2 py-0.5 rounded-full`}>
                            {t(`area.${area}` as any) || areaConf.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {areaItems.map((item) => (
                          <div key={`${item.work_name}-${item.status}`} className="flex items-center gap-2">
                            <StatusBadge status={item.status} locale={locale} />
                            <span className="text-sm text-gray-700">
                              {locale === 'zh' && item.chineseName ? item.chineseName : item.work_name}
                            </span>
                            {item.photo_url && <span className="text-blue-400 text-xs">📸</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">{t('reports.noProgressThisWeek' as any) || 'No new progress this week'}</p>
              </div>
            )}
          </div>

          {/* Section 2: Focus for Next Week */}
          <div className="bg-violet-50 rounded-2xl p-5 shadow-sm space-y-3 border border-violet-100">
            <h3 className="text-sm font-semibold text-violet-800 flex items-center gap-2">
              🎯 {t('reports.focusNextWeek' as any) || 'Focus for Next Week'}
            </h3>
            <p className="text-sm text-violet-700">
              {hasItems
                ? (t('reports.focusNextWeekDesc' as any) || 'Based on this week\'s progress, update the shelf. Mastered works can be replaced with the next in the sequence.')
                : (t('reports.focusNextWeekEmpty' as any) || 'No activities recorded this week. Consider reviewing the shelf and presenting new works.')}
            </p>
            <Link
              href={`/montree/dashboard/${childId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-violet-500 text-white hover:bg-violet-600 active:scale-95 transition-all text-sm"
            >
              📋 {t('reports.updateShelf' as any) || 'Update Shelf'}
            </Link>
          </div>

          {/* Section 3: Teacher Observations (optional notes) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              📝 {t('reports.teacherObservations' as any) || 'Your Observations'}
            </h3>
            <p className="text-xs text-gray-400">
              {t('reports.teacherObservationsHint' as any) || 'Add observations in the Gallery tab for each photo. They will appear in the parent report.'}
            </p>
            <Link
              href={`/montree/dashboard/${childId}/gallery`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all text-sm"
            >
              🖼️ {t('reports.goToGallery' as any) || 'Go to Gallery'}
            </Link>
          </div>

          {/* Invite Parent — only for teachers */}
          {session && !isHomeschoolParent(session) && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700">{t('reports.inviteParent' as any) || 'Invite Parent'}</h3>
                  <p className="text-xs text-gray-400">{t('reports.inviteParentDesc' as any) || 'Share an access code so parents can view reports'}</p>
                </div>
                <button
                  onClick={() => setInviteModalOpen(true)}
                  className="px-4 py-2 rounded-xl font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all text-sm"
                >
                  ✉️ {t('reports.invite' as any) || 'Invite'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PARENT REPORT ── */}
      {reportView === 'parent' && (
        <>
          {/* Header */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{childName}'s {t('reports.report')}</h2>
                {lastReportDate && (
                  <p className="text-xs text-gray-400">
                    {t('reports.lastSent')}: {new Date(lastReportDate).toLocaleDateString()}
                  </p>
                )}
                {!lastReportDate && (
                  <p className="text-xs text-gray-400">{t('reports.noReportsSentYet')}</p>
                )}
              </div>
              <div className="flex gap-2">
                {lastReportDate && (
                  <button
                    onClick={fetchLastReport}
                    disabled={loadingLastReport}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95 transition-all disabled:opacity-50 text-sm"
                  >
                    {loadingLastReport ? '⏳' : '📄'} {t('reports.lastReport')}
                  </button>
                )}
                {hasItems && (
                  <button
                    onClick={() => { setPreviewSelectedArea(null); setPreviewExpandedCard(null); setShowPreview(true); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all text-sm"
                  >
                    👁️ {t('reports.previewReport')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {stats && hasItems && (
            <div className="grid grid-cols-3 gap-2">
              <StatCard icon="📚" value={stats.total} label={t('reports.works')} color="gray" />
              <StatCard icon="📸" value={stats.with_photos + (stats.unassigned_photos || 0)} label={t('reports.photos')} color="blue" />
              <StatCard icon="📝" value={stats.with_descriptions} label={t('reports.descriptions')} color="emerald" />
            </div>
          )}

      {/* Work list (summary) */}
      {hasItems ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">{t('reports.progressToReport')} ({items.length})</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.map((item) => (
              <div key={`${item.work_name}-${item.area}`} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <StatusBadge status={item.status} locale={locale} />
                <span className="flex-1 text-sm font-medium text-gray-700">{locale === 'zh' && item.chineseName ? item.chineseName : item.work_name}</span>
                {item.photo_url && <span className="text-blue-500">📸</span>}
                {item.has_description && <span className="text-emerald-500">📝</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="text-gray-600 font-medium">{t('reports.allCaughtUp')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('reports.noProgressSinceLastReport')}</p>
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch(`/api/montree/reports/preview?child_id=${childId}&show_all=true&locale=${locale}`);
                if (!res.ok) throw new Error(`Preview fetch failed: ${res.status}`);
                const data = await res.json();
                if (data.success) {
                  setItems(data.items || []);
                  setStats(data.stats || null);
                  if (data.items?.length > 0) {
                    toast.success(t('reports.foundWorks').replace('{count}', data.items.length.toString()));
                  } else {
                    toast.info(t('reports.noProgressThisWeek'));
                  }
                }
              } catch (err) {
                toast.error(t('reports.loadError'));
              }
              setLoading(false);
            }}
            className="mt-4 px-4 py-2 rounded-xl font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 transition-all"
          >
            📊 {t('reports.showThisWeekProgress')}
          </button>
        </div>
      )}

      {/* Preview Modal — Gallery-style UI matching parent report page */}
      {showPreview && (() => {
        // Parent-friendly area config for preview
        const PREVIEW_AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string }> = {
          practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899' },
          sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6' },
          mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
          math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
          language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b' },
          cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e' },
        };
        const PREVIEW_AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
        const normalizePreviewArea = (area: string) => area === 'math' ? 'mathematics' : area;
        const getPreviewAreaConf = (area: string) => PREVIEW_AREA_CONFIG[normalizePreviewArea(area)] || PREVIEW_AREA_CONFIG['cultural'];
        const getPreviewAreaLabel = (area: string) => {
          const conf = getPreviewAreaConf(area);
          return locale === 'zh' ? conf.labelZh : conf.label;
        };

        // Group items by area for counts + area-grouped grid
        const previewWorksByArea: Record<string, ReportItem[]> = {};
        for (const area of PREVIEW_AREA_ORDER) previewWorksByArea[area] = [];
        for (const item of items) {
          const area = normalizePreviewArea(item.area || 'other');
          if (!previewWorksByArea[area]) previewWorksByArea[area] = [];
          previewWorksByArea[area].push(item);
        }

        // Stats
        const previewMastered = items.filter(i => i.status === 'mastered' || i.status === 'completed').length;
        const previewPracticing = items.filter(i => i.status === 'practicing').length;
        const previewPresented = items.filter(i => i.status === 'presented').length;

        // Filter by area
        const previewFiltered = previewSelectedArea
          ? items.filter(i => normalizePreviewArea(i.area) === previewSelectedArea)
          : items;

        // Render a single work card (Gallery-style)
        const renderPreviewCard = (item: ReportItem, i: number) => {
          const displayName = locale === 'zh' && item.chineseName ? item.chineseName : item.work_name;
          const areaConf = getPreviewAreaConf(item.area);
          const cardKey = `${item.work_name}-${i}`;
          const isExpanded = previewExpandedCard === cardKey;

          return (
            <div key={cardKey} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Photo */}
              {item.photo_url ? (
                <div className="relative group">
                  <button
                    onClick={() => { setLightboxSrc(item.photo_url!); setLightboxOpen(true); }}
                    className="w-full"
                  >
                    <img src={item.photo_url} alt={displayName} className="w-full aspect-[4/3] object-cover" />
                  </button>
                  {item.photo_caption && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-xs font-medium backdrop-blur-sm max-w-[70%] truncate">
                      {item.photo_caption}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full aspect-[4/3] flex items-center justify-center" style={{ backgroundColor: `${areaConf.color}10` }}>
                  <div className="text-center">
                    <span className="text-4xl">{areaConf.emoji}</span>
                    <p className="text-xs mt-1 font-medium" style={{ color: areaConf.color }}>{getPreviewAreaLabel(item.area)}</p>
                  </div>
                </div>
              )}

              {/* Work info */}
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: areaConf.color }}
                  >
                    {areaConf.emoji.length <= 2 ? areaConf.emoji : (locale === 'zh' ? areaConf.labelZh : areaConf.label).charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800 text-sm truncate flex-1">{displayName}</span>
                  <StatusBadge status={item.status} locale={locale} />
                </div>

                {item.parent_description && (
                  <p className="text-gray-600 text-sm leading-relaxed">{item.parent_description}</p>
                )}

                {item.why_it_matters && (
                  <button onClick={() => setPreviewExpandedCard(isExpanded ? null : cardKey)} className="w-full text-left">
                    <div className={`bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 transition-all ${isExpanded ? '' : 'cursor-pointer hover:bg-emerald-100/50'}`}>
                      <p className="text-[11px] font-semibold text-emerald-700 mb-0.5 flex items-center gap-1">
                        💡 {locale === 'zh' ? '为什么重要' : 'Why this matters'}
                        {!isExpanded && <span className="text-emerald-400 text-[10px]">▼</span>}
                      </p>
                      {isExpanded && <p className="text-xs text-emerald-800 leading-relaxed mt-1">{item.why_it_matters}</p>}
                    </div>
                  </button>
                )}

                {!item.parent_description && !item.why_it_matters && (
                  <p className="text-gray-400 text-xs">
                    {locale === 'zh'
                      ? `您的孩子在${getPreviewAreaLabel(item.area)}方面进行了学习。`
                      : `Your child explored this ${getPreviewAreaLabel(item.area).toLowerCase()} activity.`}
                  </p>
                )}
              </div>
            </div>
          );
        };

        return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">📋 {t('reports.reportPreview')}</h3>
                  <p className="text-emerald-100 text-sm">{t('reports.thisIsWhatParentsSee')}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 transition-all text-sm"
              >
                ✏️ {t('reports.editPhotos')}
              </button>
            </div>

            {/* Modal Body — Gallery-style matching parent report page */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-emerald-50 to-teal-50">
              <div className="p-4 space-y-4">

              {/* ── Report Header ── */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                      {childName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">
                        {locale === 'zh' ? `${childName}的学习报告` : `${childName}'s Learning Report`}
                      </h2>
                      <p className="text-emerald-100 text-sm">{items.length} {t('reports.activitiesToShare')}</p>
                    </div>
                  </div>

                  {/* Quick stats */}
                  {items.length > 0 && (
                    <div className="flex gap-3 mt-4">
                      {previewMastered > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">⭐ {previewMastered}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已掌握' : 'Mastered'}</p>
                        </div>
                      )}
                      {previewPracticing > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🔄 {previewPracticing}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '练习中' : 'Practicing'}</p>
                        </div>
                      )}
                      {previewPresented > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🌱 {previewPresented}</p>
                          <p className="text-[10px] text-emerald-100">{locale === 'zh' ? '已展示' : 'Introduced'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inspiring progress summary */}
                <div className="px-5 py-4 border-l-4 border-emerald-400 bg-emerald-50 mx-4 mt-4 mb-2 rounded-r-xl">
                  <p className="text-gray-700 leading-relaxed text-[15px]">
                    {(() => {
                      const areasCount = Object.values(previewWorksByArea).filter(a => a.length > 0).length;
                      if (locale === 'zh') {
                        const parts = [`${childName}度过了充实而专注的一周！本周共探索了${items.length}项工作。`];
                        if (areasCount >= 3) parts.push(`涵盖了${areasCount}个不同领域——全面发展正是蒙特梭利教育的精髓。`);
                        if (previewPracticing > 0) parts.push(`正在练习的工作说明孩子正处于深入学习中——重复是通往精通的道路。`);
                        return parts.join('');
                      }
                      const parts = [`${childName} had a wonderful week of learning! This week they explored ${items.length} different activities.`];
                      if (areasCount >= 3) parts.push(` Active across ${areasCount} areas — well-rounded exploration is at the heart of Montessori.`);
                      if (previewPracticing > 0) parts.push(` The works still being practiced show deep learning in progress — in Montessori, repetition is the path to mastery.`);
                      return parts.join('');
                    })()}
                  </p>
                </div>

                {/* Mastered highlights */}
                {(() => {
                  const masteredItems = items.filter(i => i.status === 'mastered' || i.status === 'completed');
                  if (masteredItems.length === 0) return null;
                  return (
                    <div className="px-5 py-3 pb-4">
                      {masteredItems.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-gray-600 text-sm leading-relaxed mb-1">
                          ⭐ {locale === 'zh' && item.chineseName ? item.chineseName : item.work_name} ({locale === 'zh' ? '已掌握' : 'Mastered'})
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* ── Area filter chips (Gallery-style) ── */}
              {items.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setPreviewSelectedArea(null)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors border-2 flex-shrink-0 ${
                      !previewSelectedArea ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                    }`}
                  >
                    {locale === 'zh' ? '全部' : 'All'}
                  </button>
                  {PREVIEW_AREA_ORDER.map(area => {
                    const config = PREVIEW_AREA_CONFIG[area];
                    const count = previewWorksByArea[area]?.length || 0;
                    if (count === 0) return null;
                    const isActive = previewSelectedArea === area;
                    return (
                      <button
                        key={area}
                        onClick={() => setPreviewSelectedArea(isActive ? null : area)}
                        className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1.5 border-2 flex-shrink-0 ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]"
                          style={{ backgroundColor: config.color }}
                        >
                          {config.emoji}
                        </div>
                        <span>{locale === 'zh' ? config.labelZh : config.label}</span>
                        <span className="text-xs opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Work Cards — Gallery-style photo grid grouped by area ── */}
              {previewFiltered.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500 text-sm">
                    {previewSelectedArea
                      ? (locale === 'zh' ? '此领域暂无活动记录' : 'No activities in this area')
                      : (locale === 'zh' ? '本周暂无活动记录' : 'No activities this week')}
                  </p>
                </div>
              ) : previewSelectedArea ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {previewFiltered.map((item, i) => renderPreviewCard(item, i))}
                </div>
              ) : (
                <div className="space-y-6">
                  {PREVIEW_AREA_ORDER.map(area => {
                    const areaWorks = previewWorksByArea[area] || [];
                    if (areaWorks.length === 0) return null;
                    const config = PREVIEW_AREA_CONFIG[area];
                    return (
                      <div key={area}>
                        <div className="flex items-center gap-2 mb-3 px-1">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: config.color }}
                          >
                            {config.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-sm">{locale === 'zh' ? config.labelZh : config.label}</p>
                            <p className="text-xs text-gray-500">
                              {areaWorks.length} {locale === 'zh' ? '项活动' : areaWorks.length === 1 ? 'activity' : 'activities'}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {areaWorks.map((item, i) => renderPreviewCard(item, i))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Extra Photos ── */}
              {!previewSelectedArea && unassignedPhotos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-white text-xs font-bold">📸</div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{locale === 'zh' ? '更多瞬间' : 'More Moments'}</p>
                      <p className="text-xs text-gray-500">{unassignedPhotos.length} {locale === 'zh' ? '张照片' : 'photos'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {unassignedPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => { setLightboxSrc(photo.url); setLightboxOpen(true); }}
                        className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm cursor-zoom-in relative group"
                      >
                        <img src={photo.url} alt={photo.caption || t('reports.learningMoment')} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-medium backdrop-blur-sm">
                          {new Date(photo.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Recommendations ── */}
              {items.filter(i => i.status === 'mastered' || i.status === 'practicing').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2 text-sm">
                    💡 {locale === 'zh' ? '在家可以这样做' : 'Try This at Home'}
                  </h4>
                  <div className="space-y-2">
                    {items.filter(i => i.status === 'mastered' || i.status === 'practicing').slice(0, 3).map((item, i) => (
                      <p key={i} className="text-amber-900 text-sm leading-relaxed flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        <span>
                          {locale === 'zh'
                            ? `让${childName}在家里也尝试${item.chineseName || item.work_name}相关的活动。`
                            : `Encourage ${childName} to practice ${item.work_name}-related activities at home.`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Closing ── */}
              <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
                <p className="text-gray-600 leading-relaxed">
                  {locale === 'zh'
                    ? `我们很开心有${childName}在课堂上，下周见！`
                    : `We love having ${childName} in our classroom. See you next week!`}
                  {' '}🌿
                </p>
              </div>

              {/* ── Footer ── */}
              <div className="text-center text-xs text-gray-400 py-2">
                {new Date().toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' · Montree'}
              </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                {t('common.close')}
              </button>
              <button
                onClick={sendReport}
                disabled={sending}
                className="flex-1 py-3 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {sending ? `⏳ ${t('reports.publishing')}` : `✅ ${t('reports.publishReport')}`}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Photo Selection Modal */}
      <PhotoSelectionModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSave={handlePhotoSelectionSave}
        currentPhotos={currentPhotos}
        availablePhotos={availableForSelection}
        childId={childId}
      />

      {/* Last Sent Report Modal */}
      {showLastReport && lastReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">📄 {t('reports.lastSentReport')}</h3>
                  <p className="text-blue-100 text-sm">
                    {t('reports.sentOn')} {new Date(lastReport.sent_at || lastReport.published_at || lastReport.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => setShowLastReport(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {lastReport.content ? (
                <>
                  {/* Child header */}
                  <div className="text-center pb-4 border-b">
                    <div className="w-16 h-16 rounded-full bg-blue-100 mx-auto mb-2 flex items-center justify-center text-2xl">
                      {lastReport.content.child?.name?.charAt(0) || childName.charAt(0)}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {lastReport.content.child?.name || childName}'s {t('reports.progress')}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      {t('reports.weekOf')} {new Date(lastReport.week_start).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Summary Stats */}
                  {lastReport.content.summary && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-lg">📚</span>
                        <p className="text-xl font-bold text-gray-700">{lastReport.content.summary.works_this_week || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.works')}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <span className="text-lg">📸</span>
                        <p className="text-xl font-bold text-blue-600">{lastReport.content.summary.photos_this_week || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.photos')}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <span className="text-lg">⭐</span>
                        <p className="text-xl font-bold text-emerald-600">{lastReport.content.summary.overall_progress?.mastered || 0}</p>
                        <p className="text-xs text-gray-500">{t('reports.mastered')}</p>
                      </div>
                    </div>
                  )}

                  {/* Works with Photos - Most recent first */}
                  {lastReport.content.works && lastReport.content.works.length > 0 && (() => {
                    // Build lookup for backwards compatibility with old reports
                    // Old reports might have work_name OR caption as the work identifier
                    const photosByWorkName = new Map<string, ReportPhoto>();
                    for (const p of lastReport.content.photos || []) {
                      const key = p.work_name || p.caption;
                      if (key) {
                        photosByWorkName.set(key.toLowerCase(), p);
                      }
                    }

                    return (
                      <div className="space-y-4">
                        {lastReport.content.works.map((work: ReportWork, i: number) => {
                          // Use photo_url from work if available, otherwise try to match from photos array
                          const photoUrl = work.photo_url || photosByWorkName.get(work.name?.toLowerCase())?.url;
                          const photoCaption = work.photo_caption || photosByWorkName.get(work.name?.toLowerCase())?.caption;

                          return (
                            <div key={`work-${work.name || i}`} className="bg-gray-50 rounded-xl p-4 space-y-3">
                              {/* Work header */}
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  work.status === 'mastered' || work.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : work.status === 'practicing'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {work.status_label || work.status}
                                </span>
                                <h4 className="font-bold text-gray-800">{locale === 'zh' && (work as any).chineseName ? (work as any).chineseName : work.name}</h4>
                              </div>

                              {/* Photo - Hero style, tap to zoom */}
                              {photoUrl && (
                                <div className="relative -mx-4 my-3">
                                  <button
                                    onClick={() => { setLightboxSrc(photoUrl); setLightboxOpen(true); }}
                                    className="aspect-[4/3] w-full overflow-hidden rounded-lg shadow-lg block cursor-zoom-in"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={work.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                  {photoCaption && (
                                    <p className="mt-2 px-4 text-sm text-gray-600 italic text-center">{photoCaption}</p>
                                  )}
                                </div>
                              )}

                              {/* Description - use parent_description (from send API) */}
                              {work.parent_description ? (
                                <div className="space-y-2">
                                  <p className="text-gray-700 text-sm leading-relaxed">
                                    {work.parent_description}
                                  </p>
                                  {work.why_it_matters && (
                                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                      <p className="text-xs font-semibold text-emerald-700 mb-1">💡 {t('reports.whyItMatters')}</p>
                                      <p className="text-sm text-emerald-800">{work.why_it_matters}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-sm italic">
                                  {t('reports.noDescriptionAvailable')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Unassigned Photos — compact grid */}
                  {lastReport.content.photos && lastReport.content.photos.length > 0 && (() => {
                    const matchedPhotoUrls = new Set(
                      (lastReport.content.works || [])
                        .filter((w: ReportWork) => w.photo_url)
                        .map((w: ReportWork) => w.photo_url)
                    );
                    const workNames = new Set(
                      (lastReport.content.works || []).map((w: ReportWork) => w.name?.toLowerCase())
                    );
                    const extraPhotos = lastReport.content.photos.filter((p: ReportPhoto) => {
                      if (matchedPhotoUrls.has(p.url)) return false;
                      const photoKey = (p.work_name || p.caption || '').toLowerCase();
                      if (photoKey && workNames.has(photoKey)) return false;
                      return true;
                    });

                    if (extraPhotos.length === 0) return null;

                    return (
                      <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          📸 {t('reports.morePhotos' as any) || 'More Photos'}
                          <span className="text-xs font-normal text-gray-500">({extraPhotos.length})</span>
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                          {extraPhotos.map((photo: ReportPhoto) => (
                            <button
                              key={photo.id}
                              onClick={() => { setLightboxSrc(photo.url || photo.thumbnail_url || ''); setLightboxOpen(true); }}
                              className="aspect-square rounded-lg overflow-hidden shadow-sm cursor-zoom-in"
                            >
                              <img
                                src={photo.url || photo.thumbnail_url}
                                alt={photo.caption || t('reports.learningMoment')}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('reports.contentNotAvailable')}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowLastReport(false)}
                className="w-full py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox — fullscreen zoom + download */}
      <PhotoLightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        src={lightboxSrc}
      />

      {/* Info */}
      <p className="text-xs text-gray-400 text-center">
        {t('reports.photosSavedInfo')}
      </p>
        </>
      )}

      {/* Invite Parent Modal */}
      {session && !isHomeschoolParent(session) && (
        <InviteParentModal
          childId={childId}
          childName={childName || 'Child'}
          teacherId={session?.teacher?.id}
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  const bg = { gray: 'bg-gray-50', emerald: 'bg-emerald-50', blue: 'bg-blue-50' }[color] || 'bg-gray-50';
  const text = { gray: 'text-gray-700', emerald: 'text-emerald-600', blue: 'text-blue-600' }[color] || 'text-gray-700';

  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-xl font-bold ${text}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status, locale }: { status: string; locale?: string }) {
  const isZh = locale === 'zh';
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', label: isZh ? '🌱 已展示' : '🌱 Introduced' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: isZh ? '🔄 练习中' : '🔄 Practicing' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: isZh ? '⭐ 已掌握' : '⭐ Mastered' },
    documented: { bg: 'bg-purple-100', text: 'text-purple-700', label: isZh ? '📸 已记录' : '📸 Documented' },
  };

  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: '○ Started' };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
