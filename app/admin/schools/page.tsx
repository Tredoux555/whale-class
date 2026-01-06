'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  classroom_count: number;
  teacher_count: number;
  student_count: number;
}

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/admin/schools');
      const data = await res.json();
      setSchools(data.schools || []);
    } catch (error) {
      console.error('Failed to fetch schools:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading schools...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🏫 Schools</h1>
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Admin
        </Link>
      </div>

      {schools.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No schools found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/admin/schools/${school.id}`}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt={school.name} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    '🏫'
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{school.name}</h2>
                  <p className="text-sm text-gray-500">{school.slug}</p>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{school.classroom_count}</div>
                    <div className="text-xs text-gray-500">Classrooms</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{school.teacher_count}</div>
                    <div className="text-xs text-gray-500">Teachers</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{school.student_count}</div>
                    <div className="text-xs text-gray-500">Students</div>
                  </div>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
