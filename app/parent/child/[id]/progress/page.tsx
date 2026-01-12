'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Work {
  id: string;
  name: string;
  area: string;
  category: string;
  status: number;
}

interface AreaProgress {
  total: number;
  presented: number;
  practicing: number;
  mastered: number;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-pink-500' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-purple-500' },
  { id: 'math', name: 'Mathematics', icon: '🔢', color: 'bg-blue-500' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-green-500' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-orange-500' },
];

const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
const STATUS_COLORS = ['bg-gray-200', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];

export default function ParentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: childId } = use(params);
  const [child, setChild] = useState<any>(null);
  const [selectedArea, setSelectedArea] = useState('practical_life');
  const [works, setWorks] = useState<Work[]>([]);
  const [areaProgress, setAreaProgress] = useState<Record<string, AreaProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChild();
    fetchAllProgress();
  }, [childId]);

  useEffect(() => {
    if (childId) fetchAreaWorks();
  }, [childId, selectedArea]);

  const fetchChild = async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      const data = await res.json();
      setChild(data.child);
    } catch (e) { console.error(e); }
  };

  const fetchAllProgress = async () => {
    const progress: Record<string, AreaProgress> = {};
    for (const area of AREAS) {
      try {
        const res = await fetch(`/api/teacher/progress?childId=${childId}&area=${area.id}`);
        const data = await res.json();
        const works = data.works || [];
        progress[area.id] = {
          total: works.length,
          presented: works.filter((w: Work) => w.status === 1).length,
          practicing: works.filter((w: Work) => w.status === 2).length,
          mastered: works.filter((w: Work) => w.status === 3).length,
        };
      } catch (e) { console.error(e); }
    }
    setAreaProgress(progress);
    setLoading(false);
  };

  const fetchAreaWorks = async () => {
    try {
      const res = await fetch(`/api/teacher/progress?childId=${childId}&area=${selectedArea}`);
      const data = await res.json();
      setWorks(data.works || []);
    } catch (e) { console.error(e); }
  };

  const totalMastered = Object.values(areaProgress).reduce((sum, a) => sum + a.mastered, 0);
  const totalWorks = Object.values(areaProgress).reduce((sum, a) => sum + a.total, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-purple-600 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href={`/parent/child/${childId}`} className="text-purple-200 text-sm mb-2 inline-block hover:text-white">
            ← Back to {child?.name || 'Child'}
          </Link>
          <h1 className="text-2xl font-bold">{child?.name}'s Progress</h1>
          <p className="text-purple-200 mt-1">
            {totalMastered} of {totalWorks} works mastered
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Overall Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
          <h2 className="font-bold text-lg mb-4">📊 Overall Progress</h2>
          <div className="grid grid-cols-5 gap-3">
            {AREAS.map((area) => {
              const prog = areaProgress[area.id] || { total: 0, mastered: 0 };
              const pct = prog.total > 0 ? Math.round((prog.mastered / prog.total) * 100) : 0;
              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className={`p-3 rounded-xl text-center transition-all ${
                    selectedArea === area.id 
                      ? 'bg-purple-100 border-2 border-purple-500' 
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="text-2xl mb-1">{area.icon}</div>
                  <div className="text-xs font-medium text-gray-700 truncate">{area.name}</div>
                  <div className="text-lg font-bold text-purple-600">{pct}%</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mb-4 text-sm">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Presented</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Practicing</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500"></span> Mastered</span>
        </div>

        {/* Works Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <h2 className="font-bold text-lg mb-4">
            {AREAS.find(a => a.id === selectedArea)?.icon} {AREAS.find(a => a.id === selectedArea)?.name}
          </h2>
          
          {works.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No works in this area yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {works.map((work) => (
                <div
                  key={work.id}
                  className={`p-3 rounded-xl border-2 ${
                    work.status === 0 ? 'bg-gray-50 border-gray-200' :
                    work.status === 1 ? 'bg-yellow-50 border-yellow-300' :
                    work.status === 2 ? 'bg-blue-50 border-blue-300' :
                    'bg-green-50 border-green-400'
                  }`}
                >
                  <div className="font-medium text-sm text-gray-800 leading-tight">{work.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{STATUS_LABELS[work.status]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/parent/home" className="text-purple-600 text-sm hover:underline">
            ← Back to Family Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
