// /montree/dashboard/page.tsx
// REBUILT: Clean, minimal, beautiful classroom dashboard
// Session 54: Deep audit - simpler UI

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import QuickCapture from '@/components/media/QuickCapture';
import SyncStatus from '@/components/media/SyncStatus';
import { initSync } from '@/lib/media';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);

  // Initialize offline sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initSync();
    }
  }, []);

  // Fetch students
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

  // ==========================================
  // LOADING STATE
  // ==========================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-pulse">🐋</span>
          </div>
          <p className="text-slate-500">Loading classroom...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* ========== HEADER ========== */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
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

      {/* ========== QUICK ACTIONS ========== */}
      <div className="px-4 py-3 max-w-2xl mx-auto">
        <button
          onClick={openQuickCapture}
          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
        >
          <span className="text-xl">📷</span>
          <span>Quick Photo</span>
        </button>
      </div>

      {/* ========== STUDENT LIST ========== */}
      <main className="px-4 pb-8 max-w-2xl mx-auto">
        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🐋</div>
            <p className="text-slate-500 mb-4">No students yet</p>
            <Link 
              href="/montree/admin/students" 
              className="text-emerald-600 font-medium"
            >
              + Add students
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student, index) => (
              <Link
                key={student.id}
                href={`/montree/dashboard/student/${student.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.99]"
              >
                {/* Avatar */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, ${getAvatarColor(index)[0]}, ${getAvatarColor(index)[1]})`
                  }}
                >
                  {student.name.charAt(0)}
                </div>
                
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{student.name}</p>
                </div>
                
                {/* Arrow */}
                <span className="text-slate-300">›</span>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* ========== FLOATING CAMERA BUTTON ========== */}
      <button
        onClick={openQuickCapture}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-90 transition-transform z-50"
      >
        <span className="text-2xl">📷</span>
      </button>

      {/* ========== QUICK CAPTURE MODAL ========== */}
      <QuickCapture
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        students={students}
      />
    </div>
  );
}

// ==========================================
// HELPERS
// ==========================================

const AVATAR_COLORS = [
  ['#10b981', '#14b8a6'], // emerald-teal
  ['#3b82f6', '#6366f1'], // blue-indigo
  ['#f59e0b', '#f97316'], // amber-orange
  ['#ec4899', '#f43f5e'], // pink-rose
  ['#8b5cf6', '#a855f7'], // violet-purple
  ['#06b6d4', '#0ea5e9'], // cyan-sky
];

function getAvatarColor(index: number): [string, string] {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
