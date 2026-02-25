// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AREA_CONFIG = {
  practical_life: { name: 'Practical Life', short: 'Practical', icon: 'P', color: '#ec4899', gradient: 'from-pink-500 to-rose-400', bgLight: '#fdf2f8', bgSubtle: '#fce7f3' },
  sensorial: { name: 'Sensorial', short: 'Sensorial', icon: 'S', color: '#8b5cf6', gradient: 'from-violet-500 to-purple-400', bgLight: '#f5f3ff', bgSubtle: '#ede9fe' },
  mathematics: { name: 'Mathematics', short: 'Math', icon: 'M', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-400', bgLight: '#eff6ff', bgSubtle: '#dbeafe' },
  language: { name: 'Language', short: 'Language', icon: 'L', color: '#22c55e', gradient: 'from-emerald-500 to-green-400', bgLight: '#f0fdf4', bgSubtle: '#dcfce7' },
  cultural: { name: 'Cultural', short: 'Cultural', icon: 'C', color: '#f97316', gradient: 'from-orange-500 to-amber-400', bgLight: '#fff7ed', bgSubtle: '#ffedd5' },
  miscellaneous: { name: 'Miscellaneous', short: 'Misc', icon: '✦', color: '#64748b', gradient: 'from-slate-500 to-gray-400', bgLight: '#f8fafc', bgSubtle: '#f1f5f9' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural', 'miscellaneous'];

function getPhotoUrl(photo: any) {
  if (!photo?.storage_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.storage_path}`;
}

export default function LibraryBrowsePage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWork, setExpandedWork] = useState(null);
  const [activeTab, setActiveTab] = useState('practical_life');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocusIdx, setSearchFocusIdx] = useState(-1);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/community/works?limit=500&sort=curriculum`);
      const data = await res.json();
      setWorks(data.works || []);
    } catch (err) {
      console.error('Failed to fetch works:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchWorks(); }, [fetchWorks]);

  // Group works by area (unknown areas go to miscellaneous)
  const byArea = useMemo(() => {
    const grouped = {};
    AREA_ORDER.forEach(a => { grouped[a] = []; });
    works.forEach(w => {
      const area = AREA_CONFIG[w.area] ? w.area : 'miscellaneous';
      grouped[area].push(w);
    });
    return grouped;
  }, [works]);

  // Area counts for tab badges
  const areaCounts = useMemo(() => {
    const counts = {};
    AREA_ORDER.forEach(a => { counts[a] = (byArea[a] || []).length; });
    return counts;
  }, [byArea]);

  // Filtered works for current tab
  const currentWorks = useMemo(() => {
    const areaWorks = byArea[activeTab] || [];
    if (!searchQuery.trim()) return areaWorks;
    const q = searchQuery.toLowerCase();
    return areaWorks.filter(w =>
      w.title?.toLowerCase().includes(q) ||
      w.description?.toLowerCase().includes(q) ||
      w.category?.toLowerCase().includes(q) ||
      w.materials?.some(m => m.toLowerCase().includes(q))
    );
  }, [byArea, activeTab, searchQuery]);

  // Search results across all areas (for autofill dropdown)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return works
      .filter(w => w.title?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q) || w.category?.toLowerCase().includes(q))
      .slice(0, 8)
      .map(w => ({ ...w, cfg: AREA_CONFIG[w.area] || AREA_CONFIG.miscellaneous }));
  }, [searchQuery, works]);

  // Close search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSearchResult = (work) => {
    const area = AREA_CONFIG[work.area] ? work.area : 'miscellaneous';
    setActiveTab(area);
    setExpandedWork(work.id);
    setSearchQuery('');
    setSearchOpen(false);
    setTimeout(() => {
      const el = document.querySelector(`[data-work-id="${work.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') { setSearchOpen(false); inputRef.current?.blur(); return; }
    if (!searchOpen || searchResults.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchFocusIdx(i => (i + 1) % searchResults.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSearchFocusIdx(i => (i <= 0 ? searchResults.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && searchFocusIdx >= 0) { e.preventDefault(); selectSearchResult(searchResults[searchFocusIdx]); }
  };

  const cfg = AREA_CONFIG[activeTab];

  // Group current works by category
  const byCategory = useMemo(() => {
    const grouped = {};
    currentWorks.forEach(w => {
      const cat = w.category || 'Uncategorised';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(w);
    });
    return grouped;
  }, [currentWorks]);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── Header ─── */}
      <header className="bg-[#0D3330]">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Link href="/montree/library" className="text-emerald-400/60 text-xs hover:text-emerald-300 transition-colors">← Library</Link>
              <h1 className="text-lg font-bold text-white mt-0.5">Browse Works</h1>
            </div>
            <Link
              href="/montree/library/upload"
              className="bg-emerald-500/90 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            >
              + Share a Work
            </Link>
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative">
            <div className="flex items-center bg-white/[0.08] border border-white/[0.1] rounded-xl px-3 py-2 gap-2 focus-within:bg-white/[0.12] focus-within:border-white/[0.2] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 flex-shrink-0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); setSearchFocusIdx(-1); }}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search across all areas..."
                className="bg-transparent outline-none text-sm text-white placeholder-white/30 flex-1"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-white/30 hover:text-white/60 text-xs">✕</button>
              )}
            </div>

            {/* Autofill dropdown */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No works found</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => selectSearchResult(r)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${i === searchFocusIdx ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                      >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: r.cfg.color }}>
                          {r.cfg.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{r.title}</div>
                          {r.category && <div className="text-[11px] text-gray-400 truncate">{r.category}</div>}
                        </div>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: r.cfg.bgSubtle, color: r.cfg.color }}>{r.cfg.short}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Area Tabs (scrollable) ─── */}
        <div className="border-t border-white/[0.06]">
          <div className="max-w-3xl mx-auto px-2">
            <div className="flex overflow-x-auto no-scrollbar -mb-px">
              {AREA_ORDER.map((areaKey) => {
                const tabCfg = AREA_CONFIG[areaKey];
                const isActive = activeTab === areaKey;
                const count = areaCounts[areaKey] || 0;
                return (
                  <button
                    key={areaKey}
                    onClick={() => { setActiveTab(areaKey); setExpandedWork(null); }}
                    className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      isActive
                        ? 'text-white'
                        : 'text-white/35 hover:text-white/60'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                        isActive ? 'text-white shadow-sm' : 'text-white/60'
                      }`}
                      style={{
                        backgroundColor: isActive ? tabCfg.color : 'transparent',
                        border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {tabCfg.icon}
                    </span>
                    <span>{tabCfg.short}</span>
                    {count > 0 && (
                      <span className={`text-[10px] tabular-nums ${isActive ? 'text-white/70' : 'text-white/25'}`}>
                        {count}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ backgroundColor: tabCfg.color }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-20">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-emerald-500 animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Loading works...</p>
          </div>
        ) : currentWorks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: cfg.bgSubtle }}>
              <span className="text-2xl" style={{ color: cfg.color }}>{cfg.icon === '✦' ? '✦' : cfg.icon}</span>
            </div>
            {searchQuery ? (
              <>
                <p className="text-gray-500 font-medium">No results in {cfg.name}</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term or check other areas</p>
              </>
            ) : activeTab === 'miscellaneous' ? (
              <>
                <p className="text-gray-500 font-medium">Nothing here yet</p>
                <p className="text-gray-400 text-sm mt-1 max-w-xs mx-auto">This is a catch-all for uploads that don&apos;t fit the 5 Montessori areas. Share anything!</p>
                <Link href="/montree/library/upload" className="inline-block mt-4 px-5 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                  + Upload Something
                </Link>
              </>
            ) : (
              <>
                <p className="text-gray-500 font-medium">No {cfg.name} works yet</p>
                <p className="text-gray-400 text-sm mt-1">Be the first to share one!</p>
                <Link href="/montree/library/upload" className="inline-block mt-4 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors" style={{ backgroundColor: cfg.color }}>
                  + Share a {cfg.short} Work
                </Link>
              </>
            )}
          </div>
        ) : (
          /* ─── Works grouped by category ─── */
          <div className="space-y-6">
            {/* Area header with stats */}
            <div className="flex items-center gap-3 pt-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}dd)` }}
              >
                {cfg.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{cfg.name}</h2>
                <p className="text-xs text-gray-400">
                  {currentWorks.length} work{currentWorks.length !== 1 ? 's' : ''}
                  {searchQuery && ` matching "${searchQuery}"`}
                  {' · '}{Object.keys(byCategory).length} categor{Object.keys(byCategory).length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
            </div>

            {/* Category groups */}
            {Object.entries(byCategory).map(([category, catWorks]) => (
              <div key={category}>
                {/* Category label */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-4 rounded-full" style={{ backgroundColor: cfg.color, opacity: 0.5 }} />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{category}</h3>
                  <span className="text-[10px] text-gray-300">{catWorks.length}</span>
                </div>

                {/* Work cards */}
                <div className="space-y-2">
                  {catWorks.map((work) => {
                    const isExpanded = expandedWork === work.id;
                    const coverPhoto = work.photos?.[work.cover_photo_index || 0];
                    const photoUrl = getPhotoUrl(coverPhoto);

                    return (
                      <div
                        key={work.id}
                        data-work-id={work.id}
                        className={`bg-white rounded-xl border transition-all duration-200 ${
                          isExpanded
                            ? 'shadow-md border-gray-200 ring-1'
                            : 'shadow-sm border-gray-100 hover:shadow hover:border-gray-200'
                        }`}
                        style={isExpanded ? { ringColor: cfg.color + '30' } : undefined}
                      >
                        {/* Work row */}
                        <button
                          onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                          className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                        >
                          {/* Thumbnail */}
                          {photoUrl ? (
                            <img src={photoUrl} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-gray-100" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.bgSubtle }}>
                              <span className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.icon}</span>
                            </div>
                          )}

                          {/* Title + meta */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{work.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {work.age_range && (
                                <span className="text-[10px] text-gray-400">Ages {work.age_range}</span>
                              )}
                              {work.photos?.length > 0 && (
                                <span className="text-[10px] text-gray-300">📷 {work.photos.length}</span>
                              )}
                              {work.ai_guide && (
                                <span className="text-[10px] text-emerald-400">✨ Guide</span>
                              )}
                            </div>
                          </div>

                          {/* Expand chevron */}
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className={`text-gray-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-3.5 pb-4 pt-0 space-y-3">
                            <div className="h-px" style={{ backgroundColor: cfg.color + '15' }} />

                            {work.description && (
                              <p className="text-sm text-gray-600 leading-relaxed">{work.description}</p>
                            )}

                            {/* Photos */}
                            {work.photos?.length > 0 && (
                              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                                {work.photos.map((photo, i) => {
                                  const url = getPhotoUrl(photo);
                                  if (!url) return null;
                                  return (
                                    <img key={i} src={url} alt={photo.caption || ''} className="h-28 w-auto rounded-xl object-cover flex-shrink-0 border border-gray-100" />
                                  );
                                })}
                              </div>
                            )}

                            {/* Materials chips */}
                            {work.materials?.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Materials</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {work.materials.map((m, i) => (
                                    <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium border" style={{ backgroundColor: cfg.bgLight, borderColor: cfg.color + '20', color: cfg.color }}>
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Aims */}
                            {work.direct_aims?.length > 0 && (
                              <div>
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">What children learn</p>
                                <div className="space-y-1">
                                  {work.direct_aims.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                      <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                                      <span className="text-sm text-gray-600">{a}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contributor + CTA */}
                            <div className="flex items-center justify-between pt-1">
                              {work.contributor_name && (
                                <p className="text-xs text-gray-400">
                                  Shared by <span className="text-gray-500">{work.contributor_name}</span>
                                  {work.contributor_country ? ` · ${work.contributor_country}` : ''}
                                </p>
                              )}
                              <Link
                                href={`/montree/library/${work.id}`}
                                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                                style={{ backgroundColor: cfg.color }}
                              >
                                Full Details
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Hide scrollbar for tabs */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
