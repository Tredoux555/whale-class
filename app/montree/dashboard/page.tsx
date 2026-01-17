// /montree/dashboard/page.tsx
// Ultra-clean teacher dashboard
// Just students. Nothing else. Tools hidden at bottom.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTools, setShowTools] = useState(false);

  useEffect(() => {
    fetch('/api/montree/students')
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Minimal Header */}
      <header className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Whale Class</h1>
        <Link 
          href="/montree/admin/students"
          className="text-emerald-400 text-sm font-medium"
        >
          + Add
        </Link>
      </header>

      {/* Student Grid - The whole screen */}
      <main className="flex-1 px-3 pb-20 overflow-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/montree/dashboard/student/${student.id}`}
              className="aspect-square bg-gray-900 hover:bg-gray-800 border-2 border-gray-800 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center p-2 transition-all active:scale-95"
            >
              {/* Photo or Initial */}
              {student.photo_url ? (
                <img 
                  src={student.photo_url} 
                  alt={student.name}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover mb-2"
                />
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center mb-2">
                  <span className="text-white text-lg sm:text-xl font-bold">
                    {student.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Name */}
              <span className="text-white text-xs sm:text-sm font-medium text-center truncate w-full">
                {student.name}
              </span>
            </Link>
          ))}
        </div>

        {students.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-4xl mb-4">👧</div>
            <div className="text-gray-400 mb-2">No students yet</div>
            <Link 
              href="/montree/admin/students"
              className="text-emerald-400 font-medium"
            >
              + Add your students
            </Link>
          </div>
        )}
      </main>

      {/* Tools Tab - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800">
        {/* Tools Panel (slides up) */}
        {showTools && (
          <div className="bg-gray-900 border-t border-gray-800 p-4 space-y-3">
            <Link
              href="/montree/dashboard/videos/preview"
              className="flex items-center gap-3 w-full p-3 bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
            >
              <span className="text-2xl">🎬</span>
              <div className="text-left">
                <div className="text-white font-medium">Generate Weekly Videos</div>
                <div className="text-purple-200 text-xs">AI-powered parent updates</div>
              </div>
            </Link>
            
            <Link
              href="/montree/dashboard/reports"
              className="flex items-center gap-3 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <span className="text-2xl">📊</span>
              <div className="text-left">
                <div className="text-white font-medium">Generate Weekly Reports</div>
                <div className="text-blue-200 text-xs">Progress summaries for parents</div>
              </div>
            </Link>

            <Link
              href="/montree/admin"
              className="flex items-center gap-3 w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              <span className="text-2xl">⚙️</span>
              <div className="text-left">
                <div className="text-white font-medium">Admin Settings</div>
                <div className="text-gray-400 text-xs">Manage students & school</div>
              </div>
            </Link>
          </div>
        )}

        {/* Tools Toggle Button */}
        <button
          onClick={() => setShowTools(!showTools)}
          className="w-full py-4 flex items-center justify-center gap-2 text-emerald-400 font-medium"
        >
          <span className={`transition-transform ${showTools ? 'rotate-180' : ''}`}>
            ▲
          </span>
          Tools
        </button>
      </div>
    </div>
  );
}
