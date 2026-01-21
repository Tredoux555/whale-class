// app/games/bead-frame/page.tsx
// Bead Frame - Small Bead Frame (ma_small_bead_frame)
// Montessori math: Place value understanding with abacus
// 3 Modes: 1) Build Numbers 2) Add Numbers 3) Challenge

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GameMode = 'build' | 'add' | 'challenge';
type GamePhase = 'menu' | 'playing' | 'feedback' | 'complete';
type FeedbackType = 'correct' | 'incorrect' | 'perfect' | null;

interface PlaceValue {
  id: string;
  name: string;
  shortName: string;
  value: number;
  color: string;
  beadColor: string;
}

interface GameState {
  mode: GameMode;
  phase: GamePhase;
  targetNumber: number;
  beads: number[];
  score: number;
  streak: number;
  bestStreak: number;
  xp: number;
  round: number;
  totalRounds: number;
  feedback: FeedbackType;
  addend1: number;
  addend2: number;
}

// ============================================
// CONSTANTS
// ============================================
const PLACE_VALUES: PlaceValue[] = [
  { id: 'thousands', name: 'Thousands', shortName: 'Th', value: 1000, color: 'from-green-500 to-green-600', beadColor: 'bg-green-500' },
  { id: 'hundreds', name: 'Hundreds', shortName: 'H', value: 100, color: 'from-blue-500 to-blue-600', beadColor: 'bg-blue-500' },
  { id: 'tens', name: 'Tens', shortName: 'T', value: 10, color: 'from-amber-500 to-amber-600', beadColor: 'bg-amber-500' },
  { id: 'units', name: 'Units', shortName: 'U', value: 1, color: 'from-red-500 to-red-600', beadColor: 'bg-red-500' },
];

const GAME_MODES = {
  build: {
    name: 'Build Numbers',
    description: 'Slide beads to show the number',
    icon: '🧮',
    color: 'from-blue-500 to-blue-600',
    rounds: 10,
    maxNumber: 99,
  },
  add: {
    name: 'Add Numbers',
    description: 'Use beads to add two numbers',
    icon: '➕',
    color: 'from-green-500 to-green-600',
    rounds: 8,
    maxNumber: 50,
  },
  challenge: {
    name: 'Challenge',
    description: 'Bigger numbers, faster pace!',
    icon: '🏆',
    color: 'from-purple-500 to-purple-600',
    rounds: 10,
    maxNumber: 999,
  },
};

// ============================================
// HELPERS
// ============================================
const getInitialState = (): GameState => ({
  mode: 'build',
  phase: 'menu',
  targetNumber: 0,
  beads: [0, 0, 0, 0],
  score: 0,
  streak: 0,
  bestStreak: 0,
  xp: 0,
  round: 1,
  totalRounds: 10,
  feedback: null,
  addend1: 0,
  addend2: 0,
});

const calculateBeadValue = (beads: number[]): number => {
  return beads[0] * 1000 + beads[1] * 100 + beads[2] * 10 + beads[3];
};

const numberToBeads = (num: number): number[] => {
  const thousands = Math.floor(num / 1000);
  const hundreds = Math.floor((num % 1000) / 100);
  const tens = Math.floor((num % 100) / 10);
  const units = num % 10;
  return [thousands, hundreds, tens, units];
};

const generateTargetNumber = (mode: GameMode): number => {
  const config = GAME_MODES[mode];
  return Math.floor(Math.random() * config.maxNumber) + 1;
};

const generateAdditionProblem = (): { addend1: number; addend2: number } => {
  const addend1 = Math.floor(Math.random() * 30) + 5;
  const addend2 = Math.floor(Math.random() * 30) + 5;
  return { addend1, addend2 };
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function BeadFrameGame() {
  const [gameState, setGameState] = useState<GameState>(getInitialState());

  // Start a game mode
  const startGame = useCallback((mode: GameMode) => {
    const config = GAME_MODES[mode];
    
    if (mode === 'add') {
      const { addend1, addend2 } = generateAdditionProblem();
      setGameState({
        ...getInitialState(),
        mode,
        phase: 'playing',
        totalRounds: config.rounds,
        targetNumber: addend1 + addend2,
        addend1,
        addend2,
      });
    } else {
      setGameState({
        ...getInitialState(),
        mode,
        phase: 'playing',
        totalRounds: config.rounds,
        targetNumber: generateTargetNumber(mode),
      });
    }
  }, []);

  // Update bead count for a place value
  const updateBeads = useCallback((index: number, delta: number) => {
    setGameState(prev => {
      const newBeads = [...prev.beads];
      const newValue = Math.max(0, Math.min(9, newBeads[index] + delta));
      newBeads[index] = newValue;
      return { ...prev, beads: newBeads };
    });
  }, []);

  // Check the answer
  const checkAnswer = useCallback(() => {
    const currentValue = calculateBeadValue(gameState.beads);
    const isCorrect = currentValue === gameState.targetNumber;
    
    setGameState(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const xpGain = isCorrect ? (10 + newStreak * 2) : 0;
      
      return {
        ...prev,
        phase: 'feedback',
        feedback: isCorrect ? (newStreak >= 3 ? 'perfect' : 'correct') : 'incorrect',
        score: isCorrect ? prev.score + 1 : prev.score,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        xp: prev.xp + xpGain,
      };
    });
  }, [gameState.beads, gameState.targetNumber]);

  // Next round
  const nextRound = useCallback(() => {
    setGameState(prev => {
      if (prev.round >= prev.totalRounds) {
        return { ...prev, phase: 'complete' };
      }
      
      if (prev.mode === 'add') {
        const { addend1, addend2 } = generateAdditionProblem();
        return {
          ...prev,
          phase: 'playing',
          round: prev.round + 1,
          beads: [0, 0, 0, 0],
          feedback: null,
          targetNumber: addend1 + addend2,
          addend1,
          addend2,
        };
      }
      
      return {
        ...prev,
        phase: 'playing',
        round: prev.round + 1,
        beads: [0, 0, 0, 0],
        feedback: null,
        targetNumber: generateTargetNumber(prev.mode),
      };
    });
  }, []);

  // Reset to menu
  const backToMenu = useCallback(() => {
    setGameState(getInitialState());
  }, []);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl">←</span>
            <span className="font-medium">Games</span>
          </Link>
          <h1 className="text-xl font-bold text-amber-600">🧮 Bead Frame</h1>
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
          {/* MENU SCREEN */}
          {gameState.phase === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Small Bead Frame</h2>
                <p className="text-gray-600">Learn place value with the abacus!</p>
              </div>

              {/* Bead Frame Preview */}
              <div className="bg-amber-100/50 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2">
                  {PLACE_VALUES.map((pv) => (
                    <div key={pv.id} className="flex flex-col items-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded bg-gradient-to-r ${pv.color} text-white`}>
                        {pv.shortName}
                      </span>
                      <div className="flex flex-col gap-1 mt-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className={`w-6 h-6 rounded-full ${pv.beadColor} opacity-60`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode Selection */}
              <div className="grid gap-4">
                {(Object.entries(GAME_MODES) as [GameMode, typeof GAME_MODES.build][]).map(([mode, config]) => (
                  <motion.button
                    key={mode}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => startGame(mode)}
                    className={`p-4 rounded-xl bg-gradient-to-r ${config.color} text-white text-left`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{config.icon}</span>
                      <div>
                        <h3 className="font-bold text-lg">{config.name}</h3>
                        <p className="text-white/80 text-sm">{config.description}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* PLAYING SCREEN */}
          {gameState.phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Round {gameState.round}/{gameState.totalRounds}</span>
                <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(gameState.round / gameState.totalRounds) * 100}%` }}
                  />
                </div>
              </div>

              {/* Target Display */}
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                {gameState.mode === 'add' ? (
                  <div>
                    <p className="text-gray-500 mb-2">Add these numbers:</p>
                    <p className="text-4xl font-bold text-gray-800">
                      {gameState.addend1} + {gameState.addend2} = ?
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500 mb-2">Show this number:</p>
                    <p className="text-5xl font-bold text-amber-600">{gameState.targetNumber}</p>
                  </div>
                )}
              </div>

              {/* Bead Frame */}
              <div className="bg-amber-100 rounded-2xl p-6">
                <div className="bg-amber-800 rounded-xl p-4">
                  <div className="flex justify-center gap-4">
                    {PLACE_VALUES.map((pv, index) => (
                      <div key={pv.id} className="flex flex-col items-center">
                        <span className={`text-xs font-bold px-2 py-1 rounded bg-gradient-to-r ${pv.color} text-white mb-2`}>
                          {pv.shortName}
                        </span>
                        
                        {/* Up Arrow */}
                        <button
                          onClick={() => updateBeads(index, 1)}
                          className="w-10 h-8 bg-white/20 rounded-t-lg text-white font-bold hover:bg-white/30 active:bg-white/40"
                        >
                          ▲
                        </button>
                        
                        {/* Bead Display */}
                        <div className="w-10 h-32 bg-amber-900/50 flex flex-col-reverse items-center justify-start py-1 gap-1">
                          {[...Array(gameState.beads[index])].map((_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={`w-8 h-8 rounded-full ${pv.beadColor} shadow-lg border-2 border-white/30`}
                            />
                          ))}
                        </div>
                        
                        {/* Down Arrow */}
                        <button
                          onClick={() => updateBeads(index, -1)}
                          className="w-10 h-8 bg-white/20 rounded-b-lg text-white font-bold hover:bg-white/30 active:bg-white/40"
                        >
                          ▼
                        </button>
                        
                        {/* Count */}
                        <span className="text-white font-bold mt-2 text-xl">{gameState.beads[index]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Current Value */}
                <div className="text-center mt-4">
                  <span className="text-amber-800 font-medium">Your number: </span>
                  <span className="text-2xl font-bold text-amber-900">{calculateBeadValue(gameState.beads)}</span>
                </div>
              </div>

              {/* Check Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={checkAnswer}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xl font-bold rounded-xl shadow-lg"
              >
                Check Answer ✓
              </motion.button>
            </motion.div>
          )}

          {/* FEEDBACK SCREEN */}
          {gameState.phase === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-8xl"
              >
                {gameState.feedback === 'perfect' ? '🌟' : gameState.feedback === 'correct' ? '✅' : '❌'}
              </motion.div>
              
              <h2 className="text-3xl font-bold">
                {gameState.feedback === 'perfect' ? 'Perfect Streak!' : 
                 gameState.feedback === 'correct' ? 'Correct!' : 'Not quite...'}
              </h2>
              
              {gameState.feedback === 'incorrect' && (
                <div className="bg-amber-100 rounded-xl p-4">
                  <p className="text-gray-600">The answer was:</p>
                  <p className="text-3xl font-bold text-amber-600">{gameState.targetNumber}</p>
                  <div className="flex justify-center gap-2 mt-2">
                    {numberToBeads(gameState.targetNumber).map((count, i) => (
                      <span key={i} className={`px-2 py-1 rounded text-white text-sm bg-gradient-to-r ${PLACE_VALUES[i].color}`}>
                        {PLACE_VALUES[i].shortName}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextRound}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xl font-bold rounded-xl"
              >
                {gameState.round >= gameState.totalRounds ? 'See Results' : 'Next Round →'}
              </motion.button>
            </motion.div>
          )}

          {/* COMPLETE SCREEN */}
          {gameState.phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-8xl"
              >
                🏆
              </motion.div>
              
              <h2 className="text-3xl font-bold text-gray-800">Game Complete!</h2>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">Score</p>
                    <p className="text-3xl font-bold text-amber-600">{gameState.score}/{gameState.totalRounds}</p>
                  </div>
                  <div className="bg-orange-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">XP Earned</p>
                    <p className="text-3xl font-bold text-orange-600">+{gameState.xp}</p>
                  </div>
                  <div className="bg-yellow-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">Best Streak</p>
                    <p className="text-3xl font-bold text-yellow-600">🔥 {gameState.bestStreak}</p>
                  </div>
                  <div className="bg-green-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">Accuracy</p>
                    <p className="text-3xl font-bold text-green-600">
                      {Math.round((gameState.score / gameState.totalRounds) * 100)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={backToMenu}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Back to Menu
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => startGame(gameState.mode)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl"
                >
                  Play Again
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
