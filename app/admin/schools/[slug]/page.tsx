// app/admin/schools/[slug]/page.tsx
// THE STEM - School Dashboard
// Single source of truth. Everything grows from here.
// If this goes down for even a day, we lose the school forever.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Classroom {
  id: string;
  name: string;
  teacher?: string;
  teacherId?: string;
  studentCount: number;
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
  classroom?: string;
  classroomId?: string;
  isActive: boolean;
  role: 'owner' | 'teacher' | 'assistant';
}

// Whale Class - THE classroom
const WHALE_CLASS: Classroom = { 
  id: 'whale', 
  name: 'Whale Class', 
  teacher: 'Tredoux', 
  teacherId: 'tredoux', 
  studentCount: 18 
};

// Teachers - Tredoux active, others inactive for now
const TEACHERS: Teacher[] = [
  { id: 'tredoux', name: 'Tredoux', classroom: 'Whale Class', classroomId: 'whale', isActive: true, role: 'owner' },
  { id: 'jasmine', name: 'Jasmine', isActive: false, role: 'teacher' },
  { id: 'ivan', name: 'Ivan', isActive: false, role: 'teacher' },
];

const SCHOOL_NAMES: Record<string, string> = {
  'beijing-international': 'Beijing International School',
  'master': 'Master Templates',
};

export default function SchoolPage() {
  const params = useParams();
  const slug = params.slug as string;
  const schoolName = SCHOOL_NAMES[slug] || slug;
  
  const [tab, setTab] = useState<'classrooms' | 'teachers' | 'tools'>('classrooms');
  const [classrooms] = useState<Classroom[]>([WHALE_CLASS]);
  const [teachers] = useState<Teacher[]>(TEACHERS);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/schools" className="text-slate-500 hover:text-white text-sm">
                ← Schools
              </Link>
              <span className="text-slate-700">/</span>
              <h1 className="text-white font-medium">{schoolName}</h1>
            </div>
            <span className="text-xs text-slate-600 bg-slate-900 px-2 py-1 rounded">🌱 THE STEM</span>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-6">
            <button
              onClick={() => setTab('classrooms')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'classrooms' ? 'text-white border-white' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Classrooms ({classrooms.length})
            </button>
            <button
              onClick={() => setTab('teachers')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'teachers' ? 'text-white border-white' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Teachers ({teachers.length})
            </button>
            <button
              onClick={() => setTab('tools')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'tools' ? 'text-white border-white' : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Tools
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        
        {/* CLASSROOMS TAB */}
        {tab === 'classrooms' && (
          <div>
            <div className="divide-y divide-slate-800">
              {classrooms.map((classroom) => (
                <Link
                  key={classroom.id}
                  href={`/admin/schools/${slug}/classrooms/${classroom.id}`}
                  className="flex items-center justify-between py-4 hover:bg-slate-900/50 -mx-4 px-4 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-teal-500" />
                    <div>
                      <span className="text-white font-medium">{classroom.name}</span>
                      {classroom.teacher && (
                        <span className="text-slate-500 text-sm ml-3">{classroom.teacher}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm">{classroom.studentCount} students</span>
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* TEACHERS TAB */}
        {tab === 'teachers' && (
          <div className="divide-y divide-slate-800">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center justify-between py-4 -mx-4 px-4">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${teacher.isActive ? 'bg-green-500' : 'bg-slate-700'}`} />
                  <div>
                    <span className="text-white font-medium">{teacher.name}</span>
                    {teacher.role === 'owner' && (
                      <span className="ml-2 px-2 py-0.5 bg-teal-500/20 text-teal-400 text-xs rounded">Owner</span>
                    )}
                    {!teacher.isActive && (
                      <span className="ml-2 text-slate-600 text-xs">Inactive</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {teacher.classroom ? (
                    <span className="text-slate-500 text-sm">{teacher.classroom}</span>
                  ) : (
                    <span className="text-slate-600 text-sm">Unassigned</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TOOLS TAB */}
        {tab === 'tools' && (
          <div className="grid gap-3">
            {/* PRIORITY: English Reports */}
            <Link
              href={`/admin/schools/${slug}/english-reports`}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-xl hover:border-teal-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <span className="text-white font-medium">Weekly English Reports</span>
                  <p className="text-slate-400 text-xs">Generate individual student reports</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-teal-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Newsletter Generator */}
            <Link
              href={`/admin/schools/${slug}/newsletter`}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl hover:border-amber-500/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📰</span>
                <div>
                  <span className="text-white font-medium">Newsletter Generator</span>
                  <p className="text-slate-400 text-xs">Weekly reports from Circle Time</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* English Sequence */}
            <Link
              href={`/admin/schools/${slug}/english`}
              className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔤</span>
                <div>
                  <span className="text-white font-medium">English Progression</span>
                  <p className="text-slate-400 text-xs">30 works: WBW → WFW → PR → PrPh</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Curriculum */}
            <Link
              href={`/admin/schools/${slug}/curriculum`}
              className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                <div>
                  <span className="text-white font-medium">Curriculum</span>
                  <p className="text-slate-400 text-xs">74 Montessori works by area</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Student Progress */}
            <Link
              href={`/admin/schools/${slug}/classrooms/whale`}
              className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👶</span>
                <div>
                  <span className="text-white font-medium">Student Progress</span>
                  <p className="text-slate-400 text-xs">18 Whale Class students</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {/* Divider */}
            <div className="border-t border-slate-800 my-2"></div>

            {/* Settings */}
            <Link
              href={`/admin/schools/${slug}/settings`}
              className="flex items-center justify-between p-3 hover:bg-slate-900 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">⚙️</span>
                <span className="text-slate-400 text-sm">School Settings</span>
              </div>
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Login Quick Reference - Always visible at bottom */}
        <div className="mt-12 pt-6 border-t border-slate-800">
          <p className="text-slate-600 text-xs uppercase tracking-wider mb-3">Quick Login</p>
          <div className="bg-slate-900 rounded-lg p-3 inline-block">
            <code className="text-sm text-slate-400">
              Admin: <span className="text-white">Tredoux</span> / <span className="text-white">870602</span>
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
