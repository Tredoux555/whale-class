// components/games/SightFlashGame.tsx
// Flash sight words game with audio

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SIGHT_WORDS_WITH_AUDIO } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

const LEVELS = [
  { id: 'level-1', name: 'Level 1', color: '#22c55e' },
  { id: 'level-2', name: 'Level 2', color: '#3b82f6' },
  { id: 'level-3', name: 'Level 3', color: '#8b5cf6' },
];

export default function SightFlashGame() {
  const router = useRouter();
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [words, setWords] = useState<{ word: string; audioUrl: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [showWord, setShowWord] = useState(true);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalQuestions = 10;
  const flashDuration = 2000; // 2 seconds to see word

  const startGame = (level: string) => {
    setSelectedLevel(level);
    const levelWords = SIGHT_WORDS_WITH_AUDIO[level] || [];
    const shuffled = [...levelWords].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setShowWord(true);
  };

  // Flash word then show options
  useEffect(() => {
    if (!selectedLevel || words.length === 0 || showCorrect || showWrong) return;
    
    setShowWord(true);
    const timer = setTimeout(() => setShowWord(false), flashDuration);
    return () => clearTimeout(timer);
  }, [currentIndex, selectedLevel, words, showCorrect, showWrong]);

  // Generate options
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const current = words[currentIndex];
    const allWords = Object.values(SIGHT_WORDS_WITH_AUDIO).flat();
    const others = allWords
      .filter(w => w.word !== current.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    setOptions([current.word, ...others.map(w => w.word)].sort(() => Math.random() - 0.5));
  }, [currentIndex, words]);

  // Play audio
  const playAudio = () => {
    if (words.length === 0 || currentIndex >= words.length) return;
    const word = words[currentIndex];
    GameAudio.playSightWord(word.word);
  };

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  const handleSelect = (selected: string) => {
    if (showCorrect || showWrong || showWord) return;
    
    if (selected === words[currentIndex].word) {
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
      const timer = setTimeout(handleNext, 1500);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, showWrong, handleNext]);

  // Level selection
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400 p-4"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">⚡ Sight Flash</h1>
            <p className="text-white/90">See the word, then find it!</p>
          </div>

          <div className="space-y-4">
            {LEVELS.map((level) => (
              <button key={level.id}
                onClick={() => startGame(level.id)}
                className="w-full p-6 bg-white rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
                <h3 className="text-xl font-bold" style={{ color: level.color }}>{level.name}</h3>
                <p className="text-gray-500 text-sm">
                  {SIGHT_WORDS_WITH_AUDIO[level.id]?.slice(0, 5).map(w => w.word).join(', ')}...
                </p>
              </button>
            ))}
          </div>

          <button onClick={() => router.push('/games')}
            className="mt-8 w-full py-3 bg-white/20 text-white rounded-xl font-bold">
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Game complete
  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        {score >= 7 && <Confetti />}
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{score >= 7 ? '🏆' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {score >= 7 ? 'Super Star!' : 'Good Job!'}
          </h2>
          <p className="text-gray-600 text-xl mb-6">Score: {score}/{totalQuestions}</p>
          <div className="space-y-3">
            <button onClick={() => startGame(selectedLevel)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl">
              🔄 Play Again
            </button>
            <button onClick={() => setSelectedLevel(null)}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl">
              ← Choose Level
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedLevel(null)} className="text-white font-bold">← Back</button>
          <div className="text-white font-bold">{currentIndex + 1}/{totalQuestions}</div>
          <div className="text-white font-bold">⭐ {score}</div>
        </div>

        <div className="h-3 bg-white/30 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden min-h-[400px]">
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
                <p className="text-white text-2xl font-bold">It was: {currentWord.word}</p>
              </div>
            </div>
          )}

          {showWord ? (
            <div className="flex flex-col items-center justify-center h-80">
              <p className="text-gray-500 mb-4">Remember this word!</p>
              <div className="text-6xl font-bold text-gray-800 animate-pulse">
                {currentWord.word}
              </div>
              <button onClick={playAudio}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full font-bold">
                🔊 Hear It
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <p className="text-xl text-gray-600 mb-4">Which word did you see?</p>
                <button onClick={playAudio}
                  className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold">
                  🔊 Hear It Again
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {options.map((option, index) => (
                  <button key={`${option}-${index}`}
                    onClick={() => handleSelect(option)}
                    disabled={showCorrect || showWrong}
                    className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl text-2xl font-bold text-gray-800 shadow-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50">
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
