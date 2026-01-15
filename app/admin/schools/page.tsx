// app/admin/schools/page.tsx
// Master Schools Management - UI First (Mock Data)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  contact_email?: string;
  settings?: {
    owner?: boolean;
    placeholder?: boolean;
    primary?: boolean;
  };
  is_active: boolean;
  created_at: string;
  classroom_count: number;
  teacher_count: number;
  student_count: number;
}

// Mock data - will be replaced with real API later
const MOCK_SCHOOLS: School[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Beijing International School',
    slug: 'beijing-international',
    settings: { owner: true, primary: true },
    is_active: true,
    created_at: '2024-01-01',
    classroom_count: 1,
    teacher_count: 2,
    student_count: 12,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'School 2 (Available)',
    slug: 'school-2',
    settings: { placeholder: true },
    is_active: true,
    created_at: '2024-01-01',
    classroom_count: 0,
    teacher_count: 0,
    student_count: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'School 3 (Available)',
    slug: 'school-3',
    settings: { placeholder: true },
    is_active: true,
    created_at: '2024-01-01',
    classroom_count: 0,
    teacher_count: 0,
    student_count: 0,
  },
];

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<School[]>(MOCK_SCHOOLS);
  const [loading, setLoading] = useState(false);

  // Sort: owner school first
  const sortedSchools = [...schools].sort((a, b) => {
    if (a.settings?.owner) return -1;
    if (b.settings?.owner) return 1;
    if (a.settings?.placeholder && !b.settings?.placeholder) return 1;
    if (!a.settings?.placeholder && b.settings?.placeholder) return -1;
    return a.name.localeCompare(b.name);
  });

  const activeSchools = schools.filter(s => !s.settings?.placeholder);
  const totalClassrooms = schools.reduce((acc, s) => acc + s.classroom_count, 0);
  const totalTeachers = schools.reduce((acc, s) => acc + s.teacher_count, 0);
  const totalStudents = schools.reduce((acc, s) => acc + s.student_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Admin
            </Link>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🏛️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Schools</h1>
              <p className="text-slate-400 text-sm">Whale Platform Master</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Platform Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-amber-400">{activeSchools.length}</div>
            <div className="text-sm text-slate-400">Active Schools</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400">{totalClassrooms}</div>
            <div className="text-sm text-slate-400">Classrooms</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-green-400">{totalTeachers}</div>
            <div className="text-sm text-slate-400">Teachers</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400">{totalStudents}</div>
            <div className="text-sm text-slate-400">Students</div>
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {sortedSchools.map((school) => {
            const isOwner = school.settings?.owner;
            const isPlaceholder = school.settings?.placeholder;
            
            return (
              <Link
                key={school.id}
                href={isPlaceholder ? '#' : `/admin/schools/${school.slug}`}
                className={`block rounded-2xl overflow-hidden transition-all ${
                  isPlaceholder 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20'
                }`}
              >
                <div className={`p-6 ${
                  isOwner 
                    ? 'bg-gradient-to-br from-amber-600 to-yellow-500' 
                    : isPlaceholder
                    ? 'bg-slate-800/50 border border-dashed border-slate-600'
                    : 'bg-gradient-to-br from-slate-700 to-slate-600'
                }`}>
                  {/* Badge */}
                  {isOwner && (
                    <div className="inline-flex items-center gap-1.5 bg-black/20 rounded-full px-3 py-1 text-xs font-bold text-white mb-3">
                      ⭐ YOUR SCHOOL
                    </div>
                  )}
                  
                  {isPlaceholder && (
                    <div className="inline-flex items-center gap-1.5 bg-slate-700/50 rounded-full px-3 py-1 text-xs font-medium text-slate-500 mb-3">
                      🔒 Available
                    </div>
                  )}
                  
                  {/* School Info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                      isOwner ? 'bg-white/20' : isPlaceholder ? 'bg-slate-700/50' : 'bg-slate-600'
                    }`}>
                      {isOwner ? '🐋' : isPlaceholder ? '➕' : '🏫'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className={`text-lg font-bold truncate ${
                        isOwner ? 'text-white' : isPlaceholder ? 'text-slate-500' : 'text-white'
                      }`}>
                        {school.name}
                      </h2>
                      <p className={`text-sm ${isOwner ? 'text-white/70' : 'text-slate-400'}`}>
                        /{school.slug}
                      </p>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  {!isPlaceholder && (
                    <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                      <div>
                        <div className={`text-xl font-bold ${isOwner ? 'text-white' : 'text-slate-200'}`}>
                          {school.classroom_count}
                        </div>
                        <div className={`text-xs ${isOwner ? 'text-white/60' : 'text-slate-400'}`}>Classes</div>
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${isOwner ? 'text-white' : 'text-slate-200'}`}>
                          {school.teacher_count}
                        </div>
                        <div className={`text-xs ${isOwner ? 'text-white/60' : 'text-slate-400'}`}>Teachers</div>
                      </div>
                      <div>
                        <div className={`text-xl font-bold ${isOwner ? 'text-white' : 'text-slate-200'}`}>
                          {school.student_count}
                        </div>
                        <div className={`text-xs ${isOwner ? 'text-white/60' : 'text-slate-400'}`}>Students</div>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Master Curriculum Section */}
        <div className="border-t border-slate-700 pt-8">
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            📕 Master Curriculum
          </h2>
          <p className="text-slate-400 text-sm mb-4">
            The master curriculum is cloned to each new school. Edit here to update the platform defaults.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/schools/master/curriculum"
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl">📚</div>
              <div>
                <h3 className="font-bold text-white">All Works</h3>
                <p className="text-sm text-slate-400">195 curriculum works</p>
              </div>
            </Link>
            
            <Link
              href="/admin/schools/master/english"
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center text-2xl">🔤</div>
              <div>
                <h3 className="font-bold text-white">English Sequence</h3>
                <p className="text-sm text-slate-400">15 English works</p>
              </div>
            </Link>
            
            <Link
              href="/admin/schools/master/areas"
              className="flex items-center gap-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">🎯</div>
              <div>
                <h3 className="font-bold text-white">Areas</h3>
                <p className="text-sm text-slate-400">5 curriculum areas</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
