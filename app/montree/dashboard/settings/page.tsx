// /montree/dashboard/settings/page.tsx
// Settings - Teacher profile, preferences
// Fixed: Removed admin features - teacher settings only
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSession, clearSession } from '@/lib/montree/auth';

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
    const session = getSession();
    if (!session) {
      router.push('/montree/login');
      return;
    }
    setTeacherName(session.teacher?.name || 'Teacher');
    setClassroomName(session.classroom?.name || 'My Classroom');
  }, [router]);

  const handleSignOut = () => {
    clearSession();
    router.push('/montree/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Sub-header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="text-xl">⚙️</span>
        <h1 className="font-bold text-gray-800">Settings</h1>
      </div>

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
