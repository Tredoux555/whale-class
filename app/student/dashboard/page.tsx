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
  { id: 'letter-sounds', name: 'Letter Sounds', icon: '🔤', href: '/games/letter-sounds', color: 'bg-pink-500' },
  { id: 'word-building', name: 'Word Building', icon: '🧱', href: '/games/word-building', color: 'bg-blue-500' },
  { id: 'letter-trace', name: 'Letter Tracing', icon: '✏️', href: '/games/letter-trace', color: 'bg-green-500' },
  { id: 'letter-match', name: 'Letter Match', icon: '🎯', href: '/games/letter-match', color: 'bg-purple-500' },
  { id: 'sentence-match', name: 'Sentence Match', icon: '📝', href: '/games/sentence-match', color: 'bg-orange-500' },
  { id: 'sentence-builder', name: 'Sentence Builder', icon: '🏗️', href: '/games/sentence-builder', color: 'bg-teal-500' },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<GameProgress[]>([]);
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    // Check for session
    const stored = localStorage.getItem('studentSession');
    if (!stored) {
      router.push('/auth/student-login');
      return;
    }
    
    const sessionData = JSON.parse(stored);
    setSession(sessionData);
    
    // Fetch progress
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 flex items-center justify-center"
           style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        <div className="text-white text-2xl animate-bounce">🐋 Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 pb-20"
         style={{ fontFamily: "'Comic Sans MS', cursive" }}>
      
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{session.avatar}</div>
            <div>
              <h1 className="text-xl font-bold text-white">Hi, {session.childName}!</h1>
              <p className="text-white/80 text-sm">Ready to learn?</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm"
          >
            👋 Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Badges Section */}
        {badges.length > 0 && (
          <div className="mb-6">
            <h2 className="text-white font-bold text-lg mb-3">🏆 Your Badges</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {badges.map((badge: any) => (
                <div key={badge.id} className="bg-white/90 rounded-xl p-3 text-center min-w-[100px] shadow-lg">
                  <div className="text-3xl">{badge.badge_icon}</div>
                  <div className="text-xs font-bold text-gray-700 mt-1">{badge.badge_name}</div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Games Grid */}
        <h2 className="text-white font-bold text-lg mb-3">🎮 Choose a Game</h2>
        <div className="grid grid-cols-2 gap-4">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className={`${game.color} rounded-2xl p-6 text-white shadow-xl 
                       hover:scale-105 transition-all active:scale-95`}
            >
              <div className="text-4xl mb-2">{game.icon}</div>
              <div className="font-bold">{game.name}</div>
              {progress.find(p => p.game === game.id) && (
                <div className="mt-2 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all"
                    style={{ 
                      width: `${(progress.find(p => p.game === game.id)?.completed || 0) / 
                              (progress.find(p => p.game === game.id)?.total || 1) * 100}%` 
                    }}
                  />
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8 text-center">
          <Link href="/games" className="text-white/80 hover:text-white text-sm">
            View All Games →
          </Link>
        </div>
      </main>
    </div>
  );
}
