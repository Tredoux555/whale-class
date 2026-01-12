'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';

const DASHBOARD_ITEMS = [
  {
    href: '/teacher/daily-reports',
    icon: '📝',
    title: 'Daily Reports',
    description: 'Send daily updates to parents',
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50',
    tags: [
      { label: 'Parents', color: 'green' },
      { label: 'Daily', color: 'emerald' },
    ],
  },
  {
    href: '/teacher/messages',
    icon: '💬',
    title: 'Messages',
    description: 'Chat with parents',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50',
    tags: [
      { label: 'Chat', color: 'blue' },
      { label: 'Parents', color: 'cyan' },
    ],
  },
  {
    href: '/teacher/attendance',
    icon: '📋',
    title: 'Attendance',
    description: 'Mark daily attendance',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
    tags: [
      { label: 'Daily', color: 'emerald' },
      { label: 'Quick', color: 'teal' },
    ],
  },
  {
    href: '/teacher/circle-planner',
    icon: '🌅',
    title: 'Circle Time Planner',
    description: '36-week curriculum with songs, books, and activities',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
    tags: [
      { label: 'Weekly Plans', color: 'orange' },
      { label: 'Documents', color: 'blue' },
      { label: 'Notes', color: 'green' },
    ],
  },
  {
    href: '/teacher/english-guide',
    icon: '📚',
    title: 'English Guide',
    description: 'Phonics, reading levels, and language activities',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    tags: [
      { label: 'Phonics', color: 'purple' },
      { label: 'Reading', color: 'pink' },
      { label: 'Games', color: 'cyan' },
    ],
  },
  {
    href: '/teacher/curriculum',
    icon: '📋',
    title: 'Curriculum Overview',
    description: 'Full Montessori curriculum with 342 works',
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
    tags: [
      { label: 'Practical Life', color: 'pink' },
      { label: 'Sensorial', color: 'purple' },
      { label: 'Math', color: 'blue' },
      { label: 'Language', color: 'green' },
    ],
  },
  {
    href: '/teacher/tools',
    icon: '🛠️',
    title: 'Teacher Tools',
    description: 'Material generators, flashcard makers, and more',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
    tags: [
      { label: 'Generators', color: 'cyan' },
      { label: 'Flashcards', color: 'blue' },
    ],
  },
];

const tagColors: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  pink: 'bg-pink-100 text-pink-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
    } else {
      setTeacherName(name);
      setLoading(false);
      
      // Set greeting based on time
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('teacherName');
    router.push('/teacher');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🐋</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-2xl">🐋</span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{greeting},</p>
                <h1 className="text-xl font-bold text-gray-800">{teacherName}!</h1>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <span>Logout</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Install PWA Prompt */}
        <InstallPrompt />
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-blue-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Teacher Dashboard</h2>
              <p className="text-blue-100">Everything you need to manage your classroom</p>
            </div>
            <div className="hidden sm:block text-6xl opacity-50">📚</div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DASHBOARD_ITEMS.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className="group block"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`bg-gradient-to-br ${item.bgGradient} rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1`}>
                {/* Icon Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
                    <span className="text-3xl">{item.icon}</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {item.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.label}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColors[tag.color]}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/teacher/classroom"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium"
            >
              <span>📊</span>
              <span>Track Progress</span>
            </Link>
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
            >
              <span>🎮</span>
              <span>Open Games</span>
            </Link>
            <Link
              href="/teacher/tools"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              <span>🛠️</span>
              <span>Create Materials</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
