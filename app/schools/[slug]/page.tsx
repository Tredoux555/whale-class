// /schools/[slug]/page.tsx
// SCHOOL DASHBOARD - Shows all classrooms in this school
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface School {
  id: string;
  name: string;
  slug: string;
}

interface Classroom {
  id: string;
  name: string;
  student_count: number;
}

export default function SchoolPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/schools/${slug}`)
      .then(res => res.json())
      .then(data => {
        setSchool(data.school);
        setClassrooms(data.classrooms || []);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
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
          <span className="text-teal-400">{school?.name}</span>
        </div>
      </nav>

      <header className="px-4 py-6 border-b border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">{school?.name}</h1>
          <p className="text-slate-400 mt-1">{classrooms.length} classrooms</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {classrooms.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No classrooms yet</p>
        ) : (
          <div className="space-y-3">
            {classrooms.map(c => (
              <Link
                key={c.id}
                href={`/schools/${slug}/classrooms/${c.name.toLowerCase()}`}
                className="flex items-center justify-between p-5 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div>
                  <h2 className="font-semibold">{c.name} Class</h2>
                  <p className="text-slate-500 text-sm">{c.student_count} students</p>
                </div>
                <span className="text-slate-600">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
