// /montree/dashboard/settings/page.tsx
// Settings - Teacher profile, preferences
// Fixed: Removed admin features - teacher settings only
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const SETTINGS_ITEMS = [
  { emoji: '🖼️', title: 'Media Gallery', desc: 'View captured photos', href: '/montree/dashboard/media' },
  { emoji: '📊', title: 'Reports', desc: 'View student reports', href: '/montree/dashboard/reports' },
  { emoji: '🎮', title: 'Curriculum Games', desc: 'Practice activities', href: '/montree/dashboard/games' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [classroomIcon, setClassroomIcon] = useState('🌳');

  useEffect(() => {
    // Load teacher session data
    const sessionStr = sessionStorage.getItem('teacherSession') || localStorage.getItem('teacherSession');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        setTeacherName(session.teacherName || session.name || 'Teacher');
        setClassroomName(session.classroomName || 'My Classroom');
        setClassroomIcon(session.classroomIcon || '🌳');
      } catch (e) {
        console.error('Failed to parse session:', e);
      }
    }
  }, []);

  const handleSignOut = () => {
    // Clear teacher session
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('teacherSession');
      localStorage.removeItem('teacherSession');
    }
    router.push('/montree/teacher/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 py-4 px-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/montree/dashboard"
          className="w-10 h-10 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors"
        >
          <span className="text-lg">←</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              {classroomIcon}
            </div>
            <div className="flex-1">
              <div className="text-gray-900 font-bold text-lg">{teacherName || 'Teacher'}</div>
              <div className="text-gray-500 text-sm">{classroomName}</div>
              <div className="text-emerald-600 text-xs mt-1">✓ Active</div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">Quick Access</h3>
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 rounded-xl p-4 transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-emerald-100 group-hover:bg-emerald-200 rounded-xl flex items-center justify-center transition-colors">
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="text-gray-800 font-medium">{item.title}</div>
                <div className="text-gray-500 text-sm">{item.desc}</div>
              </div>
              <span className="text-gray-300 group-hover:text-emerald-500 transition-colors">→</span>
            </Link>
          ))}
        </div>

        {/* Sign Out */}
        <div className="pt-4 border-t border-gray-200">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 font-medium hover:bg-red-100 transition-all"
          >
            🚪 Sign Out
          </button>
        </div>

        {/* Version */}
        <div className="text-center text-gray-400 text-xs pt-4">
          Montree v1.0 • Made for teachers, by teachers 🌳
        </div>
      </main>
    </div>
  );
}
