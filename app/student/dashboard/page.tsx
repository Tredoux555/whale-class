// app/student/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface StudentSession {
  childId: string;
  childName: string;
  avatar: string;
}

interface GameProgress {
  game: string;
  completed: number;
  total: number;
  icon: string;
}

const GAMES = [
  { id: 'letter-sounds', name: 'Letter Sounds', icon: '🔤', href: '/games/letter-sounds', gradient: 'from-pink-500 to-rose-500' },
  { id: 'word-builder', name: 'Word Builder', icon: '🧱', href: '/games/word-builder', gradient: 'from-blue-500 to-indigo-500' },
  { id: 'letter-tracer', name: 'Letter Tracing', icon: '✏️', href: '/games/letter-tracer', gradient: 'from-green-500 to-emerald-500' },
  { id: 'letter-match', name: 'Letter Match', icon: '🎯', href: '/games/letter-match', gradient: 'from-purple-500 to-violet-500' },
  { id: 'sentence-match', name: 'Sentence Match', icon: '📝', href: '/games/sentence-match', gradient: 'from-orange-500 to-amber-500' },
  { id: 'sentence-builder', name: 'Sentence Builder', icon: '🏗️', href: '/games/sentence-builder', gradient: 'from-teal-500 to-cyan-500' },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<GameProgress[]>([]);
  const [badges, setBadges] = useState<{ id: string; badge_icon: string; badge_name: string }[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('studentSession');
    if (!stored) {
      router.push('/auth/student-login');
      return;
    }
    
    const sessionData = JSON.parse(stored);
    setSession(sessionData);
    fetchProgress(sessionData.childId);
  }, [router]);

  const fetchProgress = async (childId: string) => {
    try {
      const [progressRes, badgesRes] = await Promise.all([
        fetch(`/api/student/progress-summary?childId=${childId}`),
        fetch(`/api/student/badges?childId=${childId}`),
      ]);
      
      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data.progress || []);
      }
      if (badgesRes.ok) {
        const data = await badgesRes.json();
        setBadges(data.badges || []);
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studentSession');
    router.push('/auth/student-login');
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
            <span className="text-5xl animate-bounce">🐋</span>
          </div>
          <p className="text-white text-xl font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 pb-20">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-3xl">{session.avatar}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Hi, {session.childName}!</h1>
              <p className="text-white/70 text-sm">Ready to learn? 🌟</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur-sm"
          >
            👋 Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <span className="text-2xl">🏆</span> Your Badges
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {badges.map((badge) => (
                <div key={badge.id} className="bg-white rounded-2xl p-4 text-center min-w-[100px] shadow-xl flex-shrink-0">
                  <div className="text-4xl mb-2">{badge.badge_icon}</div>
                  <div className="text-xs font-bold text-gray-700">{badge.badge_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Games Grid */}
        <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">🎮</span> Choose a Game
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game) => {
            const gameProgress = progress.find(p => p.game === game.id);
            const progressPercent = gameProgress 
              ? (gameProgress.completed / gameProgress.total) * 100 
              : 0;
            
            return (
              <Link
                key={game.id}
                href={game.href}
                className="group block"
              >
                <div className={`bg-gradient-to-br ${game.gradient} rounded-2xl p-5 text-white shadow-xl 
                             hover:scale-105 transition-all active:scale-95 relative overflow-hidden`}>
                  {/* Decorative circle */}
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                  
                  <div className="relative">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{game.icon}</div>
                    <div className="font-bold text-lg">{game.name}</div>
                    
                    {/* Progress bar */}
                    {gameProgress && (
                      <div className="mt-3">
                        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-white h-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="text-xs text-white/70 mt-1">
                          {gameProgress.completed}/{gameProgress.total} complete
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* All Games Link */}
        <div className="mt-8 text-center">
          <Link 
            href="/games" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-colors backdrop-blur-sm"
          >
            <span>View All Games</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </main>
    </div>
  );
}
