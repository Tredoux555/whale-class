// app/games/match-attack-new/page.tsx
// Match Attack - Speed Reading Game (Pink Series Object Box Digital)
// Phase 2 polished game with progress tracking

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

type Difficulty = 'easy' | 'medium' | 'hard' | 'blitz';
type GameState = 'menu' | 'countdown' | 'playing' | 'complete';

interface WordCard {
  word: string;
  image: string;
}

interface GameStats {
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  startTime: number;
  bestTime: number | null;
}

// Pink Series CVC Words with emojis
const WORD_CARDS: WordCard[] = [
  // Short A
  { word: 'cat', image: '🐱' },
  { word: 'bat', image: '🦇' },
  { word: 'hat', image: '🎩' },
  { word: 'mat', image: '🧹' },
  { word: 'rat', image: '🐀' },
  { word: 'can', image: '🥫' },
  { word: 'fan', image: '🌀' },
  { word: 'man', image: '👨' },
  { word: 'pan', image: '🍳' },
  { word: 'van', image: '🚐' },
  { word: 'bag', image: '👜' },
  { word: 'tag', image: '🏷️' },
  { word: 'cap', image: '🧢' },
  { word: 'map', image: '🗺️' },
  { word: 'nap', image: '😴' },
  { word: 'tap', image: '🚰' },
  // Short E
  { word: 'bed', image: '🛏️' },
  { word: 'red', image: '🔴' },
  { word: 'hen', image: '🐔' },
  { word: 'pen', image: '✏️' },
  { word: 'ten', image: '🔟' },
  { word: 'net', image: '🥅' },
  { word: 'pet', image: '🐕' },
  { word: 'jet', image: '✈️' },
  { word: 'wet', image: '💧' },
  { word: 'leg', image: '🦵' },
  { word: 'egg', image: '🥚' },
  { word: 'web', image: '🕸️' },
  // Short I
  { word: 'big', image: '🦣' },
  { word: 'dig', image: '⛏️' },
  { word: 'pig', image: '🐷' },
  { word: 'wig', image: '💇' },
  { word: 'bin', image: '🗑️' },
  { word: 'fin', image: '🦈' },
  { word: 'pin', image: '📌' },
  { word: 'win', image: '🏆' },
  { word: 'sit', image: '🪑' },
  { word: 'hit', image: '⚾' },
  { word: 'bit', image: '🦷' },
  { word: 'kit', image: '🧰' },
  { word: 'lip', image: '👄' },
  { word: 'zip', image: '🤐' },
  { word: 'six', image: '6️⃣' },
  { word: 'mix', image: '🥣' },
  // Short O
  { word: 'dog', image: '🐶' },
  { word: 'log', image: '🪵' },
  { word: 'fog', image: '🌫️' },
  { word: 'hog', image: '🐗' },
  { word: 'box', image: '📦' },
  { word: 'fox', image: '🦊' },
  { word: 'hot', image: '🔥' },
  { word: 'pot', image: '🍲' },
  { word: 'cot', image: '🛏️' },
  { word: 'dot', image: '⚫' },
  { word: 'mop', image: '🧹' },
  { word: 'hop', image: '🦘' },
  { word: 'top', image: '🎪' },
  { word: 'pop', image: '🎈' },
  { word: 'cob', image: '🌽' },
  { word: 'job', image: '💼' },
  // Short U
  { word: 'bug', image: '🐛' },
  { word: 'hug', image: '🤗' },
  { word: 'mug', image: '☕' },
  { word: 'rug', image: '🧶' },
  { word: 'jug', image: '🫗' },
  { word: 'bus', image: '🚌' },
  { word: 'cup', image: '🥤' },
  { word: 'pup', image: '🐕' },
  { word: 'cut', image: '✂️' },
  { word: 'nut', image: '🥜' },
  { word: 'hut', image: '🛖' },
  { word: 'sun', image: '☀️' },
  { word: 'run', image: '🏃' },
  { word: 'fun', image: '🎉' },
  { word: 'gum', image: '🫧' },
  { word: 'bun', image: '🍔' },
  { word: 'sub', image: '🥪' },
  { word: 'tub', image: '🛁' },
];

// Difficulty settings
const DIFFICULTY_CONFIG = {
  easy: { time: 60, optionCount: 3, timeBonus: 3 },
  medium: { time: 45, optionCount: 4, timeBonus: 2 },
  hard: { time: 30, optionCount: 5, timeBonus: 1 },
  blitz: { time: 20, optionCount: 6, timeBonus: 0.5 },
};

export default function MatchAttackGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [countdown, setCountdown] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [currentWord, setCurrentWord] = useState<WordCard | null>(null);
  const [options, setOptions] = useState<WordCard[]>([]);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    wrong: 0,
    streak: 0,
    bestStreak: 0,
    startTime: 0,
    bestTime: null,
  });
  const [feedback, setFeedback] = useState<{ correct: boolean; word: string } | null>(null);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [shakeWrong, setShakeWrong] = useState<string | null>(null);
  const [showWordFlash, setShowWordFlash] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, []);

  // Generate new round
  const generateRound = useCallback(() => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const availableWords = WORD_CARDS.filter(w => !usedWords.has(w.word));
    
    if (availableWords.length < config.optionCount) {
      setUsedWords(new Set());
      return generateRound();
    }

    // Pick target word
    const targetIndex = Math.floor(Math.random() * availableWords.length);
    const target = availableWords[targetIndex];

    // Pick distractors
    const distractors: WordCard[] = [];
    const otherWords = WORD_CARDS.filter(w => w.word !== target.word);
    
    while (distractors.length < config.optionCount - 1) {
      const randomIndex = Math.floor(Math.random() * otherWords.length);
      const word = otherWords[randomIndex];
      if (!distractors.find(d => d.word === word.word)) {
        distractors.push(word);
      }
    }

    // Shuffle options
    const allOptions = [target, ...distractors].sort(() => Math.random() - 0.5);

    setCurrentWord(target);
    setOptions(allOptions);
    setShowWordFlash(true);
    setTimeout(() => setShowWordFlash(false), 300);
  }, [difficulty, usedWords]);

  // Start countdown
  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('countdown');
    setCountdown(3);
    setStats({
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now(),
      bestTime: null,
    });
    setUsedWords(new Set());
    setFeedback(null);
    setTimeRemaining(DIFFICULTY_CONFIG[diff].time);
  };

  // Countdown effect
  useEffect(() => {
    if (gameState !== 'countdown') return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setGameState('playing');
      generateRound();
    }
  }, [gameState, countdown, generateRound]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setGameState('complete');
          saveProgress();
          GameAudio.playCelebration();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Handle selection
  const handleSelect = async (selected: WordCard) => {
    if (gameState !== 'playing' || feedback) return;

    const isCorrect = selected.word === currentWord?.word;

    if (isCorrect) {
      // Correct!
      const config = DIFFICULTY_CONFIG[difficulty];
      setStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
      }));
      setFeedback({ correct: true, word: selected.word });
      setUsedWords(prev => new Set([...prev, currentWord!.word]));
      
      // Time bonus
      setTimeRemaining(prev => Math.min(prev + config.timeBonus, DIFFICULTY_CONFIG[difficulty].time + 10));
      
      await GameAudio.playCorrect();

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        generateRound();
      }, 600);

    } else {
      // Wrong
      setStats(prev => ({
        ...prev,
        wrong: prev.wrong + 1,
        streak: 0,
      }));
      setFeedback({ correct: false, word: selected.word });
      setShakeWrong(selected.word);
      
      // Time penalty
      setTimeRemaining(prev => Math.max(prev - 3, 0));
      
      await GameAudio.playWrong();

      setTimeout(() => setShakeWrong(null), 500);
      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 800);
    }
  };

  // Play word audio
  const playWord = async () => {
    if (!currentWord) return;
    try {
      await GameAudio.playWord(currentWord.word, 'pink');
    } catch {
      // Word audio not found
    }
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
          game_id: 'match-attack',
          time_spent_seconds: timeSpent,
          items_attempted: stats.correct + stats.wrong,
          items_correct: stats.correct,
          high_score: stats.correct,
          completed: true,
          session_data: {
            difficulty,
            best_streak: stats.bestStreak,
            accuracy: stats.correct + stats.wrong > 0 
              ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) 
              : 100,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  // Get time bar color
  const getTimeColor = () => {
    const maxTime = DIFFICULTY_CONFIG[difficulty].time;
    const percentage = (timeRemaining / maxTime) * 100;
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // ============================================
  // RENDER: Menu
  // ============================================
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 overflow-hidden">
        <header className="p-4">
          <Link href="/montree/dashboard/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-2xl">←</span>
            <span className="font-medium">Back to Games</span>
          </Link>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="text-8xl mb-4 animate-pulse">⚡</div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            Match Attack!
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Read fast, match fast, score big!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => startGame('easy')}
              className="w-full p-5 bg-green-400 rounded-2xl shadow-lg text-left border-4 border-green-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🐢</span>
                  <div className="text-white">
                    <h2 className="text-xl font-bold">Easy</h2>
                    <p className="text-green-100 text-sm">60 seconds • 3 options</p>
                  </div>
                </div>
                <span className="text-white/60">⭐</span>
              </div>
            </button>

            <button
              onClick={() => startGame('medium')}
              className="w-full p-5 bg-blue-400 rounded-2xl shadow-lg text-left border-4 border-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🐇</span>
                  <div className="text-white">
                    <h2 className="text-xl font-bold">Medium</h2>
                    <p className="text-blue-100 text-sm">45 seconds • 4 options</p>
                  </div>
                </div>
                <span className="text-white/60">⭐⭐</span>
              </div>
            </button>

            <button
              onClick={() => startGame('hard')}
              className="w-full p-5 bg-purple-400 rounded-2xl shadow-lg text-left border-4 border-purple-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🦅</span>
                  <div className="text-white">
                    <h2 className="text-xl font-bold">Hard</h2>
                    <p className="text-purple-100 text-sm">30 seconds • 5 options</p>
                  </div>
                </div>
                <span className="text-white/60">⭐⭐⭐</span>
              </div>
            </button>

            <button
              onClick={() => startGame('blitz')}
              className="w-full p-5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-lg text-left border-4 border-red-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">⚡</span>
                  <div className="text-white">
                    <h2 className="text-xl font-bold">BLITZ MODE!</h2>
                    <p className="text-red-100 text-sm">20 seconds • 6 options</p>
                  </div>
                </div>
                <span className="text-white/60">🔥🔥🔥</span>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Countdown
  // ============================================
  if (gameState === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl font-bold text-white animate-ping">
            {countdown || 'GO!'}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Complete
  // ============================================
  if (gameState === 'complete') {
    const accuracy = stats.correct + stats.wrong > 0
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100)
      : 100;

    let badge = '🥉';
    let message = 'Good try!';
    if (stats.correct >= 20) { badge = '🏆'; message = 'Match Master!'; }
    else if (stats.correct >= 15) { badge = '🥇'; message = 'Speed Reader!'; }
    else if (stats.correct >= 10) { badge = '🥈'; message = 'Quick Matcher!'; }
    else if (stats.correct >= 5) { badge = '🥉'; message = 'Nice Start!'; }

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-9xl mb-4 animate-bounce">{badge}</div>
          <h1 className="text-4xl font-bold text-white mb-2">{message}</h1>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="text-6xl font-bold text-white mb-2">{stats.correct}</div>
            <div className="text-white/80 mb-4">Words Matched!</div>
            
            <div className="grid grid-cols-2 gap-4 text-white text-sm">
              <div>
                <div className="text-2xl font-bold">{accuracy}%</div>
                <div className="opacity-80">Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.bestStreak}</div>
                <div className="opacity-80">Best Streak</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(difficulty)}
              className="w-full p-4 bg-white text-orange-700 rounded-2xl font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              Play Again! 🔄
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="w-full p-4 bg-white/20 text-white rounded-2xl font-bold text-xl"
            >
              Change Difficulty
            </button>
            <Link href="/montree/dashboard/games" className="block w-full p-4 bg-white/10 text-white rounded-2xl font-bold text-xl">
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
    <div className="min-h-screen bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500">
      {/* Header */}
      <header className="p-3 flex items-center justify-between">
        <Link href="/montree/dashboard/games" className="text-white/80 hover:text-white text-2xl">←</Link>
        
        <div className="flex items-center gap-3">
          {/* Streak */}
          {stats.streak >= 3 && (
            <div className="bg-white text-orange-600 px-3 py-1 rounded-full font-bold text-sm animate-pulse">
              🔥 {stats.streak}
            </div>
          )}
          
          {/* Score */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold text-xl">⭐ {stats.correct}</span>
          </div>
        </div>
      </header>

      {/* Timer bar */}
      <div className="px-4 mb-4">
        <div className="h-4 bg-white/30 rounded-full overflow-hidden">
          <div 
            className={`h-full ${getTimeColor()} transition-all duration-1000`}
            style={{ width: `${(timeRemaining / DIFFICULTY_CONFIG[difficulty].time) * 100}%` }}
          />
        </div>
        <div className="text-center text-white font-bold mt-1">
          ⏱️ {timeRemaining}s
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4">
        {/* Word card */}
        <div className={`bg-white rounded-3xl p-6 mb-6 shadow-2xl text-center transition-transform ${showWordFlash ? 'scale-110' : 'scale-100'}`}>
          <p className="text-gray-500 text-sm mb-2">Read & Match:</p>
          <p className="text-5xl font-bold text-gray-800 tracking-wide">{currentWord?.word}</p>
          <button 
            onClick={playWord}
            className="mt-3 text-blue-500 hover:text-blue-700 text-sm"
          >
            🔊 Hear it
          </button>
        </div>

        {/* Options grid */}
        <div className={`grid ${options.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
          {options.map((option, index) => {
            const isCorrectAnswer = option.word === currentWord?.word;
            const isSelectedCorrect = feedback?.correct && isCorrectAnswer;
            const isSelectedWrong = feedback && !feedback.correct && feedback.word === option.word;
            const shouldShake = shakeWrong === option.word;

            return (
              <button
                key={`${option.word}-${index}`}
                onClick={() => handleSelect(option)}
                disabled={!!feedback}
                className={`
                  aspect-square rounded-2xl border-4 transition-all overflow-hidden
                  flex items-center justify-center text-6xl
                  ${isSelectedCorrect ? 'bg-green-400 border-green-300 scale-110 ring-4 ring-green-300' : ''}
                  ${isSelectedWrong ? 'bg-red-300 border-red-400' : ''}
                  ${!feedback ? 'bg-white border-white hover:border-yellow-400 hover:shadow-xl hover:scale-105' : 'bg-white border-white'}
                  ${feedback ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${shouldShake ? 'animate-shake' : ''}
                  active:scale-95
                `}
              >
                {option.image}
              </button>
            );
          })}
        </div>

        {/* Quick feedback */}
        {feedback && (
          <div className={`mt-4 text-center text-2xl font-bold animate-fadeIn ${
            feedback.correct ? 'text-green-300' : 'text-red-300'
          }`}>
            {feedback.correct ? '✓ Nice!' : '✗ Nope!'}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
