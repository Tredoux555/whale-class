// /schools/page.tsx
// THE ROOT - All schools in the platform
// This is the entry point. The stem from which all branches grow.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schools')
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">Schools</h1>
          <p className="text-slate-400 mt-1">Select a school to view classrooms</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {schools.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No schools registered</p>
        ) : (
          <div className="space-y-3">
            {schools.map(school => (
              <Link
                key={school.id}
                href={`/schools/${school.slug}`}
                className="block p-5 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <h2 className="font-semibold text-lg">{school.name}</h2>
                <p className="text-slate-500 text-sm mt-1">/{school.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
