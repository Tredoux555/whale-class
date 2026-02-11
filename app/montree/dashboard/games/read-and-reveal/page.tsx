// app/games/read-and-reveal/page.tsx
// Read & Reveal - Reading Confidence Game (Pink Reading Cards Digital)
// Child reads the word, then reveals the picture to self-check

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

type Difficulty = 'pink' | 'blue' | 'mixed';
type GameState = 'menu' | 'playing' | 'revealed' | 'complete';

interface WordCard {
  word: string;
  image: string;
  series: 'pink' | 'blue';
}

interface GameStats {
  total: number;
  selfReportedCorrect: number;
  streak: number;
  bestStreak: number;
  startTime: number;
}

// Pink Series (CVC)
const PINK_WORDS: WordCard[] = [
  { word: 'cat', image: '🐱', series: 'pink' },
  { word: 'bat', image: '🦇', series: 'pink' },
  { word: 'hat', image: '🎩', series: 'pink' },
  { word: 'mat', image: '🧹', series: 'pink' },
  { word: 'rat', image: '🐀', series: 'pink' },
  { word: 'can', image: '🥫', series: 'pink' },
  { word: 'fan', image: '🌀', series: 'pink' },
  { word: 'man', image: '👨', series: 'pink' },
  { word: 'pan', image: '🍳', series: 'pink' },
  { word: 'van', image: '🚐', series: 'pink' },
  { word: 'bag', image: '👜', series: 'pink' },
  { word: 'cap', image: '🧢', series: 'pink' },
  { word: 'map', image: '🗺️', series: 'pink' },
  { word: 'bed', image: '🛏️', series: 'pink' },
  { word: 'red', image: '🔴', series: 'pink' },
  { word: 'hen', image: '🐔', series: 'pink' },
  { word: 'pen', image: '✏️', series: 'pink' },
  { word: 'ten', image: '🔟', series: 'pink' },
  { word: 'net', image: '🥅', series: 'pink' },
  { word: 'pet', image: '🐕', series: 'pink' },
  { word: 'jet', image: '✈️', series: 'pink' },
  { word: 'web', image: '🕸️', series: 'pink' },
  { word: 'big', image: '🦣', series: 'pink' },
  { word: 'dig', image: '⛏️', series: 'pink' },
  { word: 'pig', image: '🐷', series: 'pink' },
  { word: 'bin', image: '🗑️', series: 'pink' },
  { word: 'fin', image: '🦈', series: 'pink' },
  { word: 'pin', image: '📌', series: 'pink' },
  { word: 'win', image: '🏆', series: 'pink' },
  { word: 'sit', image: '🪑', series: 'pink' },
  { word: 'hit', image: '⚾', series: 'pink' },
  { word: 'six', image: '6️⃣', series: 'pink' },
  { word: 'dog', image: '🐶', series: 'pink' },
  { word: 'log', image: '🪵', series: 'pink' },
  { word: 'fog', image: '🌫️', series: 'pink' },
  { word: 'box', image: '📦', series: 'pink' },
  { word: 'fox', image: '🦊', series: 'pink' },
  { word: 'hot', image: '🔥', series: 'pink' },
  { word: 'pot', image: '🍲', series: 'pink' },
  { word: 'dot', image: '⚫', series: 'pink' },
  { word: 'mop', image: '🧹', series: 'pink' },
  { word: 'hop', image: '🦘', series: 'pink' },
  { word: 'top', image: '🎪', series: 'pink' },
  { word: 'bug', image: '🐛', series: 'pink' },
  { word: 'hug', image: '🤗', series: 'pink' },
  { word: 'mug', image: '☕', series: 'pink' },
  { word: 'rug', image: '🧶', series: 'pink' },
  { word: 'bus', image: '🚌', series: 'pink' },
  { word: 'cup', image: '🥤', series: 'pink' },
  { word: 'cut', image: '✂️', series: 'pink' },
  { word: 'nut', image: '🥜', series: 'pink' },
  { word: 'sun', image: '☀️', series: 'pink' },
  { word: 'run', image: '🏃', series: 'pink' },
  { word: 'fun', image: '🎉', series: 'pink' },
  { word: 'gum', image: '🫧', series: 'pink' },
  { word: 'tub', image: '🛁', series: 'pink' },
];

// Blue Series (blends, digraphs)
const BLUE_WORDS: WordCard[] = [
  { word: 'frog', image: '🐸', series: 'blue' },
  { word: 'crab', image: '🦀', series: 'blue' },
  { word: 'flag', image: '🚩', series: 'blue' },
  { word: 'drum', image: '🥁', series: 'blue' },
  { word: 'swim', image: '🏊', series: 'blue' },
  { word: 'skip', image: '⏭️', series: 'blue' },
  { word: 'stop', image: '🛑', series: 'blue' },
  { word: 'clap', image: '👏', series: 'blue' },
  { word: 'snap', image: '🫰', series: 'blue' },
  { word: 'trip', image: '✈️', series: 'blue' },
  { word: 'grab', image: '🤏', series: 'blue' },
  { word: 'plan', image: '📋', series: 'blue' },
  { word: 'lamp', image: '💡', series: 'blue' },
  { word: 'camp', image: '⛺', series: 'blue' },
  { word: 'jump', image: '🦘', series: 'blue' },
  { word: 'hand', image: '✋', series: 'blue' },
  { word: 'sand', image: '🏖️', series: 'blue' },
  { word: 'band', image: '🎸', series: 'blue' },
  { word: 'milk', image: '🥛', series: 'blue' },
  { word: 'desk', image: '🪑', series: 'blue' },
  { word: 'nest', image: '🪺', series: 'blue' },
  { word: 'best', image: '🥇', series: 'blue' },
  { word: 'test', image: '📝', series: 'blue' },
  { word: 'ship', image: '🚢', series: 'blue' },
  { word: 'shop', image: '🏪', series: 'blue' },
  { word: 'fish', image: '🐟', series: 'blue' },
  { word: 'dish', image: '🍽️', series: 'blue' },
  { word: 'wish', image: '⭐', series: 'blue' },
  { word: 'chin', image: '😊', series: 'blue' },
  { word: 'chip', image: '🍟', series: 'blue' },
  { word: 'chop', image: '🪓', series: 'blue' },
  { word: 'thin', image: '📏', series: 'blue' },
  { word: 'this', image: '👆', series: 'blue' },
  { word: 'that', image: '👉', series: 'blue' },
  { word: 'them', image: '👥', series: 'blue' },
];

export default function ReadAndRevealGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('pink');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentWord, setCurrentWord] = useState<WordCard | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    total: 0,
    selfReportedCorrect: 0,
    streak: 0,
    bestStreak: 0,
    startTime: 0,
  });
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds] = useState(15);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [showEncouragement, setShowEncouragement] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);

  const encouragements = [
    "Great reading! 📚",
    "You're doing amazing! ⭐",
    "Keep it up! 🎉",
    "Wonderful! 🌟",
    "Excellent work! 👏",
    "You're a reader! 📖",
  ];

  // Cleanup
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  // Get word pool
  const getWordPool = useCallback((): WordCard[] => {
    switch (difficulty) {
      case 'pink': return PINK_WORDS;
      case 'blue': return BLUE_WORDS;
      case 'mixed': return [...PINK_WORDS, ...BLUE_WORDS];
      default: return PINK_WORDS;
    }
  }, [difficulty]);

  // Pick new word
  const pickNewWord = useCallback(() => {
    const pool = getWordPool().filter(w => !usedWords.has(w.word));
    if (pool.length === 0) {
      setUsedWords(new Set());
      return getWordPool()[Math.floor(Math.random() * getWordPool().length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, [getWordPool, usedWords]);

  // Start game
  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('playing');
    setRoundNumber(1);
    setStats({
      total: 0,
      selfReportedCorrect: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now(),
    });
    setUsedWords(new Set());
    setIsRevealed(false);
    setShowEncouragement(null);

    const word = pickNewWord();
    setCurrentWord(word);
  };

  // Reveal the picture
  const handleReveal = async () => {
    if (isRevealed || isFlipping) return;
    
    setIsFlipping(true);
    await GameAudio.play('/audio-new/effects/flip.mp3').catch(() => {});
    
    setTimeout(() => {
      setIsRevealed(true);
      setIsFlipping(false);
      setGameState('revealed');
    }, 300);
  };

  // Self-report: Got it right
  const handleGotIt = async () => {
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      selfReportedCorrect: prev.selfReportedCorrect + 1,
      streak: prev.streak + 1,
      bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
    }));
    
    setShowEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)]);
    await GameAudio.playCorrect();
    
    setTimeout(() => nextWord(), 1000);
  };

  // Self-report: Need more practice
  const handleTryAgain = async () => {
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      streak: 0,
    }));
    
    setShowEncouragement("That's okay! Keep practicing! 💪");
    await GameAudio.play('/audio-new/effects/encourage.mp3').catch(() => {});
    
    setTimeout(() => nextWord(), 1000);
  };

  // Play word audio
  const playWord = async () => {
    if (!currentWord) return;
    try {
      await GameAudio.playWord(currentWord.word, currentWord.series);
    } catch {
      // Word audio not found
    }
  };

  // Next word
  const nextWord = () => {
    if (roundNumber >= totalRounds) {
      setGameState('complete');
      saveProgress();
      GameAudio.playCelebration();
      return;
    }

    setRoundNumber(prev => prev + 1);
    setIsRevealed(false);
    setShowEncouragement(null);
    setGameState('playing');
    setUsedWords(prev => new Set([...prev, currentWord!.word]));

    const word = pickNewWord();
    setCurrentWord(word);
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
          game_id: 'read-and-reveal',
          time_spent_seconds: timeSpent,
          items_attempted: stats.total,
          items_correct: stats.selfReportedCorrect,
          completed: true,
          session_data: {
            difficulty,
            best_streak: stats.bestStreak,
            self_reported: true,
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
      <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 overflow-hidden">
        <header className="p-4">
          <Link href="/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-2xl">←</span>
            <span className="font-medium">Back to Games</span>
          </Link>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="text-8xl mb-4">🔮</div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            Read & Reveal
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Read the word, then reveal the magic!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => startGame('pink')}
              className="w-full p-5 bg-pink-400 rounded-2xl shadow-lg text-left border-4 border-pink-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌸</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Pink Series</h2>
                  <p className="text-pink-100 text-sm">CVC words: cat, dog, sun...</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('blue')}
              className="w-full p-5 bg-blue-400 rounded-2xl shadow-lg text-left border-4 border-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">💎</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Blue Series</h2>
                  <p className="text-blue-100 text-sm">Blends & digraphs: frog, ship...</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('mixed')}
              className="w-full p-5 bg-gradient-to-r from-pink-500 to-blue-500 rounded-2xl shadow-lg text-left border-4 border-purple-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌈</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Mixed Challenge</h2>
                  <p className="text-purple-100 text-sm">Pink + Blue words</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 text-white/70 text-sm">
            <p>Read the word → Tap to reveal → Self-check!</p>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Complete
  // ============================================
  if (gameState === 'complete') {
    const accuracy = stats.total > 0
      ? Math.round((stats.selfReportedCorrect / stats.total) * 100)
      : 100;

    let badge = '🥉';
    let message = 'Nice reading!';
    if (accuracy >= 90) { badge = '🏆'; message = 'Super Reader!'; }
    else if (accuracy >= 80) { badge = '🥇'; message = 'Great Reader!'; }
    else if (accuracy >= 70) { badge = '🥈'; message = 'Good Reader!'; }

    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-9xl mb-4 animate-bounce">{badge}</div>
          <h1 className="text-4xl font-bold text-white mb-2">{message}</h1>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <div className="text-3xl font-bold">{stats.selfReportedCorrect}</div>
                <div className="text-sm opacity-80">Got It!</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{accuracy}%</div>
                <div className="text-sm opacity-80">Confidence</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.bestStreak}</div>
                <div className="text-sm opacity-80">Best Streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{totalRounds}</div>
                <div className="text-sm opacity-80">Words Read</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(difficulty)}
              className="w-full p-4 bg-white text-cyan-700 rounded-2xl font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              Read More! 📚
            </button>
            <Link href="/games" className="block w-full p-4 bg-white/20 text-white rounded-2xl font-bold text-xl">
              Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Playing / Revealed
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-500">
      {/* Header */}
      <header className="p-3 flex items-center justify-between">
        <Link href="/games" className="text-white/80 hover:text-white text-2xl">←</Link>
        
        <div className="flex items-center gap-3">
          {stats.streak >= 3 && (
            <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold text-sm animate-pulse">
              🔥 {stats.streak}
            </div>
          )}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">📖 {roundNumber}/{totalRounds}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Instruction */}
        <div className="text-center text-white mb-4">
          <p className="text-lg opacity-90">
            {!isRevealed ? "Read the word, then tap to reveal!" : "Did you read it right?"}
          </p>
        </div>

        {/* Card */}
        <div className="relative perspective-1000 mb-6">
          <div
            className={`
              relative w-full aspect-[3/4] cursor-pointer
              transition-transform duration-500 transform-style-3d
              ${isFlipping ? 'rotate-y-180' : ''}
            `}
            onClick={!isRevealed ? handleReveal : undefined}
          >
            {/* Front - Word */}
            {!isRevealed && (
              <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8">
                <p className="text-6xl font-bold text-gray-800 tracking-wide mb-4">
                  {currentWord?.word}
                </p>
                
                <button
                  onClick={(e) => { e.stopPropagation(); playWord(); }}
                  className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-2"
                >
                  🔊 Need help?
                </button>

                <div className="absolute bottom-6 text-gray-400 text-sm animate-pulse">
                  Tap card to reveal! 👆
                </div>
              </div>
            )}

            {/* Back - Picture */}
            {isRevealed && (
              <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-8 animate-fadeIn">
                <div className="text-9xl mb-4">{currentWord?.image}</div>
                <p className="text-4xl font-bold text-gray-800">{currentWord?.word}</p>
                
                <button
                  onClick={playWord}
                  className="mt-4 text-blue-500 hover:text-blue-700"
                >
                  🔊 Hear it
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Encouragement */}
        {showEncouragement && (
          <div className="text-center text-2xl font-bold text-white mb-4 animate-bounce">
            {showEncouragement}
          </div>
        )}

        {/* Self-report buttons */}
        {isRevealed && !showEncouragement && (
          <div className="flex gap-4">
            <button
              onClick={handleGotIt}
              className="flex-1 p-5 bg-green-400 hover:bg-green-300 rounded-2xl text-white font-bold text-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              ✓ Got It!
            </button>
            <button
              onClick={handleTryAgain}
              className="flex-1 p-5 bg-orange-400 hover:bg-orange-300 rounded-2xl text-white font-bold text-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              ↻ Practice
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mt-6">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
