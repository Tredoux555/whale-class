// app/admin/handbook/[areaId]/page.tsx
// Dynamic area page - lists all works with click-to-open details modal

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Work {
  id: string;
  name: string;
  slug: string;
  curriculum_area: string;
  sub_area: string;
  age_min: number;
  age_max: number;
  age_typical: number;
  sequence_order: number;
  direct_aims: string[];
  indirect_aims: string[];
  readiness_indicators: string[];
  materials_needed: string[];
  parent_explanation_simple: string;
  parent_explanation_detailed: string;
}

const AREA_INFO: Record<string, { name: string; icon: string; color: string; gradient: string }> = {
  practical_life: { name: 'Practical Life', icon: '🧹', color: 'bg-amber-500', gradient: 'from-amber-500 to-yellow-500' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: 'bg-pink-500', gradient: 'from-pink-500 to-rose-500' },
  language: { name: 'Language', icon: '📖', color: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  mathematics: { name: 'Mathematics', icon: '🔢', color: 'bg-green-500', gradient: 'from-green-500 to-emerald-500' },
  cultural: { name: 'Cultural', icon: '🌍', color: 'bg-purple-500', gradient: 'from-purple-500 to-violet-500' },
  art_music: { name: 'Art & Music', icon: '🎨', color: 'bg-red-500', gradient: 'from-red-500 to-orange-500' },
};

export default function AreaPage() {
  const params = useParams();
  const areaId = params.areaId as string;
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const area = AREA_INFO[areaId] || { name: areaId, icon: '📁', color: 'bg-slate-500', gradient: 'from-slate-500 to-slate-600' };

  useEffect(() => {
    fetch('/api/brain/works')
      .then(res => res.json())
      .then(data => {
        const filtered = (data.data || []).filter((w: Work) => w.curriculum_area === areaId);
        filtered.sort((a: Work, b: Work) => (a.sequence_order || 0) - (b.sequence_order || 0));
        setWorks(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [areaId]);

  // Group works by sub_area
  const groupedWorks = works.reduce((acc, work) => {
    const subArea = work.sub_area || 'General';
    if (!acc[subArea]) acc[subArea] = [];
    acc[subArea].push(work);
    return acc;
  }, {} as Record<string, Work[]>);

  // Filter works by search
  const filteredGroups = Object.entries(groupedWorks).reduce((acc, [subArea, subWorks]) => {
    const filtered = subWorks.filter(w => 
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.sub_area?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[subArea] = filtered;
    return acc;
  }, {} as Record<string, Work[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading works...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/admin/handbook" className="text-slate-400 hover:text-white transition-colors">
            ← Handbook
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Hero */}
        <div className="flex items-start gap-4 mb-8">
          <div className={`w-16 h-16 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-3xl shadow-lg`}>
            {area.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{area.name}</h1>
            <p className="text-slate-400">{works.length} works</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search works..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
        
        {/* Works by Sub-Area */}
        <div className="space-y-8">
          {Object.entries(filteredGroups).map(([subArea, subWorks]) => (
            <div key={subArea}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                {subArea.replace(/_/g, ' ')}
              </h2>
              <div className="space-y-2">
                {subWorks.map(work => (
                  <button
                    key={work.id}
                    onClick={() => setSelectedWork(work)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">{work.name}</h3>
                        {work.direct_aims?.length > 0 && (
                          <p className="text-slate-500 text-sm mt-1 line-clamp-1">{work.direct_aims[0]}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-400">
                          Ages {work.age_min}-{work.age_max}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(filteredGroups).length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No works found matching "{searchQuery}"
          </div>
        )}
      </main>

      {/* Details Modal */}
      {selectedWork && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
          onClick={() => setSelectedWork(null)}
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                {area.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedWork.name}</h3>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                    Ages {selectedWork.age_min}-{selectedWork.age_max}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400 capitalize">
                    {selectedWork.sub_area?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Description */}
            {selectedWork.parent_explanation_simple && (
              <p className="text-slate-300 mb-5 leading-relaxed">{selectedWork.parent_explanation_simple}</p>
            )}
            
            {/* Direct Aims */}
            {selectedWork.direct_aims?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">🎯</span> Direct Aims
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.direct_aims.map((aim, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Indirect Aims */}
            {selectedWork.indirect_aims?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">✨</span> Indirect Aims
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.indirect_aims.map((aim, i) => (
                    <span key={i} className="px-3 py-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-sm">
                      {aim}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Materials */}
            {selectedWork.materials_needed?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">📦</span> Materials
                </h4>
                <ul className="space-y-1">
                  {selectedWork.materials_needed.map((m, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-600 rounded-full" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Readiness */}
            {selectedWork.readiness_indicators?.length > 0 && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">✅</span> Ready When Child...
                </h4>
                <ul className="space-y-1">
                  {selectedWork.readiness_indicators.map((r, i) => (
                    <li key={i} className="text-slate-400 text-sm flex items-center gap-2">
                      <span className="text-green-500">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Explanation */}
            {selectedWork.parent_explanation_detailed && (
              <div className="mb-5">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="text-lg">📝</span> Detailed Explanation
                </h4>
                <p className="text-slate-400 text-sm leading-relaxed">{selectedWork.parent_explanation_detailed}</p>
              </div>
            )}
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedWork(null)} 
              className="mt-4 w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
