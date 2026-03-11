// components/montree/home/ShelfView.tsx
// Visual Montessori wooden shelf — 3 planks with works as tappable 3D objects
// Tap a work → QuickGuideModal (same as teacher experience)
// Search bar above shelf — search all curriculum works, click to set focus work
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n } from '@/lib/montree/i18n/context';
import QuickGuideModal from '@/components/montree/child/QuickGuideModal';
import FullDetailsModal from '@/components/montree/child/FullDetailsModal';
import { QuickGuideData } from '@/components/montree/curriculum/types';

interface ShelfWork {
  area: string;
  work_name: string;
  chineseName?: string | null;
  status: string;
  set_at: string;
  set_by: string;
  guru_reason?: string | null;
}

interface CurriculumWork {
  name: string;
  chineseName?: string;
  area: string;
  category?: string;
}

interface ShelfViewProps {
  childId: string;
  classroomId?: string;
  onAskGuide: (message: string) => void;
  refreshTrigger?: number;
}

// Area accent colors
const AREA_COLORS: Record<string, { bg: string; glow: string; border: string }> = {
  practical_life: { bg: '#E11D48', glow: 'rgba(225,29,72,0.25)', border: 'rgba(225,29,72,0.6)' },
  sensorial:      { bg: '#F59E0B', glow: 'rgba(245,158,11,0.25)', border: 'rgba(245,158,11,0.6)' },
  mathematics:    { bg: '#3B82F6', glow: 'rgba(59,130,246,0.25)', border: 'rgba(59,130,246,0.6)' },
  language:       { bg: '#10B981', glow: 'rgba(16,185,129,0.25)', border: 'rgba(16,185,129,0.6)' },
  cultural:       { bg: '#8B5CF6', glow: 'rgba(139,92,246,0.25)', border: 'rgba(139,92,246,0.6)' },
};

// Status glow effects
const STATUS_GLOW: Record<string, string> = {
  not_started: 'none',
  presented: '0 0 8px rgba(245,158,11,0.5)',
  practicing: '0 0 12px rgba(16,185,129,0.5)',
  mastered: '0 0 14px rgba(74,222,128,0.6), 0 0 28px rgba(74,222,128,0.2)',
};

function getWorkIcon(workName: string, area: string): string {
  if (BIO.workIcon[workName]) return BIO.workIcon[workName];
  const lower = workName.toLowerCase();
  for (const [key, icon] of Object.entries(BIO.workIcon)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return BIO.areaIcon[area] || '📦';
}

// Split works array into 3 rows of 3 (filling from top)
function distributeToShelves(works: ShelfWork[]): (ShelfWork | null)[][] {
  const slots: (ShelfWork | null)[] = [];
  // Place works in order, fill 9 slots total
  for (let i = 0; i < 9; i++) {
    slots.push(i < works.length ? works[i] : null);
  }
  return [
    slots.slice(0, 3), // Top shelf
    slots.slice(3, 6), // Middle shelf
    slots.slice(6, 9), // Bottom shelf
  ];
}

export default function ShelfView({ childId, classroomId, onAskGuide, refreshTrigger }: ShelfViewProps) {
  const { t, locale } = useI18n();
  const [shelf, setShelf] = useState<ShelfWork[]>([]);
  const [loading, setLoading] = useState(true);

  // Search bar state
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<CurriculumWork[]>([]);
  const [allCurriculumWorks, setAllCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [settingWork, setSettingWork] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Dismiss search dropdown on click outside
  useEffect(() => {
    if (!searchResults.length) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setSearchText('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchResults.length]);

  // Per-area expanded reason
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Guide modal state
  const [guideOpen, setGuideOpen] = useState(false);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);
  const [guideWorkName, setGuideWorkName] = useState('');
  const [guideData, setGuideData] = useState<QuickGuideData | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  const shelfAbortRef = useRef<AbortController | null>(null);
  const guideAbortRef = useRef<AbortController | null>(null);

  // Work detail panel state
  const [detailWork, setDetailWork] = useState<ShelfWork | null>(null);
  const [detailStatus, setDetailStatus] = useState<string>('');
  const [observation, setObservation] = useState('');
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingObs, setSavingObs] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // Load all curriculum works for search
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/montree/works/search?q=', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (controller.signal.aborted) return;
        if (data.works) {
          // Normalize API response: chinese_name → chineseName, area.area_key → area
          const normalized: CurriculumWork[] = data.works.map((w: Record<string, unknown>) => ({
            name: w.name as string,
            chineseName: (w.chinese_name as string) || undefined,
            area: typeof w.area === 'object' && w.area !== null
              ? (w.area as Record<string, string>).area_key
              : (w.area as string),
          }));
          setAllCurriculumWorks(normalized);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Filter search results as user types
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    const needle = searchText.toLowerCase();
    const matches = allCurriculumWorks.filter(w =>
      w.name.toLowerCase().includes(needle) ||
      (w.chineseName && w.chineseName.includes(searchText))
    ).slice(0, 8);
    setSearchResults(matches);
  }, [searchText, allCurriculumWorks]);

  const fetchShelf = useCallback(async () => {
    shelfAbortRef.current?.abort();
    const controller = new AbortController();
    shelfAbortRef.current = controller;
    try {
      const res = await fetch(`/api/montree/shelf?child_id=${childId}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Shelf fetch failed');
      const data = await res.json();
      if (!controller.signal.aborted && data.success) {
        setShelf(data.shelf || []);
        setFetchError(false);
        setDetailWork(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFetchError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [childId]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchShelf();
  }, [refreshTrigger, fetchShelf]);

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      shelfAbortRef.current?.abort();
      guideAbortRef.current?.abort();
    };
  }, []);

  // Set a focus work from search → auto-updates shelf
  const setFocusWork = useCallback(async (work: CurriculumWork) => {
    setSettingWork(true);
    setSearchText('');
    setSearchResults([]);
    try {
      const res = await fetch('/api/montree/shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          area: work.area,
          work_name: work.name,
        }),
      });
      if (!res.ok) {
        toast.error(t('home.shelf.progressFailed'));
        return;
      }
      const data = await res.json();
      if (data.success) {
        await fetchShelf();
      }
    } catch (err) {
      console.error('Set focus work failed:', err);
      toast.error(t('common.networkError'));
    } finally {
      setSettingWork(false);
    }
  }, [childId, fetchShelf, t]);

  // Open guide for a work (same pattern as teacher week view)
  const openWorkGuide = useCallback(async (workName: string) => {
    guideAbortRef.current?.abort();
    const controller = new AbortController();
    guideAbortRef.current = controller;

    setGuideWorkName(workName);
    setGuideOpen(true);
    setGuideLoading(true);
    setGuideData(null);

    try {
      let url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      // Fix: pass locale so guide content translates to Chinese
      if (locale && locale !== 'en') {
        url += `&locale=${locale}`;
      }
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (!controller.signal.aborted) setGuideData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setGuideData(null);
    }
    if (!controller.signal.aborted) setGuideLoading(false);
  }, [classroomId, locale]);

  // Open work detail panel
  const openWorkDetail = useCallback((work: ShelfWork) => {
    setDetailWork(work);
    setDetailStatus(work.status || 'not_started');
    setObservation('');
  }, []);

  // Close work detail panel
  const closeWorkDetail = useCallback(() => {
    setDetailWork(null);
  }, []);

  // Update progress status
  const updateProgress = useCallback(async (newStatus: string) => {
    if (!detailWork || savingProgress) return;
    const currentWork = detailWork; // capture before async
    setSavingProgress(true);
    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          work_name: currentWork.work_name,
          area: currentWork.area,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setDetailStatus(newStatus);
        setShelf(prev => prev.map(w =>
          w.work_name === currentWork.work_name ? { ...w, status: newStatus } : w
        ));
        toast.success(t('home.shelf.progressUpdated'));
      } else {
        toast.error(t('home.shelf.progressFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSavingProgress(false);
    }
  }, [detailWork, childId, t]);

  // Save observation
  const saveObservation = useCallback(async () => {
    if (!detailWork || !observation.trim() || savingObs) return;
    const currentWork = detailWork; // capture before async
    setSavingObs(true);
    try {
      const res = await fetch('/api/montree/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          observation: observation.trim(),
          work_name: currentWork.work_name,
          area: currentWork.area,
        }),
      });
      if (res.ok) {
        toast.success(t('home.shelf.observationSaved'));
        setObservation('');
      } else {
        toast.error(t('home.shelf.observationFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSavingObs(false);
    }
  }, [detailWork, childId, observation, t]);

  // Distribute works across 3 shelves
  const shelves = distributeToShelves(shelf);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">📚</div>
          <p className={`text-sm ${BIO.text.secondary}`}>{t('home.shelf.loading')}</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center px-6">
          <div className="text-4xl mb-3">😔</div>
          <p className={`text-sm ${BIO.text.secondary} mb-4`}>{t('home.shelf.fetchError')}</p>
          <button
            onClick={() => { setFetchError(false); setLoading(true); fetchShelf(); }}
            className="px-6 py-2 rounded-xl text-sm font-medium"
            style={{
              background: 'rgba(74,222,128,0.15)',
              border: '1px solid rgba(74,222,128,0.3)',
              color: '#4ADE80',
            }}
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${BIO.bg.gradient}`}>
      {/* Title */}
      <h2 className={`text-center text-lg font-semibold ${BIO.text.primary} pt-5 pb-1`}>
        {t('home.shelf.title')}
      </h2>
      <p className={`text-center text-xs ${BIO.text.muted} mb-2 px-6`}>
        {t('home.shelf.tapToPresent')}
      </p>

      {/* Search bar — search all curriculum works */}
      <div ref={searchContainerRef} className="px-4 mb-3 relative">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={t('home.shelf.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/30 outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          {searchText && (
            <button
              onClick={() => { setSearchText(''); setSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div
            className="absolute left-4 right-4 top-full mt-1 rounded-xl overflow-hidden z-20"
            style={{
              background: 'rgba(20,30,25,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {searchResults.map(work => {
              const colors = AREA_COLORS[work.area] || AREA_COLORS.practical_life;
              return (
                <button
                  key={`${work.area}-${work.name}`}
                  onClick={() => setFocusWork(work)}
                  disabled={settingWork}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-50"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/85 truncate">
                      {locale === 'zh' && work.chineseName ? work.chineseName : work.name}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {t(`area.${work.area}` as any)}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/25 flex-shrink-0">
                    {t('home.shelf.setWork')}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* No results */}
        {searchText.trim() && searchResults.length === 0 && allCurriculumWorks.length > 0 && (
          <div
            className="absolute left-4 right-4 top-full mt-1 rounded-xl py-3 px-4 z-20"
            style={{
              background: 'rgba(20,30,25,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <p className="text-xs text-white/40 text-center">{t('home.shelf.noResults')}</p>
          </div>
        )}
      </div>

      {/* Per-area Guru recommendation (expanded) */}
      {expandedArea && (() => {
        const areaWork = shelf.find(s => s.area === expandedArea);
        const reason = areaWork?.guru_reason;
        const colors = AREA_COLORS[expandedArea] || AREA_COLORS.practical_life;
        return (
          <div className="px-4 mb-3">
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: `linear-gradient(135deg, ${colors.glow} 0%, rgba(255,255,255,0.03) 100%)`,
                border: `1px solid ${colors.border}`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-white/80">
                  {t('home.shelf.guruReason')} — {t(`area.${expandedArea}` as any)}
                </span>
                <button
                  onClick={() => setExpandedArea(null)}
                  className="text-white/30 text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">
                {reason || t('home.shelf.noReason')}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Shelf unit — 3 planks */}
      <div className="px-4 pb-8">
        {/* Shelf frame */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(80,60,20,0.15) 0%, rgba(60,45,15,0.25) 100%)',
            border: '1px solid rgba(139,105,20,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Side rails */}
          <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: BIO.shelf.plankEdge, opacity: 0.6 }} />
          <div className="absolute right-0 top-0 bottom-0 w-2" style={{ background: BIO.shelf.plankEdge, opacity: 0.6 }} />

          {/* Top cap */}
          <div className="h-3 mx-2" style={{ background: BIO.shelf.plankEdge, borderRadius: '8px 8px 0 0' }} />

          {/* 3 shelf rows */}
          {shelves.map((row, rowIdx) => (
            <ShelfPlank
              key={rowIdx}
              items={row}
              isLast={rowIdx === 2}
              onWorkTap={(workName: string) => {
                const work = shelf.find(w => w.work_name === workName);
                if (work) openWorkDetail(work);
              }}
              onEmptyTap={() => onAskGuide(t('home.shelf.suggestWork'))}
              onAreaTap={(area: string) => setExpandedArea(prev => prev === area ? null : area)}
              t={t}
            />
          ))}

          {/* Bottom cap */}
          <div
            className="h-2 mx-2"
            style={{
              background: BIO.shelf.plankEdge,
              borderRadius: '0 0 8px 8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* Empty state */}
      {shelf.length === 0 && (
        <div className="text-center px-6 pb-8 -mt-4">
          <p className={`text-xs ${BIO.text.secondary}`}>
            {t('home.shelf.emptyMessage')}
          </p>
        </div>
      )}

      {/* Navigation links */}
      <div className="px-4 pb-6 flex gap-3">
        <a
          href={`/montree/dashboard/${childId}/progress`}
          className="flex-1 py-3 rounded-xl text-center text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          📊 {t('home.shelf.viewProgress')}
        </a>
        <a
          href="/montree/dashboard/curriculum/browse"
          className="flex-1 py-3 rounded-xl text-center text-xs font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          📚 {t('home.shelf.browseCurriculum')}
        </a>
      </div>

      {/* Work Detail Panel */}
      {detailWork && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={closeWorkDetail}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, #0D2B27 0%, #0A1F1C 100%)',
              border: '1px solid rgba(74,222,128,0.15)',
              maxHeight: '80vh',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getWorkIcon(detailWork.work_name, detailWork.area)}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white/90 truncate">
                    {locale === 'zh' && detailWork.chineseName ? detailWork.chineseName : detailWork.work_name}
                  </h3>
                  <span className="text-xs" style={{ color: (AREA_COLORS[detailWork.area] || AREA_COLORS.practical_life).bg }}>
                    {t(`area.${detailWork.area}` as any)}
                  </span>
                </div>
              </div>
              <button onClick={closeWorkDetail} className="text-white/40 text-lg p-1">✕</button>
            </div>

            {/* Progress Status Buttons */}
            <div className="px-5 pb-4">
              <p className="text-xs text-white/50 mb-2">{t('home.shelf.status')}</p>
              <div className="flex gap-2">
                {(['presented', 'practicing', 'mastered'] as const).map(s => {
                  const isActive = detailStatus === s;
                  const colors = {
                    presented: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)', text: '#F59E0B' },
                    practicing: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.5)', text: '#10B981' },
                    mastered: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.5)', text: '#4ADE80' },
                  };
                  const c = colors[s];
                  return (
                    <button
                      key={s}
                      onClick={() => updateProgress(s)}
                      disabled={savingProgress}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{
                        background: isActive ? c.bg : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${isActive ? c.border : 'rgba(255,255,255,0.08)'}`,
                        color: isActive ? c.text : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {t(`home.shelf.${s}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observation */}
            <div className="px-5 pb-4">
              <p className="text-xs text-white/50 mb-2">{t('home.shelf.observationLabel')}</p>
              <textarea
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder={t('home.shelf.observationPlaceholder')}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/30 resize-none outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              {observation.trim() && (
                <button
                  onClick={saveObservation}
                  disabled={savingObs}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{
                    background: 'rgba(74,222,128,0.15)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    color: '#4ADE80',
                  }}
                >
                  {savingObs ? t('common.saving') : t('home.shelf.saveObservation')}
                </button>
              )}
            </div>

            {/* View Guide Button */}
            <div className="px-5 pb-5">
              <button
                onClick={() => {
                  const name = detailWork.work_name;
                  closeWorkDetail();
                  openWorkGuide(name);
                }}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(74,222,128,0.1)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  color: '#4ADE80',
                }}
              >
                {t('home.shelf.viewPresentation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Guide Modal — same component teachers use */}
      <QuickGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        workName={guideWorkName}
        guideData={guideData}
        loading={guideLoading}
        onOpenFullDetails={() => {
          setGuideOpen(false);
          setFullDetailsOpen(true);
        }}
      />

      {/* Full Details Modal — same component teachers use */}
      <FullDetailsModal
        isOpen={fullDetailsOpen}
        onClose={() => setFullDetailsOpen(false)}
        workName={guideWorkName}
        guideData={guideData}
        loading={guideLoading}
      />
    </div>
  );
}

// ─── Individual shelf plank with 3 slots ────────────────────────

function ShelfPlank({
  items,
  isLast,
  onWorkTap,
  onEmptyTap,
  onAreaTap,
  t,
}: {
  items: (ShelfWork | null)[];
  isLast: boolean;
  onWorkTap: (workName: string) => void;
  onEmptyTap: () => void;
  onAreaTap: (area: string) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="relative">
      {/* Items sitting on the shelf */}
      <div className="flex justify-around items-end px-6 pt-4 pb-2 min-h-[110px]">
        {items.map((item, idx) => (
          <ShelfObject
            key={item ? item.work_name : `empty-${idx}`}
            work={item}
            onTap={() => item ? onWorkTap(item.work_name) : onEmptyTap()}
            onAreaTap={item ? () => onAreaTap(item.area) : undefined}
            t={t}
          />
        ))}
      </div>

      {/* The wooden plank */}
      <div className="mx-2">
        {/* Plank surface */}
        <div
          className="h-3.5 relative"
          style={{
            background: BIO.shelf.plank,
            boxShadow: BIO.shelf.shadow,
          }}
        >
          {/* Wood grain */}
          <div className="absolute inset-0" style={{ background: BIO.shelf.grain, opacity: 0.5 }} />
        </div>
        {/* Plank front edge */}
        <div
          className="h-2"
          style={{
            background: BIO.shelf.plankEdge,
            boxShadow: BIO.shelf.edgeShadow,
          }}
        />
        {/* Spacer between planks (except last) */}
        {!isLast && <div className="h-1" />}
      </div>
    </div>
  );
}

// ─── Individual work object on the shelf ────────────────────────

function ShelfObject({
  work,
  onTap,
  onAreaTap,
  t,
}: {
  work: ShelfWork | null;
  onTap: () => void;
  onAreaTap?: () => void;
  t: (key: string) => string;
}) {
  const { locale } = useI18n();
  if (!work) {
    // Empty slot
    return (
      <button
        onClick={onTap}
        aria-label={t('home.shelf.askGuide')}
        className="flex flex-col items-center gap-1 transition-transform active:scale-95"
        style={{ width: '88px' }}
      >
        <div
          className="w-16 h-16 rounded-xl border border-dashed border-white/12 flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="text-white/15 text-2xl">+</span>
        </div>
        <span className="text-[9px] text-white/20 text-center">{t('home.shelf.askGuide')}</span>
      </button>
    );
  }

  const icon = getWorkIcon(work.work_name, work.area);
  const colors = AREA_COLORS[work.area] || AREA_COLORS.practical_life;
  const status = work.status || 'not_started';
  const isMastered = status === 'mastered';

  return (
    <button
      onClick={onTap}
      aria-label={t('home.shelf.viewGuide').replace('{name}', work.work_name)}
      className="flex flex-col items-center gap-1 transition-transform active:scale-95"
      style={{ width: '88px' }}
    >
      {/* The 3D material object */}
      <div className="relative">
        {/* Shadow underneath */}
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full blur-sm"
          style={{ backgroundColor: colors.glow, opacity: 0.6 }}
        />

        {/* Icon container */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center relative"
          style={{
            background: `linear-gradient(145deg, ${colors.glow} 0%, rgba(255,255,255,0.03) 60%, rgba(0,0,0,0.1) 100%)`,
            border: `1.5px solid ${colors.border}`,
            transform: 'perspective(300px) rotateY(-2deg) rotateX(3deg)',
            boxShadow: `${STATUS_GLOW[status] || 'none'}, 0 4px 12px rgba(0,0,0,0.3)`,
          }}
        >
          <span className="text-3xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            {icon}
          </span>

          {/* Mastered sparkle */}
          {isMastered && (
            <span className="absolute -top-1.5 -right-1.5 text-xs animate-pulse">⭐</span>
          )}

          {/* Status dot */}
          {status !== 'not_started' && !isMastered && (
            <div
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
              style={{
                backgroundColor: status === 'presented' ? '#F59E0B' : '#10B981',
                boxShadow: `0 0 6px ${status === 'presented' ? 'rgba(245,158,11,0.6)' : 'rgba(16,185,129,0.6)'}`,
              }}
            />
          )}
        </div>
      </div>

      {/* Work name */}
      <span
        className="text-[10px] font-medium text-white/75 text-center leading-tight max-w-full truncate px-0.5"
      >
        {locale === 'zh' && work.chineseName ? work.chineseName : work.work_name}
      </span>

      {/* Area label — tappable to show Guru recommendation */}
      <span
        className="text-[8px] text-center cursor-pointer active:opacity-80"
        style={{ color: colors.bg, opacity: 0.6 }}
        onClick={e => {
          if (onAreaTap) {
            e.stopPropagation();
            onAreaTap();
          }
        }}
      >
        {t(`area.${work.area}` as any) || BIO.areaLabel[work.area] || work.area}
      </span>
    </button>
  );
}
