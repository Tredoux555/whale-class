// app/admin/schools/[slug]/page.tsx
// Individual School Dashboard - Clean UI
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface School {
  id: string;
  name: string;
  slug: string;
  settings?: { owner?: boolean };
  classroom_count: number;
  teacher_count: number;
  student_count: number;
}

// Mock data - will be replaced with real API
const MOCK_SCHOOLS: Record<string, School> = {
  'beijing-international': {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Beijing International School',
    slug: 'beijing-international',
    settings: { owner: true },
    classroom_count: 1,
    teacher_count: 2,
    student_count: 12,
  },
};

export default function SchoolDashboardPage() {
  const params = useParams();
  const slug = params.slug as string;
  const school = MOCK_SCHOOLS[slug];

  if (!school) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">School Not Found</h2>
          <Link href="/admin/schools" className="text-amber-400 hover:text-amber-300">
            ← Back to Schools
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = school.settings?.owner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className={`${isOwner ? 'bg-gradient-to-r from-amber-900/30 to-yellow-900/20' : 'bg-slate-800/50'} backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/schools" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Schools
            </Link>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${isOwner ? 'bg-gradient-to-br from-amber-500 to-yellow-500' : 'bg-slate-700'}`}>
              <span className="text-2xl">{isOwner ? '🐋' : '🏫'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{school.name}</h1>
                {isOwner && (
                  <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold">
                    YOUR SCHOOL
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">School Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className={`rounded-xl p-5 ${isOwner ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
            <div className={`text-4xl font-bold ${isOwner ? 'text-amber-400' : 'text-white'}`}>{school.classroom_count}</div>
            <div className="text-slate-400 mt-1">Classrooms</div>
          </div>
          <div className={`rounded-xl p-5 ${isOwner ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
            <div className={`text-4xl font-bold ${isOwner ? 'text-amber-400' : 'text-white'}`}>{school.teacher_count}</div>
            <div className="text-slate-400 mt-1">Teachers</div>
          </div>
          <div className={`rounded-xl p-5 ${isOwner ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/50 border border-slate-700'}`}>
            <div className={`text-4xl font-bold ${isOwner ? 'text-amber-400' : 'text-white'}`}>{school.student_count}</div>
            <div className="text-slate-400 mt-1">Students</div>
          </div>
        </div>

        {/* Curriculum Section */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Curriculum</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href={`/admin/schools/${slug}/curriculum`}
              className="group bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📚</div>
              <h3 className="text-lg font-bold text-white">Curriculum</h3>
              <p className="text-white/70 text-sm mt-1">Customize works for this school</p>
            </Link>
            
            <Link
              href={`/admin/schools/${slug}/english`}
              className="group bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🔤</div>
              <h3 className="text-lg font-bold text-white">English Progression</h3>
              <p className="text-white/70 text-sm mt-1">WBW/a/, WBW/e/ sequence</p>
            </Link>
            
            <Link
              href="/admin/weekly-planning"
              className="group bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📅</div>
              <h3 className="text-lg font-bold text-white">Weekly Planning</h3>
              <p className="text-white/70 text-sm mt-1">Upload & manage plans</p>
            </Link>
          </div>
        </section>

        {/* Teaching Tools Section */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Teaching Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              href="/admin/classroom"
              className="group bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🎯</div>
              <h3 className="text-lg font-bold text-white">Classroom View</h3>
              <p className="text-white/70 text-sm mt-1">iPad-friendly tracking</p>
            </Link>
            
            <Link
              href={`/admin/schools/${slug}/english-reports`}
              className="group bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📝</div>
              <h3 className="text-lg font-bold text-white">English Reports</h3>
              <p className="text-white/70 text-sm mt-1">Weekly auto-generated</p>
            </Link>
            
            <Link
              href="/admin/english-progress"
              className="group bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/20"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📊</div>
              <h3 className="text-lg font-bold text-white">English Progress</h3>
              <p className="text-white/70 text-sm mt-1">Parent journey view</p>
            </Link>
          </div>
        </section>

        {/* Management Section */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/principal"
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center text-2xl">👔</div>
              <div>
                <h3 className="font-bold text-white">Principal</h3>
                <p className="text-sm text-slate-400">Overview</p>
              </div>
            </Link>
            
            <Link
              href={`/admin/schools/${slug}/classrooms`}
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">🏫</div>
              <div>
                <h3 className="font-bold text-white">Classrooms</h3>
                <p className="text-sm text-slate-400">{school.classroom_count} classes</p>
              </div>
            </Link>
            
            <Link
              href={`/admin/schools/${slug}/teachers`}
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">👩‍🏫</div>
              <div>
                <h3 className="font-bold text-white">Teachers</h3>
                <p className="text-sm text-slate-400">{school.teacher_count} teachers</p>
              </div>
            </Link>
            
            <Link
              href={`/admin/schools/${slug}/students`}
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">👶</div>
              <div>
                <h3 className="font-bold text-white">Students</h3>
                <p className="text-sm text-slate-400">{school.student_count} students</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Quick Links */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/card-generator" className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 hover:text-white transition-colors">
              🃏 3-Part Cards
            </Link>
            <Link href="/admin/material-generator" className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 hover:text-white transition-colors">
              🖨️ Materials
            </Link>
            <Link href="/admin/english-guide" className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 hover:text-white transition-colors">
              📖 English Guide
            </Link>
            <Link href="/admin/circle-planner" className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-slate-600 hover:text-white transition-colors">
              ⭕ Circle Time
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
