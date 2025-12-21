// components/games/PictureMatchGame.tsx
// Match pictures to words with audio

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PINK_SERIES, ALL_PINK_WORDS, WordData } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

interface Props {
  phase?: string;
}

export default function PictureMatchGame({ phase }: Props) {
  const router = useRouter();
  
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<WordData[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const totalQuestions = 8;

  // Start game
  const startGame = () => {
    const shuffled = [...ALL_PINK_WORDS].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setGameStarted(true);
  };

  // Generate options
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const current = words[currentIndex];
    const others = ALL_PINK_WORDS
      .filter(w => w.word !== current.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    setOptions([current, ...others].sort(() => Math.random() - 0.5));
  }, [currentIndex, words]);

  // Play audio for option
  const playOptionAudio = (word: WordData) => {
    GameAudio.playWord(word.word, phase === 'pink-series' ? 'pink' : phase === 'blue-series' ? 'blue' : 'green');
  };

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  // Handle selection
  const handleSelect = (selected: WordData) => {
    if (showCorrect || showWrong) return;
    
    if (selected.word === words[currentIndex].word) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      setShowConfetti(true);
      GameAudio.playCorrect().catch(console.error);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setShowWrong(true);
      GameAudio.playWrong().catch(console.error);
    }
  };

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
    if (showCorrect || showWrong) {
      const timer = setTimeout(handleNext, showCorrect ? 1500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, showWrong, handleNext]);

  // ==========================================
  // RENDER: Start Screen
  // ==========================================
  if (!gameStarted) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 p-4 flex items-center justify-center"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-8xl mb-4">🖼️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Picture Match</h1>
          <p className="text-gray-600 mb-6">Look at the picture and find the matching word!</p>
          
          <button
            onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-xl hover:opacity-90"
          >
            🎮 Start Game
          </button>
          
          <button
            onClick={() => router.push('/games')}
            className="mt-4 w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold"
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
        className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        {score >= 6 && <Confetti />}
        
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{score >= 6 ? '🏆' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {score >= 6 ? 'Excellent!' : 'Good Job!'}
          </h2>
          <p className="text-gray-600 text-xl mb-6">
            You matched {score} out of {totalQuestions}!
          </p>

          <div className="space-y-3">
            <button
              onClick={startGame}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl"
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => router.push('/games')}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl"
            >
              ← Back to Games
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
      className="min-h-screen p-4 bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/games')} className="text-white font-bold">
            ← Back
          </button>
          <div className="text-white font-bold">
            {currentIndex + 1} / {totalQuestions}
          </div>
          <div className="text-white font-bold">⭐ {score}</div>
        </div>

        {/* Progress */}
        <div className="h-3 bg-white/30 rounded-full overflow-hidden mb-6">
          <div 
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {/* Feedback */}
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
                <div className="text-6xl mb-4">❌</div>
                <p className="text-white text-2xl font-bold">The answer was: {currentWord.word}</p>
              </div>
            </div>
          )}

          {/* Picture */}
          <div className="text-center mb-6">
            <div className="text-9xl mb-2">{currentWord.image}</div>
            <p className="text-gray-500">Find the word for this picture!</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((option, index) => (
              <button
                key={`${option.word}-${index}`}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => playOptionAudio(option)}
                disabled={showCorrect || showWrong}
                className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl text-2xl font-bold text-gray-800 shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {option.word}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
