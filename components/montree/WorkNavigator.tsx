// components/montree/WorkNavigator.tsx
// Full work browser - search all 316 works, update progress directly
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  category_name?: string;
  sequence: number;
  area: {
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
  onWorkSelect?: (work: Work) => void;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; next: string }> = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', bg: 'bg-gray-50', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800', bg: 'bg-amber-50', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800', bg: 'bg-blue-50', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800', bg: 'bg-green-50', next: 'not_started' },
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
  onWorkSelect,
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
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when panel opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Fetch all works when panel opens or area changes
  const fetchWorks = useCallback(async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    try {
      // Build URL - classroomId is optional now
      let url = `/api/montree/works/search?child_id=${childId}&limit=400`;
      if (classroomId) {
        url += `&classroom_id=${classroomId}`;
      }
      if (selectedArea !== 'all') {
        url += `&area=${selectedArea}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load works');
      const data = await res.json();
      setAllWorks(data.works || []);
    } catch (err) {
      console.error('Failed to fetch works:', err);
      setError('Failed to load works. Please try again.');
      setAllWorks([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId, childId, selectedArea, isOpen]);

  // Fetch when opened or area changes
  useEffect(() => {
    if (isOpen) {
      fetchWorks();
    }
  }, [isOpen, selectedArea, fetchWorks]);

  // Filter works by search query
  const filteredWorks = searchQuery.trim()
    ? allWorks.filter(work =>
        work.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (work.name_chinese && work.name_chinese.includes(searchQuery)) ||
        (work.category_name && work.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allWorks;

  // Handle work selection - show detail card
  const handleWorkClick = (work: Work, index: number) => {
    setSelectedWork(work);
    setCurrentIndex(index);
    onWorkSelect?.(work);
  };

  // Navigate between works
  const navigateWork = (direction: 'prev' | 'next') => {
    if (currentIndex < 0) return;
    
    const newIndex = direction === 'next' 
      ? Math.min(currentIndex + 1, filteredWorks.length - 1)
      : Math.max(currentIndex - 1, 0);
    
    if (newIndex !== currentIndex) {
      setSelectedWork(filteredWorks[newIndex]);
      setCurrentIndex(newIndex);
    }
  };

  // Update work progress
  const updateProgress = async (newStatus: string) => {
    if (!selectedWork) return;
    
    setUpdatingStatus(true);
    try {
      // Update via the montree progress API
      const res = await fetch(`/api/montree/progress/${childId}/${selectedWork.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          status: newStatus === 'not_started' ? 'not_started' 
                : newStatus === 'presented' ? 'in_progress'
                : newStatus === 'practicing' ? 'in_progress'  
                : 'completed',
          currentLevel: newStatus === 'presented' ? 1 
                      : newStatus === 'practicing' ? 2 
                      : newStatus === 'mastered' ? 3 : 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      setSelectedWork({ ...selectedWork, status: newStatus as any });
      setAllWorks(prev => prev.map(w => 
        w.id === selectedWork.id ? { ...w, status: newStatus as any } : w
      ));
      
      toast.success(`${selectedWork.name} → ${STATUS_NAMES[newStatus]}`);
      onProgressUpdated?.();
    } catch (err) {
      console.error('Failed to update progress:', err);
      toast.error('Failed to update progress');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Cycle to next status
  const cycleStatus = () => {
    if (!selectedWork) return;
    const currentStatus = selectedWork.status || 'not_started';
    const nextStatus = STATUS_CONFIG[currentStatus].next;
    updateProgress(nextStatus);
  };

  return (
    <div className="mb-4">
      {/* Toggle Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all w-full justify-center ${
          isOpen 
            ? 'bg-emerald-600 text-white shadow-lg' 
            : 'bg-white border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400'
        }`}
      >
        <span className="text-xl">🔍</span>
        <span className="font-semibold">{isOpen ? 'Close Search' : 'Find Work'}</span>
        {!isOpen && <span className="text-sm text-emerald-500 ml-1">(All 316 works)</span>}
      </button>

      {/* Work Browser Panel */}
      {isOpen && (
        <div className="mt-3 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Search + Filters - Sticky Header */}
          <div className="sticky top-0 bg-white border-b p-3 z-10">
            {/* Search Input */}
            <div className="relative mb-3">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search works by name..."
                className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl text-base
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-200 rounded-full 
                             flex items-center justify-center text-gray-500 hover:bg-gray-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Area Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {AREAS.map((area) => (
                <button
                  key={area.key}
                  onClick={() => setSelectedArea(area.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium 
                             whitespace-nowrap transition-all ${
                    selectedArea === area.key
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{area.icon}</span>
                  <span>{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Work Detail Card */}
          {selectedWork && (
            <div className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navigateWork('prev')}
                  disabled={currentIndex <= 0}
                  className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center
                             disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ←
                </button>
                
                <div className="flex-1 text-center px-2">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedWork.name}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedWork.area?.name || selectedWork.category_name}
                  </p>
                </div>
                
                <button
                  onClick={() => navigateWork('next')}
                  disabled={currentIndex >= filteredWorks.length - 1}
                  className="w-10 h-10 bg-white rounded-full shadow flex items-center justify-center
                             disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  →
                </button>
              </div>

              {/* Status Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const isActive = (selectedWork.status || 'not_started') === key;
                  return (
                    <button
                      key={key}
                      onClick={() => updateProgress(key)}
                      disabled={updatingStatus}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        isActive 
                          ? `${config.color} ring-2 ring-offset-2 ring-emerald-500 scale-105` 
                          : `${config.bg} hover:scale-102`
                      } ${updatingStatus ? 'opacity-50' : ''}`}
                    >
                      <div className="text-lg mb-0.5">{config.label}</div>
                      <div className="text-xs opacity-75">{STATUS_NAMES[key]}</div>
                    </button>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={cycleStatus}
                  disabled={updatingStatus}
                  className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-semibold
                             hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <span>⏭️</span>
                  <span>Next Status</span>
                </button>
                <button
                  onClick={() => {
                    const query = encodeURIComponent(`${selectedWork.name} Montessori presentation`);
                    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                  }}
                  className="py-2 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600"
                >
                  ▶️ Demo
                </button>
              </div>

              {/* Navigation hint */}
              <p className="text-xs text-gray-400 text-center mt-2">
                Work {currentIndex + 1} of {filteredWorks.length} • Use ← → to navigate
              </p>
            </div>
          )}

          {/* Work List - Scrollable */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <span className="animate-spin inline-block text-2xl">🐋</span>
                <p className="mt-2">Loading works...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500 mb-2">❌ {error}</p>
                <button 
                  onClick={() => fetchWorks()}
                  className="text-emerald-600 hover:underline text-sm"
                >
                  Try again
                </button>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? `No works match "${searchQuery}"` : 'No works found'}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredWorks.map((work, index) => {
                  const status = work.status || 'not_started';
                  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
                  const isSelected = selectedWork?.id === work.id;
                  
                  return (
                    <button
                      key={work.id}
                      onClick={() => handleWorkClick(work, index)}
                      className={`w-full flex items-center gap-3 p-3 transition-colors text-left
                                 ${isSelected 
                                   ? 'bg-emerald-100 border-l-4 border-emerald-500' 
                                   : 'hover:bg-gray-50 active:bg-emerald-50'}`}
                    >
                      {/* Status Badge */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center 
                                       text-sm font-bold flex-shrink-0 ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                      
                      {/* Work Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
                          {work.name}
                        </p>
                        {work.category_name && (
                          <p className="text-xs text-gray-500 truncate">{work.category_name}</p>
                        )}
                      </div>
                      
                      {/* Area Icon */}
                      <div className="text-lg flex-shrink-0">{work.area?.icon || '📋'}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="border-t bg-gray-50 px-3 py-2 text-sm text-gray-600 text-center font-medium">
            {filteredWorks.length} works {searchQuery && `matching "${searchQuery}"`}
          </div>
        </div>
      )}
    </div>
  );
}
