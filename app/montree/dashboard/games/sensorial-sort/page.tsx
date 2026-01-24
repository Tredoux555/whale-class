// app/games/sensorial-sort/page.tsx
// Sensorial Sort - Color Tablets / Pink Tower / Brown Stairs
// Montessori sensorial: Visual discrimination through sorting
// 3 Modes: 1) Sort by Size 2) Sort by Color 3) Sort by Shape

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GameMode = 'size' | 'color' | 'shape';
type GamePhase = 'menu' | 'playing' | 'feedback' | 'complete';
type FeedbackType = 'correct' | 'incorrect' | 'perfect' | null;

interface SortItem {
  id: string;
  value: number;
  color: string;
  size: number;
  shape: 'circle' | 'square' | 'triangle';
  label: string;
}

interface GameState {
  mode: GameMode;
  phase: GamePhase;
  items: SortItem[];
  score: number;
  streak: number;
  bestStreak: number;
  xp: number;
  round: number;
  totalRounds: number;
  feedback: FeedbackType;
  sortDirection: 'asc' | 'desc';
}

// ============================================
// CONSTANTS
// ============================================
const GAME_MODES = {
  size: {
    name: 'Sort by Size',
    description: 'Arrange from smallest to largest',
    icon: '📏',
    color: 'from-pink-500 to-rose-500',
    rounds: 8,
    montessoriWork: 'Pink Tower / Brown Stairs',
  },
  color: {
    name: 'Sort by Color',
    description: 'Arrange colors light to dark',
    icon: '🎨',
    color: 'from-blue-500 to-indigo-500',
    rounds: 8,
    montessoriWork: 'Color Tablets Box 2',
  },
  shape: {
    name: 'Sort by Shape',
    description: 'Group matching shapes together',
    icon: '🔷',
    color: 'from-purple-500 to-violet-500',
    rounds: 8,
    montessoriWork: 'Geometric Cabinet',
  },
};

const COLORS = [
  { name: 'Light Pink', value: 1, bg: 'bg-pink-200' },
  { name: 'Pink', value: 2, bg: 'bg-pink-400' },
  { name: 'Rose', value: 3, bg: 'bg-rose-500' },
  { name: 'Dark Rose', value: 4, bg: 'bg-rose-700' },
  { name: 'Light Blue', value: 1, bg: 'bg-blue-200' },
  { name: 'Blue', value: 2, bg: 'bg-blue-400' },
  { name: 'Indigo', value: 3, bg: 'bg-indigo-500' },
  { name: 'Dark Indigo', value: 4, bg: 'bg-indigo-700' },
];

const SIZES = [
  { label: 'Tiny', value: 1, size: 32 },
  { label: 'Small', value: 2, size: 48 },
  { label: 'Medium', value: 3, size: 64 },
  { label: 'Large', value: 4, size: 80 },
  { label: 'XL', value: 5, size: 96 },
];

// ============================================
// HELPERS
// ============================================
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateSizeItems = (): SortItem[] => {
  const count = 4 + Math.floor(Math.random() * 2);
  return shuffleArray(SIZES.slice(0, count)).map((s, i) => ({
    id: `size-${i}`,
    value: s.value,
    color: 'bg-pink-400',
    size: s.size,
    shape: 'square' as const,
    label: s.label,
  }));
};

const generateColorItems = (): SortItem[] => {
  const colorSet = Math.random() > 0.5 ? COLORS.slice(0, 4) : COLORS.slice(4, 8);
  return shuffleArray(colorSet).map((c, i) => ({
    id: `color-${i}`,
    value: c.value,
    color: c.bg,
    size: 64,
    shape: 'square' as const,
    label: c.name,
  }));
};

const generateShapeItems = (): SortItem[] => {
  const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
  const items: SortItem[] = [];
  shapes.forEach((shape, si) => {
    for (let i = 0; i < 2; i++) {
      items.push({
        id: `shape-${si}-${i}`,
        value: si + 1,
        color: ['bg-red-400', 'bg-blue-400', 'bg-yellow-400'][si],
        size: 56,
        shape,
        label: shape,
      });
    }
  });
  return shuffleArray(items);
};

const getInitialState = (): GameState => ({
  mode: 'size',
  phase: 'menu',
  items: [],
  score: 0,
  streak: 0,
  bestStreak: 0,
  xp: 0,
  round: 1,
  totalRounds: 8,
  feedback: null,
  sortDirection: 'asc',
});

// ============================================
// MAIN COMPONENT
// ============================================
export default function SensorialSortGame() {
  const [gameState, setGameState] = useState<GameState>(getInitialState());

  const generateItems = useCallback((mode: GameMode): SortItem[] => {
    switch (mode) {
      case 'size': return generateSizeItems();
      case 'color': return generateColorItems();
      case 'shape': return generateShapeItems();
    }
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    const config = GAME_MODES[mode];
    setGameState({
      ...getInitialState(),
      mode,
      phase: 'playing',
      totalRounds: config.rounds,
      items: generateItems(mode),
      sortDirection: Math.random() > 0.5 ? 'asc' : 'desc',
    });
  }, [generateItems]);

  const handleReorder = useCallback((newItems: SortItem[]) => {
    setGameState(prev => ({ ...prev, items: newItems }));
  }, []);

  const checkAnswer = useCallback(() => {
    const { items, mode, sortDirection } = gameState;
    let isCorrect = false;

    if (mode === 'shape') {
      // Check if shapes are grouped together
      const grouped = items.reduce((acc, item, i) => {
        if (i === 0) return true;
        const prevShape = items[i - 1].shape;
        const currShape = item.shape;
        return acc && (prevShape === currShape || items.filter(it => it.shape === prevShape).every(it => items.indexOf(it) < i));
      }, true);
      isCorrect = items.every((item, i) => {
        if (i === 0) return true;
        return item.shape === items[i-1].shape || 
               items.slice(0, i).filter(it => it.shape === item.shape).length === 0;
      });
      // Simpler check: just verify shapes are grouped
      const shapeOrder = items.map(i => i.shape);
      const uniqueInOrder = shapeOrder.filter((s, i) => i === 0 || s !== shapeOrder[i-1]);
      isCorrect = uniqueInOrder.length === 3;
    } else {
      // Check ascending or descending order
      isCorrect = items.every((item, i) => {
        if (i === 0) return true;
        return sortDirection === 'asc' 
          ? item.value >= items[i - 1].value
          : item.value <= items[i - 1].value;
      });
    }

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
  }, [gameState]);

  const nextRound = useCallback(() => {
    setGameState(prev => {
      if (prev.round >= prev.totalRounds) {
        return { ...prev, phase: 'complete' };
      }
      return {
        ...prev,
        phase: 'playing',
        round: prev.round + 1,
        items: generateItems(prev.mode),
        feedback: null,
        sortDirection: Math.random() > 0.5 ? 'asc' : 'desc',
      };
    });
  }, [generateItems]);

  const backToMenu = useCallback(() => {
    setGameState(getInitialState());
  }, []);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl">←</span>
            <span className="font-medium">Games</span>
          </Link>
          <h1 className="text-xl font-bold text-rose-600">🎨 Sensorial Sort</h1>
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
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Sensorial Sorting</h2>
                <p className="text-gray-600">Train your senses through sorting!</p>
              </div>

              {/* Mode Selection */}
              <div className="grid gap-4">
                {(Object.entries(GAME_MODES) as [GameMode, typeof GAME_MODES.size][]).map(([mode, config]) => (
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
                        <p className="text-white/60 text-xs mt-1">Based on: {config.montessoriWork}</p>
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
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${(gameState.round / gameState.totalRounds) * 100}%` }}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
                <p className="text-gray-500 mb-2">
                  {gameState.mode === 'shape' ? 'Group the shapes together!' :
                   `Sort ${gameState.sortDirection === 'asc' ? 'smallest to largest' : 'largest to smallest'}`}
                </p>
                <p className="text-2xl font-bold text-rose-600">
                  {gameState.mode === 'size' && '📏 Drag to arrange by size'}
                  {gameState.mode === 'color' && '🎨 Drag to arrange by shade'}
                  {gameState.mode === 'shape' && '🔷 Drag to group shapes'}
                </p>
              </div>

              {/* Sortable Area */}
              <div className="bg-rose-100 rounded-2xl p-6 min-h-[200px]">
                <Reorder.Group
                  axis="x"
                  values={gameState.items}
                  onReorder={handleReorder}
                  className="flex flex-wrap justify-center gap-4"
                >
                  {gameState.items.map((item) => (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`${item.color} shadow-lg flex items-center justify-center text-white font-bold
                          ${item.shape === 'circle' ? 'rounded-full' : item.shape === 'triangle' ? 'clip-triangle' : 'rounded-lg'}`}
                        style={{ 
                          width: item.size, 
                          height: item.size,
                          clipPath: item.shape === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined
                        }}
                      >
                        {gameState.mode === 'size' && item.label.charAt(0)}
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>

              {/* Hint */}
              <p className="text-center text-gray-500 text-sm">
                💡 Drag items to reorder them
              </p>

              {/* Check Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={checkAnswer}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xl font-bold rounded-xl shadow-lg"
              >
                Check Order ✓
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
                 gameState.feedback === 'correct' ? 'Well Sorted!' : 'Try again next time!'}
              </h2>

              {gameState.feedback === 'correct' && (
                <p className="text-gray-600">Great sensorial discrimination!</p>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={nextRound}
                className="px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xl font-bold rounded-xl"
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
              
              <h2 className="text-3xl font-bold text-gray-800">Sorting Master!</h2>
              
              <div className="bg-white rounded-2xl p-6 shadow-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-rose-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">Score</p>
                    <p className="text-3xl font-bold text-rose-600">{gameState.score}/{gameState.totalRounds}</p>
                  </div>
                  <div className="bg-pink-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">XP Earned</p>
                    <p className="text-3xl font-bold text-pink-600">+{gameState.xp}</p>
                  </div>
                  <div className="bg-orange-100 rounded-xl p-4">
                    <p className="text-gray-500 text-sm">Best Streak</p>
                    <p className="text-3xl font-bold text-orange-600">🔥 {gameState.bestStreak}</p>
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
                  className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-xl"
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
