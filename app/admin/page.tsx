// app/admin/page.tsx
// Clean Admin Dashboard - Montree-centric design

'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardCard {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  // Core System
  {
    title: 'Montree',
    description: 'Curriculum tracking & progress',
    href: '/admin/montree',
    icon: '🌳',
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    title: 'Weekly Planning',
    description: 'Upload plans, track progress',
    href: '/admin/weekly-planning',
    icon: '📅',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  {
    title: 'Classroom View',
    description: 'iPad-friendly progress tracking',
    href: '/admin/classroom',
    icon: '🎯',
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  
  // Material Generators
  {
    title: 'Material Generator',
    description: 'Print Pink/Blue/Green series',
    href: '/admin/material-generator',
    icon: '🖨️',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
  {
    title: '3-Part Cards',
    description: 'Montessori card maker',
    href: '/admin/card-generator',
    icon: '🃏',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    title: 'Song Flashcards',
    description: 'YouTube to flashcard PDFs',
    href: '/admin/flashcard-maker',
    icon: '🎵',
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    title: 'Vocab Flashcards',
    description: 'Weekly vocabulary cards',
    href: '/admin/vocabulary-flashcards',
    icon: '📇',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  
  // Teaching Tools
  {
    title: 'Circle Time',
    description: 'Plan circle activities',
    href: '/admin/circle-planner',
    icon: '⭕',
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    title: 'Phonics',
    description: 'Phonics lessons',
    href: '/admin/phonics-planner',
    icon: '🔤',
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    title: 'English Area',
    description: 'Procurement checklist',
    href: '/admin/english-procurement',
    icon: '📚',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  
  // Utilities
  {
    title: 'Site Tester',
    description: 'Test site & generate reports',
    href: '/admin/site-tester',
    icon: '🔍',
    color: 'bg-teal-500 hover:bg-teal-600',
  },
  {
    title: 'Progress Reports',
    description: 'View student progress',
    href: '/admin/montessori/reports',
    icon: '📊',
    color: 'bg-orange-500 hover:bg-orange-600',
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
      className="min-h-screen bg-slate-900"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐋</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Whale Montessori</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DASHBOARD_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`${card.color} rounded-xl p-6 text-white transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
            >
              <div className="text-4xl mb-3">{card.icon}</div>
              <h2 className="text-xl font-bold mb-1">{card.title}</h2>
              <p className="text-white/80 text-sm">{card.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
