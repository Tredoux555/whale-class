// app/games/sentence-scramble/page.tsx
// Sentence Scramble - Build sentences by ordering words
// Develops syntax awareness and reading comprehension

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

type Difficulty = 'easy' | 'medium' | 'hard';
type GameState = 'menu' | 'playing' | 'complete';

interface Sentence {
  words: string[];
  image: string;
  hint?: string;
}

interface GameStats {
  correct: number;
  attempts: number;
  streak: number;
  bestStreak: number;
  startTime: number;
}

// Easy: 3-4 words
const EASY_SENTENCES: Sentence[] = [
  { words: ['The', 'cat', 'sat.'], image: '🐱' },
  { words: ['A', 'dog', 'ran.'], image: '🐕' },
  { words: ['The', 'sun', 'is', 'hot.'], image: '☀️' },
  { words: ['I', 'see', 'a', 'bug.'], image: '🐛' },
  { words: ['The', 'pig', 'is', 'big.'], image: '🐷' },
  { words: ['A', 'hen', 'sat.'], image: '🐔' },
  { words: ['The', 'fox', 'ran.'], image: '🦊' },
  { words: ['I', 'like', 'jam.'], image: '🍯' },
  { words: ['The', 'bus', 'is', 'red.'], image: '🚌' },
  { words: ['A', 'frog', 'can', 'hop.'], image: '🐸' },
  { words: ['The', 'cup', 'is', 'big.'], image: '☕' },
  { words: ['I', 'see', 'the', 'van.'], image: '🚐' },
  { words: ['A', 'rat', 'ran', 'fast.'], image: '🐀' },
  { words: ['The', 'box', 'is', 'full.'], image: '📦' },
  { words: ['I', 'can', 'run.'], image: '🏃' },
];

// Medium: 4-5 words
const MEDIUM_SENTENCES: Sentence[] = [
  { words: ['The', 'cat', 'sat', 'on', 'the', 'mat.'], image: '🐱' },
  { words: ['A', 'dog', 'ran', 'to', 'the', 'park.'], image: '🐕' },
  { words: ['The', 'big', 'pig', 'is', 'in', 'mud.'], image: '🐷' },
  { words: ['I', 'can', 'see', 'the', 'red', 'bus.'], image: '🚌' },
  { words: ['The', 'sun', 'is', 'up', 'in', 'the', 'sky.'], image: '☀️' },
  { words: ['A', 'frog', 'sat', 'on', 'a', 'log.'], image: '🐸' },
  { words: ['The', 'hen', 'has', 'ten', 'eggs.'], image: '🐔' },
  { words: ['I', 'got', 'a', 'big', 'red', 'box.'], image: '📦' },
  { words: ['The', 'fox', 'hid', 'in', 'the', 'den.'], image: '🦊' },
  { words: ['A', 'bug', 'is', 'on', 'the', 'rug.'], image: '🐛' },
  { words: ['The', 'man', 'has', 'a', 'big', 'hat.'], image: '👨' },
  { words: ['I', 'like', 'to', 'run', 'and', 'jump.'], image: '🏃' },
  { words: ['The', 'fish', 'swam', 'in', 'the', 'pond.'], image: '🐟' },
  { words: ['A', 'ship', 'is', 'on', 'the', 'sea.'], image: '🚢' },
  { words: ['The', 'crab', 'ran', 'on', 'the', 'sand.'], image: '🦀' },
];

// Hard: 6-8 words
const HARD_SENTENCES: Sentence[] = [
  { words: ['The', 'big', 'cat', 'sat', 'on', 'the', 'soft', 'mat.'], image: '🐱' },
  { words: ['A', 'fast', 'dog', 'ran', 'to', 'get', 'the', 'ball.'], image: '🐕' },
  { words: ['The', 'frog', 'jumped', 'into', 'the', 'cold', 'pond.'], image: '🐸' },
  { words: ['I', 'can', 'see', 'a', 'big', 'ship', 'on', 'the', 'sea.'], image: '🚢' },
  { words: ['The', 'hen', 'sat', 'on', 'her', 'nest', 'of', 'eggs.'], image: '🐔' },
  { words: ['A', 'red', 'bus', 'went', 'down', 'the', 'long', 'road.'], image: '🚌' },
  { words: ['The', 'fox', 'ran', 'fast', 'to', 'catch', 'the', 'hen.'], image: '🦊' },
  { words: ['I', 'like', 'to', 'swim', 'in', 'the', 'big', 'pool.'], image: '🏊' },
  { words: ['The', 'man', 'put', 'on', 'his', 'hat', 'and', 'coat.'], image: '👨' },
  { words: ['A', 'fish', 'swam', 'in', 'the', 'tank', 'all', 'day.'], image: '🐟' },
  { words: ['The', 'drum', 'made', 'a', 'loud', 'bang', 'bang', 'sound.'], image: '🥁' },
  { words: ['I', 'had', 'fun', 'at', 'the', 'park', 'with', 'my', 'dog.'], image: '🎉' },
];

export default function SentenceScrambleGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentSentence, setCurrentSentence] = useState<Sentence | null>(null);
  const [scrambledWords, setScrambledWords] = useState<string[]>([]);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    attempts: 0,
    streak: 0,
    bestStreak: 0,
    startTime: 0,
  });
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [usedSentences, setUsedSentences] = useState<Set<string>>(new Set());
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, []);

  // Get sentence pool
  const getSentencePool = useCallback((): Sentence[] => {
    switch (difficulty) {
      case 'easy': return EASY_SENTENCES;
      case 'medium': return MEDIUM_SENTENCES;
      case 'hard': return HARD_SENTENCES;
      default: return EASY_SENTENCES;
    }
  }, [difficulty]);

  // Pick new sentence
  const pickNewSentence = useCallback(() => {
    const pool = getSentencePool();
    const key = (s: Sentence) => s.words.join(' ');
    const available = pool.filter(s => !usedSentences.has(key(s)));
    
    if (available.length === 0) {
      setUsedSentences(new Set());
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return available[Math.floor(Math.random() * available.length)];
  }, [getSentencePool, usedSentences]);

  // Scramble words
  const scrambleWords = (words: string[]): string[] => {
    const scrambled = [...words];
    // Fisher-Yates shuffle
    for (let i = scrambled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]];
    }
    // Make sure it's actually different
    if (scrambled.join(' ') === words.join(' ')) {
      return scrambleWords(words);
    }
    return scrambled;
  };

  // Start game
  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('playing');
    setRoundNumber(1);
    setStats({
      correct: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now(),
    });
    setUsedSentences(new Set());
    setWrongAttempts(0);
    setFeedback(null);

    const sentence = pickNewSentence();
    setCurrentSentence(sentence);
    setScrambledWords(scrambleWords(sentence.words));
    setPlacedWords([]);
  };

  // Handle word click (from scrambled to placed)
  const handleWordClick = (word: string, index: number) => {
    if (feedback) return;
    
    // Move word from scrambled to placed
    const newScrambled = scrambledWords.filter((_, i) => i !== index);
    setScrambledWords(newScrambled);
    setPlacedWords([...placedWords, word]);

    // Play click sound
    GameAudio.play('/audio-new/effects/click.mp3').catch(() => {});
  };

  // Handle removing word from placed
  const handleRemoveWord = (index: number) => {
    if (feedback) return;

    const word = placedWords[index];
    const newPlaced = placedWords.filter((_, i) => i !== index);
    setPlacedWords(newPlaced);
    setScrambledWords([...scrambledWords, word]);
  };

  // Check answer
  const checkAnswer = async () => {
    if (!currentSentence || placedWords.length !== currentSentence.words.length) return;

    const isCorrect = placedWords.join(' ') === currentSentence.words.join(' ');

    if (isCorrect) {
      setStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
      }));
      setFeedback('correct');
      await GameAudio.playCorrect();

      feedbackTimeoutRef.current = setTimeout(() => {
        if (roundNumber >= totalRounds) {
          setGameState('complete');
          saveProgress();
          GameAudio.playCelebration();
        } else {
          nextSentence();
        }
      }, 1500);
    } else {
      setStats(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        streak: 0,
      }));
      setWrongAttempts(prev => prev + 1);
      setFeedback('wrong');
      await GameAudio.playWrong();

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
      }, 1000);
    }
  };

  // Next sentence
  const nextSentence = () => {
    setRoundNumber(prev => prev + 1);
    setFeedback(null);
    setWrongAttempts(0);

    const key = currentSentence!.words.join(' ');
    setUsedSentences(prev => new Set([...prev, key]));

    const sentence = pickNewSentence();
    setCurrentSentence(sentence);
    setScrambledWords(scrambleWords(sentence.words));
    setPlacedWords([]);
  };

  // Reset current sentence
  const resetSentence = () => {
    if (!currentSentence) return;
    setScrambledWords(scrambleWords(currentSentence.words));
    setPlacedWords([]);
    setFeedback(null);
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
          game_id: 'sentence-scramble',
          time_spent_seconds: timeSpent,
          items_attempted: stats.correct + stats.attempts,
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
      <div className="min-h-screen bg-gradient-to-b from-violet-600 via-purple-500 to-fuchsia-500 overflow-hidden">
        <header className="p-4">
          <Link href="/montree/dashboard/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-2xl">←</span>
            <span className="font-medium">Back to Games</span>
          </Link>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8 text-center">
          <div className="text-8xl mb-4">🧩</div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            Sentence Scramble
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Put the words in order!
          </p>

          <div className="space-y-3">
            <button
              onClick={() => startGame('easy')}
              className="w-full p-5 bg-green-400 rounded-2xl shadow-lg text-left border-4 border-green-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🐣</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Easy</h2>
                  <p className="text-green-100 text-sm">3-4 word sentences</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('medium')}
              className="w-full p-5 bg-yellow-400 rounded-2xl shadow-lg text-left border-4 border-yellow-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🐥</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Medium</h2>
                  <p className="text-yellow-100 text-sm">5-6 word sentences</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startGame('hard')}
              className="w-full p-5 bg-red-400 rounded-2xl shadow-lg text-left border-4 border-red-300 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🦅</span>
                <div className="text-white">
                  <h2 className="text-xl font-bold">Hard</h2>
                  <p className="text-red-100 text-sm">7-9 word sentences</p>
                </div>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Complete
  // ============================================
  if (gameState === 'complete') {
    const accuracy = stats.correct + stats.attempts > 0
      ? Math.round((stats.correct / (stats.correct + stats.attempts)) * 100)
      : 100;

    let badge = '🥉';
    let message = 'Good job!';
    if (accuracy >= 90) { badge = '🏆'; message = 'Sentence Master!'; }
    else if (accuracy >= 80) { badge = '🥇'; message = 'Great Builder!'; }
    else if (accuracy >= 70) { badge = '🥈'; message = 'Nice Work!'; }

    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-600 via-purple-500 to-fuchsia-500 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-9xl mb-4 animate-bounce">{badge}</div>
          <h1 className="text-4xl font-bold text-white mb-2">{message}</h1>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <div className="text-3xl font-bold">{stats.correct}</div>
                <div className="text-sm opacity-80">Sentences</div>
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
  const canCheck = placedWords.length === currentSentence?.words.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-600 via-purple-500 to-fuchsia-500">
      {/* Header */}
      <header className="p-3 flex items-center justify-between">
        <Link href="/montree/dashboard/games" className="text-white/80 hover:text-white text-2xl">←</Link>
        
        <div className="flex items-center gap-3">
          {stats.streak >= 3 && (
            <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-bold text-sm animate-pulse">
              🔥 {stats.streak}
            </div>
          )}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">📝 {roundNumber}/{totalRounds}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-2">
        {/* Picture hint */}
        <div className="text-center mb-4">
          <span className="text-7xl">{currentSentence?.image}</span>
        </div>

        {/* Answer zone */}
        <div className={`bg-white rounded-2xl p-4 mb-4 min-h-[80px] shadow-xl ${
          feedback === 'correct' ? 'ring-4 ring-green-400' :
          feedback === 'wrong' ? 'ring-4 ring-red-400 animate-shake' : ''
        }`}>
          <p className="text-gray-400 text-sm mb-2 text-center">
            {placedWords.length === 0 ? 'Tap words to build the sentence' : 'Tap to remove'}
          </p>
          <div className="flex flex-wrap gap-2 justify-center min-h-[40px]">
            {placedWords.map((word, index) => (
              <button
                key={`placed-${index}`}
                onClick={() => handleRemoveWord(index)}
                disabled={!!feedback}
                className={`
                  px-4 py-2 rounded-xl font-bold text-lg transition-all
                  ${feedback === 'correct' ? 'bg-green-100 text-green-700' :
                    feedback === 'wrong' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700 hover:bg-purple-200'}
                `}
              >
                {word}
              </button>
            ))}
            {placedWords.length === 0 && (
              <span className="text-gray-300">___ ___ ___</span>
            )}
          </div>
        </div>

        {/* Hint after 2 wrong */}
        {wrongAttempts >= 2 && !feedback && currentSentence && (
          <div className="bg-yellow-100 text-yellow-800 rounded-xl p-3 mb-4 text-center text-sm">
            💡 Hint: Start with "<strong>{currentSentence.words[0]}</strong>"
          </div>
        )}

        {/* Scrambled words */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <div className="flex flex-wrap gap-2 justify-center min-h-[50px]">
            {scrambledWords.map((word, index) => (
              <button
                key={`scrambled-${index}`}
                onClick={() => handleWordClick(word, index)}
                disabled={!!feedback}
                className="px-4 py-2 bg-white rounded-xl font-bold text-lg text-gray-800 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {word}
              </button>
            ))}
            {scrambledWords.length === 0 && (
              <span className="text-white/50">All words placed!</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={resetSentence}
            disabled={!!feedback || placedWords.length === 0}
            className="flex-1 p-3 bg-white/20 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:bg-white/30 transition-colors"
          >
            🔄 Reset
          </button>
          <button
            onClick={checkAnswer}
            disabled={!canCheck || !!feedback}
            className={`flex-1 p-3 rounded-xl font-bold text-lg transition-all
              ${canCheck && !feedback
                ? 'bg-green-400 text-white hover:bg-green-300 hover:scale-105'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
          >
            ✓ Check
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mt-4 text-center text-2xl font-bold animate-fadeIn ${
            feedback === 'correct' ? 'text-green-300' : 'text-red-300'
          }`}>
            {feedback === 'correct' ? '🎉 Perfect!' : '🤔 Try again!'}
          </div>
        )}

        {/* Progress */}
        <div className="mt-4">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
