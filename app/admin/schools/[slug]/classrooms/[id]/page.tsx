// app/admin/schools/[slug]/classrooms/[id]/page.tsx
// Classroom Detail - MULTI-TENANT: Fetches from database
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  display_order: number;
  current_work?: string;
}

interface Classroom {
  id: string;
  name: string;
  school_id: string;
}

export default function ClassroomPage() {
  const params = useParams();
  const slug = params.slug as string;
  const classroomId = params.id as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClassroomData();
  }, [slug, classroomId]);

  async function fetchClassroomData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${slug}/classrooms/${classroomId}`);
      if (!res.ok) throw new Error('Failed to fetch classroom');
      const data = await res.json();
      setClassroom(data.classroom);
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-500 hover:text-white text-sm">
              ← Back
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">{classroom?.name || 'Classroom'}</h1>
            <span className="text-slate-600 text-sm">• {students.length} students</span>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-3 overflow-x-auto">
          <Link
            href={`/admin/schools/${slug}/english-reports`}
            className="px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-sm text-teal-400 hover:border-teal-500/50 transition-colors whitespace-nowrap"
          >
            📝 Weekly Reports
          </Link>
          <Link
            href={`/admin/schools/${slug}/newsletter`}
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 hover:border-amber-500/50 transition-colors whitespace-nowrap"
          >
            📰 Newsletter
          </Link>
          <Link
            href={`/admin/schools/${slug}/english`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            🔤 English Sequence
          </Link>
          <Link
            href={`/admin/schools/${slug}/curriculum`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            📚 Curriculum
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 mb-4"
        />

        {/* Students List */}
        <div className="divide-y divide-slate-800">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between py-3 -mx-4 px-4 hover:bg-slate-900/50 rounded-lg cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-500">
                  {student.display_order}
                </span>
                <span className="text-white font-medium">{student.name}</span>
              </div>
              {student.current_work && (
                <span className="text-slate-500 text-sm">{student.current_work}</span>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-slate-600 text-center py-8">
            {search ? 'No students match your search' : 'No students in this classroom'}
          </p>
        )}
      </div>
    </div>
  );
}
