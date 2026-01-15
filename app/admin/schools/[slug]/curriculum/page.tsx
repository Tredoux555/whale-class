// app/admin/schools/[slug]/curriculum/page.tsx
// School Curriculum Management - Connected to Real Data with Seed Function
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  workCount: number;
}

const AREA_METADATA: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🧹', color: 'from-amber-500 to-orange-500' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: 'from-pink-500 to-rose-500' },
  math: { name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500' },
  language: { name: 'Language', icon: '📚', color: 'from-green-500 to-emerald-500' },
  cultural: { name: 'Cultural', icon: '🌍', color: 'from-purple-500 to-violet-500' },
};

const SCHOOL_NAME = 'Beijing International School';

export default function SchoolCurriculumPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [areas, setAreas] = useState<CurriculumArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWorks, setTotalWorks] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCurriculumStats();
  }, []);

  const fetchCurriculumStats = async () => {
    try {
      // Fetch counts for each area
      const areaIds = Object.keys(AREA_METADATA);
      const counts: Record<string, number> = {};
      
      await Promise.all(
        areaIds.map(async (areaId) => {
          const res = await fetch(`/api/schools/master/curriculum/${areaId}`);
          const data = await res.json();
          counts[areaId] = data.total || 0;
        })
      );
      
      // Build areas array with counts
      const areasWithCounts = areaIds.map(id => ({
        id,
        name: AREA_METADATA[id].name,
        icon: AREA_METADATA[id].icon,
        color: AREA_METADATA[id].color,
        workCount: counts[id] || 0,
      }));
      
      setAreas(areasWithCounts);
      setTotalWorks(Object.values(counts).reduce((sum, c) => sum + c, 0));
    } catch (err) {
      console.error('Failed to fetch curriculum stats:', err);
      // Fallback to empty
      setAreas(Object.entries(AREA_METADATA).map(([id, meta]) => ({
        id,
        ...meta,
        workCount: 0,
      })));
    } finally {
      setLoading(false);
    }
  };

  const seedCurriculum = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeedMessage(null);
    
    try {
      const res = await fetch('/api/admin/seed-curriculum', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setSeedMessage(`✅ Seeded ${data.count} works!`);
        // Refresh counts
        await fetchCurriculumStats();
      } else {
        setSeedMessage(`⚠️ ${data.error || 'Seed failed'}`);
      }
    } catch (err) {
      console.error('Seed error:', err);
      setSeedMessage('❌ Failed to seed curriculum');
    } finally {
      setSeeding(false);
    }
  };

  const isEmpty = totalWorks === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/schools/${slug}`} className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Back
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">📚</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Curriculum</h1>
              <p className="text-slate-400 text-sm">{SCHOOL_NAME}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isEmpty && (
              <button 
                onClick={seedCurriculum}
                disabled={seeding}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
                  seeding 
                    ? 'bg-slate-700 text-slate-400 cursor-wait' 
                    : 'bg-green-500 text-white hover:bg-green-400'
                }`}
              >
                {seeding ? '⏳ Seeding...' : '🌱 Seed Curriculum'}
              </button>
            )}
            <button 
              onClick={fetchCurriculumStats}
              className="px-4 py-2 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        {/* Seed Message */}
        {seedMessage && (
          <div className={`rounded-xl p-4 mb-6 ${
            seedMessage.includes('✅') ? 'bg-green-500/10 border border-green-500/20' :
            seedMessage.includes('⚠️') ? 'bg-amber-500/10 border border-amber-500/20' :
            'bg-red-500/10 border border-red-500/20'
          }`}>
            <p className={`text-sm ${
              seedMessage.includes('✅') ? 'text-green-400' :
              seedMessage.includes('⚠️') ? 'text-amber-400' :
              'text-red-400'
            }`}>{seedMessage}</p>
          </div>
        )}

        {/* Empty State */}
        {isEmpty && !loading && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-3">📭</div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">Curriculum is Empty</h3>
            <p className="text-amber-200/70 text-sm mb-4">
              Click "Seed Curriculum" above to populate with 74 Montessori works.
            </p>
          </div>
        )}

        {/* Info */}
        {!isEmpty && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
            <p className="text-amber-200 text-sm">
              <strong className="text-amber-400">School Curriculum</strong> — 
              Customize works for {SCHOOL_NAME}. Changes here don't affect the master curriculum.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {loading ? '...' : totalWorks}
            </div>
            <div className="text-sm text-slate-400">Total Works</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-blue-400">{areas.length || 5}</div>
            <div className="text-sm text-slate-400">Areas</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className={`text-3xl font-bold ${totalWorks > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalWorks > 0 ? '✓' : '✗'}
            </div>
            <div className="text-sm text-slate-400">{totalWorks > 0 ? 'Seeded' : 'Empty'}</div>
          </div>
        </div>

        {/* Areas Grid */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Curriculum Areas</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {areas.map((area) => (
              <Link
                key={area.id}
                href={`/admin/schools/${slug}/curriculum/${area.id}`}
                className={`group bg-gradient-to-br ${area.color} rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl group-hover:scale-110 transition-transform">{area.icon}</div>
                  <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-bold text-white">
                    {area.workCount}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white">{area.name}</h3>
                <p className="text-white/70 text-sm mt-1">Tap to view works</p>
              </Link>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link 
            href={`/admin/schools/${slug}/curriculum/add`}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors"
          >
            <div className="text-xl mb-2">➕</div>
            <div className="font-medium text-white text-sm">Add Work</div>
          </Link>
          <Link 
            href={`/admin/schools/${slug}/curriculum/import`}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors"
          >
            <div className="text-xl mb-2">📥</div>
            <div className="font-medium text-white text-sm">Import</div>
          </Link>
          <Link 
            href={`/admin/schools/${slug}/curriculum/export`}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors"
          >
            <div className="text-xl mb-2">📤</div>
            <div className="font-medium text-white text-sm">Export</div>
          </Link>
          <Link 
            href={`/admin/schools/${slug}/english`}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors"
          >
            <div className="text-xl mb-2">🔤</div>
            <div className="font-medium text-white text-sm">English</div>
          </Link>
        </div>
      </main>
    </div>
  );
}
