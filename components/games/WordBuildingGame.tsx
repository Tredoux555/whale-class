// components/games/WordBuildingGame.tsx
// Drag letters to build words with audio

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PINK_SERIES, BLUE_SERIES, WordData } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

interface Props {
  phase?: string;
  level?: string;
}

const LEVELS = [
  { id: 'short-a', name: 'Short A', color: '#ef4444', series: 'pink' as const },
  { id: 'short-i', name: 'Short I', color: '#f97316', series: 'pink' as const },
  { id: 'short-o', name: 'Short O', color: '#eab308', series: 'pink' as const },
  { id: 'short-e', name: 'Short E', color: '#22c55e', series: 'pink' as const },
  { id: 'short-u', name: 'Short U', color: '#3b82f6', series: 'pink' as const },
  { id: 'blends', name: 'Blends', color: '#8b5cf6', series: 'blue' as const },
];

export default function WordBuildingGame({ phase, level }: Props) {
  const router = useRouter();
  
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[0] | null>(null);
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [placedLetters, setPlacedLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalQuestions = 5;

  // Start game with level
  const startGame = (levelData: typeof LEVELS[0]) => {
    setSelectedLevel(levelData);
    
    let wordPool: WordData[] = [];
    if (levelData.series === 'pink') {
      wordPool = PINK_SERIES[levelData.id] || [];
    } else {
      wordPool = Object.values(BLUE_SERIES).flat();
    }
    
    const shuffled = [...wordPool].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setPlacedLetters([]);
  };

  // Setup letters for current word
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    const letters = currentWord.word.split('');
    
    // Add some extra random letters
    const extraLetters = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter(l => !letters.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    const allLetters = [...letters, ...extraLetters].sort(() => Math.random() - 0.5);
    setAvailableLetters(allLetters);
    setPlacedLetters([]);
  }, [currentIndex, words]);

  // Play word audio
  const playWordAudio = useCallback(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    const word = words[currentIndex];
    GameAudio.playWord(word.word, selectedLevel?.series || 'pink');
  }, [currentIndex, words, selectedLevel]);

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  // Auto-play on new word
  useEffect(() => {
    if (selectedLevel && words.length > 0 && !showCorrect && !showWrong) {
      const timer = setTimeout(playWordAudio, 500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, selectedLevel, words, playWordAudio, showCorrect, showWrong]);

  // Handle letter tap
  const handleLetterTap = (letter: string, index: number) => {
    if (showCorrect || showWrong) return;
    
    // Add to placed letters
    setPlacedLetters(prev => [...prev, letter]);
    
    // Remove from available
    setAvailableLetters(prev => {
      const newLetters = [...prev];
      newLetters.splice(index, 1);
      return newLetters;
    });
  };

  // Handle placed letter tap (remove)
  const handlePlacedTap = (index: number) => {
    if (showCorrect || showWrong) return;
    
    const letter = placedLetters[index];
    setPlacedLetters(prev => {
      const newPlaced = [...prev];
      newPlaced.splice(index, 1);
      return newPlaced;
    });
    setAvailableLetters(prev => [...prev, letter]);
  };

  // Check answer - FIXED: Prevent double-trigger with hasCompletedRef
  const hasCompletedRef = useRef(false);
  
  useEffect(() => {
    // Reset completion flag when word changes
    hasCompletedRef.current = false;
  }, [currentIndex, words.length]);
  
  useEffect(() => {
    // Don't check if already showing feedback or already completed
    if (showCorrect || showWrong || hasCompletedRef.current) return;
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const currentWord = words[currentIndex];
    const builtWord = placedLetters.join('');
    
    // Only check when word is complete
    if (builtWord.length === currentWord.word.length) {
      hasCompletedRef.current = true; // Prevent double-trigger
      
      if (builtWord === currentWord.word) {
        setScore(prev => prev + 1);
        setShowCorrect(true);
        setShowConfetti(true);
        GameAudio.playCorrect().catch(console.error);
        setTimeout(() => setShowConfetti(false), 2000);
      } else {
        setShowWrong(true);
        GameAudio.playWrong().catch(console.error);
      }
    }
  }, [placedLetters, currentIndex, words, showCorrect, showWrong]);

  // Next question
  const handleNext = useCallback(() => {
    setShowCorrect(false);
    setShowWrong(false);
    
    if (currentIndex + 1 >= totalQuestions) {
      setGameComplete(true);
      GameAudio.playUI('complete').catch(console.error);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (showCorrect) {
      const timer = setTimeout(handleNext, 1500);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, handleNext]);

  // Retry on wrong
  const handleRetry = () => {
    setShowWrong(false);
    setPlacedLetters([]);
    const currentWord = words[currentIndex];
    const letters = currentWord.word.split('');
    const extraLetters = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter(l => !letters.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    setAvailableLetters([...letters, ...extraLetters].sort(() => Math.random() - 0.5));
  };

  // ==========================================
  // RENDER: Level Selection
  // ==========================================
  if (!selectedLevel) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-green-400 via-teal-400 to-blue-400 p-4"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              🔤 Word Building
            </h1>
            <p className="text-white/90 text-lg">
              Build words by tapping letters!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => startGame(lvl)}
                className="p-6 bg-white rounded-2xl shadow-xl hover:scale-105 transition-transform active:scale-95"
              >
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl"
                  style={{ backgroundColor: lvl.color + '30' }}
                >
                  {lvl.series === 'pink' ? '🩷' : '💙'}
                </div>
                <h3 className="text-lg font-bold text-gray-800">{lvl.name}</h3>
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push('/games')}
            className="mt-8 w-full py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30"
          >
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Game Complete
  // ==========================================
  if (gameComplete) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          background: `linear-gradient(135deg, ${selectedLevel.color}dd, ${selectedLevel.color}99)`,
        }}
      >
        {score >= 4 && <Confetti />}
        
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{score >= 4 ? '🎉' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {score >= 4 ? 'Amazing!' : 'Good Try!'}
          </h2>
          <p className="text-gray-600 text-xl mb-6">
            You got {score} out of {totalQuestions}!
          </p>

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={`text-4xl ${star <= score ? '' : 'opacity-30'}`}>⭐</span>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(selectedLevel)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl hover:bg-green-600"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => setSelectedLevel(null)}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl hover:bg-gray-300"
            >
              ← Choose Level
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Game Play
  // ==========================================
  const currentWord = words[currentIndex];

  return (
    <div 
      className="min-h-screen p-4"
      style={{ 
        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
        background: `linear-gradient(135deg, ${selectedLevel.color}dd, ${selectedLevel.color}99)`,
      }}
    >
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedLevel(null)} className="text-white font-bold">
            ← Back
          </button>
          <div className="text-white font-bold">{selectedLevel.name}</div>
          <div className="text-white font-bold">⭐ {score}</div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {/* Feedback Overlays */}
          {showCorrect && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">✅</div>
                <p className="text-white text-3xl font-bold">Correct!</p>
              </div>
            </div>
          )}
          
          {showWrong && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <p className="text-white text-2xl font-bold mb-4">Try Again!</p>
                <button
                  onClick={handleRetry}
                  className="px-8 py-3 bg-white text-orange-500 rounded-xl font-bold"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Word Image & Audio */}
          <div className="text-center mb-6">
            <div className="text-8xl mb-4">{currentWord.image}</div>
            <button
              onClick={playWordAudio}
              className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600"
            >
              🔊 Hear Word
            </button>
          </div>

          {/* Word Slots */}
          <div className="flex justify-center gap-2 mb-8">
            {currentWord.word.split('').map((_, index) => (
              <div
                key={index}
                onClick={() => placedLetters[index] && handlePlacedTap(index)}
                className={`w-14 h-14 border-4 border-dashed rounded-xl flex items-center justify-center text-3xl font-bold cursor-pointer transition-all ${
                  placedLetters[index] 
                    ? 'bg-blue-100 border-blue-400' 
                    : 'border-gray-300'
                }`}
              >
                {placedLetters[index] || ''}
              </div>
            ))}
          </div>

          {/* Available Letters */}
          <div className="flex flex-wrap justify-center gap-3">
            {availableLetters.map((letter, index) => (
              <button
                key={`${letter}-${index}`}
                onClick={() => handleLetterTap(letter, index)}
                className="w-14 h-14 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl text-white text-2xl font-bold shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
