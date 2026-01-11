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
  colorKey: CardColor;
}

type CardColor = 'slate' | 'amber' | 'green' | 'emerald' | 'cyan' | 'pink' | 'purple' | 'indigo' | 'blue' | 'yellow' | 'red' | 'teal' | 'orange';

// Inline styles map - works with Tailwind v4 (bypasses purging)
const COLOR_STYLES: Record<CardColor, { bg: string; hover: string }> = {
  slate:   { bg: '#475569', hover: '#334155' },
  amber:   { bg: '#f59e0b', hover: '#d97706' },
  green:   { bg: '#22c55e', hover: '#16a34a' },
  emerald: { bg: '#10b981', hover: '#059669' },
  cyan:    { bg: '#06b6d4', hover: '#0891b2' },
  pink:    { bg: '#ec4899', hover: '#db2777' },
  purple:  { bg: '#a855f7', hover: '#9333ea' },
  indigo:  { bg: '#6366f1', hover: '#4f46e5' },
  blue:    { bg: '#3b82f6', hover: '#2563eb' },
  yellow:  { bg: '#eab308', hover: '#ca8a04' },
  red:     { bg: '#ef4444', hover: '#dc2626' },
  teal:    { bg: '#14b8a6', hover: '#0d9488' },
  orange:  { bg: '#f97316', hover: '#ea580c' },
};

const DEFAULT_CARDS: DashboardCard[] = [
  // Role Portals
  {
    id: 'principal',
    title: 'Principal',
    description: 'School & classroom overview',
    href: '/principal',
    icon: '🏫',
    colorKey: 'slate',
  },
  {
    id: 'teacher',
    title: 'Teacher Portal',
    description: 'Progress tracking & tools',
    href: '/teacher/dashboard',
    icon: '👩‍🏫',
    colorKey: 'amber',
  },
  
  // Core System
  {
    id: 'montree',
    title: 'Independent Montree',
    description: 'Multi-tenant platform plan',
    href: '/admin/montree',
    icon: '🌳',
    colorKey: 'green',
  },
  {
    id: 'montree-home',
    title: 'Montree Home',
    description: 'Homeschool platform management',
    href: '/admin/montree-home',
    icon: '🏠',
    colorKey: 'emerald',
  },
  {
    id: 'weekly-planning',
    title: 'Weekly Planning',
    description: 'Upload plans, track progress',
    href: '/admin/weekly-planning',
    icon: '📅',
    colorKey: 'cyan',
  },
  {
    id: 'classroom',
    title: 'Classroom',
    description: 'iPad-friendly progress tracking',
    href: '/admin/classroom',
    icon: '🎯',
    colorKey: 'emerald',
  },
  
  // Material Generators
  {
    id: 'material-generator',
    title: 'Material Generator',
    description: 'Print Pink/Blue/Green series',
    href: '/admin/material-generator',
    icon: '🖨️',
    colorKey: 'pink',
  },
  {
    id: 'card-generator',
    title: '3-Part Cards',
    description: 'Montessori card maker',
    href: '/admin/card-generator',
    icon: '🃏',
    colorKey: 'purple',
  },
  {
    id: 'flashcard-maker',
    title: 'Song Flashcards',
    description: 'YouTube to flashcard PDFs',
    href: '/admin/flashcard-maker',
    icon: '🎵',
    colorKey: 'indigo',
  },
  {
    id: 'vocabulary-flashcards',
    title: 'Vocab Flashcards',
    description: 'Weekly vocabulary cards',
    href: '/admin/vocabulary-flashcards',
    icon: '📇',
    colorKey: 'cyan',
  },
  
  // Teaching Tools
  {
    id: 'english-progress',
    title: 'English Progress',
    description: 'Parent reports & tracking',
    href: '/admin/english-progress',
    icon: '📚',
    colorKey: 'blue',
  },
  {
    id: 'english-guide',
    title: 'English Guide',
    description: 'How to teach each skill',
    href: '/admin/english-guide',
    icon: '📖',
    colorKey: 'indigo',
  },
  {
    id: 'circle-planner',
    title: 'Circle Time',
    description: 'Plan circle activities',
    href: '/admin/circle-planner',
    icon: '⭕',
    colorKey: 'yellow',
  },
  {
    id: 'phonics-planner',
    title: 'Phonics',
    description: 'Phonics lessons',
    href: '/admin/phonics-planner',
    icon: '🔤',
    colorKey: 'red',
  },
  
  // Utilities
  {
    id: 'site-tester',
    title: 'Site Tester',
    description: 'Test site & generate reports',
    href: '/admin/site-tester',
    icon: '🔍',
    colorKey: 'teal',
  },
  {
    id: 'progress-reports',
    title: 'Progress Reports',
    description: 'View student progress',
    href: '/admin/montessori/reports',
    icon: '📊',
    colorKey: 'orange',
  },
];

const STORAGE_KEY = 'whale_admin_card_order';

// Card component with hover state
function DashboardCardItem({ 
  card, 
  editMode, 
  isDragging, 
  isDropTarget 
}: { 
  card: DashboardCard; 
  editMode: boolean; 
  isDragging: boolean; 
  isDropTarget: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = COLOR_STYLES[card.colorKey];
  
  const cardStyle: React.CSSProperties = {
    backgroundColor: isHovered ? colors.hover : colors.bg,
    borderRadius: '0.75rem',
    padding: '1.5rem',
    color: 'white',
    transition: 'all 0.2s',
    transform: isDragging ? 'scale(0.95)' : isHovered ? 'scale(1.02)' : 'scale(1)',
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isHovered ? '0 20px 25px -5px rgb(0 0 0 / 0.3)' : 'none',
    display: 'block',
  };

  const content = (
    <>
      {editMode && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>
          <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
        </div>
      )}
      <div style={{ fontSize: '2.25rem', marginBottom: '0.75rem' }}>{card.icon}</div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{card.title}</h2>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>{card.description}</p>
    </>
  );

  if (editMode) {
    return (
      <div 
        style={cardStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={card.href}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {content}
    </Link>
  );
}

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
      className="min-h-screen"
      style={{ 
        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
        backgroundColor: '#0f172a'
      }}
    >
      {/* Header */}
      <header style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.875rem' }}>🐋</span>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Admin Dashboard</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Whale Montessori</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setEditMode(!editMode)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                backgroundColor: editMode ? '#eab308' : '#334155',
                color: editMode ? 'black' : 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {editMode ? '✓ Done' : '⚙️ Edit'}
            </button>
            <Link
              href="/"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#334155',
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: '500',
                textDecoration: 'none'
              }}
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Edit Mode Banner */}
      {editMode && (
        <div style={{ backgroundColor: '#eab308', color: 'black', padding: '0.75rem 1.5rem' }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontWeight: '500' }}>
              ✋ Drag cards to reorder them. Click &quot;Done&quot; when finished.
            </p>
            <button
              onClick={resetOrder}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '0.25rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Dashboard Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '1rem' 
        }}>
          {cards.map((card) => (
            <div
              key={card.id}
              draggable={editMode}
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDragOver={(e) => handleDragOver(e, card.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, card.id)}
              onDragEnd={handleDragEnd}
              style={{ 
                position: 'relative',
                cursor: editMode ? 'grab' : 'pointer'
              }}
            >
              {/* Drop indicator */}
              {dragOverCard === card.id && draggedCard !== card.id && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  border: '4px solid #facc15',
                  borderRadius: '0.75rem',
                  pointerEvents: 'none',
                  zIndex: 10
                }} />
              )}
              
              <DashboardCardItem 
                card={card}
                editMode={editMode}
                isDragging={draggedCard === card.id}
                isDropTarget={dragOverCard === card.id}
              />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
