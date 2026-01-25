// /montree/dashboard/page.tsx
// Session 86: Auth-aware dashboard - shows teacher's classroom only
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

interface TeacherSession {
  id: string;
  name: string;
  classroom_id: string;
  school_id: string;
  classroom_name: string;
  classroom_icon: string;
}

const AVATAR_COLORS = [
  ['#ec4899', '#f43f5e'],
  ['#8b5cf6', '#a855f7'],
  ['#3b82f6', '#6366f1'],
  ['#06b6d4', '#14b8a6'],
  ['#10b981', '#22c55e'],
  ['#f59e0b', '#f97316'],
];

function getAvatarColor(index: number): [string, string] {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemo = searchParams.get('demo') === 'true';
  
  const [teacher, setTeacher] = useState<TeacherSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Check auth on mount
  useEffect(() => {
    if (isDemo) {
      // Demo mode - use fake data
      setTeacher({
        id: 'demo',
        name: 'Demo Teacher',
        classroom_id: '00000000-0000-0000-0000-000000000002',
        school_id: '00000000-0000-0000-0000-000000000001',
        classroom_name: 'Whale Class',
        classroom_icon: '🐋',
      });
      return;
    }

    // Check localStorage for logged-in teacher
    const stored = localStorage.getItem('montree_teacher');
    if (!stored) {
      router.push('/montree/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setTeacher(parsed);
    } catch {
      localStorage.removeItem('montree_teacher');
      router.push('/montree/login');
    }
  }, [isDemo, router]);

  // Fetch students for this classroom
  useEffect(() => {
    if (!teacher?.classroom_id) return;

    const url = teacher.classroom_id 
      ? `/api/montree/children?classroom_id=${teacher.classroom_id}`
      : '/api/montree/children';

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setStudents(data.children || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [teacher?.classroom_id]);

  // Init sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initSync();
    }
  }, []);

  const openQuickCapture = useCallback(() => {
    setQuickCaptureOpen(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('montree_teacher');
    router.push('/montree/login');
  };

  const buildUrl = (path: string) => isDemo ? `${path}?demo=true` : path;

  // Loading state
  if (loading || !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
        <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
              <div>
                <div className="h-5 w-24 bg-slate-200 rounded animate-pulse"></div>
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
          {/* Classroom Info - clickable for logout */}
          <div className="relative">
            <button 
              onClick={() => setShowLogout(!showLogout)}
              className="flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -m-1 transition-colors"
            >
              <span className="text-2xl">{teacher.classroom_icon}</span>
              <div className="text-left">
                <h1 className="text-lg font-semibold text-slate-800">{teacher.classroom_name}</h1>
                <p className="text-xs text-slate-400">{students.length} students • {teacher.name}</p>
              </div>
            </button>
            
            {/* Logout dropdown */}
            {showLogout && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <SyncStatus showLabel={false} />
            
            <Link
              href={buildUrl('/montree/dashboard/reports')}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-base">📊</span>
            </Link>
            
            <Link
              href={buildUrl('/montree/dashboard/media')}
              className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
            >
              <span className="text-base">🖼️</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Click outside to close logout */}
      {showLogout && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowLogout(false)}
        />
      )}

      {/* Quick Actions - hide in demo */}
      {!isDemo && (
        <div className="px-4 py-3 max-w-4xl mx-auto">
          <button
            onClick={openQuickCapture}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">📷</span>
            <span>Quick Photo</span>
          </button>
        </div>
      )}

      {/* Student Grid */}
      <main className="px-4 py-6 max-w-4xl mx-auto pb-40">
        {students.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{teacher.classroom_icon}</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Welcome to {teacher.classroom_name}!</h2>
            <p className="text-slate-500 mb-6">No students yet. Add your first student to get started.</p>
            <Link 
              href="/montree/admin/students" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              <span>+</span>
              <span>Add Students</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {students.map((student, index) => {
              const colors = getAvatarColor(index);

              return (
                <Link
                  key={student.id}
                  href={buildUrl(`/montree/dashboard/student/${student.id}`)}
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

      {/* Floating Camera Button - hide in demo */}
      {!isDemo && (
        <button
          onClick={openQuickCapture}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-90 transition-transform z-50"
        >
          <span className="text-2xl">📷</span>
        </button>
      )}

      {/* Quick Capture Modal */}
      <QuickCapture
        isOpen={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        students={students}
      />

      {/* Demo Tutorial */}
      <DemoTutorial steps={CLASSROOM_STEPS} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <span className="text-4xl animate-pulse">🌱</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
