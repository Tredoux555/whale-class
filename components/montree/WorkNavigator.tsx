// components/montree/WorkNavigator.tsx
// Simple work browser - shows full list immediately, search filters the list
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  classroomId: string;
  childId: string;
  onWorkSelect: (work: Work) => void;
}

const AREAS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'practical_life', label: 'PL', icon: '🧹' },
  { key: 'sensorial', label: 'S', icon: '👁️' },
  { key: 'math', label: 'M', icon: '🔢' },
  { key: 'language', label: 'L', icon: '📖' },
  { key: 'cultural', label: 'C', icon: '🌍' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600' },
  presented: { label: 'P', color: 'bg-amber-200 text-amber-800' },
  practicing: { label: 'Pr', color: 'bg-blue-200 text-blue-800' },
  mastered: { label: 'M', color: 'bg-green-200 text-green-800' },
};

export default function WorkNavigator({
  classroomId,
  childId,
  onWorkSelect,
}: WorkNavigatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('all');
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all works when panel opens or area changes
  const fetchWorks = useCallback(async () => {
    if (!classroomId || !isOpen) return;
    
    setLoading(true);
    try {
      const areaParam = selectedArea !== 'all' ? `&area=${selectedArea}` : '';
      const res = await fetch(
        `/api/montree/works/search?classroom_id=${classroomId}&child_id=${childId}${areaParam}&limit=200`
      );
      const data = await res.json();
      setAllWorks(data.works || []);
    } catch (err) {
      console.error('Failed to fetch works:', err);
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

  // Handle work selection
  const handleWorkSelect = (work: Work) => {
    onWorkSelect(work);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="mb-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
          isOpen 
            ? 'bg-emerald-600 text-white' 
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'
        }`}
      >
        <span>🔍</span>
        <span className="text-sm font-medium">{isOpen ? 'Close' : 'Find Work'}</span>
      </button>

      {/* Work Browser Panel */}
      {isOpen && (
        <div className="mt-3 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Search + Filters - Sticky Header */}
          <div className="sticky top-0 bg-white border-b p-3 z-10">
            {/* Search Input */}
            <div className="relative mb-2">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter works..."
                className="w-full px-4 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Area Filter Pills */}
            <div className="flex gap-1 overflow-x-auto">
              {AREAS.map((area) => (
                <button
                  key={area.key}
                  onClick={() => setSelectedArea(area.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium 
                             whitespace-nowrap transition-all ${
                    selectedArea === area.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{area.icon}</span>
                  <span>{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Work List - Scrollable */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <span className="animate-spin inline-block">⏳</span> Loading works...
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No works match your search' : 'No works found'}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredWorks.map((work) => {
                  const status = work.status || 'not_started';
                  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
                  
                  return (
                    <button
                      key={work.id}
                      onClick={() => handleWorkSelect(work)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-emerald-50 
                                 transition-colors text-left active:bg-emerald-100"
                    >
                      {/* Status Badge */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center 
                                       text-xs font-bold flex-shrink-0 ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                      
                      {/* Work Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{work.name}</p>
                        {work.category_name && (
                          <p className="text-xs text-gray-500 truncate">{work.category_name}</p>
                        )}
                      </div>
                      
                      {/* Area Icon */}
                      <div className="text-base flex-shrink-0">{work.area?.icon || '📋'}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
            {filteredWorks.length} works {searchQuery && `matching "${searchQuery}"`}
          </div>
        </div>
      )}
    </div>
  );
}
