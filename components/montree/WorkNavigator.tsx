// components/montree/WorkNavigator.tsx
// Smart work navigator with search, area filters, and snap-back logic
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Types
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
  assignment?: {
    status: string;
    current_level: number;
  } | null;
}

interface WorkNavigatorProps {
  classroomId: string;
  childId: string;
  assignedWorks: Work[];  // Weekly assigned works
  onWorkSelect: (work: Work) => void;
  onSessionLog: (work: Work, type: string) => void;
  currentWorkId?: string;
}

const AREAS = [
  { key: 'all', label: 'All', icon: '📋', color: 'gray' },
  { key: 'practical_life', label: 'PL', icon: '🧹', color: 'pink' },
  { key: 'sensorial', label: 'S', icon: '👁️', color: 'purple' },
  { key: 'math', label: 'M', icon: '🔢', color: 'blue' },
  { key: 'language', label: 'L', icon: '📖', color: 'green' },
  { key: 'cultural', label: 'C', icon: '🌍', color: 'orange' },
];

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800' },
};

export default function WorkNavigator({
  classroomId,
  childId,
  assignedWorks,
  onWorkSelect,
  onSessionLog,
  currentWorkId,
}: WorkNavigatorProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [filteredWorks, setFilteredWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDeviated, setIsDeviated] = useState(false);
  const [recommendedWork, setRecommendedWork] = useState<Work | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [snapBackAnimating, setSnapBackAnimating] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute recommended work (first non-mastered assigned work)
  useEffect(() => {
    const nextWork = assignedWorks.find(w => 
      w.status !== 'mastered' && w.status !== 'not_started'
    ) || assignedWorks.find(w => w.status !== 'mastered');
    setRecommendedWork(nextWork || null);
  }, [assignedWorks]);

  // Check if we're deviated from recommended track
  useEffect(() => {
    if (currentWorkId && recommendedWork) {
      setIsDeviated(currentWorkId !== recommendedWork.id);
    }
  }, [currentWorkId, recommendedWork]);

  // Fetch all works when area changes or search is opened
  const fetchAllWorks = useCallback(async () => {
    if (!classroomId) return;
    
    setLoading(true);
    try {
      const areaParam = selectedArea !== 'all' ? `&area=${selectedArea}` : '';
      const res = await fetch(
        `/api/montree/works/search?classroom_id=${classroomId}&child_id=${childId}${areaParam}`
      );
      const data = await res.json();
      setAllWorks(data.works || []);
    } catch (err) {
      console.error('Failed to fetch works:', err);
    } finally {
      setLoading(false);
    }
  }, [classroomId, childId, selectedArea]);

  // Fetch when search is opened or area changes
  useEffect(() => {
    if (showSearch) {
      fetchAllWorks();
    }
  }, [showSearch, selectedArea, fetchAllWorks]);

  // Filter works by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredWorks(allWorks);
      return;
    }
    
    const q = searchQuery.toLowerCase();
    const filtered = allWorks.filter(work =>
      work.name.toLowerCase().includes(q) ||
      (work.name_chinese && work.name_chinese.includes(q)) ||
      (work.category_name && work.category_name.toLowerCase().includes(q))
    );
    setFilteredWorks(filtered);
  }, [searchQuery, allWorks]);

  // Handle work selection from search
  const handleWorkSelect = (work: Work) => {
    setIsDeviated(true);
    onWorkSelect(work);
    setShowSearch(false);
    setSearchQuery('');
  };

  // Handle snap back to recommended with animation
  const handleSnapBack = () => {
    if (recommendedWork) {
      setSnapBackAnimating(true);
      // Slight delay for visual feedback
      setTimeout(() => {
        setIsDeviated(false);
        onWorkSelect(recommendedWork);
        setSnapBackAnimating(false);
      }, 200);
    }
  };

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <div className="relative">
      {/* Search Toggle + Deviation Indicator */}
      <div className="flex items-center gap-2 mb-3">
        {/* Search Button */}
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            showSearch 
              ? 'bg-emerald-600 text-white' 
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span>🔍</span>
          <span className="text-sm font-medium">Find Work</span>
        </button>

        {/* Snap Back Indicator - Enhanced Animation */}
        {isDeviated && recommendedWork && (
          <button
            onClick={handleSnapBack}
            disabled={snapBackAnimating}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all overflow-hidden
                       ${snapBackAnimating 
                         ? 'bg-emerald-500 text-white border-emerald-500 scale-95' 
                         : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-300 hover:border-amber-400 hover:shadow-md'
                       }`}
          >
            {/* Animated arrow */}
            <span className={`text-lg transition-transform ${snapBackAnimating ? 'animate-spin' : 'animate-bounce'}`}>
              {snapBackAnimating ? '⏳' : '↩'}
            </span>
            <div className="flex flex-col items-start">
              <span className="text-[10px] uppercase tracking-wide opacity-70">Return to</span>
              <span className="text-sm font-bold truncate max-w-[120px] leading-tight">
                {recommendedWork.name}
              </span>
            </div>
            {/* Pulsing glow ring */}
            {!snapBackAnimating && (
              <span className="absolute -inset-1 rounded-xl border-2 border-amber-400 animate-ping opacity-40" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Search Panel */}
      {showSearch && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 mb-4">
          {/* Search Input */}
          <div className="relative mb-3">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search works..."
              className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-xl 
                         focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Area Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
            {AREAS.map((area) => (
              <button
                key={area.key}
                onClick={() => setSelectedArea(area.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium 
                           whitespace-nowrap transition-all ${
                  selectedArea === area.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{area.icon}</span>
                <span>{area.label}</span>
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <span className="animate-spin inline-block">⏳</span> Loading...
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No works found' : 'Start typing to search'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredWorks.slice(0, 20).map((work) => {
                  const status = work.status || 'not_started';
                  const statusConfig = STATUS_CONFIG[status];
                  
                  return (
                    <button
                      key={work.id}
                      onClick={() => handleWorkSelect(work)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 
                                 transition-colors text-left"
                    >
                      {/* Status Badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center 
                                       text-sm font-bold ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                      
                      {/* Work Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{work.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {work.area?.name} • {work.category_name || 'General'}
                        </p>
                      </div>
                      
                      {/* Area Badge */}
                      <div className="text-lg">{work.area?.icon || '📋'}</div>
                    </button>
                  );
                })}
                
                {filteredWorks.length > 20 && (
                  <p className="text-center text-sm text-gray-500 py-2">
                    +{filteredWorks.length - 20} more results
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowSearch(false)}
            className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            Close Search
          </button>
        </div>
      )}
    </div>
  );
}
