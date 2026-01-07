// components/games/GameShell.tsx
// Enhanced game shell with consistent UI, animations, and feedback

'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import Confetti from './Confetti';
import { GameAudio } from '@/lib/games/audio-paths';
import { 
  GAME_COLORS, 
  GAME_FONTS, 
  GAME_ANIMATIONS,
  getRandomCelebration,
  calculateStars 
} from '@/lib/games/design-system';

interface GameShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  score: number;
  total: number;
  current: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  showBack?: boolean;
  backUrl?: string;
  onReset?: () => void;
}

export default function GameShell({
  children,
  title,
  subtitle,
  score,
  total,
  current,
  difficulty = 'easy',
  showBack = true,
  backUrl = '/games',
  onReset,
}: GameShellProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const progress = total > 0 ? (current / total) * 100 : 0;
  
  // Difficulty colors
  const difficultyColors = {
    easy: 'from-green-400 via-emerald-400 to-teal-400',
    medium: 'from-blue-400 via-indigo-400 to-purple-400',
    hard: 'from-purple-400 via-pink-400 to-rose-400',
    expert: 'from-rose-400 via-orange-400 to-amber-400',
  };

  const difficultyBadge = {
    easy: { emoji: '🌱', text: 'Easy' },
    medium: { emoji: '🌿', text: 'Medium' },
    hard: { emoji: '🌳', text: 'Hard' },
    expert: { emoji: '🏔️', text: 'Expert' },
  };

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br ${difficultyColors[difficulty]} p-4`}
      style={{ fontFamily: GAME_FONTS.display }}
    >
      {/* Inject animations */}
      <style>{GAME_ANIMATIONS}</style>
      
      {/* Confetti */}
      {showConfetti && <Confetti />}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {showBack && (
            <Link 
              href={backUrl}
              className="flex items-center gap-2 text-white/90 hover:text-white transition-colors bg-white/20 px-4 py-2 rounded-xl"
            >
              <span className="text-xl">←</span>
              <span className="font-bold">Back</span>
            </Link>
          )}
          
          <div className="flex items-center gap-3">
            <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-bold">
              {difficultyBadge[difficulty].emoji} {difficultyBadge[difficulty].text}
            </span>
            {onReset && (
              <button
                onClick={onReset}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-bold transition-colors"
              >
                🔄 Reset
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-1">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white/80 text-lg">{subtitle}</p>
          )}
        </div>

        {/* Score & Progress */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">⭐</span>
              <span className="text-white font-bold text-2xl">{score}</span>
            </div>
            <div className="text-white/90 font-bold">
              {current} / {total}
            </div>
          </div>
          <div className="h-4 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-400 rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// Feedback overlays
export function CorrectOverlay({ word, onComplete }: { word?: string; onComplete: () => void }) {
  const [phrase] = useState(getRandomCelebration('correct'));
  
  useEffect(() => {
    GameAudio.playCorrect();
    const timer = setTimeout(onComplete, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 rounded-3xl z-20 animate-pop">
      <div className="text-center">
        <div className="text-8xl mb-4 animate-bounce">✅</div>
        <p className="text-white text-3xl font-bold mb-2" style={{ fontFamily: GAME_FONTS.display }}>
          {phrase}
        </p>
        {word && (
          <p className="text-white/90 text-2xl font-bold mt-4 bg-white/20 px-6 py-2 rounded-xl inline-block">
            {word}
          </p>
        )}
      </div>
    </div>
  );
}

export function WrongOverlay({ hint, tries, onComplete }: { 
  hint?: string; 
  tries: number;
  onComplete: () => void;
}) {
  useEffect(() => {
    GameAudio.playWrong();
    const timer = setTimeout(onComplete, tries >= 2 ? 2500 : 1500);
    return () => clearTimeout(timer);
  }, [onComplete, tries]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-orange-500/95 rounded-3xl z-20">
      <div className="text-center animate-shake">
        <div className="text-7xl mb-4">🤔</div>
        <p className="text-white text-2xl font-bold mb-2" style={{ fontFamily: GAME_FONTS.display }}>
          {tries >= 2 ? 'Here\'s a hint!' : 'Try again!'}
        </p>
        {tries >= 2 && hint && (
          <div className="mt-4 bg-white/20 px-6 py-3 rounded-xl animate-float">
            <p className="text-white text-xl font-bold">💡 {hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LevelCompleteOverlay({ 
  level, 
  score, 
  total,
  onNext,
  onReplay,
}: { 
  level: number;
  score: number;
  total: number;
  onNext: () => void;
  onReplay: () => void;
}) {
  const stars = calculateStars(score, total);
  const [phrase] = useState(getRandomCelebration('levelComplete'));

  useEffect(() => {
    GameAudio.playCelebration();
  }, []);

  return (
    <div className="text-center py-8">
      <div className="text-6xl mb-4 animate-bounce">🎉</div>
      
      <h2 className="text-3xl font-bold text-gray-800 mb-2" style={{ fontFamily: GAME_FONTS.display }}>
        {phrase}
      </h2>
      
      <p className="text-gray-600 text-xl mb-4">
        Level {level} Complete!
      </p>

      <p className="text-gray-700 text-lg mb-4">
        You got <span className="font-bold text-green-600">{score}</span> out of <span className="font-bold">{total}</span>
      </p>

      {/* Stars */}
      <div className="flex justify-center gap-3 mb-6">
        {[1, 2, 3].map((star) => (
          <span 
            key={star} 
            className={`text-5xl transition-all duration-500 ${
              star <= stars ? 'animate-pulse scale-110' : 'opacity-30 grayscale'
            }`}
            style={{ animationDelay: `${star * 0.2}s` }}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 flex-wrap">
        <button
          onClick={onNext}
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
          style={{ fontFamily: GAME_FONTS.display }}
        >
          Next Level →
        </button>
        <button
          onClick={onReplay}
          className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
          style={{ fontFamily: GAME_FONTS.display }}
        >
          🔄 Replay
        </button>
      </div>
    </div>
  );
}

export function GameCompleteOverlay({
  totalScore,
  totalQuestions,
  onPlayAgain,
  onExit,
}: {
  totalScore: number;
  totalQuestions: number;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const stars = calculateStars(totalScore, totalQuestions);
  const percentage = Math.round((totalScore / totalQuestions) * 100);
  const [phrase] = useState(getRandomCelebration('allComplete'));

  useEffect(() => {
    GameAudio.playCelebration();
  }, []);

  const trophyEmoji = stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '💪';

  return (
    <div className="text-center py-8">
      <div className="text-8xl mb-4">{trophyEmoji}</div>
      
      <h2 className="text-4xl font-bold text-gray-800 mb-2" style={{ fontFamily: GAME_FONTS.display }}>
        {phrase}
      </h2>
      
      <p className="text-gray-600 text-xl mb-2">
        Game Complete!
      </p>

      <p className="text-3xl font-bold text-green-600 mb-4">
        {percentage}% Correct!
      </p>

      <p className="text-gray-700 text-lg mb-4">
        {totalScore} / {totalQuestions} answers correct
      </p>

      {/* Stars */}
      <div className="flex justify-center gap-4 mb-8">
        {[1, 2, 3].map((star) => (
          <span 
            key={star} 
            className={`text-6xl transition-all duration-700 ${
              star <= stars ? 'animate-pulse' : 'opacity-20 grayscale'
            }`}
            style={{ animationDelay: `${star * 0.3}s` }}
          >
            ⭐
          </span>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 flex-wrap">
        <button
          onClick={onPlayAgain}
          className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
          style={{ fontFamily: GAME_FONTS.display }}
        >
          🔄 Play Again
        </button>
        <button
          onClick={onExit}
          className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold text-xl transition-all hover:scale-105 shadow-lg"
          style={{ fontFamily: GAME_FONTS.display }}
        >
          ← All Games
        </button>
      </div>
    </div>
  );
}
