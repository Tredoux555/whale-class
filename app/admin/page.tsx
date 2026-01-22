// app/admin/page.tsx
// Beautiful Admin Dashboard - Quick Stats + Tools

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
  gradient?: string;
}

interface Stats {
  children: number;
  works: number;
  games: number;
  week: number;
}

const QUICK_ACTIONS = [
  { id: 'classroom', title: 'Classroom', href: '/admin/classroom', icon: '🎯', gradient: 'from-emerald-500 to-teal-500', desc: 'Track progress' },
  { id: 'handbook', title: 'Handbook', href: '/admin/handbook', icon: '📚', gradient: 'from-indigo-500 to-purple-500', desc: '213 works' },
  { id: 'games', title: 'Games', href: '/games', icon: '🎮', gradient: 'from-pink-500 to-rose-500', desc: 'Play & learn' },
  { id: 'weekly', title: 'Weekly Planning', href: '/admin/weekly-planning', icon: '📅', gradient: 'from-cyan-500 to-blue-500', desc: 'Upload plans' },
];

const TOOLS: Tool[] = [
  // Teaching Tools
  { id: 'circle-planner', title: 'Circle Time', href: '/admin/circle-planner', icon: '⭕', color: 'bg-amber-500', description: 'Plan activities' },
  { id: 'english-guide', title: 'English Guide', href: '/admin/english-guide', icon: '📖', color: 'bg-blue-500', description: 'How to teach' },
  { id: 'english-setup', title: 'English Setup', href: '/admin/english-setup', icon: '🗄️', color: 'bg-teal-500', description: 'Shelf layout' },
  { id: 'english-progress', title: 'English Progress', href: '/admin/english-progress', icon: '📊', color: 'bg-indigo-500', description: 'Parent reports' },
  { id: 'phonics-planner', title: 'Phonics', href: '/admin/phonics-planner', icon: '🔤', color: 'bg-red-500', description: 'Phonics lessons' },
  
  // Material Generators
  { id: 'card-generator', title: '3-Part Cards', href: '/admin/card-generator', icon: '🃏', color: 'bg-purple-500', description: 'Montessori cards' },
  { id: 'material-generator', title: 'Material Generator', href: '/admin/material-generator', icon: '🖨️', color: 'bg-pink-500', description: 'Pink/Blue/Green' },
  { id: 'flashcard-maker', title: 'Song Flashcards', href: '/admin/flashcard-maker', icon: '🎵', color: 'bg-violet-500', description: 'YouTube to PDF' },
  { id: 'vocabulary-flashcards', title: 'Vocab Flashcards', href: '/admin/vocabulary-flashcards', icon: '📇', color: 'bg-teal-500', description: 'Weekly vocab' },
  
  // Management
  { id: 'video-manager', title: 'Video Manager', href: '/admin/video-manager', icon: '🎬', color: 'bg-orange-500', description: 'Homepage videos' },
  { id: 'media-library', title: 'Media Library', href: '/admin/media-library', icon: '📁', color: 'bg-slate-500', description: 'Uploaded files' },
  { id: 'montree', title: 'Independent Montree', href: '/admin/montree', icon: '🌳', color: 'bg-green-600', description: 'Multi-tenant' },
  { id: 'site-tester', title: 'Site Tester', href: '/admin/site-tester', icon: '🔍', color: 'bg-slate-600', description: 'Test & debug' },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ children: 18, works: 213, games: 20, week: 4 });
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    checkAuth();
    updateGreeting();
    fetchStats();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  };

  const fetchStats = async () => {
    try {
      // Get current week
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      
      // Fetch children count
      const childRes = await fetch('/api/classroom/children');
      const childData = await childRes.json();
      
      setStats({
        children: childData.children?.length || 18,
        works: 213,
        games: 20,
        week
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl">🐋</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{greeting}, Tredoux!</h1>
              <p className="text-slate-400 text-sm">Week {stats.week} • Whale Class</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors text-sm"
            >
              🌐 View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600/80 text-white rounded-xl font-medium hover:bg-red-600 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        
        {/* Quick Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-emerald-400">{stats.children}</div>
            <div className="text-emerald-300/80 text-sm">Students</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-purple-400">{stats.works}</div>
            <div className="text-purple-300/80 text-sm">Montessori Works</div>
          </div>
          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-pink-400">{stats.games}</div>
            <div className="text-pink-300/80 text-sm">Learning Games</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 border border-cyan-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-cyan-400">Week {stats.week}</div>
            <div className="text-cyan-300/80 text-sm">{new Date().getFullYear()}</div>
          </div>
        </section>

        {/* Quick Actions - Primary */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className={`group bg-gradient-to-br ${action.gradient} rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl`}
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{action.icon}</div>
                <h3 className="font-bold text-white text-lg">{action.title}</h3>
                <p className="text-white/70 text-sm">{action.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* SCHOOLS - Primary Action */}
        <section className="mb-8">
          <Link
            href="/admin/schools"
            className="block bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl p-6 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-amber-500/20 group"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <span className="text-4xl group-hover:scale-110 transition-transform">🏛️</span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">Schools</h2>
                <p className="text-white/80">Manage schools, curriculum, teachers, students & reports</p>
              </div>
              <div className="text-white/60 group-hover:text-white group-hover:translate-x-2 transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        {/* Print & Reports */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Print & Reports</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/classroom/print?week=4&year=2026&mode=grid"
              target="_blank"
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl">🖨️</span>
              </div>
              <h3 className="font-bold text-white text-sm">Print Weekly Plan</h3>
              <p className="text-slate-500 text-xs mt-1">Grid, Cards, or Wall mode</p>
            </Link>
            <Link
              href="/admin/english-progress"
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-purple-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="font-bold text-white text-sm">English Reports</h3>
              <p className="text-slate-500 text-xs mt-1">Generate parent updates</p>
            </Link>
            <Link
              href="/admin/classroom"
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-emerald-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl">📄</span>
              </div>
              <h3 className="font-bold text-white text-sm">Student Reports</h3>
              <p className="text-slate-500 text-xs mt-1">Individual progress PDFs</p>
            </Link>
          </div>
        </section>

        {/* TOOLS */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">All Tools</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {TOOLS.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="group bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800 transition-all"
              >
                <div className={`w-10 h-10 ${tool.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <span className="text-xl">{tool.icon}</span>
                </div>
                <h3 className="font-bold text-white text-sm">{tool.title}</h3>
                <p className="text-slate-500 text-xs mt-1">{tool.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-600 text-sm">
          <p>🐋 Whale Montessori Platform • teacherpotato.xyz</p>
        </div>
      </main>
    </div>
  );
}
