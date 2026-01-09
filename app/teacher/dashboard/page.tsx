'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
    } else {
      setTeacherName(name);
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('teacherName');
    router.push('/teacher');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐋</span>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Teacher Portal</h1>
                <p className="text-sm text-gray-500">Welcome, {teacherName}!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-red-500 text-sm"
            >
              Logout →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Your Teaching Tools</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Circle Time Planner */}
          <Link
            href="/teacher/circle-planner"
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl group-hover:scale-110 transition-transform">🌅</span>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Circle Time Planner</h3>
                <p className="text-gray-500 text-sm mt-1">
                  36-week English curriculum with songs, books, and activities
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Weekly Plans</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Documents</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Notes</span>
            </div>
          </Link>

          {/* English Guide */}
          <Link
            href="/teacher/english-guide"
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <span className="text-5xl group-hover:scale-110 transition-transform">📚</span>
              <div>
                <h3 className="text-xl font-bold text-gray-800">English Guide</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Phonics, reading levels, and language activities
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Phonics</span>
              <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">Reading</span>
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">Games</span>
            </div>
          </Link>
        </div>

        {/* Quick Resources */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-700 mb-4">Quick Resources</h2>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                href="/admin/vocabulary-flashcards"
                className="p-3 bg-cyan-50 rounded-lg text-center hover:bg-cyan-100 transition-colors"
              >
                <span className="text-2xl">🃏</span>
                <p className="text-sm mt-1">Flashcards</p>
              </Link>
              <Link
                href="/admin/card-generator"
                className="p-3 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors"
              >
                <span className="text-2xl">🎴</span>
                <p className="text-sm mt-1">3-Part Cards</p>
              </Link>
              <Link
                href="/admin/flashcard-maker"
                className="p-3 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors"
              >
                <span className="text-2xl">🎵</span>
                <p className="text-sm mt-1">Video Cards</p>
              </Link>
              <Link
                href="/english-games"
                className="p-3 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors"
              >
                <span className="text-2xl">🎮</span>
                <p className="text-sm mt-1">Learning Games</p>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
