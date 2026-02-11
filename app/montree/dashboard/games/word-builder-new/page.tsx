// app/games/word-builder-new/page.tsx
// Word Builder - Enhanced Moveable Alphabet Digital
// Phase 2 polished game with progress tracking

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

type Difficulty = 'cvc' | 'ccvc' | 'cvcc' | 'all';
type GameState = 'menu' | 'playing' | 'complete';

interface GameWord {
  word: string;
  image: string;
  sounds: string[];
}

interface GameStats {
  correct: number;
  totalAttempts: number;
  streak: number;
  bestStreak: number;
  startTime: number;
}

// CVC Words organized by vowel
const CVC_WORDS: GameWord[] = [
  // Short A
  { word: 'cat', image: '🐱', sounds: ['c', 'a', 't'] },
  { word: 'bat', image: '🦇', sounds: ['b', 'a', 't'] },
  { word: 'hat', image: '🎩', sounds: ['h', 'a', 't'] },
  { word: 'mat', image: '🧹', sounds: ['m', 'a', 't'] },
  { word: 'rat', image: '🐀', sounds: ['r', 'a', 't'] },
  { word: 'sat', image: '🪑', sounds: ['s', 'a', 't'] },
  { word: 'can', image: '🥫', sounds: ['c', 'a', 'n'] },
  { word: 'fan', image: '🌀', sounds: ['f', 'a', 'n'] },
  { word: 'man', image: '👨', sounds: ['m', 'a', 'n'] },
  { word: 'pan', image: '🍳', sounds: ['p', 'a', 'n'] },
  { word: 'van', image: '🚐', sounds: ['v', 'a', 'n'] },
  { word: 'bag', image: '👜', sounds: ['b', 'a', 'g'] },
  { word: 'tag', image: '🏷️', sounds: ['t', 'a', 'g'] },
  // Short E
  { word: 'bed', image: '🛏️', sounds: ['b', 'e', 'd'] },
  { word: 'red', image: '🔴', sounds: ['r', 'e', 'd'] },
  { word: 'hen', image: '🐔', sounds: ['h', 'e', 'n'] },
  { word: 'pen', image: '✏️', sounds: ['p', 'e', 'n'] },
  { word: 'ten', image: '🔟', sounds: ['t', 'e', 'n'] },
  { word: 'net', image: '🥅', sounds: ['n', 'e', 't'] },
  { word: 'pet', image: '🐕', sounds: ['p', 'e', 't'] },
  { word: 'jet', image: '✈️', sounds: ['j', 'e', 't'] },
  { word: 'wet', image: '💧', sounds: ['w', 'e', 't'] },
  { word: 'leg', image: '🦵', sounds: ['l', 'e', 'g'] },
  // Short I
  { word: 'big', image: '🦣', sounds: ['b', 'i', 'g'] },
  { word: 'dig', image: '⛏️', sounds: ['d', 'i', 'g'] },
  { word: 'pig', image: '🐷', sounds: ['p', 'i', 'g'] },
  { word: 'wig', image: '💇', sounds: ['w', 'i', 'g'] },
  { word: 'bin', image: '🗑️', sounds: ['b', 'i', 'n'] },
  { word: 'fin', image: '🦈', sounds: ['f', 'i', 'n'] },
  { word: 'pin', image: '📌', sounds: ['p', 'i', 'n'] },
  { word: 'win', image: '🏆', sounds: ['w', 'i', 'n'] },
  { word: 'sit', image: '🪑', sounds: ['s', 'i', 't'] },
  { word: 'hit', image: '⚾', sounds: ['h', 'i', 't'] },
  { word: 'bit', image: '🦷', sounds: ['b', 'i', 't'] },
  { word: 'kit', image: '🧰', sounds: ['k', 'i', 't'] },
  // Short O
  { word: 'dog', image: '🐶', sounds: ['d', 'o', 'g'] },
  { word: 'log', image: '🪵', sounds: ['l', 'o', 'g'] },
  { word: 'fog', image: '🌫️', sounds: ['f', 'o', 'g'] },
  { word: 'hog', image: '🐗', sounds: ['h', 'o', 'g'] },
  { word: 'box', image: '📦', sounds: ['b', 'o', 'x'] },
  { word: 'fox', image: '🦊', sounds: ['f', 'o', 'x'] },
  { word: 'hot', image: '🔥', sounds: ['h', 'o', 't'] },
  { word: 'pot', image: '🍲', sounds: ['p', 'o', 't'] },
  { word: 'cot', image: '🛏️', sounds: ['c', 'o', 't'] },
  { word: 'dot', image: '⚫', sounds: ['d', 'o', 't'] },
  { word: 'mop', image: '🧹', sounds: ['m', 'o', 'p'] },
  { word: 'hop', image: '🦘', sounds: ['h', 'o', 'p'] },
  { word: 'top', image: '🎪', sounds: ['t', 'o', 'p'] },
  // Short U
  { word: 'bug', image: '🐛', sounds: ['b', 'u', 'g'] },
  { word: 'hug', image: '🤗', sounds: ['h', 'u', 'g'] },
  { word: 'mug', image: '☕', sounds: ['m', 'u', 'g'] },
  { word: 'rug', image: '🧶', sounds: ['r', 'u', 'g'] },
  { word: 'jug', image: '🫗', sounds: ['j', 'u', 'g'] },
  { word: 'bus', image: '🚌', sounds: ['b', 'u', 's'] },
  { word: 'cup', image: '🥤', sounds: ['c', 'u', 'p'] },
  { word: 'pup', image: '🐕', sounds: ['p', 'u', 'p'] },
  { word: 'cut', image: '✂️', sounds: ['c', 'u', 't'] },
  { word: 'nut', image: '🥜', sounds: ['n', 'u', 't'] },
  { word: 'hut', image: '🛖', sounds: ['h', 'u', 't'] },
  { word: 'sun', image: '☀️', sounds: ['s', 'u', 'n'] },
  { word: 'run', image: '🏃', sounds: ['r', 'u', 'n'] },
  { word: 'fun', image: '🎉', sounds: ['f', 'u', 'n'] },
];

// CCVC/CVCC words (blends)
const BLEND_WORDS: GameWord[] = [
  { word: 'frog', image: '🐸', sounds: ['f', 'r', 'o', 'g'] },
  { word: 'crab', image: '🦀', sounds: ['c', 'r', 'a', 'b'] },
  { word: 'flag', image: '🚩', sounds: ['f', 'l', 'a', 'g'] },
  { word: 'drum', image: '🥁', sounds: ['d', 'r', 'u', 'm'] },
  { word: 'swim', image: '🏊', sounds: ['s', 'w', 'i', 'm'] },
  { word: 'skip', image: '⏭️', sounds: ['s', 'k', 'i', 'p'] },
  { word: 'stop', image: '🛑', sounds: ['s', 't', 'o', 'p'] },
  { word: 'clap', image: '👏', sounds: ['c', 'l', 'a', 'p'] },
  { word: 'snap', image: '🫰', sounds: ['s', 'n', 'a', 'p'] },
  { word: 'trip', image: '✈️', sounds: ['t', 'r', 'i', 'p'] },
  { word: 'grab', image: '🤏', sounds: ['g', 'r', 'a', 'b'] },
  { word: 'plan', image: '📋', sounds: ['p', 'l', 'a', 'n'] },
  // CVCC
  { word: 'lamp', image: '💡', sounds: ['l', 'a', 'm', 'p'] },
  { word: 'camp', image: '⛺', sounds: ['c', 'a', 'm', 'p'] },
  { word: 'jump', image: '🦘', sounds: ['j', 'u', 'm', 'p'] },
  { word: 'hand', image: '✋', sounds: ['h', 'a', 'n', 'd'] },
  { word: 'sand', image: '🏖️', sounds: ['s', 'a', 'n', 'd'] },
  { word: 'band', image: '🎸', sounds: ['b', 'a', 'n', 'd'] },
  { word: 'milk', image: '🥛', sounds: ['m', 'i', 'l', 'k'] },
  { word: 'silk', image: '🧵', sounds: ['s', 'i', 'l', 'k'] },
  { word: 'desk', image: '🪑', sounds: ['d', 'e', 's', 'k'] },
  { word: 'nest', image: '🪺', sounds: ['n', 'e', 's', 't'] },
  { word: 'best', image: '🥇', sounds: ['b', 'e', 's', 't'] },
  { word: 'test', image: '📝', sounds: ['t', 'e', 's', 't'] },
];

// Consonants and vowels for the alphabet tray
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'x', 'z'];
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

export default function WordBuilderGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('cvc');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentWord, setCurrentWord] = useState<GameWord | null>(null);
  const [placedLetters, setPlacedLetters] = useState<(string | null)[]>([]);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    totalAttempts: 0,
    streak: 0,
    bestStreak: 0,
    startTime: 0,
  });
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'hint'; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [showSoundOut, setShowSoundOut] = useState(false);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, []);

  // Get word pool based on difficulty
  const getWordPool = useCallback((): GameWord[] => {
    switch (difficulty) {
      case 'cvc': return CVC_WORDS;
      case 'ccvc':
      case 'cvcc': return BLEND_WORDS;
      case 'all': return [...CVC_WORDS, ...BLEND_WORDS];
      default: return CVC_WORDS;
    }
  }, [difficulty]);

  // Pick a random word
  const pickNewWord = useCallback(() => {
    const pool = getWordPool().filter(w => !usedWords.has(w.word));
    if (pool.length === 0) {
      setUsedWords(new Set());
      return getWordPool()[Math.floor(Math.random() * getWordPool().length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [getWordPool, usedWords]);

  // Start the game
  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('playing');
    setRoundNumber(1);
    setStats({
      correct: 0,
      totalAttempts: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now(),
    });
    setUsedWords(new Set());
    setWrongAttempts(0);
    setShowSoundOut(false);
    
    const word = pickNewWord();
    setCurrentWord(word);
    setPlacedLetters(new Array(word.sounds.length).fill(null));
    setFeedback(null);

    // Play the word
    setTimeout(() => playWord(word.word), 300);
  };

  // Play word audio
  const playWord = async (word: string) => {
    setIsPlaying(true);
    try {
      await GameAudio.playWord(word, 'pink');
    } catch {
      try {
        await GameAudio.playWord(word, 'blue');
      } catch {
        // Word not found
      }
    }
    setIsPlaying(false);
  };

  // Play letter sound
  const playLetter = async (letter: string) => {
    try {
      await GameAudio.play(`/audio-new/letters/${letter.toLowerCase()}.mp3`);
    } catch {
      // Letter sound not found
    }
  };

  // Sound out the word (play each phoneme)
  const soundOutWord = async () => {
    if (!currentWord || isPlaying) return;
    setIsPlaying(true);
    setShowSoundOut(true);

    for (let i = 0; i < currentWord.sounds.length; i++) {
      await playLetter(currentWord.sounds[i]);
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    setIsPlaying(false);
  };

  // Handle letter placement
  const handleLetterClick = async (letter: string) => {
    if (!currentWord || isPlaying || feedback?.type === 'correct') return;

    const nextEmpty = placedLetters.findIndex(l => l === null);
    if (nextEmpty === -1) return;

    const expectedLetter = currentWord.sounds[nextEmpty];
    
    if (letter.toLowerCase() === expectedLetter.toLowerCase()) {
      // Correct!
      const newPlaced = [...placedLetters];
      newPlaced[nextEmpty] = letter;
      setPlacedLetters(newPlaced);
      
      await playLetter(letter);

      // Check if complete
      if (nextEmpty === currentWord.sounds.length - 1) {
        // Word complete!
        setStats(prev => ({
          ...prev,
          correct: prev.correct + 1,
          streak: prev.streak + 1,
          bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        }));
        setFeedback({ type: 'correct', message: '🎉 Perfect!' });
        setUsedWords(prev => new Set([...prev, currentWord.word]));
        
        await GameAudio.playCorrect();
        setTimeout(() => playWord(currentWord.word), 500);

        feedbackTimeoutRef.current = setTimeout(() => {
          if (roundNumber >= totalRounds) {
            setGameState('complete');
            saveProgress();
            GameAudio.playCelebration();
          } else {
            nextWord();
          }
        }, 2000);
      }
    } else {
      // Wrong
      setStats(prev => ({
        ...prev,
        totalAttempts: prev.totalAttempts + 1,
        streak: 0,
      }));
      setWrongAttempts(prev => prev + 1);
      setFeedback({ type: 'wrong', message: 'Try again!' });
      await GameAudio.playWrong();

      if (wrongAttempts >= 1) {
        setFeedback({ type: 'hint', message: `Hint: Next letter is "${expectedLetter.toUpperCase()}"` });
      }

      feedbackTimeoutRef.current = setTimeout(() => {
        if (feedback?.type !== 'correct') setFeedback(null);
      }, 1500);
    }
  };

  // Remove letter from slot
  const removeLetter = (index: number) => {
    if (feedback?.type === 'correct') return;
    const newPlaced = [...placedLetters];
    newPlaced[index] = null;
    setPlacedLetters(newPlaced);
  };

  // Go to next word
  const nextWord = () => {
    setRoundNumber(prev => prev + 1);
    setWrongAttempts(0);
    setShowSoundOut(false);
    setFeedback(null);
    
    const word = pickNewWord();
    setCurrentWord(word);
    setPlacedLetters(new Array(word.sounds.length).fill(null));
    
    setTimeout(() => playWord(word.word), 300);
  };

  // Reset current word
  const resetWord = () => {
    if (!currentWord) return;
    setPlacedLetters(new Array(currentWord.sounds.length).fill(null));
    setFeedback(null);
    setWrongAttempts(0);
  };

  // Save progress
  const saveProgress = async () => {
    try {
      const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
      const studentId = localStorage.getItem('current_student_id');
      if (!studentId) return;

      await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          game_id: 'word-builder',
          time_spent_seconds: timeSpent,
          items_attempted: stats.totalAttempts + stats.correct,
          items_correct: stats.correct,
          completed: true,
          session_data: {
            difficulty,
            best_streak: stats.bestStreak,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  // ============================================
  // RENDER: Menu
  // ============================================
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-500 to-pink-500 overflow-hidden">
        <header className="p-4">
          <Link href="/montree/dashboard/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-2xl">←</span>
            <span className="font-medium">Back to Games</span>
          </Link>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="text-8xl mb-4 animate-bounce">🔤</div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            Word Builder
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Build words letter by letter!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => startGame('cvc')}
              className="w-full p-5 bg-green-400 rounded-2xl shadow-lg text-left border-4 border-green-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌱</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">CVC Words</h2>
                  <p className="text-green-100 text-sm">cat, dog, sun, bed...</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('ccvc')}
              className="w-full p-5 bg-blue-400 rounded-2xl shadow-lg text-left border-4 border-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌿</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Blend Words</h2>
                  <p className="text-blue-100 text-sm">frog, lamp, jump, hand...</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('all')}
              className="w-full p-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg text-left border-4 border-purple-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌈</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">All Words Mixed</h2>
                  <p className="text-purple-100 text-sm">Ultimate challenge!</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {['A', 'B', 'C'].map((letter, i) => (
              <span
                key={letter}
                className="text-4xl bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {letter}
              </span>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Complete
  // ============================================
  if (gameState === 'complete') {
    const accuracy = stats.correct + stats.totalAttempts > 0
      ? Math.round((stats.correct / (stats.correct + stats.totalAttempts)) * 100)
      : 100;

    let badge = '🥉';
    let message = 'Good effort!';
    if (accuracy >= 90) { badge = '🏆'; message = 'Word Master!'; }
    else if (accuracy >= 80) { badge = '🥇'; message = 'Amazing Speller!'; }
    else if (accuracy >= 70) { badge = '🥈'; message = 'Great Builder!'; }

    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-9xl mb-4 animate-bounce">{badge}</div>
          <h1 className="text-4xl font-bold text-white mb-2">{message}</h1>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <div className="text-3xl font-bold">{stats.correct}</div>
                <div className="text-sm opacity-80">Words Built</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{accuracy}%</div>
                <div className="text-sm opacity-80">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.bestStreak}</div>
                <div className="text-sm opacity-80">Best Streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{Math.floor((Date.now() - stats.startTime) / 1000)}s</div>
                <div className="text-sm opacity-80">Time</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(difficulty)}
              className="w-full p-4 bg-white text-purple-700 rounded-2xl font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              Play Again! 🔄
            </button>
            <Link href="/montree/dashboard/games" className="block w-full p-4 bg-white/20 text-white rounded-2xl font-bold text-xl">
              Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Playing
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-500 to-pink-500">
      {/* Header */}
      <header className="p-3 flex items-center justify-between">
        <Link href="/montree/dashboard/games" className="text-white/80 hover:text-white text-2xl">←</Link>
        <div className="flex items-center gap-3">
          {stats.streak >= 3 && (
            <div className="bg-orange-400 text-white px-3 py-1 rounded-full font-bold text-sm animate-pulse">
              🔥 {stats.streak}
            </div>
          )}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">⭐ {stats.correct}/{totalRounds}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-2">
        {/* Word display */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-5 mb-4 text-center">
          {/* Picture and word */}
          <div 
            className="text-7xl mb-2 cursor-pointer hover:scale-110 transition-transform"
            onClick={() => currentWord && playWord(currentWord.word)}
          >
            {currentWord?.image}
          </div>
          
          <p className="text-3xl font-bold text-white mb-3">{currentWord?.word}</p>

          {/* Audio buttons */}
          <div className="flex justify-center gap-3">
            <button
              onClick={() => currentWord && playWord(currentWord.word)}
              disabled={isPlaying}
              className="bg-white/30 hover:bg-white/40 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
            >
              🔊 Hear Word
            </button>
            <button
              onClick={soundOutWord}
              disabled={isPlaying}
              className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
            >
              🎵 Sound It Out
            </button>
          </div>

          {/* Sound out visualization */}
          {showSoundOut && currentWord && (
            <div className="mt-3 flex justify-center gap-2">
              {currentWord.sounds.map((sound, i) => (
                <span 
                  key={i} 
                  className="text-2xl font-bold text-yellow-300 animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  /{sound}/
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Letter slots */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-xl">
          <p className="text-center text-gray-600 font-medium text-sm mb-3">
            Tap letters to build the word:
          </p>
          
          <div className="flex justify-center gap-2 mb-4">
            {placedLetters.map((letter, index) => (
              <div
                key={index}
                onClick={() => letter && removeLetter(index)}
                className={`
                  w-14 h-16 rounded-xl border-4 border-dashed flex items-center justify-center text-3xl font-bold
                  transition-all cursor-pointer
                  ${letter 
                    ? 'bg-green-100 border-green-400 text-green-700' 
                    : 'bg-gray-100 border-gray-300 text-gray-300'
                  }
                  ${letter ? 'hover:bg-red-100 hover:border-red-400' : ''}
                `}
              >
                {letter?.toUpperCase() || '_'}
                {letter && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100">
                    ✕
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-center p-2 rounded-xl font-bold mb-3 animate-fadeIn ${
              feedback.type === 'correct' ? 'bg-green-100 text-green-700' :
              feedback.type === 'hint' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {feedback.message}
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={resetWord}
            className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            🔄 Reset Word
          </button>
        </div>

        {/* Alphabet tray */}
        <div className="bg-white rounded-2xl p-4 shadow-xl">
          {/* Vowels */}
          <div className="flex justify-center gap-2 mb-3">
            {VOWELS.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                disabled={isPlaying || feedback?.type === 'correct'}
                className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-xl text-2xl font-bold shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {letter}
              </button>
            ))}
          </div>

          {/* Consonants */}
          <div className="flex flex-wrap justify-center gap-2">
            {CONSONANTS.map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                disabled={isPlaying || feedback?.type === 'correct'}
                className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xl font-bold shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-white/70 text-sm mb-2">
            <span>Word {roundNumber} of {totalRounds}</span>
            <span>{Math.round((roundNumber / totalRounds) * 100)}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
