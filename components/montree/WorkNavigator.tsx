// components/montree/WorkNavigator.tsx
// Simplified work browser - tap status badge to cycle, swipe to navigate
// BUILD: 20260120-1805
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

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string; level: number }> = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented', level: 0 },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', next: 'practicing', level: 1 },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', next: 'mastered', level: 2 },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', next: 'not_started', level: 3 },
};

export default function WorkNavigator({
  classroomId,
  childId,
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const fetchWorks = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('child_id', childId);
      params.set('limit', '400');
      if (classroomId) params.set('classroom_id', classroomId);
      if (selectedArea !== 'all') params.set('area', selectedArea);

      const res = await fetch(`/api/montree/works/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      if (data.works?.length > 0) {
        setAllWorks(data.works);
        setError(null);
      } else {
        setAllWorks([]);
        setError('No works found.');
      }
      setSelectedWork(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setAllWorks([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId, childId, selectedArea, isOpen]);

  useEffect(() => {
    if (isOpen) fetchWorks();
  }, [isOpen, selectedArea, fetchWorks]);

  const filteredWorks = searchQuery.trim()
    ? allWorks.filter(work =>
        work.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (work.name_chinese && work.name_chinese.includes(searchQuery))
      )
    : allWorks;

  const currentIndex = selectedWork
    ? filteredWorks.findIndex(w => w.id === selectedWork.id)
    : -1;

  useEffect(() => {
    if (selectedWork && currentIndex < 0) setSelectedWork(null);
  }, [searchQuery, currentIndex, selectedWork]);

  const navigateWork = (direction: 'prev' | 'next') => {
    if (filteredWorks.length === 0) return;
    
    let newIndex: number;
    if (currentIndex < 0) {
      newIndex = direction === 'next' ? 0 : filteredWorks.length - 1;
    } else {
      newIndex = direction === 'next'
        ? Math.min(currentIndex + 1, filteredWorks.length - 1)
        : Math.max(currentIndex - 1, 0);
    }
    if (filteredWorks[newIndex]) setSelectedWork(filteredWorks[newIndex]);
  };

  // TAP status badge to cycle
  const cycleStatus = async () => {
    if (!selectedWork || updatingStatus) return;
    
    const current = selectedWork.status || 'not_started';
    const next = STATUS_CONFIG[current].next;
    const config = STATUS_CONFIG[next];

    setUpdatingStatus(true);

    try {
      const apiStatus = next === 'mastered' ? 'completed'
                      : next === 'not_started' ? 'not_started'
                      : 'in_progress';

      const res = await fetch(`/api/montree/progress/${childId}/${selectedWork.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: next === 'not_started' ? 'reset' : 'update',
          status: apiStatus,
          currentLevel: config.level,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      const updatedWork = { ...selectedWork, status: next as any };
      setSelectedWork(updatedWork);
      setAllWorks(prev => prev.map(w => w.id === selectedWork.id ? updatedWork : w));
      toast.success(`→ ${next.replace('_', ' ')}`);
      onProgressUpdated?.();
    } catch {
      toast.error('Failed to update');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigateWork(diff > 0 ? 'next' : 'prev');
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

          {/* Selected Work - SIMPLIFIED */}
          {selectedWork && (
            <div
              className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 p-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Navigation + Status in one row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateWork('prev')}
                  disabled={currentIndex <= 0}
                  className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center disabled:opacity-30 active:scale-95 border text-lg"
                >
                  ←
                </button>

                {/* Tappable Status Badge - THE MAIN INTERACTION */}
                <button
                  onClick={cycleStatus}
                  disabled={updatingStatus}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shadow-lg transition-transform active:scale-90 ${
                    STATUS_CONFIG[selectedWork.status || 'not_started'].color
                  } ${updatingStatus ? 'animate-pulse' : ''}`}
                >
                  {STATUS_CONFIG[selectedWork.status || 'not_started'].label}
                </button>

                {/* Work Name */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{selectedWork.name}</h3>
                  <p className="text-xs text-gray-500">{currentIndex + 1} of {filteredWorks.length}</p>
                </div>

                <button
                  onClick={() => navigateWork('next')}
                  disabled={currentIndex >= filteredWorks.length - 1}
                  className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center disabled:opacity-30 active:scale-95 border text-lg"
                >
                  →
                </button>
              </div>

              {/* Demo button - optional, small */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => {
                    const q = encodeURIComponent(`${selectedWork.name} Montessori`);
                    window.open(`https://www.youtube.com/results?search_query=${q}`, '_blank');
                  }}
                  className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  ▶️ Watch Demo
                </button>
              </div>
            </div>
          )}

          {/* Work List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <span className="animate-bounce text-2xl block mb-2">🐋</span>
                <p className="text-sm">Loading...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8 px-4">
                <p className="text-amber-700 text-sm mb-2">{error}</p>
                <button onClick={fetchWorks} className="text-emerald-600 text-sm">Try again</button>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No works found
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
                      onClick={() => setSelectedWork(isSelected ? null : work)}
                      className={`w-full flex items-center gap-3 p-3 transition-all text-left ${
                        isSelected
                          ? 'bg-emerald-100 border-l-4 border-emerald-500'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${config.color}`}>
                        {config.label}
                      </div>
                      <span className={`flex-1 text-sm truncate ${isSelected ? 'text-emerald-900 font-medium' : 'text-gray-900'}`}>
                        {work.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">{filteredWorks.length} works • v72</span>
            <button
              onClick={() => { setIsOpen(false); setSelectedWork(null); }}
              className="text-sm text-emerald-600 font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
