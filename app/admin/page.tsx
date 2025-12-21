'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description: string;
  color: string;
}

interface NavSection {
  title: string;
  icon: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Content',
    icon: '📹',
    items: [
      { name: 'Videos', href: '/admin/videos', icon: '🎬', description: 'Upload & manage videos', color: 'bg-blue-500' },
      { name: 'Song Flashcards', href: '/admin/flashcard-maker', icon: '🎵', description: 'Generate from YouTube', color: 'bg-purple-500' },
      { name: 'Three-Part Cards', href: '/admin/card-generator', icon: '🃏', description: 'Montessori card maker', color: 'bg-pink-500' },
      { name: 'Class Materials', href: '/admin/materials', icon: '📁', description: 'PDFs, images, docs', color: 'bg-indigo-500' },
    ],
  },
  {
    title: 'Curriculum',
    icon: '📚',
    items: [
      { name: 'Montree', href: '/admin/montree', icon: '🌳', description: 'Curriculum tree view', color: 'bg-green-600' },
      { name: 'AI Planner', href: '/admin/ai-planner', icon: '✨', description: 'AI lesson planning', color: 'bg-violet-500' },
      { name: 'Material Generator', href: '/admin/material-generator', icon: '📄', description: 'Print language materials', color: 'bg-orange-500' },
      { name: 'Circle Time', href: '/admin/circle-planner', icon: '🌈', description: 'Plan circle activities', color: 'bg-yellow-500' },
      { name: 'Phonics', href: '/admin/phonics-planner', icon: '🔤', description: 'Phonics lessons', color: 'bg-red-500' },
    ],
  },
  {
    title: 'Students',
    icon: '👥',
    items: [
      { name: 'Children', href: '/admin/children', icon: '👶', description: 'Manage students', color: 'bg-cyan-500' },
      { name: 'Progress', href: '/admin/progress', icon: '📊', description: 'Track all progress', color: 'bg-emerald-500' },
      { name: 'Parents', href: '/admin/parent-signups', icon: '👨‍👩‍👧', description: 'Parent approvals', color: 'bg-teal-500' },
    ],
  },
  {
    title: 'Access',
    icon: '🔐',
    items: [
      { name: 'Teachers', href: '/admin/rbac-management', icon: '👩‍🏫', description: 'Roles & permissions', color: 'bg-slate-600' },
      { name: 'Site Tester', href: '/admin/site-tester', icon: '🔍', description: 'Test site & generate reports', color: 'bg-amber-600' },
    ],
  },
];

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) {
        router.push("/admin/login");
      }
    } catch (error) {
      router.push("/admin/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div 
      className="min-h-screen bg-gray-900"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-gray-800 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🐋</div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">Whale Montessori</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                View Site
              </Link>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {/* Section Header */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{section.icon}</span>
                <h2 className="text-xl font-bold text-white">{section.title}</h2>
              </div>

              {/* Section Items */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group block"
                  >
                    <div className={`${item.color} rounded-xl p-4 transition-all hover:scale-105 hover:shadow-xl`}>
                      <div className="text-3xl mb-2">{item.icon}</div>
                      <h3 className="font-bold text-white text-lg">{item.name}</h3>
                      <p className="text-white/80 text-xs mt-1">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickStat label="Videos" value="58" icon="🎬" />
            <QuickStat label="Students" value="8" icon="👶" />
            <QuickStat label="Works" value="257" icon="📚" />
            <QuickStat label="Teachers" value="3" icon="👩‍🏫" />
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}
