// /app/montree/dashboard/[childId]/progress/detail/page.tsx
// Detailed progress view with mastery timeline and area breakdown
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { AREA_CONFIG } from '@/lib/montree/types';

interface WorkProgress {
  id: string;
  work_name: string;
  area: string;
  status: string;
  presented_at: string | null;
  mastered_at: string | null;
}

export default function ProgressDetailPage() {
  const params = useParams();
  const childId = params.childId as string;
  
  const [progress, setProgress] = useState<WorkProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'mastered' | 'practicing'>('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;
    fetch(`/api/montree/progress/summary?child_id=${childId}`)
      .then(r => r.json())
      .then(data => {
        setProgress(data.progress || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load');
        setLoading(false);
      });
  }, [childId]);


  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[area] || AREA_CONFIG[area.replace('mathematics', 'math')] || 
      { name: area, icon: '📋', color: '#888' };
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter progress
  const filteredProgress = progress.filter(p => {
    if (activeTab === 'mastered' && p.status !== 'completed') return false;
    if (activeTab === 'practicing' && p.status !== 'practicing') return false;
    if (selectedArea && p.area !== selectedArea) return false;
    return true;
  });

  // Group by area for stats
  const areaStats = Object.entries(AREA_CONFIG).map(([key, config]) => {
    const areaProgress = progress.filter(p => p.area === key || p.area === key.replace('math', 'mathematics'));
    const mastered = areaProgress.filter(p => p.status === 'completed').length;
    const practicing = areaProgress.filter(p => p.status === 'practicing').length;
    const presented = areaProgress.filter(p => p.status === 'presented').length;
    return { key, ...config, total: areaProgress.length, mastered, practicing, presented };
  }).filter(a => a.total > 0);

  const totalMastered = progress.filter(p => p.status === 'completed').length;
  const totalPracticing = progress.filter(p => p.status === 'practicing').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <Link href={`/montree/dashboard/${childId}/progress`} className="text-emerald-600 text-sm mb-2 inline-block">
          ← Back to Progress
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Detailed Progress</h1>
      </div>

      {/* Stats Cards */}
      <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-emerald-600">{totalMastered}</div>
          <div className="text-xs text-gray-500">Mastered</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-blue-500">{totalPracticing}</div>
          <div className="text-xs text-gray-500">Practicing</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-gray-600">{progress.length}</div>
          <div className="text-xs text-gray-500">Total Works</div>
        </div>
      </div>

      {/* Area Filter */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedArea(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              !selectedArea ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600'
            }`}
          >
            All Areas
          </button>
          {areaStats.map(area => (
            <button
              key={area.key}
              onClick={() => setSelectedArea(area.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
                selectedArea === area.key ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600'
              }`}
            >
              <span>{area.icon}</span>
              <span>{area.name}</span>
              <span className="text-xs opacity-70">({area.total})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex bg-white rounded-xl p-1 shadow-sm">
          {(['all', 'mastered', 'practicing'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                activeTab === tab ? 'bg-emerald-500 text-white' : 'text-gray-500'
              }`}
            >
              {tab === 'all' ? `All (${progress.length})` : 
               tab === 'mastered' ? `Mastered (${totalMastered})` : 
               `Practicing (${totalPracticing})`}
            </button>
          ))}
        </div>
      </div>

      {/* Works List */}
      <div className="max-w-2xl mx-auto space-y-2">
        {filteredProgress.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500">No works found</p>
          </div>
        ) : (
          filteredProgress.map(p => {
            const area = getAreaConfig(p.area);
            return (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <span className="text-2xl">{area.icon}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{p.work_name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{area.name}</span>
                    {p.presented_at && <span>• Started {formatDate(p.presented_at)}</span>}
                    {p.mastered_at && <span>• Mastered {formatDate(p.mastered_at)}</span>}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  p.status === 'practicing' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {p.status === 'completed' ? '✓ Mastered' : 
                   p.status === 'practicing' ? 'Practicing' : 'Presented'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Area Breakdown */}
      {areaStats.length > 0 && !selectedArea && (
        <div className="max-w-2xl mx-auto mt-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Progress by Area</h2>
          <div className="space-y-3">
            {areaStats.map(area => (
              <div key={area.key} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{area.icon}</span>
                    <span className="font-medium text-gray-800">{area.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">{area.mastered}/{area.total}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${area.total > 0 ? (area.mastered / area.total) * 100 : 0}%`,
                      backgroundColor: area.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
