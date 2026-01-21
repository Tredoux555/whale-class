// app/admin/handbook/page.tsx
// Digital Handbook - Browse all 213 Montessori works by curriculum area

'use client';

import Link from 'next/link';

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'bg-amber-500', gradient: 'from-amber-500 to-yellow-500', count: 45, desc: 'Care of self, environment & grace and courtesy' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'bg-pink-500', gradient: 'from-pink-500 to-rose-500', count: 35, desc: 'Visual, tactile, auditory & stereognostic' },
  { id: 'language', name: 'Language', icon: '📖', color: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-500', count: 37, desc: 'Spoken, written & reading development' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: 'bg-green-500', gradient: 'from-green-500 to-emerald-500', count: 52, desc: 'Numbers, operations & geometry' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'bg-purple-500', gradient: 'from-purple-500 to-violet-500', count: 32, desc: 'Geography, science, history & nature' },
  { id: 'art_music', name: 'Art & Music', icon: '🎨', color: 'bg-red-500', gradient: 'from-red-500 to-orange-500', count: 12, desc: 'Creative expression & appreciation' },
];

export default function HandbookPage() {
  const totalWorks = AREAS.reduce((sum, area) => sum + area.count, 0);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              ← Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <span className="text-4xl">📚</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Montessori Handbook</h1>
          <p className="text-slate-400">{totalWorks} works across {AREAS.length} curriculum areas</p>
        </div>
        
        {/* Area Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AREAS.map(area => (
            <Link 
              key={area.id}
              href={`/admin/handbook/${area.id}`}
              className="group bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 hover:bg-slate-800 transition-all hover:scale-[1.02]"
            >
              <div className={`w-14 h-14 bg-gradient-to-br ${area.gradient} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                {area.icon}
              </div>
              <h2 className="font-bold text-white text-lg mb-1">{area.name}</h2>
              <p className="text-slate-500 text-sm mb-3">{area.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">{area.count} works</span>
                <span className="text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all">→</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-10 bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Reference</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{totalWorks}</div>
              <div className="text-slate-500 text-sm">Total Works</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">2-6</div>
              <div className="text-slate-500 text-sm">Age Range</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">11</div>
              <div className="text-slate-500 text-sm">Sensitive Periods</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{AREAS.length}</div>
              <div className="text-slate-500 text-sm">Areas</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
