// app/admin/page.tsx
// Clean Admin Dashboard - Montree-centric design with draggable cards

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
  color: string;
}

const DEFAULT_CARDS: DashboardCard[] = [
  // Core System
  {
    id: 'montree',
    title: 'Montree',
    description: 'Curriculum tracking & progress',
    href: '/admin/montree',
    icon: '🌳',
    color: 'bg-green-500 hover:bg-green-600',
  },
  {
    id: 'montree-home',
    title: 'Montree Home',
    description: 'Homeschool platform management',
    href: '/admin/montree-home',
    icon: '🏠',
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  {
    id: 'weekly-planning',
    title: 'Weekly Planning',
    description: 'Upload plans, track progress',
    href: '/admin/weekly-planning',
    icon: '📅',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  {
    id: 'classroom',
    title: 'Classroom',
    description: 'iPad-friendly progress tracking',
    href: '/admin/classroom',
    icon: '🎯',
    color: 'bg-emerald-500 hover:bg-emerald-600',
  },
  
  // Material Generators
  {
    id: 'material-generator',
    title: 'Material Generator',
    description: 'Print Pink/Blue/Green series',
    href: '/admin/material-generator',
    icon: '🖨️',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
  {
    id: 'card-generator',
    title: '3-Part Cards',
    description: 'Montessori card maker',
    href: '/admin/card-generator',
    icon: '🃏',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    id: 'flashcard-maker',
    title: 'Song Flashcards',
    description: 'YouTube to flashcard PDFs',
    href: '/admin/flashcard-maker',
    icon: '🎵',
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    id: 'vocabulary-flashcards',
    title: 'Vocab Flashcards',
    description: 'Weekly vocabulary cards',
    href: '/admin/vocabulary-flashcards',
    icon: '📇',
    color: 'bg-cyan-500 hover:bg-cyan-600',
  },
  
  // Teaching Tools
  {
    id: 'english-progress',
    title: 'English Progress',
    description: 'Parent reports & tracking',
    href: '/admin/english-progress',
    icon: '📚',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    id: 'english-guide',
    title: 'English Guide',
    description: 'How to teach each skill',
    href: '/admin/english-guide',
    icon: '📖',
    color: 'bg-indigo-500 hover:bg-indigo-600',
  },
  {
    id: 'circle-planner',
    title: 'Circle Time',
    description: 'Plan circle activities',
    href: '/admin/circle-planner',
    icon: '⭕',
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    id: 'phonics-planner',
    title: 'Phonics',
    description: 'Phonics lessons',
    href: '/admin/phonics-planner',
    icon: '🔤',
    color: 'bg-red-500 hover:bg-red-600',
  },
  
  // Utilities
  {
    id: 'site-tester',
    title: 'Site Tester',
    description: 'Test site & generate reports',
    href: '/admin/site-tester',
    icon: '🔍',
    color: 'bg-teal-500 hover:bg-teal-600',
  },
  {
    id: 'progress-reports',
    title: 'Progress Reports',
    description: 'View student progress',
    href: '/admin/montessori/reports',
    icon: '📊',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
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
        // Reorder cards based on saved order, keeping any new cards at the end
        const orderedCards: DashboardCard[] = [];
        savedOrder.forEach(id => {
          const card = DEFAULT_CARDS.find(c => c.id === id);
          if (card) orderedCards.push(card);
        });
        // Add any new cards not in saved order
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
      const order = newCards.map(c => c.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch (e) {
      console.error('Failed to save card order:', e);
    }
  };

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

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    if (!editMode) return;
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, cardId: string) => {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (cardId !== draggedCard) {
      setDragOverCard(cardId);
    }
  };

  const handleDragLeave = () => {
    setDragOverCard(null);
  };

  const handleDrop = (e: React.DragEvent, targetCardId: string) => {
    if (!editMode) return;
    e.preventDefault();
    
    if (!draggedCard || draggedCard === targetCardId) {
      setDraggedCard(null);
      setDragOverCard(null);
      return;
    }

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

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragOverCard(null);
  };

  const resetOrder = () => {
    setCards(DEFAULT_CARDS);
    localStorage.removeItem(STORAGE_KEY);
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
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                editMode 
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              }`}
            >
              {editMode ? '✓ Done' : '⚙️ Edit'}
            </button>
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

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="bg-yellow-500 text-black px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p className="font-medium">
              ✋ Drag cards to reorder them. Click "Done" when finished.
            </p>
            <button
              onClick={resetOrder}
              className="px-3 py-1 bg-black/20 hover:bg-black/30 rounded text-sm font-medium"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              draggable={editMode}
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, card.id)}
              onDragEnd={handleDragEnd}
              className={`relative ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {/* Drop indicator */}
              {dragOverCard === card.id && draggedCard !== card.id && (
                <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl pointer-events-none z-10" />
              )}
              
              {editMode ? (
                <div
                  className={`${card.color} rounded-xl p-6 text-white transition-all ${
                    draggedCard === card.id ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'
                  }`}
                >
                  <div className="absolute top-2 right-2 text-white/50">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                    </svg>
                  </div>
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h2 className="text-xl font-bold mb-1">{card.title}</h2>
                  <p className="text-white/80 text-sm">{card.description}</p>
                </div>
              ) : (
                <Link
                  href={card.href}
                  className={`${card.color} rounded-xl p-6 text-white transition-all hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] block`}
                >
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h2 className="text-xl font-bold mb-1">{card.title}</h2>
                  <p className="text-white/80 text-sm">{card.description}</p>
                </Link>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
