'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  display_order: number;
  date_of_birth?: string;
  current_work?: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const [student, setStudent] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  async function fetchStudent() {
    try {
      const res = await fetch(`/api/classroom/student/${studentId}`);
      const data = await res.json();
      setStudent(data.student);
    } catch (err) {
      console.error('Failed to fetch student:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Student not found</p>
          <Link href="/admin/classroom" className="text-teal-600 hover:underline">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  const initials = student.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/classroom" 
              className="text-gray-400 hover:text-gray-600"
            >
              ← Back
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-xl">
                {initials}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
                <p className="text-sm text-gray-500">Student #{student.display_order}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Current Work Section */}
        <section className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Current Work
          </h2>
          <div className="bg-teal-50 rounded-lg p-4 border border-teal-100">
            <p className="text-lg font-medium text-teal-700">
              {student.current_work || 'No work assigned'}
            </p>
            <p className="text-sm text-teal-600 mt-1">Started: —</p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Quick Log
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 transition-colors">
              <span className="text-2xl">✓</span>
              <span className="text-sm font-medium">Done</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors">
              <span className="text-2xl">🔄</span>
              <span className="text-sm font-medium">Repeat</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors">
              <span className="text-2xl">→</span>
              <span className="text-sm font-medium">Next Work</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors">
              <span className="text-2xl">📝</span>
              <span className="text-sm font-medium">Add Note</span>
            </button>
          </div>
        </section>

        {/* Recent History */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Recent History
          </h2>
          <div className="text-center py-8 text-gray-400">
            <p>No history yet</p>
            <p className="text-sm mt-1">Log work to see history here</p>
          </div>
        </section>
      </main>
    </div>
  );
}
