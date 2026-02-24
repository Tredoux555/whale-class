// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AREA_CONFIG = {
  practical_life: { name: 'Practical Life', icon: 'P', color: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  sensorial: { name: 'Sensorial', icon: 'S', color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  mathematics: { name: 'Math', icon: 'M', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  language: { name: 'Language', icon: 'L', color: '#22c55e', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cultural: { name: 'Cultural', icon: 'C', color: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

const AGE_LABELS = {
  all: 'All Ages',
  primary_year1: 'Year 1 (2.5-4)',
  primary_year2: 'Year 2 (4-5)',
  primary_year3: 'Year 3 (5-6)',
};

function getPhotoUrl(photo: any) {
  if (!photo?.storage_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.storage_path}`;
}

export default function LibraryBrowsePage() {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [area, setArea] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [age, setAge] = useState('all');
  const [sort, setSort] = useState('curriculum');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Inject modal state
  const [injectWork, setInjectWork] = useState(null);
  const [teacherCode, setTeacherCode] = useState('');
  const [injecting, setInjecting] = useState(false);
  const [injectResult, setInjectResult] = useState(null);

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), sort });
      if (area !== 'all') params.set('area', area);
      if (search) params.set('search', search);
      if (age !== 'all') params.set('age', age);

      const res = await fetch(`/api/montree/community/works?${params}`);
      const data = await res.json();
      setWorks(data.works || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error('Failed to fetch works:', err);
    }
    setLoading(false);
  }, [area, search, age, sort, page]);

  useEffect(() => { fetchWorks(); }, [fetchWorks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleInject = async () => {
    if (!injectWork || !teacherCode.trim()) return;
    setInjecting(true);
    setInjectResult(null);
    try {
      const res = await fetch(`/api/montree/community/works/${injectWork.id}/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_code: teacherCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInjectResult({ success: true, message: data.message });
      } else {
        setInjectResult({ success: false, message: data.error });
      }
    } catch {
      setInjectResult({ success: false, message: 'Something went wrong. Try again.' });
    }
    setInjecting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">
                ← Back to Library
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">
                Browse Works
              </h1>
              <p className="text-emerald-200 mt-1">
                By teachers, for teachers. Browse, share, and add to your classroom.
              </p>
            </div>
            <Link
              href="/montree/library/upload"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              + Share a Work
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search works by name, description, or materials..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button type="submit" className="px-6 py-2 bg-emerald-500 rounded-lg font-medium hover:bg-emerald-600 transition-colors">
              Search
            </button>
          </form>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Area tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => { setArea('all'); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              area === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Areas ({total})
          </button>
          {AREA_ORDER.map((key) => {
            const cfg = AREA_CONFIG[key];
            return (
              <button
                key={key}
                onClick={() => { setArea(key); setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  area === key ? 'text-white' : `${cfg.bg} ${cfg.text} border ${cfg.border} hover:opacity-80`
                }`}
                style={area === key ? { backgroundColor: cfg.color } : {}}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: cfg.color }}
                >
                  {cfg.icon}
                </span>
                {cfg.name}
              </button>
            );
          })}
        </div>

        {/* Sort + Age filter row */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
          >
            <option value="curriculum">Curriculum Order</option>
            <option value="newest">Newest First</option>
            <option value="downloads">Most Downloaded</option>
            <option value="injected">Most Added to Classrooms</option>
            <option value="oldest">Oldest First</option>
          </select>

          <select
            value={age}
            onChange={(e) => { setAge(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-white"
          >
            {Object.entries(AGE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {search && (
            <button
              onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-600 hover:bg-gray-200"
            >
              Clear search: &quot;{search}&quot; ×
            </button>
          )}
        </div>
      </div>

      {/* Works Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading works...</div>
        ) : works.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No works found</p>
            <p className="text-gray-400 mt-2">
              {search ? 'Try a different search term' : 'Be the first to share a work!'}
            </p>
            <Link
              href="/montree/library/upload"
              className="inline-block mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              + Share a Work
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {works.map((work) => {
                const cfg = AREA_CONFIG[work.area] || AREA_CONFIG.practical_life;
                const coverPhoto = work.photos?.[work.cover_photo_index || 0];
                const photoUrl = getPhotoUrl(coverPhoto);

                return (
                  <div
                    key={work.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Photo or placeholder */}
                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={work.title} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ backgroundColor: cfg.color + '15' }}
                        >
                          <span
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                            style={{ backgroundColor: cfg.color }}
                          >
                            {cfg.icon}
                          </span>
                        </div>
                      )}
                      {/* Area badge */}
                      <span
                        className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-white text-xs font-bold"
                        style={{ backgroundColor: cfg.color }}
                      >
                        {cfg.name}
                      </span>
                      {/* Photo count */}
                      {work.photos?.length > 1 && (
                        <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                          {work.photos.length} photos
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 text-lg leading-tight">{work.title}</h3>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{work.description}</p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                        <span>{AGE_LABELS[work.age_range] || 'All Ages'}</span>
                        {work.contributor_country && <span>{work.contributor_country}</span>}
                        <span className="ml-auto">{work.download_count || 0} downloads</span>
                      </div>

                      {/* Materials preview */}
                      {work.materials?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {work.materials.slice(0, 3).map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                              {m}
                            </span>
                          ))}
                          {work.materials.length > 3 && (
                            <span className="px-2 py-0.5 text-xs text-gray-400">+{work.materials.length - 3} more</span>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mt-4">
                        <Link
                          href={`/montree/library/${work.id}`}
                          className="flex-1 text-center py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => { setInjectWork(work); setTeacherCode(''); setInjectResult(null); }}
                          className="flex-1 py-2 text-white rounded-lg text-sm font-medium transition-colors"
                          style={{ backgroundColor: '#0D3330' }}
                        >
                          Send to Classroom
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inject Modal */}
      {injectWork && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setInjectWork(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            {injectResult?.success ? (
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-gray-900">{injectResult.message}</h3>
                <p className="text-gray-500 mt-2">The work is now in your classroom curriculum.</p>
                <button
                  onClick={() => setInjectWork(null)}
                  className="mt-6 w-full py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900">Send to My Classroom</h3>
                <p className="text-gray-500 mt-1">
                  Enter your Montree teacher code to add <strong>&quot;{injectWork.title}&quot;</strong> directly to your curriculum.
                </p>

                <input
                  type="text"
                  value={teacherCode}
                  onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  maxLength={10}
                  className="w-full mt-4 px-4 py-3 text-center text-2xl tracking-widest font-mono border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  autoFocus
                />

                {injectResult && !injectResult.success && (
                  <p className="text-red-500 text-sm mt-2 text-center">{injectResult.message}</p>
                )}

                <button
                  onClick={handleInject}
                  disabled={injecting || teacherCode.length < 4}
                  className="w-full mt-4 py-3 bg-[#0D3330] text-white rounded-xl font-medium disabled:opacity-50 hover:bg-[#164440] transition-colors"
                >
                  {injecting ? 'Adding...' : 'Add to My Curriculum'}
                </button>

                <p className="text-center text-xs text-gray-400 mt-3">
                  Don&apos;t have Montree? <Link href="/montree/try" className="text-emerald-600 underline">Try free</Link>
                </p>

                <button
                  onClick={() => setInjectWork(null)}
                  className="w-full mt-2 py-2 text-gray-500 text-sm hover:text-gray-700"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
