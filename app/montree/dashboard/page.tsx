// /montree/dashboard/page.tsx
// Session 84: Grid layout + demo mode support
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import QuickCapture from '@/components/media/QuickCapture';
import SyncStatus from '@/components/media/SyncStatus';
import DemoTutorial, { CLASSROOM_STEPS } from '@/components/montree/DemoTutorial';
import { initSync } from '@/lib/media';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

const AVATAR_COLORS = [
  ['#ec4899', '#f43f5e'], // pink-rose
  ['#8b5cf6', '#a855f7'], // violet-purple
  ['#3b82f6', '#6366f1'], // blue-indigo
  ['#06b6d4', '#14b8a6'], // cyan-teal
  ['#10b981', '#22c55e'], // emerald-green
  ['#f59e0b', '#f97316'], // amber-orange
];

function getAvatarColor(index: number): [string, string] {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initSync();
    }
  }, []);

  useEffect(() => {
    fetch('/api/montree/children')
      .then(r => r.json())
      .then(data => {
        setStudents(data.children || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openQuickCapture = useCallback(() => {
    setQuickCaptureOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐋</span>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">Whale Class</h1>
                <div className="h-3 w-16 bg-slate-200 rounded animate-pulse mt-1"></div>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 max-w-4xl mx-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center p-4 bg-white/70 rounded-2xl">
                <div className="w-14 h-14 rounded-full bg-slate-200 animate-pulse mb-2"></div>
                <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐋</span>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Whale Class</h1>
              <p className="text-xs text-slate-400">{students.length} students</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <SyncStatus showLabel={false} />
            
            <Link
              href="/montree/dashboard/reports"
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-base">📊</span>
            </Link>
            
            <Link
              href="/montree/dashboard/media"
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-base">🖼️</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="px-4 py-3 max-w-4xl mx-auto">
        <button
          onClick={openQuickCapture}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
        >
          <span className="text-xl">📷</span>
          <span>Quick Photo</span>
        </button>
      </div>

      {/* Student Grid */}
      <main className="px-4 py-6 max-w-4xl mx-auto pb-40">
        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🐋</div>
            <p className="text-slate-500 mb-4">No students yet</p>
            <Link href="/montree/admin/students" className="text-emerald-600 font-medium">
              + Add students
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {students.map((student, index) => {
              const colors = getAvatarColor(index);

              return (
                <Link
                  key={student.id}
                  href={`/montree/dashboard/student/${student.id}`}
                  className="relative flex flex-col items-center p-4 rounded-2xl transition-all bg-white/70 hover:bg-white hover:shadow-md"
                >
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md mb-2"
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <p className="font-medium text-slate-800 text-sm text-center truncate w-full">
                    {student.name}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Camera Button */}
      <button
        onClick={openQuickCapture}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-90 transition-transform z-50"
      >
        <span className="text-2xl">📷</span>
      </button>

      {/* Quick Capture Modal */}
      <QuickCapture
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        students={students}
      />

      {/* Demo Tutorial - only shows when ?demo=zohan is in URL */}
      <Suspense fallback={null}>
        <DemoTutorial steps={CLASSROOM_STEPS} />
      </Suspense>
    </div>
  );
}
