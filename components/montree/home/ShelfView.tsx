// components/montree/home/ShelfView.tsx
// The child's works at a glance — a calm, premium parent surface (NOT a teacher
// tracker). Top: a 5-area progress-ring overview (the journey map). Below: warm
// work cards, each with a status ring + an unmistakable "How-to →" affordance.
//   • Home/Ivy context (onPresentWork set): tap a work → Ivy's hand-held Step Card.
//   • Teacher context (onPresentWork absent): tap → the progress detail panel.
// Search adds a work to the shelf. Area rings reveal Ivy's reason for that area.
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
  // When provided (home/Ivy context), tapping a shelf work calls this instead of
  // opening the teacher progress panel — the parent gets the hand-held how-to card.
  onPresentWork?: (work: { work_name: string; area: string }) => void;
}

// Canonical Montessori area order + soft hue identity (used as gentle tints + ring
// strokes only — never loud fills, so it reads premium against the BIO palette).
const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;
const AREA_COLORS: Record<string, { bg: string; glow: string; border: string }> = {
  practical_life: { bg: '#F0639A', glow: 'rgba(240,99,154,0.16)', border: 'rgba(240,99,154,0.35)' },
  sensorial:      { bg: '#F5B042', glow: 'rgba(245,176,66,0.16)', border: 'rgba(245,176,66,0.35)' },
  mathematics:    { bg: '#5AA9FF', glow: 'rgba(90,169,255,0.16)', border: 'rgba(90,169,255,0.35)' },
  language:       { bg: '#4ADE80', glow: 'rgba(74,222,128,0.16)', border: 'rgba(74,222,128,0.35)' },
  cultural:       { bg: '#A78BFA', glow: 'rgba(167,139,250,0.16)', border: 'rgba(167,139,250,0.35)' },
};

// Status → progress fraction + stroke color for the gentle rings.
const STATUS_FRAC: Record<string, number> = { not_started: 0, presented: 0.34, practicing: 0.67, mastered: 1 };
const STATUS_HEX: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.16)',
  presented: '#F5B042',
  practicing: '#10B981',
  mastered: '#4ADE80',
};

function getWorkIcon(workName: string, area: string): string {
  if (BIO.workIcon[workName]) return BIO.workIcon[workName];
  const lower = workName.toLowerCase();
  for (const [key, icon] of Object.entries(BIO.workIcon)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return BIO.areaIcon[area] || '📦';
}

export default function ShelfView({ childId, classroomId, onAskGuide, refreshTrigger, onPresentWork }: ShelfViewProps) {
  const { t, locale } = useI18n();
  // Typed helper so dynamic i18n keys don't need `as any`.
  const tk = (key: string) => t(key as Parameters<typeof t>[0]);

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

  // Work detail panel state (teacher path only)
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
      .then(r => {
        if (!r.ok) throw new Error('Curriculum search failed');
        return r.json();
      })
      .then(data => {
        if (controller.signal.aborted) return;
        if (data.works) {
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
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to load curriculum works:', err);
      });
    return () => controller.abort();
  }, []);

  // Filter search results as user types (debounced 150ms)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const needle = searchText.toLowerCase();
      const matches = allCurriculumWorks.filter(w =>
        w.name.toLowerCase().includes(needle) ||
        (w.chineseName && w.chineseName.includes(searchText))
      ).slice(0, 8);
      setSearchResults(matches);
    }, 150);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
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
        body: JSON.stringify({ child_id: childId, area: work.area, work_name: work.name }),
      });
      if (!res.ok) {
        toast.error(t('home.shelf.progressFailed'));
        return;
      }
      const data = await res.json();
      if (data.success) await fetchShelf();
    } catch (err) {
      console.error('Set focus work failed:', err);
      toast.error(t('common.networkError'));
    } finally {
      setSettingWork(false);
    }
  }, [childId, fetchShelf, t]);

  // Open guide for a work (teacher path)
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
      if (locale && locale !== 'en') url += `&locale=${locale}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('Guide fetch failed');
      const data = await res.json();
      if (!controller.signal.aborted) setGuideData(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load work guide:', err);
      setGuideData(null);
    }
    if (!controller.signal.aborted) setGuideLoading(false);
  }, [classroomId, locale]);

  // Tap a work — home hands off to Ivy's Step Card; teacher opens the detail panel.
  const handleWorkTap = useCallback((work: ShelfWork) => {
    if (onPresentWork) onPresentWork({ work_name: work.work_name, area: work.area });
    else {
      setDetailWork(work);
      setDetailStatus(work.status || 'not_started');
      setObservation('');
    }
  }, [onPresentWork]);

  const closeWorkDetail = useCallback(() => { setDetailWork(null); }, []);

  // Update progress status (teacher path)
  const updateProgress = useCallback(async (newStatus: string) => {
    if (!detailWork || savingProgress) return;
    const currentWork = detailWork;
    setSavingProgress(true);
    try {
      const res = await fetch('/api/montree/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: currentWork.work_name, area: currentWork.area, status: newStatus }),
      });
      if (res.ok) {
        setDetailStatus(newStatus);
        setShelf(prev => prev.map(w => w.work_name === currentWork.work_name ? { ...w, status: newStatus } : w));
        toast.success(t('home.shelf.progressUpdated'));
      } else {
        toast.error(t('home.shelf.progressFailed'));
      }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSavingProgress(false);
    }
  }, [detailWork, savingProgress, childId, t]);

  // Save observation (teacher path)
  const saveObservation = useCallback(async () => {
    if (!detailWork || !observation.trim() || savingObs) return;
    const currentWork = detailWork;
    setSavingObs(true);
    try {
      const res = await fetch('/api/montree/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, observation: observation.trim(), work_name: currentWork.work_name, area: currentWork.area }),
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
  }, [detailWork, observation, savingObs, childId, t]);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">🌿</div>
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
            style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}
          >
            {t('common.tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  // Per-area aggregates for the overview rings.
  const areaSummary = AREA_ORDER.map((area) => {
    const works = shelf.filter(w => w.area === area);
    const frac = works.length
      ? works.reduce((s, w) => s + (STATUS_FRAC[w.status] ?? 0), 0) / works.length
      : 0;
    return { area, count: works.length, frac };
  });
  const inProgress = shelf.filter(w => w.status === 'practicing' || w.status === 'presented').length;
  const mastered = shelf.filter(w => w.status === 'mastered').length;

  return (
    <div className={`flex-1 overflow-y-auto ${BIO.bg.gradient}`}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Header — warm journey framing */}
        <div className="pt-6 pb-1 text-center">
          <h2 className={`text-[22px] font-semibold ${BIO.text.primary} tracking-tight`}>
            {t('home.shelf.title')}
          </h2>
          <p className={`text-xs ${BIO.text.muted} mt-1`}>{t('home.shelf.tapToPresent')}</p>
        </div>

        {/* Tiny at-a-glance summary (numbers only — no copy to translate) */}
        {shelf.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-4 mt-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }}>
              {shelf.length} {shelf.length === 1 ? '·' : '·'} {t('home.shelf.title').toLowerCase().includes(' ') ? '' : ''}
              <span className="sr-only">works</span>
              <span aria-hidden> works</span>
            </span>
            {inProgress > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399' }}>
                ● {inProgress}
              </span>
            )}
            {mastered > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>
                ✦ {mastered}
              </span>
            )}
          </div>
        )}

        {/* Area overview — 5 rings (the journey map). Tap → reason, or ask Ivy. */}
        <div className="flex justify-between gap-1.5 mb-3">
          {areaSummary.map(({ area, count, frac }) => {
            const colors = AREA_COLORS[area];
            const active = expandedArea === area;
            const empty = count === 0;
            return (
              <button
                key={area}
                onClick={() => empty ? onAskGuide(t('home.shelf.suggestWork')) : setExpandedArea(prev => prev === area ? null : area)}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 transition-transform active:scale-95"
                aria-label={tk(`area.${area}`)}
                style={{ opacity: empty ? 0.4 : 1 }}
              >
                <Ring size={48} stroke={3} frac={empty ? 0 : Math.max(frac, 0.06)} color={colors.bg} track="rgba(255,255,255,0.07)">
                  <span className="text-lg" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
                    {BIO.areaIcon[area] || '📦'}
                  </span>
                </Ring>
                <span className="text-[9px] leading-tight text-center truncate w-full" style={{ color: active ? colors.bg : 'rgba(255,255,255,0.5)' }}>
                  {tk(`area.${area}`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Per-area Ivy reason (revealed by tapping an area ring) */}
        {expandedArea && (() => {
          const areaWork = shelf.find(s => s.area === expandedArea);
          const reason = areaWork?.guru_reason;
          const colors = AREA_COLORS[expandedArea] || AREA_COLORS.practical_life;
          return (
            <div
              className="rounded-2xl px-4 py-3 mb-3"
              style={{ background: `linear-gradient(135deg, ${colors.glow} 0%, rgba(255,255,255,0.02) 100%)`, border: `1px solid ${colors.border}` }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold" style={{ color: colors.bg }}>
                  🌿 {tk(`area.${expandedArea}`)}
                </span>
                <button onClick={() => setExpandedArea(null)} className="text-white/30 text-xs px-1" aria-label="Close">✕</button>
              </div>
              <p className="text-xs text-white/65 leading-relaxed">{reason || t('home.shelf.noReason')}</p>
            </div>
          );
        })()}

        {/* Search — add a work to the shelf */}
        <div ref={searchContainerRef} className="mb-4 relative">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
            <input
              ref={searchRef}
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder={t('home.shelf.searchPlaceholder')}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl text-base sm:text-sm outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(74,222,128,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,222,128,0.1)'; }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            {searchText && (
              <button onClick={() => { setSearchText(''); setSearchResults([]); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs" aria-label="Clear">✕</button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl overflow-hidden z-20"
              style={{ background: 'rgba(13,30,26,0.97)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(14px)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
              {searchResults.map(work => {
                const colors = AREA_COLORS[work.area] || AREA_COLORS.practical_life;
                return (
                  <button
                    key={`${work.area}-${work.name}`}
                    onClick={() => setFocusWork(work)}
                    disabled={settingWork}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-white/5 active:bg-white/10 disabled:opacity-50"
                  >
                    <span className="text-lg flex-shrink-0">{getWorkIcon(work.name, work.area)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/88 truncate">{locale === 'zh' && work.chineseName ? work.chineseName : work.name}</div>
                      <div className="text-[10px]" style={{ color: colors.bg, opacity: 0.8 }}>{tk(`area.${work.area}`)}</div>
                    </div>
                    <span className="text-[10px] text-[#4ADE80]/70 flex-shrink-0">+ {t('home.shelf.setWork')}</span>
                  </button>
                );
              })}
            </div>
          )}

          {searchText.trim() && searchResults.length === 0 && allCurriculumWorks.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl py-3 px-4 z-20"
              style={{ background: 'rgba(13,30,26,0.97)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <p className="text-xs text-white/40 text-center">{t('home.shelf.noResults')}</p>
            </div>
          )}
        </div>

        {/* Works — warm cards with status rings + a clear "How-to →" affordance */}
        {shelf.length === 0 ? (
          <div className="rounded-2xl px-6 py-10 text-center mb-8"
            style={{ background: BIO.glow.inner, border: '1px solid rgba(74,222,128,0.14)' }}>
            <div className="text-4xl mb-3">🌱</div>
            <p className={`text-sm ${BIO.text.secondary} mb-5 leading-relaxed`}>{t('home.shelf.emptyMessage')}</p>
            <button
              onClick={() => onAskGuide(t('home.shelf.suggestWork'))}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#4ADE80', color: '#0A1F1C', boxShadow: BIO.glow.soft }}
            >
              ✨ {t('home.shelf.askGuide')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-8">
            {shelf.map((work) => (
              <WorkCard key={work.work_name} work={work} locale={locale} t={t} onTap={() => handleWorkTap(work)} />
            ))}
            {/* Ask Ivy — the one elegant CTA, replaces rigid empty "+" slots */}
            <button
              onClick={() => onAskGuide(t('home.shelf.suggestWork'))}
              className="rounded-2xl flex flex-col items-center justify-center gap-2 py-7 px-3 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(74,222,128,0.04)', border: '1px dashed rgba(74,222,128,0.28)', minHeight: 150 }}
            >
              <span className="text-2xl">✨</span>
              <span className="text-xs font-medium text-[#4ADE80] text-center leading-tight">{t('home.shelf.askGuide')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Work Detail Panel — TEACHER path only (onPresentWork absent) */}
      {detailWork && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={closeWorkDetail}>
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-2xl overflow-y-auto"
            style={{ background: 'linear-gradient(180deg, #0D2B27 0%, #0A1F1C 100%)', border: '1px solid rgba(74,222,128,0.15)', maxHeight: '80vh' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl">{getWorkIcon(detailWork.work_name, detailWork.area)}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white/90 truncate">
                    {locale === 'zh' && detailWork.chineseName ? detailWork.chineseName : detailWork.work_name}
                  </h3>
                  <span className="text-xs" style={{ color: (AREA_COLORS[detailWork.area] || AREA_COLORS.practical_life).bg }}>
                    {tk(`area.${detailWork.area}`)}
                  </span>
                </div>
              </div>
              <button onClick={closeWorkDetail} className="text-white/40 text-lg p-1">✕</button>
            </div>

            <div className="px-5 pb-4">
              <p className="text-xs text-white/50 mb-2">{t('home.shelf.status')}</p>
              <div className="flex gap-2">
                {(['presented', 'practicing', 'mastered'] as const).map(s => {
                  const isActive = detailStatus === s;
                  const c = {
                    presented: { bg: 'rgba(245,176,66,0.15)', border: 'rgba(245,176,66,0.5)', text: '#F5B042' },
                    practicing: { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.5)', text: '#10B981' },
                    mastered: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.5)', text: '#4ADE80' },
                  }[s];
                  return (
                    <button
                      key={s}
                      onClick={() => updateProgress(s)}
                      disabled={savingProgress}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                      style={{ background: isActive ? c.bg : 'rgba(255,255,255,0.04)', border: `1.5px solid ${isActive ? c.border : 'rgba(255,255,255,0.08)'}`, color: isActive ? c.text : 'rgba(255,255,255,0.5)' }}
                    >
                      {tk(`home.shelf.${s}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-4">
              <p className="text-xs text-white/50 mb-2">{t('home.shelf.observationLabel')}</p>
              <textarea
                value={observation}
                onChange={e => setObservation(e.target.value)}
                placeholder={t('home.shelf.observationPlaceholder')}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white/90 placeholder-white/30 resize-none outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              {observation.trim() && (
                <button
                  onClick={saveObservation}
                  disabled={savingObs}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
                  style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}
                >
                  {savingObs ? t('common.saving') : t('home.shelf.saveObservation')}
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={() => { const name = detailWork.work_name; closeWorkDetail(); openWorkGuide(name); }}
                className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}
              >
                {t('home.shelf.viewPresentation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Guide + Full Details modals — teacher path */}
      <QuickGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        workName={guideWorkName}
        guideData={guideData}
        loading={guideLoading}
        onOpenFullDetails={() => { setGuideOpen(false); setFullDetailsOpen(true); }}
      />
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

// ─── A gentle progress ring (SVG arc over a soft track) ─────────────
function Ring({ size, stroke, frac, color, track, children }: {
  size: number; stroke: number; frac: number; color: string; track: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, frac));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {clamped > 0 && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─── A single work card ─────────────────────────────────────────────
function WorkCard({ work, locale, t, onTap }: {
  work: ShelfWork;
  locale: string;
  t: ReturnType<typeof useI18n>['t'];
  onTap: () => void;
}) {
  const tk = (key: string) => t(key as Parameters<typeof t>[0]);
  const colors = AREA_COLORS[work.area] || AREA_COLORS.practical_life;
  const status = work.status || 'not_started';
  const frac = STATUS_FRAC[status] ?? 0;
  const ringColor = STATUS_HEX[status] || STATUS_HEX.not_started;
  const isMastered = status === 'mastered';
  const name = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
  const showStatus = status !== 'not_started';

  return (
    <button
      onClick={onTap}
      aria-label={t('home.shelf.viewGuide').replace('{name}', work.work_name)}
      className="group rounded-2xl flex flex-col items-center text-center px-3 pt-4 pb-3 transition-all active:scale-[0.98]"
      style={{
        background: `linear-gradient(160deg, ${colors.glow} 0%, rgba(255,255,255,0.025) 55%, rgba(0,0,0,0.12) 100%)`,
        border: `1px solid ${isMastered ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isMastered ? '0 0 18px rgba(74,222,128,0.16)' : '0 4px 14px rgba(0,0,0,0.22)',
        minHeight: 150,
      }}
    >
      {/* Icon inside a status ring */}
      <div className="relative mb-2.5">
        <Ring size={58} stroke={3} frac={Math.max(frac, 0.04)} color={ringColor} track="rgba(255,255,255,0.08)">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: colors.glow }}>
            <span className="text-xl" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.35))' }}>
              {getWorkIcon(work.work_name, work.area)}
            </span>
          </div>
        </Ring>
        {isMastered && <span className="absolute -top-0.5 -right-0.5 text-sm">✦</span>}
      </div>

      {/* Work name */}
      <span
        className="text-[13px] font-medium text-white/90 leading-snug mb-1.5"
        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
      >
        {name}
      </span>

      {/* Status (when started) */}
      {showStatus && (
        <span className="text-[10px] font-medium mb-2" style={{ color: ringColor }}>
          {tk(`home.shelf.${status}`)}
        </span>
      )}

      {/* The unmistakable affordance */}
      <span
        className="mt-auto text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors"
        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80' }}
      >
        {t('home.shelf.howTo')} →
      </span>
    </button>
  );
}
