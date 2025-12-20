// components/games/GameWrapper.tsx
// Common wrapper for all games with score, progress, celebrations

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Confetti from './Confetti';
import { playCorrectSound, playWrongSound } from '@/lib/games/sound-utils';

interface GameWrapperProps {
  children: ReactNode;
  score: number;
  totalQuestions: number;
  currentQuestion: number;
  onComplete?: (score: number, total: number) => void;
  showCelebration?: boolean;
}

export default function GameWrapper({
  children,
  score,
  totalQuestions,
  currentQuestion,
  onComplete,
  showCelebration = false,
}: GameWrapperProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const progress = totalQuestions > 0 ? (currentQuestion / totalQuestions) * 100 : 0;

  useEffect(() => {
    if (showCelebration) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  }, [showCelebration]);

  return (
    <div className="relative">
      {/* Confetti */}
      {showConfetti && <Confetti />}

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            <span className="text-white font-bold text-xl">{score}</span>
          </div>
          <div className="text-white/80">
            {currentQuestion} / {totalQuestions}
          </div>
        </div>
        <div className="h-4 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Game Content */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 min-h-[400px]">
        {children}
      </div>

      {/* Streak indicator */}
      {score > 0 && score % 3 === 0 && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-bounce">
          <span className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full font-bold shadow-lg">
            🔥 {score} in a row!
          </span>
        </div>
      )}
    </div>
  );
}

// Feedback animations
export function CorrectFeedback({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    playCorrectSound();
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-3xl z-10 animate-pulse">
      <div className="text-center">
        <div className="text-8xl mb-4 animate-bounce">✅</div>
        <p className="text-white text-3xl font-bold">Great Job!</p>
      </div>
    </div>
  );
}

export function WrongFeedback({ correctAnswer, onComplete }: { correctAnswer: string; onComplete: () => void }) {
  useEffect(() => {
    playWrongSound();
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-orange-500/90 rounded-3xl z-10">
      <div className="text-center">
        <div className="text-6xl mb-4">🤔</div>
        <p className="text-white text-2xl font-bold mb-2">Try Again!</p>
        <p className="text-white/80">The answer is: <strong>{correctAnswer}</strong></p>
      </div>
    </div>
  );
}

export function CompleteFeedback({ score, total, onPlayAgain, onExit }: { 
  score: number; 
  total: number; 
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const percentage = Math.round((score / total) * 100);
  const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : percentage >= 50 ? 1 : 0;

  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">
        {stars === 3 ? '🏆' : stars === 2 ? '🌟' : stars === 1 ? '⭐' : '💪'}
      </div>
      
      <h2 className="text-3xl font-bold text-gray-800 mb-2">
        {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great Job!' : stars === 1 ? 'Good Try!' : 'Keep Practicing!'}
      </h2>
      
      <p className="text-gray-600 text-xl mb-4">
        You got {score} out of {total} correct!
      </p>

      {/* Stars */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((star) => (
          <span 
            key={star} 
            className={`text-5xl ${star <= stars ? 'animate-pulse' : 'opacity-30'}`}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={onPlayAgain}
          className="px-8 py-4 bg-green-500 text-white rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-lg"
        >
          🔄 Play Again
        </button>
        <button
          onClick={onExit}
          className="px-8 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-lg"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

