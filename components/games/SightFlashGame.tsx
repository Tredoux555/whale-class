// components/games/SightFlashGame.tsx
// Flash sight words game - Enhanced with hints, stars, and better feedback

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SIGHT_WORDS_WITH_AUDIO } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration, calculateStars } from '@/lib/games/design-system';

const LEVELS = [
  { id: 'level-1', name: 'Level 1', color: '#22c55e', emoji: '🌱', desc: 'Basic sight words' },
  { id: 'level-2', name: 'Level 2', color: '#3b82f6', emoji: '🌿', desc: 'Common words' },
  { id: 'level-3', name: 'Level 3', color: '#8b5cf6', emoji: '🌳', desc: 'Advanced words' },
];

export default function SightFlashGame() {
  const router = useRouter();
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [words, setWords] = useState<{ word: string; audioUrl: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [showWord, setShowWord] = useState(true);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebration, setCelebration] = useState('');

  const totalQuestions = 10;
  const flashDuration = 2000;

  const startGame = (level: string) => {
    setSelectedLevel(level);
    const levelWords = SIGHT_WORDS_WITH_AUDIO[level] || [];
    const shuffled = [...levelWords].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setTries(0);
    setGameComplete(false);
    setShowWord(true);
  };

  // Flash word then show options
  useEffect(() => {
    if (!selectedLevel || words.length === 0 || showCorrect || showWrong) return;
    
    setShowWord(true);
    setTries(0);
    const timer = setTimeout(() => setShowWord(false), flashDuration);
    return () => clearTimeout(timer);
  }, [currentIndex, selectedLevel, words.length, showCorrect, showWrong]);

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

  const playAudio = () => {
    if (words.length === 0 || currentIndex >= words.length) return;
    const word = words[currentIndex];
    GameAudio.playSightWord(word.word);
  };

  useEffect(() => {
    return () => { GameAudio.stop(); };
  }, []);

  const handleSelect = (selected: string) => {
    if (showCorrect || showWrong || showWord) return;
    
    if (selected === words[currentIndex].word) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      setShowConfetti(true);
      setCelebration(getRandomCelebration('correct'));
      GameAudio.playCorrect().catch(console.error);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setTries(prev => prev + 1);
      setShowWrong(true);
      GameAudio.playWrong().catch(console.error);
    }
  };

  const handleNext = useCallback(() => {
    setShowCorrect(false);
    setShowWrong(false);
    
    if (currentIndex + 1 >= totalQuestions) {
      setGameComplete(true);
      GameAudio.playCelebration().catch(console.error);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (showCorrect || showWrong) {
      const delay = showCorrect ? 1500 : (tries >= 2 ? 2500 : 1500);
      const timer = setTimeout(handleNext, delay);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, showWrong, handleNext, tries]);

  // Level selection
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400 p-4"
        style={{ fontFamily: GAME_FONTS.display }}>
        <style>{GAME_ANIMATIONS}</style>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">⚡</div>
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">Sight Flash</h1>
            <p className="text-white/90">See the word, remember it, find it!</p>
          </div>

          <div className="space-y-4">
            {LEVELS.map((level) => (
              <button key={level.id}
                onClick={() => startGame(level.id)}
                className="w-full p-6 bg-white rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{level.emoji}</span>
                  <div className="text-left flex-1">
                    <h3 className="text-xl font-bold" style={{ color: level.color }}>{level.name}</h3>
                    <p className="text-gray-500 text-sm">{level.desc}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {SIGHT_WORDS_WITH_AUDIO[level.id]?.slice(0, 4).map(w => w.word).join(', ')}...
                    </p>
                  </div>
                  <span className="text-3xl text-gray-300">→</span>
                </div>
              </button>
            ))}
          </div>

          <button onClick={() => router.push('/games')}
            className="mt-8 w-full py-4 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-colors">
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Game complete
  if (gameComplete) {
    const stars = calculateStars(score, totalQuestions);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400"
        style={{ fontFamily: GAME_FONTS.display }}>
        <style>{GAME_ANIMATIONS}</style>
        {stars >= 2 && <Confetti />}
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-7xl mb-4">{stars === 3 ? '🏆' : stars === 2 ? '🌟' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {stars === 3 ? 'Perfect!' : stars === 2 ? 'Great Job!' : 'Keep Practicing!'}
          </h2>
          <p className="text-gray-600 text-xl mb-4">Score: {score}/{totalQuestions}</p>
          
          {/* Stars */}
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3].map((star) => (
              <span key={star} 
                className={`text-5xl transition-all ${star <= stars ? 'animate-pulse' : 'opacity-30 grayscale'}`}>
                ⭐
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={() => startGame(selectedLevel)}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-colors shadow-lg">
              🔄 Play Again
            </button>
            <button onClick={() => setSelectedLevel(null)}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-bold text-xl transition-colors">
              ← Choose Level
            </button>
            <button onClick={() => router.push('/games')}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors">
              ← All Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-400"
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedLevel(null)} 
            className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-colors">
            ← Back
          </button>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            {currentIndex + 1}/{totalQuestions}
          </div>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            ⭐ {score}
          </div>
        </div>

        {/* Progress */}
        <div className="h-4 bg-white/30 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden min-h-[420px]">
          {/* Correct Overlay */}
          {showCorrect && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 rounded-3xl z-10 animate-pop">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">✅</div>
                <p className="text-white text-3xl font-bold mb-2">{celebration}</p>
                <p className="text-white/90 text-2xl font-bold bg-white/20 px-6 py-2 rounded-xl inline-block">
                  {currentWord.word}
                </p>
              </div>
            </div>
          )}
          
          {/* Wrong Overlay */}
          {showWrong && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-500/95 rounded-3xl z-10">
              <div className="text-center animate-shake">
                <div className="text-7xl mb-4">🤔</div>
                {tries >= 2 ? (
                  <>
                    <p className="text-white text-2xl font-bold mb-2">Here's the word!</p>
                    <div className="bg-white/20 px-6 py-3 rounded-xl animate-float">
                      <p className="text-white text-3xl font-bold">💡 {currentWord.word}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-white text-2xl font-bold">Try again!</p>
                )}
              </div>
            </div>
          )}

          {showWord ? (
            <div className="flex flex-col items-center justify-center h-80">
              <p className="text-gray-500 mb-4 text-lg">👀 Remember this word!</p>
              <div className="text-7xl font-bold text-gray-800 animate-pulse mb-6">
                {currentWord.word}
              </div>
              <button onClick={playAudio}
                className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-lg transition-colors shadow-lg">
                🔊 Hear It
              </button>
              <div className="mt-6 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full animate-pulse" 
                  style={{ animation: `shrink ${flashDuration}ms linear forwards` }} />
              </div>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <p className="text-xl text-gray-600 mb-4">Which word did you see?</p>
                <button onClick={playAudio}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold transition-colors">
                  🔊 Hear It Again
                </button>
                {tries >= 1 && tries < 2 && (
                  <p className="text-orange-500 text-sm mt-3 animate-pulse">
                    💡 One more try for a hint!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {options.map((option, index) => (
                  <button key={`${option}-${index}`}
                    onClick={() => handleSelect(option)}
                    disabled={showCorrect || showWrong}
                    className={`
                      p-6 rounded-2xl text-2xl font-bold shadow-lg 
                      transition-all duration-200 
                      hover:scale-105 active:scale-95
                      disabled:opacity-50 disabled:pointer-events-none
                      bg-gradient-to-br from-purple-100 to-pink-100 
                      hover:from-purple-200 hover:to-pink-200
                      text-gray-800
                      min-h-[72px]
                    `}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
