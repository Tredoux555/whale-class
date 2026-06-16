// components/montree/home/CornerView.tsx
//
// The Corner — the child's actual growing corner at home, NOT a classroom shelf.
// Ivy-led by design (iron rule #1: one thing at a time, never a menu):
//   • The spotlight: the ONE work Ivy has set for now, with her reason + how-to.
//   • On the corner now: the small real set of works that are physically out.
//     Each carries a quiet "has a home" cue — the put-it-back ritual lives in the
//     furniture, not a lecture.
//   • Prepare for next week: the make/buy-one-at-a-time rhythm → routes to Ivy.
//   • A quiet journey line: a record of order found, never a report card.
//   • A tucked "see the full library" escape hatch for the curious — nothing
//     pushes the parent to browse.
//
// Data comes entirely from /api/montree/shelf (the child's focus works + status +
// per-area reason). The spotlight is derived: the most-recently-set work that
// isn't mastered yet. Tapping any work hands off to Ivy's Step Card (onPresentWork).
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n } from '@/lib/montree/i18n/context';

interface CornerWork {
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
}

interface CornerViewProps {
  childId: string;
  childName?: string;
  classroomId?: string;
  onAskGuide: (message: string) => void;
  refreshTrigger?: number;
  // Tapping a work hands the parent Ivy's hand-held Step Card (home-only path).
  onPresentWork?: (work: { work_name: string; area: string }) => void;
}

const AREA_TINT: Record<string, { glow: string; bg: string }> = {
  practical_life: { glow: 'rgba(240,99,154,0.16)', bg: '#F0639A' },
  sensorial:      { glow: 'rgba(245,176,66,0.16)', bg: '#F5B042' },
  mathematics:    { glow: 'rgba(90,169,255,0.16)', bg: '#5AA9FF' },
  language:       { glow: 'rgba(74,222,128,0.16)', bg: '#4ADE80' },
  cultural:       { glow: 'rgba(167,139,250,0.16)', bg: '#A78BFA' },
};

// Status → a calm dot colour + label key. 'not_started' shows as "just introduced".
const STATUS_HEX: Record<string, string> = {
  not_started: 'rgba(255,255,255,0.4)',
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

export default function CornerView({ childId, childName, onAskGuide, refreshTrigger, onPresentWork }: CornerViewProps) {
  const { t, locale } = useI18n();
  const first = (childName || '').split(' ')[0];
  const possessive = first ? `${first}'s` : 'their';

  const [shelf, setShelf] = useState<CornerWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const shelfAbortRef = useRef<AbortController | null>(null);

  // Hidden "see all" escape hatch — collapsed by default, never pushed.
  const [browseOpen, setBrowseOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<CurriculumWork[]>([]);
  const [allCurriculumWorks, setAllCurriculumWorks] = useState<CurriculumWork[]>([]);
  const [settingWork, setSettingWork] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchShelf = useCallback(async () => {
    shelfAbortRef.current?.abort();
    const controller = new AbortController();
    shelfAbortRef.current = controller;
    try {
      const res = await fetch(`/api/montree/shelf?child_id=${childId}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Corner fetch failed');
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.success) {
        setShelf((data.shelf || []) as CornerWork[]);
        setFetchError(false);
      } else {
        // 200 with { success:false } — surface an error instead of freezing on stale state.
        setFetchError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFetchError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [childId]);

  useEffect(() => { fetchShelf(); }, [fetchShelf]);
  useEffect(() => { if (refreshTrigger && refreshTrigger > 0) fetchShelf(); }, [refreshTrigger, fetchShelf]);
  useEffect(() => () => { shelfAbortRef.current?.abort(); }, []);

  // Load curriculum once, lazily — only when the parent opens "see all".
  useEffect(() => {
    if (!browseOpen || allCurriculumWorks.length > 0) return;
    const controller = new AbortController();
    fetch('/api/montree/works/search?q=', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error('Curriculum search failed'); return r.json(); })
      .then(data => {
        if (controller.signal.aborted || !data.works) return;
        setAllCurriculumWorks(data.works.map((w: Record<string, unknown>) => ({
          name: w.name as string,
          chineseName: (w.chinese_name as string) || undefined,
          area: typeof w.area === 'object' && w.area !== null
            ? (w.area as Record<string, string>).area_key
            : (w.area as string),
        })));
      })
      .catch((err) => { if (!(err instanceof DOMException && err.name === 'AbortError')) console.error('Failed to load works:', err); });
    return () => controller.abort();
  }, [browseOpen, allCurriculumWorks.length]);

  useEffect(() => {
    if (!searchText.trim()) { setSearchResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const needle = searchText.toLowerCase();
      setSearchResults(allCurriculumWorks.filter(w =>
        w.name.toLowerCase().includes(needle) || (w.chineseName && w.chineseName.includes(searchText))
      ).slice(0, 8));
    }, 150);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchText, allCurriculumWorks]);

  const addWork = useCallback(async (work: CurriculumWork) => {
    setSettingWork(true);
    setSearchText('');
    setSearchResults([]);
    try {
      const res = await fetch('/api/montree/shelf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, area: work.area, work_name: work.name }),
      });
      if (!res.ok) { toast.error(t('home.shelf.progressFailed')); return; }
      const data = await res.json();
      if (data.success) { await fetchShelf(); setBrowseOpen(false); }
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setSettingWork(false);
    }
  }, [childId, fetchShelf, t]);

  const displayName = useCallback((w: { work_name: string; chineseName?: string | null }) =>
    (locale === 'zh' && w.chineseName) ? w.chineseName : w.work_name, [locale]);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">🌿</div>
          <p className={`text-sm ${BIO.text.secondary}`}>Setting up the corner…</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center px-6">
          <div className="text-4xl mb-3">😔</div>
          <p className={`text-sm ${BIO.text.secondary} mb-4`}>Could not load the corner. Please check your connection.</p>
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

  // ── Derive the spotlight + the corner set ──────────────────────────────
  // Identity is area+name (focus works are unique per area, not per name) so two
  // works can never collide on React keys or the spotlight comparator.
  const keyOf = (w: { area: string; work_name: string }) => `${w.area}::${w.work_name}`;
  const active = shelf.filter(w => w.status !== 'mastered');
  const mastered = shelf.filter(w => w.status === 'mastered');
  // Spotlight = the most-recently-set work that isn't mastered (what they're on now).
  const spotlight = active.length
    ? [...active].sort((a, b) => (b.set_at || '').localeCompare(a.set_at || ''))[0]
    : null;
  const spotKey = spotlight ? keyOf(spotlight) : null;
  // The corner, ordered: spotlight first, then the rest by recency.
  const cornerOrdered = [...shelf].sort((a, b) => {
    if (spotKey && keyOf(a) === spotKey) return -1;
    if (spotKey && keyOf(b) === spotKey) return 1;
    return (b.set_at || '').localeCompare(a.set_at || '');
  });

  const empty = shelf.length === 0;

  return (
    <div className={`flex-1 overflow-y-auto ${BIO.bg.gradient}`}>
      <div className="max-w-2xl mx-auto px-4 pb-10">

        {empty ? (
          // ── Nothing on the corner yet → invite Ivy to begin ──────────────
          <div className="pt-10">
            <div className="rounded-2xl px-6 py-10 text-center"
              style={{ background: BIO.glow.inner, border: '1px solid rgba(74,222,128,0.14)' }}>
              <div className="text-4xl mb-3">🌱</div>
              <p className={`text-base ${BIO.text.primary} font-medium mb-1`}>Let&apos;s start {possessive} corner</p>
              <p className={`text-sm ${BIO.text.secondary} mb-5 leading-relaxed`}>
                One small, beautiful work at a time. Ivy will choose where to begin.
              </p>
              <button
                onClick={() => onAskGuide(t('home.shelf.suggestWork'))}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#4ADE80', color: '#0A1F1C', boxShadow: BIO.glow.soft }}
              >
                ✨ Ask Ivy where to begin
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── The spotlight: the ONE thing for now ─────────────────────── */}
            {spotlight && (
              <div className="pt-6">
                <div className="rounded-2xl p-4" style={{ background: 'rgba(18,48,42,0.9)', border: '1px solid rgba(74,222,128,0.32)' }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[#4ADE80] text-sm">🌿</span>
                    <span className="text-[11px] tracking-wider uppercase text-[#4ADE80]">This week · from Ivy</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: (AREA_TINT[spotlight.area] || AREA_TINT.language).glow }}>
                      <span className="text-2xl" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))' }}>
                        {getWorkIcon(spotlight.work_name, spotlight.area)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-base font-medium text-white/95 leading-snug">{displayName(spotlight)}</div>
                      <div className="text-xs" style={{ color: (AREA_TINT[spotlight.area] || AREA_TINT.language).bg }}>
                        {t(`area.${spotlight.area}` as Parameters<typeof t>[0])}
                      </div>
                    </div>
                  </div>
                  {spotlight.guru_reason && (
                    <p className="text-[12.5px] text-white/68 leading-relaxed mb-3">{spotlight.guru_reason}</p>
                  )}
                  <button
                    onClick={() => onPresentWork?.({ work_name: spotlight.work_name, area: spotlight.area })}
                    className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5"
                    style={{ background: '#4ADE80', color: '#0A1F1C', boxShadow: BIO.glow.soft }}
                  >
                    Show me how to present it →
                  </button>
                </div>
              </div>
            )}

            {/* ── On the corner now: the small real set ────────────────────── */}
            <div className="flex items-center justify-between pt-6 pb-2 px-1">
              <span className="text-[13.5px] font-medium text-white/85">On {possessive} corner now</span>
              <span className="text-[11px] text-white/35">{cornerOrdered.length} {cornerOrdered.length === 1 ? 'work' : 'works'}</span>
            </div>

            <div className="flex flex-col gap-2">
              {cornerOrdered.map((work) => {
                const isSpot = !!spotKey && keyOf(work) === spotKey;
                const dot = STATUS_HEX[work.status] || STATUS_HEX.not_started;
                const statusLabel = work.status === 'not_started'
                  ? 'just introduced'
                  : t(`home.shelf.${work.status}` as Parameters<typeof t>[0]).toLowerCase();
                return (
                  <button
                    key={keyOf(work)}
                    onClick={() => onPresentWork?.({ work_name: work.work_name, area: work.area })}
                    className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.99]"
                    style={{ background: 'rgba(15,38,32,0.85)', border: `1px solid ${isSpot ? 'rgba(74,222,128,0.28)' : 'rgba(255,255,255,0.06)'}` }}
                  >
                    <span className="text-xl shrink-0">{getWorkIcon(work.work_name, work.area)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-white/90 truncate">{displayName(work)}</div>
                      <div className="text-[10.5px] flex items-center gap-1.5" style={{ color: dot }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                        {isSpot ? `${statusLabel} · this week` : statusLabel}
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-white/30 shrink-0">
                      <span aria-hidden>↩</span> has a home
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Prepare for next week — make/buy one at a time, via Ivy ───── */}
            <button
              onClick={() => onAskGuide(`What can we prepare or make for ${first || 'my child'} for next week?`)}
              className="w-full mt-3 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.99]"
              style={{ background: 'rgba(16,31,27,0.9)', border: '1px dashed rgba(245,176,66,0.3)' }}
            >
              <span className="text-lg shrink-0" style={{ color: '#F5B042' }}>🔨</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-white/82">Prepare for next week</div>
                <div className="text-[11px] text-white/40">Ask Ivy for a make-at-home you can set up</div>
              </div>
              <span className="text-white/30 text-base shrink-0">→</span>
            </button>

            {/* ── Quiet journey line — a record of order found ──────────────── */}
            <div className="text-center pt-4 pb-1">
              <span className="text-[11px] text-white/40">
                <span className="text-[#4ADE80]">✦</span>{' '}
                {mastered.length > 0
                  ? `${possessive} corner is finding its order — ${mastered.length} ${mastered.length === 1 ? 'work has' : 'works have'} become ${first ? `${first}'s` : 'their'} own`
                  : `${possessive} corner is just beginning to grow`}
              </span>
            </div>

            {/* ── Hidden 'see all' escape hatch — tucked, never pushed ──────── */}
            <div className="pt-5 text-center">
              {!browseOpen ? (
                <button onClick={() => setBrowseOpen(true)} className="text-[11px] text-white/30 underline underline-offset-2">
                  see the full library
                </button>
              ) : (
                <div className="text-left mt-1 rounded-2xl p-3" style={{ background: 'rgba(13,30,26,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-white/45">Add a work yourself</span>
                    <button onClick={() => { setBrowseOpen(false); setSearchText(''); setSearchResults([]); }} className="text-white/30 text-xs">✕</button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
                    <input
                      type="text"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder={t('home.shelf.searchPlaceholder')}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-base sm:text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)' }}
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {searchResults.map(work => (
                        <button
                          key={`${work.area}-${work.name}`}
                          onClick={() => addWork(work)}
                          disabled={settingWork}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-xl transition-colors hover:bg-white/5 disabled:opacity-50"
                        >
                          <span className="text-lg shrink-0">{getWorkIcon(work.name, work.area)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-white/88 truncate">{(locale === 'zh' && work.chineseName) ? work.chineseName : work.name}</div>
                            <div className="text-[10px]" style={{ color: (AREA_TINT[work.area] || AREA_TINT.language).bg, opacity: 0.8 }}>
                              {t(`area.${work.area}` as Parameters<typeof t>[0])}
                            </div>
                          </div>
                          <span className="text-[10px] text-[#4ADE80]/70 shrink-0">+ {t('home.shelf.setWork')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchText.trim() && searchResults.length === 0 && allCurriculumWorks.length > 0 && (
                    <p className="text-[11px] text-white/35 text-center mt-2">{t('home.shelf.noResults')}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
