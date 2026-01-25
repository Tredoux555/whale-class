// app/admin/schools/page.tsx
// Schools - Tesla Design: Clean, Direct, Scalable
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  isOwner?: boolean;
  isActive: boolean;
  classrooms: number;
  teachers: number;
  students: number;
}

// Mock data
const MOCK_SCHOOLS: School[] = [
  { id: '1', name: 'Beijing International School', slug: 'beijing-international', isOwner: true, isActive: true, classrooms: 1, teachers: 2, students: 12 },
];

export default function SchoolsPage() {
  const [schools] = useState<School[]>(MOCK_SCHOOLS);
  const [search, setSearch] = useState('');

  const filtered = schools.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-slate-500 hover:text-white text-sm">
              ← Admin
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">Schools</h1>
          </div>
          <button className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
            + Add School
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="max-w-4xl mx-auto px-6 py-4">
        <input
          type="text"
          placeholder="Search schools..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700"
        />
      </div>

      {/* Schools List */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="divide-y divide-slate-800">
          {filtered.map((school) => (
            <Link
              key={school.id}
              href={`/admin/schools/${school.slug}`}
              className="flex items-center justify-between py-4 hover:bg-slate-900/50 -mx-4 px-4 rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${school.isActive ? 'bg-green-500' : 'bg-slate-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{school.name}</span>
                    {school.isOwner && (
                      <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                        Owner
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-sm">/{school.slug}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-slate-400 text-sm">{school.classrooms} class</span>
                  <span className="text-slate-700 mx-2">·</span>
                  <span className="text-slate-400 text-sm">{school.teachers} teachers</span>
                  <span className="text-slate-700 mx-2">·</span>
                  <span className="text-slate-400 text-sm">{school.students} students</span>
                </div>
                <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No schools found</p>
          </div>
        )}

        {/* Quick Access - Minimal */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-600 text-xs uppercase tracking-wider mb-4">Master Templates</p>
          <div className="flex gap-4">
            <Link 
              href="/admin/schools/master/curriculum" 
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              Curriculum →
            </Link>
            <Link 
              href="/admin/schools/master/english" 
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              English Sequence →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
