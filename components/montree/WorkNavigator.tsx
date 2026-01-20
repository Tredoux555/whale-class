// components/montree/WorkNavigator.tsx
// Full work browser - search all 316 curriculum works, update progress with swipe navigation
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  category_name?: string;
  sequence: number;
  area?: {
    area_key: string;
    name: string;
    color?: string;
    icon?: string;
  };
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered';
}

interface WorkNavigatorProps {
  classroomId?: string | null;
  childId: string;
  childName?: string;
  onProgressUpdated?: () => void;
}

const AREAS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'practical_life', label: 'Practical', icon: '🧹' },
  { key: 'sensorial', label: 'Sensorial', icon: '👁️' },
  { key: 'math', label: 'Math', icon: '🔢' },
  { key: 'language', label: 'Language', icon: '📖' },
  { key: 'cultural', label: 'Cultural', icon: '🌍' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string; level: number }> = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', bg: 'bg-gray-50 border-gray-200', next: 'presented', level: 0 },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', bg: 'bg-amber-50 border-amber-200', next: 'practicing', level: 1 },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', bg: 'bg-blue-50 border-blue-200', next: 'mastered', level: 2 },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', bg: 'bg-green-50 border-green-200', next: 'not_started', level: 3 },
};

const STATUS_NAMES: Record<string, string> = {
  not_started: 'Not Started',
  presented: 'Presented',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

export default function WorkNavigator({
  classroomId,
  childId,
  childName,
  onProgressUpdated,
}: WorkNavigatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [tappedStatus, setTappedStatus] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedWorkRef = useRef<HTMLButtonElement>(null);

  // Focus search when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll selected work into view
  useEffect(() => {
    if (selectedWork && selectedWorkRef.current) {
      selectedWorkRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedWork?.id]);

  // Fetch all works
  const fetchWorks = useCallback(async () => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    
    try {
      // Build URL - classroom_id optional, API auto-detects
      const params = new URLSearchParams();
      params.set('child_id', childId);
      params.set('limit', '400');
      if (classroomId) params.set('classroom_id', classroomId);
      if (selectedArea !== 'all') params.set('area', selectedArea);

      const url = `/api/montree/works/search?${params.toString()}`;
      console.log('WorkNavigator fetching:', url);

      const res = await fetch(url);
      const data = await res.json();

      console.log('WorkNavigator response:', {
        ok: res.ok,
        status: res.status,
        worksCount: data.works?.length,
        error: data.error,
        debug: data.debug,
      });

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (data.works && data.works.length > 0) {
        setAllWorks(data.works);
        setError(null);
      } else {
        setAllWorks([]);
        const debugInfo = data.debug ? `\n\nDebug: ${data.debug.join(', ')}` : '';
        setError(`No works found.${debugInfo}`);
      }

      setSelectedWork(null);
    } catch (err) {
      console.error('WorkNavigator fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
      setAllWorks([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId, childId, selectedArea, isOpen]);

  // Fetch when panel opens or area changes
  useEffect(() => {
    if (isOpen) {
      fetchWorks();
    }
  }, [isOpen, selectedArea, fetchWorks]);

  // Filter by search (client-side for instant results)
  const filteredWorks = searchQuery.trim()
    ? allWorks.filter(work =>
        work.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (work.name_chinese && work.name_chinese.includes(searchQuery)) ||
        (work.category_name && work.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allWorks;

  // Current index in filtered list
  const currentIndex = selectedWork
    ? filteredWorks.findIndex(w => w.id === selectedWork.id)
    : -1;

  // Clear selection when filtered out
  useEffect(() => {
    if (selectedWork && currentIndex < 0) {
      setSelectedWork(null);
    }
  }, [searchQuery, currentIndex, selectedWork]);

  // Navigate works
  const navigateWork = (direction: 'prev' | 'next') => {
    if (filteredWorks.length === 0) return;
    
    let newIndex: number;
    if (currentIndex < 0) {
      // Nothing selected, select first/last
      newIndex = direction === 'next' ? 0 : filteredWorks.length - 1;
    } else {
      newIndex = direction === 'next'
        ? Math.min(currentIndex + 1, filteredWorks.length - 1)
        : Math.max(currentIndex - 1, 0);
    }

    if (filteredWorks[newIndex]) {
      setSelectedWork(filteredWorks[newIndex]);
    }
  };

  // Update progress
  const updateProgress = async (newStatus: string) => {
    if (!selectedWork || updatingStatus) return;

    setTappedStatus(newStatus);
    setUpdatingStatus(true);

    try {
      const config = STATUS_CONFIG[newStatus];
      const apiStatus = newStatus === 'mastered' ? 'completed'
                      : newStatus === 'not_started' ? 'not_started'
                      : 'in_progress';

      const res = await fetch(`/api/montree/progress/${childId}/${selectedWork.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: newStatus === 'not_started' ? 'reset' : 'update',
          status: apiStatus,
          currentLevel: config.level,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      const updatedWork = { ...selectedWork, status: newStatus as any };
      setSelectedWork(updatedWork);
      setAllWorks(prev => prev.map(w => w.id === selectedWork.id ? updatedWork : w));

      toast.success(`${selectedWork.name} → ${STATUS_NAMES[newStatus]}`);
      onProgressUpdated?.();
    } catch (err) {
      console.error('Progress update error:', err);
      toast.error('Failed to update');
    } finally {
      setUpdatingStatus(false);
      setTappedStatus(null);
    }
  };

  // Cycle to next status
  const cycleStatus = () => {
    if (!selectedWork) return;
    const current = selectedWork.status || 'not_started';
    updateProgress(STATUS_CONFIG[current].next);
  };

  // Handle swipe gestures
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      navigateWork(diff > 0 ? 'next' : 'prev');
    }
  };

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all w-full justify-center ${
          isOpen
            ? 'bg-emerald-600 text-white shadow-lg'
            : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm'
        }`}
      >
        <span className="text-xl">{isOpen ? '✕' : '🔍'}</span>
        <span className="font-semibold">{isOpen ? 'Close' : 'Find Work'}</span>
        {!isOpen && <span className="text-sm text-emerald-500 ml-1">Browse all works</span>}
      </button>

      {/* Work Browser Panel */}
      {isOpen && (
        <div className="mt-3 bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Search + Area Filters */}
          <div className="bg-gray-50 border-b p-3">
            <div className="relative mb-3">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search works..."
                className="w-full px-4 py-3 pl-10 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {AREAS.map((area) => (
                <button
                  key={area.key}
                  onClick={() => setSelectedArea(area.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    selectedArea === area.key
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <span>{area.icon}</span>
                  <span>{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Work Detail - Swipeable */}
          {selectedWork && (
            <div
              className="border-b bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Header with nav */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateWork('prev')}
                  disabled={currentIndex <= 0}
                  className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 active:scale-95 border text-lg"
                >
                  ←
                </button>

                <div className="flex-1 text-center px-3">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedWork.name}</h3>
                  <p className="text-sm text-gray-500">{selectedWork.area?.name || selectedWork.category_name}</p>
                </div>

                <button
                  onClick={() => navigateWork('next')}
                  disabled={currentIndex >= filteredWorks.length - 1}
                  className="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center disabled:opacity-30 hover:bg-gray-50 active:scale-95 border text-lg"
                >
                  →
                </button>
              </div>

              {/* Status Buttons 2x2 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const isActive = (selectedWork.status || 'not_started') === key;
                  const isTapped = tappedStatus === key;

                  return (
                    <button
                      key={key}
                      onClick={() => updateProgress(key)}
                      disabled={updatingStatus}
                      className={`py-3 px-2 rounded-xl font-bold text-sm transition-all relative overflow-hidden ${
                        isActive
                          ? `${config.color} ring-2 ring-offset-2 ring-emerald-500 shadow-md`
                          : `border ${config.bg} hover:shadow-sm active:scale-95`
                      } ${updatingStatus && !isTapped ? 'opacity-50' : ''}`}
                    >
                      {isTapped && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                          <span className="animate-spin">⏳</span>
                        </div>
                      )}
                      <div className="text-xl mb-1">{config.label}</div>
                      <div className="text-xs opacity-80">{STATUS_NAMES[key]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={cycleStatus}
                  disabled={updatingStatus}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                >
                  ⏭️ Next Status
                </button>
                <button
                  onClick={() => {
                    const q = encodeURIComponent(`${selectedWork.name} Montessori presentation`);
                    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
                  }}
                  className="py-3 px-5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 active:scale-[0.98] shadow-md"
                >
                  ▶️ Demo
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-3">
                {currentIndex + 1} of {filteredWorks.length} • Swipe or tap ← → to navigate
              </p>
            </div>
          )}

          {/* Work List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-gray-500">
                <span className="animate-bounce text-3xl block mb-2">🐋</span>
                <p className="font-medium">Loading works...</p>
              </div>
            ) : error ? (
              <div className="text-center py-10 px-4">
                <span className="text-3xl block mb-2">⚠️</span>
                <p className="text-amber-700 font-medium mb-2 whitespace-pre-wrap text-sm">{error}</p>
                <button onClick={fetchWorks} className="text-emerald-600 hover:underline text-sm font-medium">
                  Try again
                </button>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <span className="text-3xl block mb-2">🔍</span>
                <p>{searchQuery ? `No works match "${searchQuery}"` : 'No works found'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredWorks.map((work) => {
                  const status = work.status || 'not_started';
                  const config = STATUS_CONFIG[status];
                  const isSelected = selectedWork?.id === work.id;

                  return (
                    <button
                      key={work.id}
                      ref={isSelected ? selectedWorkRef : null}
                      onClick={() => setSelectedWork(isSelected ? null : work)}
                      className={`w-full flex items-center gap-3 p-3.5 transition-all text-left ${
                        isSelected
                          ? 'bg-emerald-100 border-l-4 border-emerald-500'
                          : 'hover:bg-gray-50 active:bg-emerald-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${config.color}`}>
                        {config.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                          {work.name}
                        </p>
                        {work.category_name && (
                          <p className="text-xs text-gray-500 truncate">{work.category_name}</p>
                        )}
                      </div>
                      <div className="text-xl opacity-60">{work.area?.icon || '📋'}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">
              {filteredWorks.length} work{filteredWorks.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setIsOpen(false); setSelectedWork(null); }}
              className="text-sm text-emerald-600 font-semibold hover:text-emerald-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
