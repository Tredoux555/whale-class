// app/admin/page.tsx
// Modern Admin Dashboard with gradient design

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  gradient: string;
}

const DEFAULT_CARDS: DashboardCard[] = [
  // Role Portals
  { id: 'principal', title: 'Principal', description: 'School & classroom overview', href: '/principal', icon: '🏫', gradient: 'from-slate-600 to-slate-700' },
  { id: 'teacher', title: 'Teacher Portal', description: 'Progress tracking & tools', href: '/teacher/dashboard', icon: '👩‍🏫', gradient: 'from-amber-500 to-orange-500' },
  { id: 'teacher-students', title: 'Assign Students', description: 'Link students to teachers', href: '/admin/teacher-students', icon: '🔗', gradient: 'from-teal-500 to-cyan-500' },
  
  // Core System
  { id: 'montree', title: 'Independent Montree', description: 'Multi-tenant platform plan', href: '/admin/montree', icon: '🌳', gradient: 'from-green-500 to-emerald-500' },
  { id: 'montree-home', title: 'Montree Home', description: 'Homeschool platform management', href: '/admin/montree-home', icon: '🏠', gradient: 'from-emerald-500 to-teal-500' },
  { id: 'weekly-planning', title: 'Weekly Planning', description: 'Upload plans, track progress', href: '/admin/weekly-planning', icon: '📅', gradient: 'from-cyan-500 to-blue-500' },
  { id: 'classroom', title: 'Classroom', description: 'iPad-friendly progress tracking', href: '/admin/classroom', icon: '🎯', gradient: 'from-emerald-500 to-green-500' },
  
  // Material Generators
  { id: 'material-generator', title: 'Material Generator', description: 'Print Pink/Blue/Green series', href: '/admin/material-generator', icon: '🖨️', gradient: 'from-pink-500 to-rose-500' },
  { id: 'card-generator', title: '3-Part Cards', description: 'Montessori card maker', href: '/admin/card-generator', icon: '🃏', gradient: 'from-purple-500 to-violet-500' },
  { id: 'flashcard-maker', title: 'Song Flashcards', description: 'YouTube to flashcard PDFs', href: '/admin/flashcard-maker', icon: '🎵', gradient: 'from-indigo-500 to-purple-500' },
  { id: 'vocabulary-flashcards', title: 'Vocab Flashcards', description: 'Weekly vocabulary cards', href: '/admin/vocabulary-flashcards', icon: '📇', gradient: 'from-cyan-500 to-teal-500' },
  
  // Teaching Tools
  { id: 'english-progress', title: 'English Progress', description: 'Parent reports & tracking', href: '/admin/english-progress', icon: '📚', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'english-guide', title: 'English Guide', description: 'How to teach each skill', href: '/admin/english-guide', icon: '📖', gradient: 'from-indigo-500 to-blue-500' },
  { id: 'circle-planner', title: 'Circle Time', description: 'Plan circle activities', href: '/admin/circle-planner', icon: '⭕', gradient: 'from-yellow-500 to-amber-500' },
  { id: 'phonics-planner', title: 'Phonics', description: 'Phonics lessons', href: '/admin/phonics-planner', icon: '🔤', gradient: 'from-red-500 to-pink-500' },
  
  // Utilities
  { id: 'site-tester', title: 'Site Tester', description: 'Test site & generate reports', href: '/admin/site-tester', icon: '🔍', gradient: 'from-teal-500 to-emerald-500' },
  { id: 'progress-reports', title: 'Progress Reports', description: 'View student progress', href: '/admin/montessori/reports', icon: '📊', gradient: 'from-orange-500 to-red-500' },
];

const STORAGE_KEY = 'whale_admin_card_order';

export default function AdminDashboard() {
  const router = useRouter();
  const [cards, setCards] = useState<DashboardCard[]>(DEFAULT_CARDS);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    checkAuth();
    loadCardOrder();
  }, []);

  const loadCardOrder = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedOrder: string[] = JSON.parse(saved);
        const orderedCards: DashboardCard[] = [];
        savedOrder.forEach(id => {
          const card = DEFAULT_CARDS.find(c => c.id === id);
          if (card) orderedCards.push(card);
        });
        DEFAULT_CARDS.forEach(card => {
          if (!orderedCards.find(c => c.id === card.id)) {
            orderedCards.push(card);
          }
        });
        setCards(orderedCards);
      }
    } catch (e) {
      console.error('Failed to load card order:', e);
    }
  };

  const saveCardOrder = (newCards: DashboardCard[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards.map(c => c.id)));
    } catch (e) {
      console.error('Failed to save card order:', e);
    }
  };

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.status === 401) router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (!editMode) return;
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    if (!editMode) return;
    e.preventDefault();
    if (cardId !== draggedCard) setDragOverCard(cardId);
  };

  const handleDrop = (e: React.DragEvent, targetCardId: string) => {
    if (!editMode || !draggedCard || draggedCard === targetCardId) {
      setDraggedCard(null);
      setDragOverCard(null);
      return;
    }
    e.preventDefault();

    const newCards = [...cards];
    const draggedIndex = newCards.findIndex(c => c.id === draggedCard);
    const targetIndex = newCards.findIndex(c => c.id === targetCardId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newCards.splice(draggedIndex, 1);
      newCards.splice(targetIndex, 0, removed);
      setCards(newCards);
      saveCardOrder(newCards);
    }

    setDraggedCard(null);
    setDragOverCard(null);
  };

  const resetOrder = () => {
    setCards(DEFAULT_CARDS);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">🐋</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-slate-400 text-sm">Whale Montessori Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                editMode 
                  ? 'bg-yellow-500 text-black' 
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
            >
              {editMode ? '✓ Done' : '⚙️ Edit Layout'}
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
            >
              🌐 View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="bg-yellow-500 text-black py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="font-medium flex items-center gap-2">
              <span className="text-xl">✋</span>
              Drag cards to reorder them. Click "Done" when finished.
            </p>
            <button
              onClick={resetOrder}
              className="px-3 py-1.5 bg-black/20 rounded-lg text-sm font-medium hover:bg-black/30 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-white">17</div>
            <div className="text-sm text-slate-400">Admin Tools</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-emerald-400">✓</div>
            <div className="text-sm text-slate-400">System Online</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-blue-400">342</div>
            <div className="text-sm text-slate-400">Curriculum Works</div>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="text-3xl font-bold text-purple-400">14</div>
            <div className="text-sm text-slate-400">Games Available</div>
          </div>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              draggable={editMode}
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDragLeave={() => setDragOverCard(null)}
              onDrop={(e) => handleDrop(e, card.id)}
              onDragEnd={() => { setDraggedCard(null); setDragOverCard(null); }}
              className={`relative ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {/* Drop indicator */}
              {dragOverCard === card.id && draggedCard !== card.id && (
                <div className="absolute inset-0 border-4 border-yellow-400 rounded-2xl pointer-events-none z-10" />
              )}
              
              {editMode ? (
                <div 
                  className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 transition-all ${
                    draggedCard === card.id ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'
                  }`}
                >
                  {/* Drag handle */}
                  <div className="absolute top-3 right-3 text-white/40">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                  </div>
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h2 className="text-lg font-bold text-white mb-1">{card.title}</h2>
                  <p className="text-white/70 text-sm">{card.description}</p>
                </div>
              ) : (
                <Link
                  href={card.href}
                  className={`block bg-gradient-to-br ${card.gradient} rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20 group`}
                >
                  <div className="text-4xl mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform">{card.icon}</div>
                  <h2 className="text-lg font-bold text-white mb-1">{card.title}</h2>
                  <p className="text-white/70 text-sm">{card.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-white/50 text-sm group-hover:text-white/80 transition-colors">
                    <span>Open</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Whale Montessori Platform • Admin Dashboard</p>
        </div>
      </main>
    </div>
  );
}
