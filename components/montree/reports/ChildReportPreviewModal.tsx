// components/montree/reports/ChildReportPreviewModal.tsx
// Per-child Parent Report preview / publish / last-sent-report flow.
//
// EXTRACTED VERBATIM (Jul 4 2026) from app/montree/dashboard/[childId]/gallery/page.tsx
// when the child gallery became display-only. This is the ONLY teacher surface for
// previewing + publishing the per-child parent report — it now lives on the Parents
// tab (/montree/dashboard/parent-codes). The modal internals (excludedWorks
// persistence, lightbox-in-modal, edit-photos refetch) are moved as-is, NOT
// redesigned — this flow is load-bearing (it's how teachers send reports to parents).
//
// APIs used (unchanged):
//   GET   /api/montree/reports/preview?child_id&locale
//   GET   /api/montree/reports/available-photos?child_id&locale
//   GET   /api/montree/reports?child_id&status=sent&limit=1&locale
//   PATCH /api/montree/reports/photos
//   POST  /api/montree/reports/send?locale
//
// Mount pattern: render with key={childId} so per-child state (excludedWorks etc.)
// resets when the target child changes, but persists across close/reopen for the
// SAME child (the teacher's delete choices should survive reopens — original
// gallery behaviour).
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';

const PhotoLightbox = dynamic(() => import('@/components/montree/media/PhotoLightbox'), { ssr: false });
const PhotoSelectionModal = dynamic(() => import('@/components/montree/PhotoSelectionModal'), { ssr: false });

// ── Report Types ──
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

interface UnassignedPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface ReportPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  work_name?: string;
}

interface SentReport {
  id?: string;
  sent_at?: string;
  published_at?: string;
  created_at: string;
  week_start: string;
  content: {
    child?: { name?: string };
    summary?: { works_this_week?: number; photos_this_week?: number; overall_progress?: { mastered?: number } };
    works?: Array<{ name: string; status: string; status_label?: string; photo_url?: string | null; photo_caption?: string | null; parent_description?: string | null; why_it_matters?: string | null; chineseName?: string | null }>;
    photos?: Array<{ id: string; url?: string; thumbnail_url?: string; caption?: string | null; work_name?: string | null }>;
  };
}

export interface ChildReportPreviewModalProps {
  childId: string;
  childName: string;
  isOpen: boolean;
  /** 'preview' — this week's draft report; 'last' — the most recent SENT report. */
  mode: 'preview' | 'last';
  onClose: () => void;
  /** Fired after a successful publish so the caller can update its "last sent" status. */
  onSent?: () => void;
}

export default function ChildReportPreviewModal({
  childId,
  childName,
  isOpen,
  mode,
  onClose,
  onSent,
}: ChildReportPreviewModalProps) {
  const { t, locale } = useI18n();

  // ── Report State (moved verbatim from the gallery page) ──
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);
  const [reportChildName, setReportChildName] = useState(childName);
  const [reportUnassigned, setReportUnassigned] = useState<UnassignedPhoto[]>([]);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewSelectedArea, setPreviewSelectedArea] = useState<string | null>(null);
  const [previewExpandedCard, setPreviewExpandedCard] = useState<string | null>(null);
  const [excludedWorks, setExcludedWorks] = useState<Set<string>>(new Set());
  const [reportLightboxSrc, setReportLightboxSrc] = useState('');
  const [reportLightboxOpen, setReportLightboxOpen] = useState(false);
  // Photo selection modal
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentReportPhotos, setCurrentReportPhotos] = useState<ReportPhoto[]>([]);
  const [allReportPhotos, setAllReportPhotos] = useState<ReportPhoto[]>([]);
  // Past reports
  const [showLastReport, setShowLastReport] = useState(false);
  const [lastReport, setLastReport] = useState<SentReport | null>(null);
  const [loadingLastReport, setLoadingLastReport] = useState(false);

  const closeModal = useCallback(() => {
    setShowReportPreview(false);
    setShowLastReport(false);
    onClose();
  }, [onClose]);

  // ── Report Handlers (moved verbatim) ──

  const fetchReportPreview = useCallback(async () => {
    setReportLoading(true);
    try {
      const controller = new AbortController();
      const [previewRes, photosRes] = await Promise.all([
        fetch(`/api/montree/reports/preview?child_id=${childId}&locale=${locale}`, { signal: controller.signal }),
        fetch(`/api/montree/reports/available-photos?child_id=${childId}&locale=${locale}`, { signal: controller.signal }),
      ]);
      if (!previewRes.ok || !photosRes.ok) throw new Error('Fetch failed');
      const previewData = await previewRes.json();
      const photosData = await photosRes.json();

      if (previewData.success && photosData.success) {
        setReportChildName(previewData.child_name || childName || 'Student');
        setReportItems(previewData.items || []);
        setReportUnassigned(previewData.unassigned_photos || []);

        const allAvailablePhotos = photosData.photos || [];
        const reportedWorkNames = new Set(
          (previewData.items || []).filter((item: ReportItem) => item.photo_url).map((item: ReportItem) => item.work_name)
        );
        const reportedPhotos = allAvailablePhotos.filter((p: ReportPhoto) => p.work_name && reportedWorkNames.has(p.work_name));
        setCurrentReportPhotos(reportedPhotos);
        setAllReportPhotos(allAvailablePhotos);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch report preview:', err);
      toast.error(t('reports.loadError'));
    }
    setReportLoading(false);
  }, [childId, childName, locale, t]);

  const handleOpenReportPreview = useCallback(async () => {
    setPreviewSelectedArea(null);
    setPreviewExpandedCard(null);
    // Don't reset exclusions — teacher's delete choices should persist across reopens
    await fetchReportPreview();
    setShowReportPreview(true);
  }, [fetchReportPreview]);

  const sendReport = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/montree/reports/send?locale=${locale}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          excluded_works: excludedWorks.size > 0 ? Array.from(excludedWorks) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Send failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        toast.success(t('reports.published'));
        setReportItems([]);
        setExcludedWorks(new Set());
        onSent?.();
        closeModal();
      } else {
        toast.error(data.error || t('common.failedToSend'));
      }
    } catch {
      toast.error(t('common.failedToSend'));
    }
    setSending(false);
  };

  const handlePhotoSelectionSave = async (selectedMediaIds: string[]) => {
    try {
      const res = await fetch('/api/montree/reports/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, selected_media_ids: selectedMediaIds }),
      });
      if (!res.ok) throw new Error(`Photo update failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        await fetchReportPreview();
      } else {
        throw new Error(data.error || 'Failed');
      }
    } catch (err) {
      console.error('Failed to update photos:', err);
      toast.error(t('reports.photoUpdateFailed'));
      throw err;
    }
  };

  const fetchLastReport = useCallback(async () => {
    setLoadingLastReport(true);
    let opened = false;
    try {
      const res = await fetch(`/api/montree/reports?child_id=${childId}&status=sent&limit=1&locale=${locale}`);
      if (!res.ok) throw new Error(`Report fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success && data.reports && data.reports.length > 0) {
        setLastReport(data.reports[0]);
        setShowLastReport(true);
        opened = true;
      } else {
        toast.error(t('reports.noReportsFound'));
      }
    } catch (err) {
      console.error('Failed to fetch last report:', err);
      toast.error(t('reports.loadLastReportError'));
    }
    setLoadingLastReport(false);
    return opened;
  }, [childId, locale, t]);

  // Drive the flow from the isOpen/mode props: opening in 'preview' mode runs the
  // preview fetch then shows the preview modal (same sequence as the gallery's
  // "Preview Report" button); 'last' fetches the most recent sent report and shows
  // it, or closes with a toast when none exists.
  useEffect(() => {
    if (!isOpen) {
      setShowReportPreview(false);
      setShowLastReport(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (mode === 'preview') {
        await handleOpenReportPreview();
      } else {
        const opened = await fetchLastReport();
        if (!cancelled && !opened) onClose();
      }
    })();
    return () => { cancelled = true; };
    // handleOpenReportPreview / fetchLastReport are stable per (childId, locale);
    // re-running on their identity change while open would refetch mid-view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Memoize available photos for photo selection modal
  const availableForSelection = useMemo(() => {
    const ids = new Set(currentReportPhotos.map(cp => cp.id));
    return allReportPhotos.filter(p => !ids.has(p.id));
  }, [currentReportPhotos, allReportPhotos]);

  if (!isOpen && !showReportPreview && !showLastReport) return null;

  return (
    <>
      {/* Loading overlay while the preview / last report is being fetched */}
      {isOpen && !showReportPreview && !showLastReport && (reportLoading || loadingLastReport) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div style={{ background: 'rgba(7,18,12,0.97)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: 14, padding: '14px 22px', color: 'rgba(255,255,255,0.80)', fontFamily: '"Inter", sans-serif', fontSize: 14 }}>
            ⏳ {t('common.loading')}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT PREVIEW MODAL
          ══════════════════════════════════════════════ */}
      {showReportPreview && (() => {
        const PREVIEW_AREA_CONFIG: Record<string, { emoji: string; labelKey: string; color: string }> = {
          practical_life: { emoji: '🧹', labelKey: 'gallery.previewAreaPracticalLife', color: '#ec4899' },
          sensorial: { emoji: '👁️', labelKey: 'gallery.previewAreaSensorial', color: '#8b5cf6' },
          mathematics: { emoji: '🔢', labelKey: 'gallery.previewAreaMathematics', color: '#3b82f6' },
          math: { emoji: '🔢', labelKey: 'gallery.previewAreaMathematics', color: '#3b82f6' },
          language: { emoji: '📚', labelKey: 'gallery.previewAreaLanguage', color: '#f59e0b' },
          cultural: { emoji: '🌍', labelKey: 'gallery.previewAreaCultural', color: '#22c55e' },
          special_events: { emoji: '🎉', labelKey: 'gallery.previewAreaSpecialEvents', color: '#e11d48' },
        };
        const PREVIEW_AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'special_events'];
        const normalizePreviewArea = (area: string) => area === 'math' ? 'mathematics' : area;
        const getPreviewAreaConf = (area: string) => PREVIEW_AREA_CONFIG[normalizePreviewArea(area)] || PREVIEW_AREA_CONFIG['cultural'];
        const getPreviewAreaLabel = (area: string) => t(getPreviewAreaConf(area).labelKey);

        // Separate included vs excluded items for accurate counts
        const includedItems = reportItems.filter(i => !excludedWorks.has(i.work_name));

        const previewWorksByArea: Record<string, ReportItem[]> = {};
        for (const area of PREVIEW_AREA_ORDER) previewWorksByArea[area] = [];
        for (const item of includedItems) {
          const area = normalizePreviewArea(item.area || 'other');
          if (!previewWorksByArea[area]) previewWorksByArea[area] = [];
          previewWorksByArea[area].push(item);
        }

        const previewMastered = includedItems.filter(i => i.status === 'mastered' || i.status === 'completed').length;
        const previewPracticing = includedItems.filter(i => i.status === 'practicing').length;
        const previewPresented = includedItems.filter(i => i.status === 'presented').length;

        // Filter for display still uses ALL items (so excluded cards show with opacity)
        const previewFiltered = previewSelectedArea
          ? reportItems.filter(i => normalizePreviewArea(i.area) === previewSelectedArea)
          : reportItems;

        const toggleExcludeWork = (workName: string) => {
          setExcludedWorks(prev => {
            const next = new Set(prev);
            if (next.has(workName)) {
              next.delete(workName);
              toast.success(t('gallery.restoredToReport'));
            } else {
              next.add(workName);
              toast.success(t('gallery.excludedFromReport'));
            }
            return next;
          });
        };

        const renderPreviewCard = (item: ReportItem, i: number) => {
          const displayName = locale === 'zh' && item.chineseName ? item.chineseName : item.work_name;
          const areaConf = getPreviewAreaConf(item.area);
          const cardKey = `${item.work_name}-${i}`;
          const isExpanded = previewExpandedCard === cardKey;
          const isExcluded = excludedWorks.has(item.work_name);

          return (
            <div key={cardKey} className={`bg-white rounded-xl shadow-sm border overflow-hidden relative ${isExcluded ? 'border-red-200 opacity-50' : 'border-gray-100'}`}>
              {/* Exclude/Restore button */}
              <button
                onClick={() => toggleExcludeWork(item.work_name)}
                className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-md transition-colors ${
                  isExcluded
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-red-500/80 text-white hover:bg-red-600'
                }`}
                title={isExcluded ? t('gallery.restore') : t('gallery.removeFromReport')}
              >
                {isExcluded ? '↩' : '✕'}
              </button>
              {isExcluded && (
                <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
                  <div className="bg-red-500/80 text-white px-3 py-1 rounded-lg text-xs font-bold">
                    {t('gallery.removed')}
                  </div>
                </div>
              )}
              {item.photo_url ? (
                <div className="relative group">
                  <button onClick={() => { setReportLightboxSrc(item.photo_url!); setReportLightboxOpen(true); }} className="w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element -- report photos are remote proxy URLs, moved verbatim from the gallery */}
                    <img src={item.photo_url} alt={displayName} loading="lazy" decoding="async" className="w-full aspect-[4/3] object-cover" />
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
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: areaConf.color }}>
                    {areaConf.emoji.length <= 2 ? areaConf.emoji : t(areaConf.labelKey).charAt(0)}
                  </div>
                  <span className="text-sm truncate flex-1" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.90)' }}>{displayName}</span>
                  <ReportStatusBadge status={item.status} t={t} />
                </div>
                {item.parent_description && <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)', fontFamily: '"Inter", sans-serif' }}>{item.parent_description}</p>}
                {item.why_it_matters && (
                  <button onClick={() => setPreviewExpandedCard(isExpanded ? null : cardKey)} className="w-full text-left">
                    <div className={`bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5 transition-all ${isExpanded ? '' : 'cursor-pointer hover:bg-emerald-100/50'}`}>
                      <p className="text-[11px] font-semibold text-emerald-700 mb-0.5 flex items-center gap-1">
                        💡 {t('gallery.whyThisMatters')}
                        {!isExpanded && <span className="text-emerald-400 text-[10px]">▼</span>}
                      </p>
                      {isExpanded && <p className="text-xs text-emerald-800 leading-relaxed mt-1">{item.why_it_matters}</p>}
                    </div>
                  </button>
                )}
                {!item.parent_description && !item.why_it_matters && (
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: '"Inter", sans-serif' }}>
                    {t('gallery.fallbackDescription', { area: getPreviewAreaLabel(item.area).toLowerCase() })}
                  </p>
                )}
              </div>
            </div>
          );
        };

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(7,18,12,0.97)', border: '1px solid rgba(52,211,153,0.20)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' }}>
            {/* Modal Header */}
            <div className="p-4" style={{ borderBottom: '1px solid rgba(52,211,153,0.15)', background: 'linear-gradient(180deg, rgba(39,129,90,0.35) 0%, rgba(10,26,15,0.00) 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 500, fontSize: 18, color: 'rgba(255,255,255,0.95)', margin: 0 }}>📋 {t('reports.reportPreview')}</h3>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(52,211,153,0.70)', margin: '2px 0 0' }}>{t('reports.thisIsWhatParentsSee')}</p>
                </div>
                <button onClick={closeModal} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>×</button>
              </div>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg active:scale-95 transition-all"
                style={{ padding: '8px 12px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.30)', color: '#34d399', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                ✏️ {t('reports.editPhotos')}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
              <div className="p-4 space-y-4">

              {/* Report Header */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, rgba(16,73,45,0.80), rgba(7,18,12,0.60))', padding: '20px' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                      {reportChildName.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h2 style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.95)', margin: '0 0 4px' }}>
                        {t('gallery.learningReport', { name: reportChildName })}
                      </h2>
                      <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(52,211,153,0.75)', margin: 0 }}>
                        {reportItems.length - excludedWorks.size} {t('reports.activitiesToShare')}
                        {excludedWorks.size > 0 && (
                          <span className="text-red-200 ml-1">({t('gallery.removedCount', { count: String(excludedWorks.size) })})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {reportItems.length > 0 && (
                    <div className="flex gap-3 mt-4">
                      {previewMastered > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">⭐ {previewMastered}</p>
                          <p className="text-[10px] text-emerald-100">{t('gallery.mastered')}</p>
                        </div>
                      )}
                      {previewPracticing > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🔄 {previewPracticing}</p>
                          <p className="text-[10px] text-emerald-100">{t('gallery.practicing')}</p>
                        </div>
                      )}
                      {previewPresented > 0 && (
                        <div className="bg-white/15 rounded-lg px-3 py-1.5 text-center">
                          <p className="text-lg font-bold">🌱 {previewPresented}</p>
                          <p className="text-[10px] text-emerald-100">{t('gallery.introduced')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Inspiring progress summary */}
                <div style={{ margin: '12px 16px 8px', paddingLeft: 12, borderLeft: '3px solid rgba(52,211,153,0.50)', background: 'rgba(52,211,153,0.06)', borderRadius: '0 12px 12px 0', padding: '12px 12px 12px 16px' }}>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.80)', lineHeight: 1.6, margin: 0 }}>
                    {(() => {
                      const areasCount = Object.values(previewWorksByArea).filter(a => a.length > 0).length;
                      const parts = [t('gallery.progressSummary', { name: reportChildName, count: String(includedItems.length) })];
                      if (areasCount >= 3) parts.push(t('gallery.progressAreas', { count: String(areasCount) }));
                      if (previewPracticing > 0) parts.push(t('gallery.progressPracticing'));
                      return parts.join('');
                    })()}
                  </p>
                </div>

                {/* Mastered highlights */}
                {(() => {
                  const masteredItems = includedItems.filter(i => i.status === 'mastered' || i.status === 'completed');
                  if (masteredItems.length === 0) return null;
                  return (
                    <div className="px-5 py-3 pb-4">
                      {masteredItems.slice(0, 3).map((item, i) => (
                        <p key={i} className="text-sm leading-relaxed mb-1" style={{ color: 'rgba(255,255,255,0.70)', fontFamily: '"Inter", sans-serif' }}>
                          ⭐ {locale === 'zh' && item.chineseName ? item.chineseName : item.work_name} ({t('gallery.mastered')})
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Area filter chips */}
              {reportItems.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  <button
                    onClick={() => setPreviewSelectedArea(null)}
                    className="whitespace-nowrap flex-shrink-0"
                    style={{ padding: '6px 12px', borderRadius: 999, fontFamily: '"Inter", sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: !previewSelectedArea ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${!previewSelectedArea ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.12)'}`, color: !previewSelectedArea ? '#34d399' : 'rgba(255,255,255,0.55)' }}
                  >
                    {t('common.all')}
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
                        className="whitespace-nowrap flex-shrink-0 flex items-center gap-1.5"
                        style={{ padding: '6px 12px', borderRadius: 999, fontFamily: '"Inter", sans-serif', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: isActive ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.06)', border: `1px solid ${isActive ? 'rgba(52,211,153,0.45)' : 'rgba(52,211,153,0.12)'}`, color: isActive ? '#34d399' : 'rgba(255,255,255,0.55)' }}
                      >
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: config.color }}>{config.emoji}</div>
                        <span>{t(config.labelKey)}</span>
                        <span className="text-xs opacity-60">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Work Cards */}
              {previewFiltered.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 18, padding: '32px 24px', textAlign: 'center' }}>
                  <div className="text-4xl mb-3">📋</div>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    {previewSelectedArea
                      ? t('gallery.noActivitiesInArea')
                      : t('gallery.noActivitiesThisWeek')}
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
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: config.color }}>{config.emoji}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>{t(config.labelKey)}</p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)', margin: 0 }}>{areaWorks.length === 1 ? t('gallery.activity', { count: '1' }) : t('gallery.activities', { count: String(areaWorks.length) })}</p>
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

              {/* Extra Photos */}
              {!previewSelectedArea && reportUnassigned.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.15)' }}>📸</div>
                    <div>
                      <p className="text-sm" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>{t('gallery.moreMoments')}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)', margin: 0 }}>{reportUnassigned.length} {t('gallery.photos')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {reportUnassigned.map((photo) => (
                      <button
                        key={photo.id}
                        onClick={() => { setReportLightboxSrc(photo.url); setReportLightboxOpen(true); }}
                        className="aspect-[4/3] rounded-xl overflow-hidden shadow-sm cursor-zoom-in relative group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- report photos are remote proxy URLs, moved verbatim from the gallery */}
                        <img src={photo.url} alt={photo.caption || t('reports.learningMoment')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded-lg text-white text-[10px] font-medium backdrop-blur-sm">
                          {new Date(photo.created_at).toLocaleDateString(getIntlLocale(locale), { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {includedItems.filter(i => i.status === 'mastered' || i.status === 'practicing').length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 18, padding: 20 }}>
                  <h4 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, fontSize: 13, color: '#f59e0b', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    💡 {t('gallery.tryThisAtHome')}
                  </h4>
                  <div className="space-y-2">
                    {includedItems.filter(i => i.status === 'mastered' || i.status === 'practicing').slice(0, 3).map((item, i) => (
                      <p key={i} className="text-sm leading-relaxed flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.75)', fontFamily: '"Inter", sans-serif' }}>
                        <span className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }}>•</span>
                        <span>
                          {t('gallery.homeRecommendation', { name: reportChildName, work: (locale === 'zh' && item.chineseName) ? item.chineseName : item.work_name })}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Closing */}
              <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(52,211,153,0.12)', borderRadius: 18, padding: 20, textAlign: 'center' }}>
                <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                  {t('gallery.closingMessage', { name: reportChildName })}
                  {' '}🌿
                </p>
              </div>

              <div className="text-center py-2" style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.30)' }}>
                {new Date().toLocaleDateString(getIntlLocale(locale), { month: 'long', day: 'numeric', year: 'numeric' })}
                {' · Montree'}
              </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3" style={{ padding: 16, borderTop: '1px solid rgba(52,211,153,0.12)', background: 'rgba(7,18,12,0.60)' }}>
              <button
                onClick={closeModal}
                className="flex-1 rounded-xl"
                style={{ padding: '12px 0', fontFamily: '"Inter", sans-serif', fontWeight: 600, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer' }}
              >
                {t('common.close')}
              </button>
              <button
                onClick={sendReport}
                disabled={sending || includedItems.length === 0}
                className="flex-1 rounded-xl disabled:opacity-50"
                style={{ padding: '12px 0', fontFamily: '"Inter", sans-serif', fontWeight: 700, background: 'linear-gradient(180deg, #34d399, #10b981)', color: '#06281a', border: 'none', cursor: 'pointer' }}
              >
                {sending ? `⏳ ${t('reports.publishing')}` : includedItems.length === 0 ? t('gallery.noActivitiesToSend') : `✅ ${t('reports.publishReport')}`}
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
        currentPhotos={currentReportPhotos}
        availablePhotos={availableForSelection}
        childId={childId}
      />

      {/* Last Sent Report Modal */}
      {showLastReport && lastReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col" style={{ background: 'rgba(7,18,12,0.97)', border: '1px solid rgba(52,211,153,0.20)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)' }}>
            <div className="p-4" style={{ borderBottom: '1px solid rgba(52,211,153,0.15)', background: 'linear-gradient(180deg, rgba(39,129,90,0.30) 0%, transparent 100%)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 500, fontSize: 18, color: 'rgba(255,255,255,0.95)', margin: 0 }}>📄 {t('reports.lastSentReport')}</h3>
                  <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(52,211,153,0.70)', margin: '2px 0 0' }}>
                    {t('reports.sentOn')} {new Date(lastReport.sent_at || lastReport.published_at || lastReport.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={closeModal} style={{ color: 'rgba(255,255,255,0.45)', fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {lastReport.content ? (
                <>
                  <div className="text-center pb-4" style={{ borderBottom: '1px solid rgba(52,211,153,0.12)' }}>
                    <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center text-2xl font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.30)' }}>
                      {lastReport.content.child?.name?.charAt(0) || reportChildName.charAt(0) || '?'}
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-lora), serif', fontWeight: 500, fontSize: 20, color: 'rgba(255,255,255,0.95)', margin: '0 0 4px' }}>
                      {lastReport.content.child?.name || reportChildName}&apos;s {t('reports.progress')}
                    </h2>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                      {t('reports.weekOf')} {new Date(lastReport.week_start).toLocaleDateString()}
                    </p>
                  </div>
                  {lastReport.content.summary && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}>
                        <span className="text-lg">📚</span>
                        <p className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.90)' }}>{lastReport.content.summary.works_this_week || 0}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('reports.works')}</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)' }}>
                        <span className="text-lg">📸</span>
                        <p className="text-xl font-bold" style={{ color: 'rgba(147,197,253,0.90)' }}>{lastReport.content.summary.photos_this_week || 0}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('reports.photos')}</p>
                      </div>
                      <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.18)' }}>
                        <span className="text-lg">⭐</span>
                        <p className="text-xl font-bold" style={{ color: '#34d399' }}>{lastReport.content.summary.overall_progress?.mastered || 0}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>{t('reports.mastered')}</p>
                      </div>
                    </div>
                  )}
                  {lastReport.content.works && lastReport.content.works.length > 0 && (
                    <div className="space-y-4">
                      {lastReport.content.works.map((work, i) => (
                        <div key={`work-${work.name || i}`} className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center gap-2">
                            <ReportStatusBadge status={work.status} t={t} />
                            <h4 style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.90)', margin: 0 }}>{locale === 'zh' && work.chineseName ? work.chineseName : work.name}</h4>
                          </div>
                          {work.photo_url && (
                            <div className="relative -mx-4 my-3">
                              <button
                                onClick={() => { setReportLightboxSrc(work.photo_url!); setReportLightboxOpen(true); }}
                                className="aspect-[4/3] w-full overflow-hidden rounded-lg block cursor-zoom-in"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element -- report photos are remote proxy URLs, moved verbatim from the gallery */}
                                <img src={work.photo_url} alt={work.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              </button>
                              {work.photo_caption && (
                                <p className="mt-2 px-4 text-sm italic text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>{work.photo_caption}</p>
                              )}
                            </div>
                          )}
                          {work.parent_description ? (
                            <div className="space-y-2">
                              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>{work.parent_description}</p>
                              {work.why_it_matters && (
                                <div className="rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: '#34d399' }}>💡 {t('reports.whyItMatters')}</p>
                                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>{work.why_it_matters}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm italic" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('reports.noDescriptionAvailable')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <p>{t('reports.contentNotAvailable')}</p>
                </div>
              )}
            </div>
            <div className="p-4" style={{ borderTop: '1px solid rgba(52,211,153,0.12)', background: 'rgba(7,18,12,0.60)' }}>
              <button onClick={closeModal} className="w-full rounded-xl" style={{ padding: '12px 0', fontFamily: '"Inter", sans-serif', fontWeight: 600, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.60)', cursor: 'pointer' }}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Lightbox */}
      <PhotoLightbox
        isOpen={reportLightboxOpen}
        onClose={() => setReportLightboxOpen(false)}
        src={reportLightboxSrc}
      />
    </>
  );
}

// ── Report Status Badge ──
function ReportStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const styles: Record<string, { bg: string; text: string; labelKey: string }> = {
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', labelKey: 'gallery.statusPresented' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', labelKey: 'gallery.statusPracticing' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', labelKey: 'gallery.statusMastered' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', labelKey: 'gallery.statusMastered' },
    documented: { bg: 'bg-purple-100', text: 'text-purple-700', labelKey: 'gallery.statusDocumented' },
  };
  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', labelKey: 'gallery.statusStarted' };
  return <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>{t(style.labelKey)}</span>;
}
