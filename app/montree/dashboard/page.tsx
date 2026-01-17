// /montree/dashboard/page.tsx
// THE DASHBOARD - Student grid with REAL progress data
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StudentProgress {
  completed: number;
  in_progress: number;
  percentage: number;
}

interface Student {
  id: string;
  name: string;
  display_order: number;
  date_of_birth?: string;
  progress: StudentProgress;
}

// Emoji assignment based on student order (consistent)
const STUDENT_EMOJIS = [
  '🌸', '🚀', '🍀', '⚡', '🦋', '🦁', '🐨', '🎸', '🎯', '🏀',
  '🐮', '🌺', '🎨', '⭐', '🌊', '👑', '🌈', '💫', '🌻', '🎭'
];

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const res = await fetch('/api/montree/students');
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-400 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading students...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          <p className="font-medium">Error loading students</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={() => { setError(null); setLoading(true); fetchStudents(); }}
            className="mt-3 text-sm underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Calculate class stats
  const classProgress = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.progress?.percentage || 0), 0) / students.length)
    : 0;
  
  const totalCompleted = students.reduce((sum, s) => sum + (s.progress?.completed || 0), 0);
  const totalInProgress = students.reduce((sum, s) => sum + (s.progress?.in_progress || 0), 0);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Whale Class</h1>
          <p className="text-slate-500 text-sm">{students.length} students • Beijing International</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/montree/dashboard/reports"
            className="px-3 py-2 bg-teal-500/20 border border-teal-500/40 rounded-xl text-teal-400 text-sm font-medium hover:bg-teal-500/30 transition-all"
          >
            📝
          </Link>
          <button className="px-3 py-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 text-sm font-medium hover:bg-amber-500/30 transition-all">
            📹
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 rounded-2xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-white">{classProgress}%</div>
          <div className="text-slate-500 text-sm">Progress</div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 rounded-2xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-teal-400">{totalCompleted}</div>
          <div className="text-slate-500 text-sm">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900 rounded-2xl p-4 border border-slate-700/50">
          <div className="text-3xl font-bold text-amber-400">{totalInProgress}</div>
          <div className="text-slate-500 text-sm">In Progress</div>
        </div>
      </div>

      {/* Student Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">Students</h2>
          <span className="text-slate-600 text-sm">Tap to view</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {students.map((student, i) => (
            <Link
              key={student.id}
              href={`/montree/dashboard/student/${student.id}`}
              className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-teal-500/50 rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{STUDENT_EMOJIS[i % STUDENT_EMOJIS.length]}</span>
                <span className="text-white font-medium text-sm truncate">{student.name}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${student.progress?.percentage || 0}%` }}
                />
              </div>
              <div className="mt-1 text-slate-500 text-xs">
                {student.progress?.completed || 0} works done
              </div>
              {/* Order badge */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center text-xs text-slate-500">
                {student.display_order || i + 1}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {students.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🐋</div>
          <p className="text-slate-500">No students found</p>
          <p className="text-slate-600 text-sm mt-2">Run migration 040 in Supabase</p>
        </div>
      )}

      {/* Quick Add Button */}
      <div className="fixed bottom-24 right-4">
        <button className="w-14 h-14 bg-teal-500 hover:bg-teal-600 rounded-full shadow-lg shadow-teal-500/30 flex items-center justify-center text-white text-2xl transition-all hover:scale-110 active:scale-95">
          +
        </button>
      </div>
    </div>
  );
}
