// components/games/CombinedISpy.tsx
// Combined I Spy - FIXED: Uses correct audio paths + says the word
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GameAudio } from '@/lib/games/audio-paths';
import { soundGameAudio } from '@/lib/sound-games/sound-utils';
import {
  CombinedSoundRound,
  CombinedSoundWord,
  generateRound,
  getPhonetic,
  shuffleArray,
} from '@/lib/sound-games/combined-sounds-data';

interface CombinedISpyProps {
  roundCount?: number;
  onComplete?: () => void;
  onBack?: () => void;
}

type GameState = 'start' | 'playing' | 'complete';

export default function CombinedISpy({ roundCount = 10, onComplete, onBack }: CombinedISpyProps) {
  const [gameState, setGameState] = useState<GameState>('start');
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [currentRound, setCurrentRound] = useState<CombinedSoundRound | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<CombinedSoundWord[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showStars, setShowStars] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // FIXED: Use correct audio path for letter sounds
  const playSound = useCallback(async (sound: string) => {
    await GameAudio.playLetter(sound.toLowerCase());
  }, []);

  // FIXED: Play the actual word using soundGameAudio
  const playWord = useCallback(async (word: string) => {
    await soundGameAudio.playWord(word.toLowerCase());
  }, []);

  const initRound = useCallback(() => {
    const round = generateRound(usedWords);
    if (round) {
      setCurrentRound(round);
      setShuffledOptions(shuffleArray([round.targetWord, ...round.distractors]));
      setSelectedAnswer(null);
      setIsCorrect(null);
      setAttempts(0);
    }
  }, [usedWords]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setCurrentRoundIndex(0);
    setUsedWords(new Set());
    setScore(0);
    setShowStars(false);
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && !currentRound) {
      initRound();
    }
  }, [gameState, currentRound, initRound]);

  // Play sounds when round changes
  useEffect(() => {
    if (currentRound && gameState === 'playing') {
      const timer1 = setTimeout(() => playSound(currentRound.targetWord.beginSound), 500);
      const timer2 = setTimeout(() => playSound(currentRound.targetWord.endSound), 1200);
      return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }
  }, [currentRound, gameState, playSound]);

  const handleSelect = useCallback(async (word: CombinedSoundWord) => {
    if (isCorrect === true) return;
    setSelectedAnswer(word.word);
    
    if (word.word === currentRound?.targetWord.word) {
      setIsCorrect(true);
      setShowStars(true);
      await GameAudio.playCorrect();
      
      // FIXED: Say the word when correct!
      setTimeout(async () => {
        await playWord(word.word);
      }, 500);
      
      const points = attempts === 0 ? 10 : Math.max(1, 10 - attempts * 2);
      setScore(prev => prev + points);
      setUsedWords(prev => new Set([...prev, word.word]));
      
      setTimeout(() => {
        setShowStars(false);
        if (currentRoundIndex + 1 >= roundCount) {
          setGameState('complete');
          onComplete?.();
        } else {
          setCurrentRoundIndex(prev => prev + 1);
          setCurrentRound(null);
        }
      }, 2000);
    } else {
      setIsCorrect(false);
      setAttempts(prev => prev + 1);
      await GameAudio.playWrong();
      setTimeout(() => { setSelectedAnswer(null); setIsCorrect(null); }, 800);
    }
  }, [currentRound, isCorrect, currentRoundIndex, roundCount, attempts, onComplete, playWord]);

  const replayInstruction = useCallback(async () => {
    if (currentRound) {
      await playSound(currentRound.targetWord.beginSound);
      setTimeout(() => playSound(currentRound.targetWord.endSound), 700);
    }
  }, [currentRound, playSound]);

  // Start screen
  if (gameState === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-400 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍👂</div>
          <h1 className="text-3xl font-bold text-purple-700 mb-2">Combined I Spy</h1>
          <p className="text-lg text-gray-600 mb-6">Listen for <span className="text-blue-600 font-bold">TWO</span> sounds!</p>
          <div className="bg-purple-50 rounded-2xl p-4 mb-6">
            <p className="text-gray-700 mb-2">Example:</p>
            <p className="text-lg">&quot;I spy something that <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-sm font-bold">BEGINS with /k/</span> and <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-sm font-bold">ENDS with /t/</span>&quot;</p>
            <div className="mt-3 text-4xl">🐱</div>
            <p className="text-purple-600 font-bold">CAT!</p>
          </div>
          <button onClick={startGame} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold py-4 px-8 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all">Let&apos;s Play! 🎮</button>
          {onBack && <button onClick={onBack} className="mt-4 text-gray-500 hover:text-gray-700">← Back to Games</button>}
        </div>
      </div>
    );
  }

  // Complete screen
  if (gameState === 'complete') {
    const maxScore = roundCount * 10;
    const percentage = Math.round((score / maxScore) * 100);
    const stars = percentage >= 90 ? 3 : percentage >= 70 ? 2 : 1;
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-400 flex flex-col items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-purple-700 mb-2">Amazing Job!</h1>
          <div className="my-6">
            <div className="text-5xl mb-2">{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
            <p className="text-2xl font-bold text-gray-700">{score} / {maxScore} points</p>
            <p className="text-gray-500">You found {roundCount} words!</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => { setGameState('start'); setCurrentRound(null); }} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xl font-bold py-4 px-8 rounded-2xl">Play Again! 🔄</button>
            {onBack && <button onClick={onBack} className="w-full bg-gray-200 text-gray-700 text-lg font-bold py-3 px-6 rounded-2xl">← Back to Games</button>}
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (!currentRound) {
    return <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-400 flex items-center justify-center"><div className="text-4xl animate-bounce">🔍</div></div>;
  }

  // Playing screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-300 via-orange-300 to-pink-400 flex flex-col p-4">
      {showStars && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="relative">
            {[...Array(12)].map((_, i) => (<div key={i} className="absolute text-4xl animate-ping" style={{ transform: `rotate(${i * 30}deg) translateY(-80px)`, animationDelay: `${i * 50}ms` }}>⭐</div>))}
            <div className="text-6xl animate-bounce">🌟</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {onBack && <button onClick={onBack} className="bg-white/80 text-gray-600 px-4 py-2 rounded-full shadow hover:bg-white">← Back</button>}
        <div className="bg-white/80 px-4 py-2 rounded-full shadow"><span className="font-bold text-purple-600">{currentRoundIndex + 1} / {roundCount}</span></div>
        <div className="bg-white/80 px-4 py-2 rounded-full shadow"><span className="font-bold text-yellow-600">⭐ {score}</span></div>
      </div>

      {/* Instruction Card */}
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl p-6 mb-6">
        <p className="text-center text-gray-600 text-lg mb-3">I spy something that...</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">BEGINS with</span>
            <button onClick={() => playSound(currentRound.targetWord.beginSound)} className="bg-blue-500 text-white px-4 py-2 rounded-full font-bold text-xl shadow-lg hover:scale-110 active:scale-95 animate-pulse">{getPhonetic(currentRound.targetWord.beginSound)}</button>
          </div>
          <span className="text-2xl text-gray-400">and</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-700">ENDS with</span>
            <button onClick={() => playSound(currentRound.targetWord.endSound)} className="bg-orange-500 text-white px-4 py-2 rounded-full font-bold text-xl shadow-lg hover:scale-110 active:scale-95 animate-pulse">{getPhonetic(currentRound.targetWord.endSound)}</button>
          </div>
        </div>
        <button onClick={replayInstruction} className="mt-4 mx-auto flex items-center gap-2 bg-purple-100 text-purple-600 px-4 py-2 rounded-full hover:bg-purple-200">🔊 Hear again</button>
      </div>

      {/* Answer Options */}
      <div className="flex-1 grid grid-cols-2 gap-4 max-w-lg mx-auto w-full">
        {shuffledOptions.map((word) => {
          const isSelected = selectedAnswer === word.word;
          const isCorrectAnswer = word.word === currentRound.targetWord.word;
          const showCorrect = isSelected && isCorrect === true;
          const showWrong = isSelected && isCorrect === false;
          return (
            <button key={word.word} onClick={() => handleSelect(word)} disabled={isCorrect === true}
              className={`relative bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center justify-center min-h-[140px] transition-all duration-200
                ${!isSelected && !isCorrect ? 'hover:scale-105 active:scale-95' : ''}
                ${showCorrect ? 'bg-green-100 ring-4 ring-green-500 scale-105' : ''}
                ${showWrong ? 'bg-red-100 ring-4 ring-red-500 animate-shake' : ''}
                ${isCorrect === true && !isCorrectAnswer ? 'opacity-50' : ''}`}>
              <span className="text-6xl sm:text-7xl mb-2">{word.image}</span>
              {isCorrect === true && <span className={`text-lg font-bold ${isCorrectAnswer ? 'text-green-600' : 'text-gray-400'}`}>{word.word}</span>}
              {showCorrect && <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✓</div>}
              {showWrong && <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center">✗</div>}
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {attempts >= 2 && isCorrect === null && (
        <div className="mt-4 text-center"><p className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full inline-block">💡 Hint: Look for {currentRound.targetWord.image}</p></div>
      )}

      <style jsx>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } } .animate-shake { animation: shake 0.4s ease-in-out; }`}</style>
    </div>
  );
}
