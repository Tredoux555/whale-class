// app/admin/schools/[slug]/curriculum/[areaId]/page.tsx
// Curriculum Area - Shows all works in this area
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Work {
  id: string;
  name: string;
  description?: string;
  sequence: number;
  chineseName?: string;
  isActive: boolean;
}

// Area metadata
const AREAS: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🧹', color: 'from-amber-500 to-orange-500' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: 'from-pink-500 to-rose-500' },
  math: { name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500' },
  language: { name: 'Language', icon: '📚', color: 'from-green-500 to-emerald-500' },
  cultural: { name: 'Cultural', icon: '🌍', color: 'from-purple-500 to-violet-500' },
};

export default function CurriculumAreaPage() {
  const params = useParams();
  const slug = params.slug as string;
  const areaId = params.areaId as string;
  
  const area = AREAS[areaId];
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorks();
  }, [areaId]);

  const fetchWorks = async () => {
    try {
      setLoading(true);
      // Fetch from curriculum_roadmap via API
      // Using a placeholder schoolId since all schools use master curriculum for now
      const res = await fetch(`/api/schools/master/curriculum/${areaId}`);
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        setWorks([]);
      } else {
        setWorks(data.works || []);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to fetch works:', err);
      setError('Failed to load curriculum works');
      setWorks([]);
    } finally {
      setLoading(false);
    }
  };

  if (!area) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Area Not Found</h2>
          <Link href={`/admin/schools/${slug}/curriculum`} className="text-amber-400">
            ← Back to Curriculum
          </Link>
        </div>
      </div>
    );
  }

  const filteredWorks = works.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.chineseName?.includes(searchTerm)
  );

  const activeWorks = works.filter(w => w.isActive).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className={`bg-gradient-to-r ${area.color} sticky top-0 z-20`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/schools/${slug}/curriculum`} className="text-white/70 hover:text-white transition-colors text-sm">
              ← Curriculum
            </Link>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-xl">{area.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{area.name}</h1>
              <p className="text-white/70 text-sm">{works.length} works</p>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors text-sm">
            + Add Work
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-slate-400 text-xs mt-1">Showing from database. Run curriculum seed if empty.</p>
          </div>
        )}

        {/* Stats & Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-4">
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-white">{works.length}</span>
              <span className="text-slate-400 text-sm ml-2">total</span>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-2 border border-slate-700">
              <span className="text-2xl font-bold text-green-400">{activeWorks}</span>
              <span className="text-slate-400 text-sm ml-2">active</span>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Search works..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600 w-64"
          />
        </div>

        {/* Works List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredWorks.map((work, index) => (
              <div
                key={work.id}
                className={`bg-slate-800 border rounded-xl p-4 transition-all ${
                  work.isActive ? 'border-slate-700 hover:border-slate-600' : 'border-slate-800 opacity-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Sequence */}
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-slate-300">
                    {work.sequence || index + 1}
                  </div>
                  
                  {/* Work Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white">{work.name}</h3>
                      {work.chineseName && (
                        <span className="text-slate-400 text-sm">({work.chineseName})</span>
                      )}
                    </div>
                    {work.description && (
                      <p className="text-sm text-slate-400 truncate">{work.description}</p>
                    )}
                  </div>
                  
                  {/* Status */}
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    work.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {work.isActive ? '✓ Active' : 'Hidden'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredWorks.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-400">
              {searchTerm ? 'No works match your search' : 'No works in this area. Run the curriculum seed migration.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
