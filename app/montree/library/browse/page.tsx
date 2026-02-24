// @ts-nocheck
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AREA_CONFIG = {
  practical_life: { name: 'Practical Life', icon: 'P', color: '#ec4899' },
  sensorial: { name: 'Sensorial', icon: 'S', color: '#8b5cf6' },
  mathematics: { name: 'Math', icon: 'M', color: '#3b82f6' },
  language: { name: 'Language', icon: 'L', color: '#22c55e' },
  cultural: { name: 'Cultural', icon: 'C', color: '#f97316' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

function getPhotoUrl(photo: any) {
  if (!photo?.storage_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.storage_path}`;
}

export default function LibraryBrowsePage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWork, setExpandedWork] = useState(null);
  const [collapsedAreas, setCollapsedAreas] = useState({});

  // Search with autofill
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

  // Group works by area
  const byArea = useMemo(() => {
    const grouped = {};
    AREA_ORDER.forEach(a => { grouped[a] = []; });
    works.forEach(w => {
      if (grouped[w.area]) grouped[w.area].push(w);
    });
    return grouped;
  }, [works]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return works
      .filter(w => w.title?.toLowerCase().includes(q) || w.description?.toLowerCase().includes(q) || w.category?.toLowerCase().includes(q))
      .slice(0, 8)
      .map(w => ({ ...w, cfg: AREA_CONFIG[w.area] || AREA_CONFIG.practical_life }));
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
    // Uncollapse the area if needed
    setCollapsedAreas(prev => ({ ...prev, [work.area]: false }));
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

  const toggleArea = (areaKey) => {
    setCollapsedAreas(prev => ({ ...prev, [areaKey]: !prev[areaKey] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/30 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">← Library</Link>
              <h1 className="text-xl font-bold mt-0.5">Browse Works</h1>
            </div>
            <Link
              href="/montree/library/upload"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              + Share
            </Link>
          </div>

          {/* Search with autofill */}
          <div ref={searchRef} className="relative mt-3">
            <div className="flex items-center bg-white/10 border border-white/20 rounded-lg px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-emerald-400 transition-all">
              <span className="text-white/50 text-sm">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); setSearchFocusIdx(-1); }}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search works..."
                className="bg-transparent outline-none text-sm text-white placeholder-white/40 flex-1"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} className="text-white/40 hover:text-white text-xs">✕</button>
              )}
            </div>

            {/* Autofill dropdown */}
            {searchOpen && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 text-center">No works found</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    {searchResults.map((r, i) => (
                      <button
                        key={r.id}
                        onClick={() => selectSearchResult(r)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${i === searchFocusIdx ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                      >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: r.cfg.color }}>
                          {r.cfg.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 truncate">{r.title}</div>
                          {r.category && <div className="text-xs text-gray-400 truncate">{r.category}</div>}
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{r.cfg.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading works...</div>
        ) : works.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No works in the library yet.</p>
            <Link href="/montree/library/upload" className="inline-block mt-3 px-5 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">+ Share a Work</Link>
          </div>
        ) : (
          /* Flat list — all areas, each with a header then works */
          AREA_ORDER.map((areaKey) => {
            const cfg = AREA_CONFIG[areaKey];
            const areaWorks = byArea[areaKey] || [];
            if (areaWorks.length === 0) return null;
            const isCollapsed = !!collapsedAreas[areaKey];

            return (
              <div key={areaKey} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Area header — tap to collapse/expand */}
                <button
                  onClick={() => toggleArea(areaKey)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  >
                    {cfg.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <p className="font-bold text-gray-800">{cfg.name}</p>
                    <p className="text-xs text-gray-400">{areaWorks.length} works</p>
                  </div>
                  <span className={`text-gray-400 text-sm transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
                </button>

                {/* Works list */}
                {!isCollapsed && (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {areaWorks.map((work) => {
                      const isExpanded = expandedWork === work.id;
                      const coverPhoto = work.photos?.[work.cover_photo_index || 0];
                      const photoUrl = getPhotoUrl(coverPhoto);

                      return (
                        <div key={work.id} data-work-id={work.id}>
                          {/* Work row */}
                          <button
                            onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            {/* Color bar */}
                            <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color, opacity: 0.4 }} />

                            {/* Thumbnail or placeholder */}
                            {photoUrl ? (
                              <img src={photoUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '12' }}>
                                <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.icon}</span>
                              </div>
                            )}

                            {/* Title + category */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm truncate">{work.title}</p>
                              {work.category && <p className="text-xs text-gray-400 truncate">{work.category}</p>}
                            </div>

                            {/* Photo count */}
                            {work.photos?.length > 0 && (
                              <span className="text-xs text-gray-300 flex-shrink-0">📷 {work.photos.length}</span>
                            )}

                            <span className={`text-gray-300 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                          </button>

                          {/* Expanded */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 bg-gray-50/50 space-y-3 ml-5 border-l-2" style={{ borderColor: cfg.color + '30' }}>
                              {work.description && (
                                <p className="text-sm text-gray-600 leading-relaxed">{work.description}</p>
                              )}

                              {/* Photos */}
                              {work.photos?.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                  {work.photos.map((photo, i) => {
                                    const url = getPhotoUrl(photo);
                                    if (!url) return null;
                                    return (
                                      <img key={i} src={url} alt={photo.caption || ''} className="h-24 w-auto rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                                    );
                                  })}
                                </div>
                              )}

                              {/* Materials */}
                              {work.materials?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">Materials</p>
                                  <div className="flex flex-wrap gap-1">
                                    {work.materials.map((m, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600">{m}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Aims */}
                              {work.direct_aims?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 mb-1">What children learn</p>
                                  <ul className="text-xs text-gray-600 space-y-0.5">
                                    {work.direct_aims.map((a, i) => <li key={i}>• {a}</li>)}
                                  </ul>
                                </div>
                              )}

                              {/* Contributor */}
                              {work.contributor_name && (
                                <p className="text-xs text-gray-400">
                                  Shared by {work.contributor_name}{work.contributor_country ? ` · ${work.contributor_country}` : ''}
                                </p>
                              )}

                              <Link
                                href={`/montree/library/${work.id}`}
                                className="inline-block py-2 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                              >
                                Full Details →
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
