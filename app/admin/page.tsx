// app/admin/page.tsx
// Simplified Admin Dashboard - Schools + Tools

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Tool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

const TOOLS: Tool[] = [
  // Teaching Tools
  { id: 'classroom', title: 'Classroom', href: '/admin/classroom', icon: '🎯', color: 'bg-emerald-500', description: 'iPad progress tracking' },
  { id: 'weekly-planning', title: 'Weekly Planning', href: '/admin/weekly-planning', icon: '📅', color: 'bg-cyan-500', description: 'Upload & manage plans' },
  { id: 'circle-planner', title: 'Circle Time', href: '/admin/circle-planner', icon: '⭕', color: 'bg-amber-500', description: 'Plan activities' },
  { id: 'handbook', title: 'Handbook', href: '/admin/handbook', icon: '📚', color: 'bg-indigo-500', description: '213 Montessori works' },
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) router.push("/admin/login");
    } catch {
      router.push("/admin/login");
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🐋</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Whale Montessori Platform</p>
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
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        
        {/* SCHOOLS - Primary Action */}
        <section className="mb-10">
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

        {/* TOOLS */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Tools</h2>
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
          <p>Whale Montessori Platform</p>
        </div>
      </main>
    </div>
  );
}
