// app/admin/schools/[slug]/curriculum/page.tsx
// School Curriculum Management - Clean UI
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  workCount: number;
}

const MOCK_AREAS: CurriculumArea[] = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-amber-500 to-orange-500', workCount: 45 },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-pink-500 to-rose-500', workCount: 38 },
  { id: 'math', name: 'Mathematics', icon: '🔢', color: 'from-blue-500 to-indigo-500', workCount: 52 },
  { id: 'language', name: 'Language', icon: '📚', color: 'from-green-500 to-emerald-500', workCount: 35 },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: 'from-purple-500 to-violet-500', workCount: 25 },
];

const SCHOOL_NAME = 'Beijing International School';

export default function SchoolCurriculumPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [areas] = useState<CurriculumArea[]>(MOCK_AREAS);

  const totalWorks = areas.reduce((sum, a) => sum + a.workCount, 0);

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
          
          <button className="px-4 py-2 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors text-sm">
            🔄 Sync from Master
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6">
        {/* Info */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <p className="text-amber-200 text-sm">
            <strong className="text-amber-400">School Curriculum</strong> — 
            Customize works for {SCHOOL_NAME}. Changes here don't affect the master curriculum.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-amber-400">{totalWorks}</div>
            <div className="text-sm text-slate-400">Total Works</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-blue-400">{areas.length}</div>
            <div className="text-sm text-slate-400">Areas</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
            <div className="text-3xl font-bold text-green-400">✓</div>
            <div className="text-sm text-slate-400">Synced</div>
          </div>
        </div>

        {/* Areas Grid */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Curriculum Areas</h2>
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

        {/* Quick Actions */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors">
            <div className="text-xl mb-2">➕</div>
            <div className="font-medium text-white text-sm">Add Work</div>
          </button>
          <button className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors">
            <div className="text-xl mb-2">📥</div>
            <div className="font-medium text-white text-sm">Import</div>
          </button>
          <button className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left hover:border-slate-600 transition-colors">
            <div className="text-xl mb-2">📤</div>
            <div className="font-medium text-white text-sm">Export</div>
          </button>
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
