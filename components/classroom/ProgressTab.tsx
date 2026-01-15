'use client';

import { useState, useEffect } from 'react';

interface WorkProgress {
  id: string;
  name: string;
  status: number; // 0=not started, 1=presented, 2=practicing, 3=mastered
  category?: string;
  subcategory?: string;
}

interface AreaProgress {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  works: WorkProgress[];
  stats: {
    total: number;
    presented: number;
    practicing: number;
    mastered: number;
  };
}

interface ProgressTabProps {
  childId: string;
  childName: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', bgColor: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50' },
  { id: 'culture', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', bgColor: 'bg-orange-50' },
];

const STATUS_COLORS = ['bg-gray-200', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];
const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];

export default function ProgressTab({ childId, childName }: ProgressTabProps) {
  const [areaProgress, setAreaProgress] = useState<AreaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/progress`);
      const data = await res.json();
      
      // Process progress data into areas
      const progressByArea = AREAS.map(area => {
        const areaWorks = (data.works || []).filter((w: any) => 
          w.area === area.id || w.area === area.name.toLowerCase().replace(' ', '_')
        );
        
        return {
          ...area,
          works: areaWorks,
          stats: {
            total: areaWorks.length,
            presented: areaWorks.filter((w: WorkProgress) => w.status === 1).length,
            practicing: areaWorks.filter((w: WorkProgress) => w.status === 2).length,
            mastered: areaWorks.filter((w: WorkProgress) => w.status === 3).length,
          }
        };
      });

      setAreaProgress(progressByArea);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleArea = (areaId: string) => {
    setExpandedArea(prev => prev === areaId ? null : areaId);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl animate-pulse">📊</span>
        </div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  // Overall stats
  const overallStats = areaProgress.reduce(
    (acc, area) => ({
      total: acc.total + area.stats.total,
      presented: acc.presented + area.stats.presented,
      practicing: acc.practicing + area.stats.practicing,
      mastered: acc.mastered + area.stats.mastered,
    }),
    { total: 0, presented: 0, practicing: 0, mastered: 0 }
  );

  const overallPercent = overallStats.total > 0 
    ? Math.round((overallStats.mastered / overallStats.total) * 100) 
    : 0;

  return (
    <div>
      {/* Overall Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-2xl font-bold text-blue-600">{overallPercent}%</div>
        </div>
        
        {/* Progress bar */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full flex">
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${(overallStats.mastered / overallStats.total) * 100}%` }}
            />
            <div 
              className="bg-blue-500 transition-all" 
              style={{ width: `${(overallStats.practicing / overallStats.total) * 100}%` }}
            />
            <div 
              className="bg-yellow-400 transition-all" 
              style={{ width: `${(overallStats.presented / overallStats.total) * 100}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{overallStats.total} total works</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              {overallStats.presented}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {overallStats.practicing}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {overallStats.mastered}
            </span>
          </div>
        </div>
      </div>

      {/* Area Cards */}
      <div className="space-y-3">
        {areaProgress.map(area => {
          const isExpanded = expandedArea === area.id;
          const areaPercent = area.stats.total > 0 
            ? Math.round((area.stats.mastered / area.stats.total) * 100) 
            : 0;

          return (
            <div key={area.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Area Header - Clickable */}
              <button
                onClick={() => toggleArea(area.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center text-2xl shadow`}>
                  {area.icon}
                </div>
                
                <div className="flex-1 text-left">
                  <h4 className="font-bold text-gray-900">{area.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full flex">
                        <div 
                          className="bg-green-500" 
                          style={{ width: `${(area.stats.mastered / Math.max(area.stats.total, 1)) * 100}%` }}
                        />
                        <div 
                          className="bg-blue-500" 
                          style={{ width: `${(area.stats.practicing / Math.max(area.stats.total, 1)) * 100}%` }}
                        />
                        <div 
                          className="bg-yellow-400" 
                          style={{ width: `${(area.stats.presented / Math.max(area.stats.total, 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{areaPercent}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {area.stats.mastered}/{area.stats.total}
                  </span>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Works List */}
              {isExpanded && area.works.length > 0 && (
                <div className={`border-t ${area.bgColor} p-3`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {area.works.map(work => (
                      <div
                        key={work.id}
                        className={`p-2 rounded-lg bg-white shadow-sm border-l-4 ${
                          work.status === 3 ? 'border-green-500' :
                          work.status === 2 ? 'border-blue-500' :
                          work.status === 1 ? 'border-yellow-400' :
                          'border-gray-200'
                        }`}
                      >
                        <p className="text-xs font-medium text-gray-800 truncate">{work.name}</p>
                        <p className="text-[10px] text-gray-500">{STATUS_LABELS[work.status]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isExpanded && area.works.length === 0 && (
                <div className="border-t p-4 text-center text-gray-500 text-sm">
                  No works tracked in this area yet
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
