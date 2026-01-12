// app/assessment/[sessionId]/complete/page.tsx
// Celebration screen after completing assessment
// Fun, child-friendly completion screen

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getCelebrationMessage } from '@/lib/assessment/scoring';
import { GameAudio } from '@/lib/games/audio-paths';

interface Session {
  id: string;
  child_name: string;
  overall_percentage: number;
  total_score: number;
  total_possible: number;
}

export default function AssessmentCompletePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/assessment/sessions/${sessionId}`);
      const data = await res.json();
      
      if (data.success && data.session) {
        setSession(data.session);
        
        // Play celebration sound
        setTimeout(() => {
          GameAudio.playCelebration();
          setShowConfetti(true);
        }, 500);
      }
    } catch (err) {
      console.error('Error loading session:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-400 to-purple-500 flex items-center justify-center">
        <div className="text-8xl animate-bounce">🐋</div>
      </div>
    );
  }

  const celebration = getCelebrationMessage(session?.overall_percentage || 70);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-400 to-purple-500 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              {['🎉', '⭐', '🌟', '✨', '🎊', '💫'][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="text-center z-10">
        {/* Big emoji */}
        <div className="text-9xl mb-6 animate-bounce">
          {celebration.emoji}
        </div>

        {/* Message */}
        <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
          {celebration.message}
        </h1>
        
        <p className="text-2xl text-white/90 mb-2">
          {celebration.subMessage}
        </p>

        {session && (
          <p className="text-xl text-white/80 mb-8">
            Great work, {session.child_name}! 🐋
          </p>
        )}

        {/* Whale mascot */}
        <div className="text-8xl mb-8 animate-pulse">
          🐋
        </div>

        {/* Done button */}
        <Link
          href="/assessment"
          className="inline-block px-12 py-6 bg-white text-purple-600 rounded-3xl font-bold text-2xl shadow-xl hover:scale-105 transition-transform"
        >
          🏠 All Done!
        </Link>
      </div>

      {/* CSS for confetti animation */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
          font-size: 2rem;
        }
      `}</style>
    </div>
  );
}
