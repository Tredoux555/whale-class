// components/games/MissingLetterGame.tsx
// Fill in the missing letter with audio

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_PINK_WORDS, WordData } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

export default function MissingLetterGame() {
  const router = useRouter();
  
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [missingIndex, setMissingIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const totalQuestions = 8;

  const startGame = () => {
    const shuffled = [...ALL_PINK_WORDS].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setGameStarted(true);
  };

  // Setup missing letter and options
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const word = words[currentIndex].word;
    const randIndex = Math.floor(Math.random() * word.length);
    setMissingIndex(randIndex);
    
    const correctLetter = word[randIndex];
    const wrongLetters = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter(l => l !== correctLetter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    setOptions([correctLetter, ...wrongLetters].sort(() => Math.random() - 0.5));
  }, [currentIndex, words]);

  // Play word audio
  const playWordAudio = () => {
    if (words.length === 0 || currentIndex >= words.length) return;
    const word = words[currentIndex];
    GameAudio.playWord(word.word, phase === 'pink-series' ? 'pink' : phase === 'blue-series' ? 'blue' : 'green');
  };

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  const handleSelect = (letter: string) => {
    if (showCorrect || showWrong) return;
    
    const correctLetter = words[currentIndex].word[missingIndex];
    
    if (letter === correctLetter) {
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

  useEffect(() => {
    if (showCorrect || showWrong) {
      const timer = setTimeout(handleNext, showCorrect ? 1500 : 2000);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, showWrong, handleNext]);

  // Start screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 p-4 flex items-center justify-center"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-8xl mb-4">❓</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Missing Letter</h1>
          <p className="text-gray-600 mb-6">Find the missing letter in each word!</p>
          <button onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-xl">
            🎮 Start Game
          </button>
          <button onClick={() => router.push('/games')}
            className="mt-4 w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Complete screen
  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        {score >= 6 && <Confetti />}
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{score >= 6 ? '🎉' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {score >= 6 ? 'Excellent!' : 'Good Try!'}
          </h2>
          <p className="text-gray-600 text-xl mb-6">Score: {score}/{totalQuestions}</p>
          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl">
              🔄 Play Again
            </button>
            <button onClick={() => router.push('/games')}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl">
              ← Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const displayWord = currentWord.word.split('').map((letter, i) => 
    i === missingIndex ? '_' : letter
  ).join('');

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/games')} className="text-white font-bold">← Back</button>
          <div className="text-white font-bold">{currentIndex + 1}/{totalQuestions}</div>
          <div className="text-white font-bold">⭐ {score}</div>
        </div>

        <div className="h-3 bg-white/30 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
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
                <p className="text-white text-2xl font-bold">
                  It was: {currentWord.word[missingIndex]}
                </p>
              </div>
            </div>
          )}

          <div className="text-center mb-6">
            <div className="text-8xl mb-4">{currentWord.image}</div>
            <button onClick={playWordAudio}
              className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 mb-4">
              🔊 Hear Word
            </button>
            <div className="text-5xl font-bold tracking-widest text-gray-800">
              {displayWord}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {options.map((letter, index) => (
              <button key={`${letter}-${index}`}
                onClick={() => handleSelect(letter)}
                disabled={showCorrect || showWrong}
                className="h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl text-white text-3xl font-bold shadow-lg hover:scale-110 active:scale-95 transition-transform disabled:opacity-50">
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
