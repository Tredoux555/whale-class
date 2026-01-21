// app/games/quantity-match/page.tsx
// Quantity Match - Cards & Counters (ma_cards_counters)
// Montessori math: Symbol-quantity association + Odd/Even discovery
// 3 Levels: 1) Arrange Cards 2) Pair Counters 3) Odd/Even

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GameMode = 'arrange' | 'counters' | 'oddeven';
type GamePhase = 'menu' | 'playing' | 'feedback' | 'complete';
type FeedbackType = 'correct' | 'incorrect' | 'perfect' | null;

interface Counter {
  id: string;
  position: number;
}

interface GameState {
  mode: GameMode;
  phase: GamePhase;
  currentNumber: number;
  counters: Counter[];
  score: number;
  streak: number;
  bestStreak: number;
  xp: number;
  round: number;
  totalRounds: number;
  cards: number[];
  placedCards: (number | null)[];
  selectedCard: number | null;
}

// ============================================
// GAME CONFIG
// ============================================
const GAME_MODES = {
  arrange: {
    name: 'Arrange Cards',
    description: 'Put number cards 1-10 in order',
    icon: '🃏',
    color: 'from-blue-500 to-blue-600',
    rounds: 3,
    montessoriLevel: 1,
  },
  counters: {
    name: 'Pair Counters',
    description: 'Place the right number of counters',
    icon: '🔴',
    color: 'from-red-500 to-orange-500',
    rounds: 10,
    montessoriLevel: 2,
  },
  oddeven: {
    name: 'Odd & Even',
    description: 'Discover which numbers are odd or even',
    icon: '👫',
    color: 'from-purple-500 to-pink-500',
    rounds: 10,
    montessoriLevel: 3,
  },
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getInitialState = (): GameState => ({
  mode: 'arrange',
  phase: 'menu',
  currentNumber: 1,
  counters: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  xp: 0,
  round: 0,
  totalRounds: 10,
  cards: [],
  placedCards: Array(10).fill(null),
  selectedCard: null,
});

// ============================================
// MAIN COMPONENT
// ============================================
export default function QuantityMatchGame() {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [feedback, setFeedback] = useState<FeedbackType>(null);

  const startGame = (mode: GameMode) => {
    const config = GAME_MODES[mode];
    if (mode === 'arrange') {
      setGameState({
        ...getInitialState(),
        mode,
        phase: 'playing',
        totalRounds: config.rounds,
        cards: shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        placedCards: Array(10).fill(null),
      });
    } else {
      setGameState({
        ...getInitialState(),
        mode,
        phase: 'playing',
        totalRounds: config.rounds,
        currentNumber: Math.floor(Math.random() * 10) + 1,
        counters: [],
      });
    }
  };

  const placeCounter = () => {
    if (gameState.counters.length >= 20) return;
    const newCounter: Counter = {
      id: `counter-${Date.now()}-${Math.random()}`,
      position: gameState.counters.length,
    };
    setGameState(prev => ({
      ...prev,
      counters: [...prev.counters, newCounter],
    }));
  };

  const removeCounter = (id: string) => {
    setGameState(prev => ({
      ...prev,
      counters: prev.counters.filter(c => c.id !== id),
    }));
  };

  const advanceRound = () => {
    setFeedback(null);
    if (gameState.round + 1 >= gameState.totalRounds) {
      setGameState(prev => ({ ...prev, phase: 'complete' }));
      trackProgress();
    } else {
      setGameState(prev => ({
        ...prev,
        round: prev.round + 1,
        phase: 'playing',
        currentNumber: Math.floor(Math.random() * 10) + 1,
        counters: [],
      }));
    }
  };

  const checkCounterAnswer = () => {
    const isCorrect = gameState.counters.length === gameState.currentNumber;
    const isPerfect = isCorrect && gameState.streak >= 2;
    if (isCorrect) {
      setFeedback(isPerfect ? 'perfect' : 'correct');
      setGameState(prev => ({
        ...prev,
        score: prev.score + (isPerfect ? 15 : 10),
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        xp: prev.xp + 10 + (isPerfect ? 5 : 0),
        phase: 'feedback',
      }));
    } else {
      setFeedback('incorrect');
      setGameState(prev => ({ ...prev, streak: 0, phase: 'feedback' }));
    }
    setTimeout(() => advanceRound(), 1500);
  };

  const checkOddEven = (answer: 'odd' | 'even') => {
    const isOdd = gameState.currentNumber % 2 === 1;
    const correctAnswer = isOdd ? 'odd' : 'even';
    const isCorrect = answer === correctAnswer;
    const isPerfect = isCorrect && gameState.streak >= 2;
    if (isCorrect) {
      setFeedback(isPerfect ? 'perfect' : 'correct');
      setGameState(prev => ({
        ...prev,
        score: prev.score + (isPerfect ? 20 : 15),
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        xp: prev.xp + 15 + (isPerfect ? 5 : 0),
        phase: 'feedback',
      }));
    } else {
      setFeedback('incorrect');
      setGameState(prev => ({ ...prev, streak: 0, phase: 'feedback' }));
    }
    setTimeout(() => advanceRound(), 1500);
  };

  const selectCard = (card: number) => {
    setGameState(prev => ({
      ...prev,
      selectedCard: prev.selectedCard === card ? null : card,
    }));
  };

  const placeCard = (slotIndex: number) => {
    if (gameState.selectedCard === null) return;
    if (gameState.placedCards[slotIndex] !== null) return;
    const cardValue = gameState.selectedCard;
    const isCorrect = slotIndex === cardValue - 1;
    setGameState(prev => {
      const newPlacedCards = [...prev.placedCards];
      newPlacedCards[slotIndex] = cardValue;
      return {
        ...prev,
        placedCards: newPlacedCards,
        cards: prev.cards.filter(c => c !== cardValue),
        selectedCard: null,
        score: isCorrect ? prev.score + 5 : prev.score,
        xp: isCorrect ? prev.xp + 2 : prev.xp,
      };
    });
  };

  useEffect(() => {
    if (gameState.mode === 'arrange' && gameState.phase === 'playing') {
      const allPlaced = gameState.placedCards.every(c => c !== null);
      const allCorrect = gameState.placedCards.every((c, i) => c === i + 1);
      if (allPlaced) {
        if (allCorrect) {
          setFeedback('perfect');
          setGameState(prev => ({
            ...prev,
            score: prev.score + 50,
            xp: prev.xp + 25,
            phase: 'feedback',
          }));
        } else {
          setFeedback('incorrect');
          setGameState(prev => ({ ...prev, phase: 'feedback' }));
        }
        setTimeout(() => {
          if (gameState.round + 1 >= gameState.totalRounds) {
            setGameState(prev => ({ ...prev, phase: 'complete' }));
            trackProgress();
          } else {
            setGameState(prev => ({
              ...prev,
              round: prev.round + 1,
              phase: 'playing',
              cards: shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
              placedCards: Array(10).fill(null),
              selectedCard: null,
            }));
          }
          setFeedback(null);
        }, 2000);
      }
    }
  }, [gameState.placedCards, gameState.mode, gameState.phase, gameState.round, gameState.totalRounds]);

  const trackProgress = async () => {
    try {
      await fetch('/api/games/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: 'quantity-match',
          mode: gameState.mode,
          score: gameState.score,
          xp_earned: gameState.xp,
          streak: gameState.bestStreak,
          completed: true,
        }),
      });
    } catch (e) {
      console.error('Failed to track progress:', e);
    }
  };

  // Render counters in Montessori paired format
  const renderCountersInPairs = () => {
    const pairs: Counter[][] = [];
    let currentPair: Counter[] = [];
    gameState.counters.forEach((counter) => {
      currentPair.push(counter);
      if (currentPair.length === 2) {
        pairs.push(currentPair);
        currentPair = [];
      }
    });
    if (currentPair.length === 1) {
      pairs.push(currentPair);
    }
    return (
      <div className="flex flex-col items-center gap-2">
        {pairs.map((pair, pairIndex) => (
          <div key={pairIndex} className="flex gap-3 items-center">
            {pair.map((counter) => (
              <motion.button
                key={counter.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => removeCounter(counter.id)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 
                  shadow-lg hover:shadow-xl active:scale-90 transition-all"
              />
            ))}
            {pair.length === 1 && (
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const progress = ((gameState.round + 1) / gameState.totalRounds) * 100;
  const isOdd = gameState.currentNumber % 2 === 1;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl">←</span>
            <span className="font-medium">Games</span>
          </Link>
          <h1 className="text-xl font-bold text-blue-600">🔢 Quantity Match</h1>
          {gameState.phase !== 'menu' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">⭐ {gameState.xp} XP</span>
              <span className="text-sm font-medium text-orange-500">🔥 {gameState.streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* ============================================ */}
          {/* MENU SCREEN */}
          {/* ============================================ */}
          {gameState.phase === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Cards & Counters</h2>
                <p className="text-gray-600">Learn numbers 1-10 and discover odd & even!</p>
              </div>

              <div className="grid gap-4">
                {(Object.entries(GAME_MODES) as [GameMode, typeof GAME_MODES[GameMode]][]).map(([key, mode]) => (
                  <motion.button
                    key={key}
                    onClick={() => startGame(key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-6 rounded-2xl bg-gradient-to-r ${mode.color} text-white shadow-lg
                      flex items-center gap-4 text-left`}
                  >
                    <span className="text-4xl">{mode.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold">{mode.name}</h3>
                      <p className="text-white/80 text-sm">{mode.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                          Level {mode.montessoriLevel}
                        </span>
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                          {mode.rounds} rounds
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* ARRANGE CARDS MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'arrange' && (
            <motion.div
              key="arrange"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Put the cards in order 1-10
                </h2>
                <p className="text-gray-500">Round {gameState.round + 1} of {gameState.totalRounds}</p>
              </div>

              {/* Card Slots */}
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg">
                <div className="grid grid-cols-5 gap-3 mb-6">
                  {gameState.placedCards.map((card, index) => (
                    <motion.button
                      key={index}
                      onClick={() => placeCard(index)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`aspect-[3/4] rounded-xl border-3 flex items-center justify-center
                        text-3xl font-bold transition-all
                        ${card !== null 
                          ? card === index + 1
                            ? 'bg-green-100 border-green-400 text-green-700'
                            : 'bg-red-100 border-red-400 text-red-700'
                          : gameState.selectedCard !== null
                            ? 'bg-blue-50 border-blue-300 border-dashed cursor-pointer hover:bg-blue-100'
                            : 'bg-gray-50 border-gray-200 border-dashed'
                        }`}
                    >
                      {card !== null ? card : index + 1}
                      {card === null && (
                        <span className="absolute text-gray-300 text-lg">?</span>
                      )}
                    </motion.button>
                  ))}
                </div>

                {/* Available Cards */}
                <div className="border-t-2 border-gray-200 pt-6">
                  <p className="text-sm text-gray-500 mb-3 text-center">Tap a card, then tap where it goes:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {gameState.cards.map((card) => (
                      <motion.button
                        key={card}
                        onClick={() => selectCard(card)}
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-14 h-20 rounded-xl flex items-center justify-center
                          text-2xl font-bold shadow-lg transition-all
                          ${gameState.selectedCard === card
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-4 ring-blue-300'
                            : 'bg-white hover:bg-blue-50 text-gray-800'
                          }`}
                      >
                        {card}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* COUNTERS MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'counters' && (
            <motion.div
              key="counters"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Place <span className="text-red-500">{gameState.currentNumber}</span> counter{gameState.currentNumber !== 1 ? 's' : ''}
                </h2>
                <p className="text-gray-500">Round {gameState.round + 1} of {gameState.totalRounds}</p>
              </div>

              {/* Number Card Display */}
              <div className="flex justify-center">
                <div className="w-24 h-32 bg-white rounded-2xl shadow-xl flex items-center justify-center
                  text-5xl font-bold text-gray-800 border-4 border-blue-200">
                  {gameState.currentNumber}
                </div>
              </div>

              {/* Counter Area */}
              <div className="bg-white/60 rounded-2xl p-8 shadow-lg min-h-[200px] flex flex-col items-center justify-center">
                {gameState.counters.length === 0 ? (
                  <p className="text-gray-400">Tap the button to add counters</p>
                ) : (
                  <AnimatePresence>
                    {renderCountersInPairs()}
                  </AnimatePresence>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <motion.button
                  onClick={placeCounter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl
                    font-bold text-lg shadow-lg flex items-center gap-2"
                >
                  <span className="text-2xl">🔴</span>
                  Add Counter ({gameState.counters.length})
                </motion.button>
                <motion.button
                  onClick={checkCounterAnswer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl
                    font-bold text-lg shadow-lg"
                >
                  Check ✓
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* ODD/EVEN MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'oddeven' && (
            <motion.div
              key="oddeven"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Is this number odd or even?
                </h2>
                <p className="text-gray-500">Round {gameState.round + 1} of {gameState.totalRounds}</p>
              </div>

              {/* Number Display with Visual Counters */}
              <div className="bg-white/60 rounded-2xl p-8 shadow-lg flex flex-col items-center gap-6">
                <div className="w-28 h-36 bg-white rounded-2xl shadow-xl flex items-center justify-center
                  text-6xl font-bold text-gray-800 border-4 border-purple-200">
                  {gameState.currentNumber}
                </div>
                
                {/* Visual representation */}
                <div className="flex flex-col items-center gap-2">
                  {Array.from({ length: Math.ceil(gameState.currentNumber / 2) }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500 shadow" />
                      {rowIndex * 2 + 2 <= gameState.currentNumber ? (
                        <div className="w-8 h-8 rounded-full bg-purple-500 shadow" />
                      ) : (
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-purple-300" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  {isOdd ? '☝️ One is left alone!' : '👫 Everyone has a pair!'}
                </p>
              </div>

              {/* Answer Buttons */}
              <div className="flex justify-center gap-4">
                <motion.button
                  onClick={() => checkOddEven('odd')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl
                    font-bold text-xl shadow-lg"
                >
                  ☝️ ODD
                </motion.button>
                <motion.button
                  onClick={() => checkOddEven('even')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl
                    font-bold text-xl shadow-lg"
                >
                  👫 EVEN
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* FEEDBACK OVERLAY */}
          {/* ============================================ */}
          {gameState.phase === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`p-8 rounded-3xl shadow-2xl text-center
                  ${feedback === 'perfect' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                    feedback === 'correct' ? 'bg-gradient-to-br from-green-400 to-green-500' :
                    'bg-gradient-to-br from-red-400 to-red-500'}`}
              >
                <span className="text-6xl">
                  {feedback === 'perfect' ? '🌟' : feedback === 'correct' ? '✓' : '✗'}
                </span>
                <p className="text-white text-2xl font-bold mt-2">
                  {feedback === 'perfect' ? 'Perfect!' : feedback === 'correct' ? 'Correct!' : 'Try again!'}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* COMPLETE SCREEN */}
          {/* ============================================ */}
          {gameState.phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-8xl"
              >
                🏆
              </motion.div>

              <h2 className="text-4xl font-bold text-gray-800">Amazing Work!</h2>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-blue-600">{gameState.score}</p>
                    <p className="text-sm text-gray-500">Score</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-yellow-600">+{gameState.xp}</p>
                    <p className="text-sm text-gray-500">XP Earned</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-orange-600">{gameState.bestStreak}</p>
                    <p className="text-sm text-gray-500">Best Streak</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <motion.button
                  onClick={() => startGame(gameState.mode)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl
                    font-bold text-lg shadow-lg"
                >
                  Play Again 🔄
                </motion.button>
                <motion.button
                  onClick={() => setGameState(getInitialState())}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-gray-700 rounded-2xl
                    font-bold text-lg shadow-lg border-2 border-gray-200"
                >
                  Choose Mode
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
