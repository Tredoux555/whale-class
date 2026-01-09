'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TeacherEnglishGuidePage() {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  // Redirect to admin guide with teacher context
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Teacher Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🐋</span>
              <div>
                <h1 className="text-xl font-bold">English Teaching Guide</h1>
                <p className="text-cyan-100 text-sm">Welcome, {teacherName}!</p>
              </div>
            </div>
            <Link
              href="/teacher/dashboard"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Embed the admin guide content via iframe or redirect */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">📚 English Teaching Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/english-guide"
              className="p-6 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition group"
            >
              <div className="text-4xl mb-2">📖</div>
              <h3 className="font-bold text-lg text-blue-700 group-hover:text-blue-800">
                Complete English Guide
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Montessori language journey • How to teach each skill
              </p>
            </Link>

            <Link
              href="/admin/english-curriculum"
              className="p-6 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition group"
            >
              <div className="text-4xl mb-2">📋</div>
              <h3 className="font-bold text-lg text-purple-700 group-hover:text-purple-800">
                Curriculum Overview
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Week-by-week curriculum plan
              </p>
            </Link>

            <Link
              href="/english-games"
              className="p-6 border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition group"
            >
              <div className="text-4xl mb-2">🎮</div>
              <h3 className="font-bold text-lg text-green-700 group-hover:text-green-800">
                Learning Games
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Interactive phonics & vocabulary games
              </p>
            </Link>

            <Link
              href="/admin/vocabulary-flashcards"
              className="p-6 border-2 border-orange-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition group"
            >
              <div className="text-4xl mb-2">🃏</div>
              <h3 className="font-bold text-lg text-orange-700 group-hover:text-orange-800">
                Vocabulary Flashcards
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Week-by-week vocabulary cards
              </p>
            </Link>
          </div>

          {/* Quick Tips */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <h3 className="font-bold text-yellow-800 mb-2">💡 Daily Teaching Tips</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• Use Three-Period Lessons for new vocabulary</li>
              <li>• Sound games BEFORE letter introduction</li>
              <li>• Children write (build words) before they read</li>
              <li>• Extend Period 2 for ESL learners</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
