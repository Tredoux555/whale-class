// components/games/MissingLetterGame.tsx
// Fill in the missing letter - Enhanced with GameShell, hints, and better feedback

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMissingLetterLevel, MissingLetterWord } from '@/lib/games/missing-letter-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration, calculateStars } from '@/lib/games/design-system';

export default function MissingLetterGame() {
  const router = useRouter();
  
  const [currentLevel, setCurrentLevel] = useState(1);
  const [words, setWords] = useState<MissingLetterWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0); // Track attempts for hints
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [allLevelsComplete, setAllLevelsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [celebration, setCelebration] = useState('');

  const wordsPerLevel = 8;
  const totalLevels = 8;

  const startGame = () => {
    setCurrentLevel(1);
    const levelWords = getMissingLetterLevel(1);
    setWords(levelWords);
    setCurrentIndex(0);
    setScore(0);
    setTries(0);
    setLevelComplete(false);
    setAllLevelsComplete(false);
    setGameStarted(true);
  };

  // Setup options
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;
    
    const wordData = words[currentIndex];
    const correctLetter = wordData.word[wordData.missing];
    const wrongLetters = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter(l => l !== correctLetter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    
    setOptions([correctLetter, ...wrongLetters].sort(() => Math.random() - 0.5));
    setTries(0); // Reset tries for new word
  }, [currentIndex, words]);

  // Play word audio
  const playWordAudio = () => {
    if (words.length === 0 || currentIndex >= words.length) return;
    const wordData = words[currentIndex];
    GameAudio.play(wordData.audioUrl).catch(console.error);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  const handleSelect = (letter: string) => {
    if (showCorrect || showWrong) return;
    
    const wordData = words[currentIndex];
    const correctLetter = wordData.word[wordData.missing];
    
    if (letter === correctLetter) {
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
    
    if (currentIndex + 1 >= wordsPerLevel) {
      setLevelComplete(true);
      GameAudio.playCelebration().catch(console.error);
      
      if (currentLevel >= totalLevels) {
        setAllLevelsComplete(true);
      }
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, currentLevel]);
  
  const handleNextLevel = () => {
    if (currentLevel < totalLevels) {
      setCurrentLevel(prev => prev + 1);
      const levelWords = getMissingLetterLevel(currentLevel + 1);
      setWords(levelWords);
      setCurrentIndex(0);
      setScore(0);
      setLevelComplete(false);
    }
  };

  useEffect(() => {
    if (showCorrect || showWrong) {
      const delay = showCorrect ? 1500 : (tries >= 2 ? 2500 : 1500);
      const timer = setTimeout(handleNext, delay);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, showWrong, handleNext, tries]);

  // Get difficulty based on level
  const getDifficulty = () => {
    if (currentLevel <= 2) return 'easy';
    if (currentLevel <= 4) return 'medium';
    if (currentLevel <= 6) return 'hard';
    return 'expert';
  };

  const difficultyColors = {
    easy: 'from-green-400 via-emerald-400 to-teal-400',
    medium: 'from-blue-400 via-indigo-400 to-purple-400',
    hard: 'from-purple-400 via-pink-400 to-rose-400',
    expert: 'from-rose-400 via-orange-400 to-amber-400',
  };

  // Start screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 p-4 flex items-center justify-center"
        style={{ fontFamily: GAME_FONTS.display }}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-8xl mb-4">❓</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Missing Letter</h1>
          <p className="text-gray-600 mb-2">Find the missing letter in each word!</p>
          <p className="text-gray-500 text-sm mb-6">8 levels • 64 words total</p>
          <button onClick={startGame}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-lg">
            🎮 Start Game
          </button>
          <button onClick={() => router.push('/games')}
            className="mt-4 w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors">
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Level complete screen
  if (levelComplete && !allLevelsComplete) {
    const stars = calculateStars(score, wordsPerLevel);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400"
        style={{ fontFamily: GAME_FONTS.display }}>
        {stars >= 2 && <Confetti />}
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{stars >= 2 ? '🎉' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Level {currentLevel} Complete!
          </h2>
          <p className="text-gray-600 text-xl mb-4">Score: {score}/{wordsPerLevel}</p>
          
          {/* Stars */}
          <div className="flex justify-center gap-3 mb-6">
            {[1, 2, 3].map((star) => (
              <span 
                key={star} 
                className={`text-5xl transition-all ${star <= stars ? 'animate-pulse' : 'opacity-30 grayscale'}`}
              >
                ⭐
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={handleNextLevel}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-colors shadow-lg">
              → Level {currentLevel + 1}
            </button>
            <button onClick={() => { setLevelComplete(false); setScore(0); setCurrentIndex(0); }}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors">
              🔄 Replay Level
            </button>
            <button onClick={() => router.push('/games')}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors">
              ← Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // All levels complete
  if (allLevelsComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400"
        style={{ fontFamily: GAME_FONTS.display }}>
        <Confetti />
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-8xl mb-4">🏆</div>
          <h2 className="text-4xl font-bold text-gray-800 mb-2">Champion!</h2>
          <p className="text-gray-600 text-xl mb-2">You completed all {totalLevels} levels!</p>
          <p className="text-green-600 text-lg font-bold mb-6">
            {getRandomCelebration('allComplete')}
          </p>
          <div className="space-y-3">
            <button onClick={startGame}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-colors shadow-lg">
              🔄 Play Again
            </button>
            <button onClick={() => router.push('/games')}
              className="w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold text-xl transition-colors">
              ← Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const correctLetter = currentWord.word[currentWord.missing];
  const displayWord = currentWord.word.split('').map((letter, i) => 
    i === currentWord.missing ? '_' : letter
  ).join('');

  return (
    <div className={`min-h-screen p-4 bg-gradient-to-br ${difficultyColors[getDifficulty()]}`}
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/games')} 
            className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-colors">
            ← Back
          </button>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            Level {currentLevel}
          </div>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            ⭐ {score}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/20 rounded-2xl p-3 mb-6">
          <div className="flex justify-between text-white/90 text-sm mb-2">
            <span>Question {currentIndex + 1} of {wordsPerLevel}</span>
            <span>{Math.round(((currentIndex + 1) / wordsPerLevel) * 100)}%</span>
          </div>
          <div className="h-4 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / wordsPerLevel) * 100}%` }} />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
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
                    <p className="text-white text-2xl font-bold mb-2">Here's a hint!</p>
                    <div className="bg-white/20 px-6 py-3 rounded-xl animate-float">
                      <p className="text-white text-xl font-bold">
                        💡 The letter is: <span className="text-3xl">{correctLetter.toUpperCase()}</span>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-white text-2xl font-bold">Try again!</p>
                )}
              </div>
            </div>
          )}

          {/* Word Display */}
          <div className="text-center mb-6">
            <div className="text-9xl mb-4">{currentWord.image}</div>
            <button onClick={playWordAudio}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-bold text-lg transition-colors shadow-lg mb-4">
              🔊 Hear Word
            </button>
            <div className="text-6xl font-bold tracking-[0.3em] text-gray-800">
              {displayWord}
            </div>
            {tries >= 1 && tries < 2 && (
              <p className="text-orange-500 text-sm mt-2 animate-pulse">
                💡 One more try for a hint!
              </p>
            )}
          </div>

          {/* Letter Options */}
          <div className="grid grid-cols-4 gap-4">
            {options.map((letter, index) => (
              <button key={`${letter}-${index}`}
                onClick={() => handleSelect(letter)}
                disabled={showCorrect || showWrong}
                className={`
                  h-20 rounded-2xl text-white text-4xl font-bold shadow-lg 
                  transition-all duration-200 
                  hover:scale-110 active:scale-95
                  disabled:opacity-50 disabled:pointer-events-none
                  bg-gradient-to-br from-purple-500 to-pink-500
                  hover:from-purple-400 hover:to-pink-400
                  min-h-[72px] min-w-[72px]
                `}>
                {letter}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
