// /schools/[slug]/classrooms/[id]/page.tsx
// THE STEM - Multi-tenant classroom view
// Clean. Portable. Can be migrated to any domain.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  date_of_birth?: string;
}

interface School {
  id: string;
  name: string;
  slug: string;
}

export default function ClassroomPage() {
  const params = useParams();
  const schoolSlug = params.slug as string;
  const classroomId = params.id as string;
  
  const [school, setSchool] = useState<School | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClassroom();
  }, [schoolSlug, classroomId]);

  async function fetchClassroom() {
    try {
      const res = await fetch(`/api/schools/${schoolSlug}/classrooms/${classroomId}`);
      if (!res.ok) throw new Error('Failed to load classroom');
      const data = await res.json();
      setSchool(data.school);
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/schools" className="text-teal-400 hover:underline">← Back to schools</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Breadcrumb */}
      <nav className="border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-slate-500">
          <Link href="/schools" className="hover:text-white">Schools</Link>
          <span>/</span>
          <Link href={`/schools/${schoolSlug}`} className="hover:text-white">{school?.name}</Link>
          <span>/</span>
          <span className="text-teal-400">{classroomId}</span>
        </div>
      </nav>

      {/* Header */}
      <header className="px-4 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐋</span>
            <div>
              <h1 className="text-2xl font-bold capitalize">{classroomId} Class</h1>
              <p className="text-slate-400">{students.length} students • {school?.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 mb-6 focus:outline-none focus:border-teal-500"
        />

        {/* Student List */}
        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No students found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((student, i) => (
              <Link
                key={student.id}
                href={`/schools/${schoolSlug}/students/${student.id}`}
                className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <span className="w-8 h-8 bg-teal-900 text-teal-300 rounded-full flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <span className="font-medium">{student.name}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
