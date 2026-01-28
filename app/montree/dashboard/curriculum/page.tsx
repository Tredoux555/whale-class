'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';

interface Work {
  id: string;
  work_key: string;
  name: string;
  name_chinese?: string;
  area_id: string;
  category_name?: string;
  age_range?: string;
  is_active: boolean;
}

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
};

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-green-400 to-emerald-500',
  sensorial: 'from-orange-400 to-amber-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-pink-400 to-rose-500',
  cultural: 'from-purple-400 to-violet-500'
};

export default function CurriculumPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [byArea, setByArea] = useState<Record<string, Work[]>>({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) { router.push('/montree/login'); return; }
    try { setSession(JSON.parse(stored)); } 
    catch { router.push('/montree/login'); }
  }, [router]);

  useEffect(() => {
    if (!session?.classroom?.id) return;
    fetchCurriculum();
  }, [session?.classroom?.id]);

  const fetchCurriculum = async () => {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/curriculum?classroom_id=${session.classroom.id}`);
      const data = await res.json();
      setCurriculum(data.curriculum || []);
      setByArea(data.byArea || {});
    } catch (err) {
      toast.error('Failed to load curriculum');
    }
    setLoading(false);
  };

  const handleSeedCurriculum = async () => {
    if (!session?.classroom?.id) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: session.classroom.id, action: 'seed' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Added ${data.seeded} works to curriculum!`);
        fetchCurriculum();
      } else {
        toast.error(data.error || 'Failed to seed');
      }
    } catch (err) {
      toast.error('Failed to seed curriculum');
    }
    setSeeding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">📚</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 pb-24">
      <Toaster position="top-center" richColors />
      
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/montree/dashboard')} 
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">←</button>
              <div>
                <h1 className="text-xl font-bold">Curriculum</h1>
                <p className="text-emerald-100 text-sm">{curriculum.length} works available</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {curriculum.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <span className="text-5xl mb-4 block">📚</span>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Curriculum Yet</h2>
            <p className="text-gray-500 mb-6">Seed the default Montessori curriculum to get started</p>
            <button onClick={handleSeedCurriculum} disabled={seeding}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold 
                shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
              {seeding ? 'Seeding...' : '🌱 Seed Default Curriculum'}
            </button>
          </div>
        ) : (
          <>
            {/* Area Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(byArea).map(([area, works]) => (
                <button key={area} onClick={() => setSelectedArea(selectedArea === area ? null : area)}
                  className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all text-left
                    ${selectedArea === area ? 'ring-2 ring-emerald-500' : ''}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AREA_COLORS[area] || 'from-gray-400 to-gray-500'} 
                    flex items-center justify-center text-2xl mb-2`}>
                    {AREA_ICONS[area] || '📖'}
                  </div>
                  <p className="font-semibold text-gray-800 capitalize">{area.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">{works.length} works</p>
                </button>
              ))}
            </div>

            {/* Selected Area Works */}
            {selectedArea && byArea[selectedArea] && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 capitalize flex items-center gap-2">
                  {AREA_ICONS[selectedArea]} {selectedArea.replace('_', ' ')}
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {byArea[selectedArea].map(work => (
                    <div key={work.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{work.name}</p>
                        {work.name_chinese && <p className="text-sm text-gray-500">{work.name_chinese}</p>}
                      </div>
                      <span className="text-xs text-gray-400">{work.age_range || '3-6'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-around">
          <button onClick={() => router.push('/montree/dashboard')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">🏠</span><span className="text-xs">Home</span>
          </button>
          <button className="flex flex-col items-center text-emerald-600">
            <span className="text-xl">📚</span><span className="text-xs font-medium">Curriculum</span>
          </button>
          <button onClick={() => router.push('/montree/dashboard/progress')} className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📊</span><span className="text-xs">Progress</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
