// app/games/color-grade/page.tsx
// Color Grading Game - Montessori Color Tablets Box III
// Arrange 7 shades of a color from lightest to darkest
// Session 63 - Jan 24, 2026
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GamePhase = 'menu' | 'playing' | 'checking' | 'complete';

interface ColorShade {
  id: string;
  shade: number; // 1-7, 1 = lightest, 7 = darkest
  hex: string;
}

interface ColorSet {
  name: string;
  icon: string;
  shades: string[]; // 7 hex colors from light to dark
}

// ============================================
// COLOR DATA - 9 color families, 7 shades each
// ============================================
const COLOR_SETS: ColorSet[] = [
  {
    name: 'Red',
    icon: '🔴',
    shades: ['#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#C62828'],
  },
  {
    name: 'Blue',
    icon: '🔵',
    shades: ['#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1565C0'],
  },
  {
    name: 'Green',
    icon: '🟢',
    shades: ['#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#2E7D32'],
  },
  {
    name: 'Yellow',
    icon: '🟡',
    shades: ['#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#F9A825'],
  },
  {
    name: 'Orange',
    icon: '🟠',
    shades: ['#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#EF6C00'],
  },
  {
    name: 'Purple',
    icon: '🟣',
    shades: ['#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#6A1B9A'],
  },
  {
    name: 'Pink',
    icon: '💗',
    shades: ['#F8BBD9', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#AD1457'],
  },
  {
    name: 'Brown',
    icon: '🤎',
    shades: ['#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#4E342E'],
  },
  {
    name: 'Gray',
    icon: '⚫',
    shades: ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242'],
  },
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

const createShades = (colorSet: ColorSet): ColorShade[] => {
  const shades = colorSet.shades.map((hex, index) => ({
    id: `shade-${index}`,
    shade: index + 1,
    hex,
  }));
  return shuffleArray(shades);
};

const checkOrder = (shades: ColorShade[]): boolean => {
  for (let i = 0; i < shades.length - 1; i++) {
    if (shades[i].shade > shades[i + 1].shade) {
      return false;
    }
  }
  return true;
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function ColorGradeGame() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [currentColor, setCurrentColor] = useState<ColorSet | null>(null);
  const [shades, setShades] = useState<ColorShade[]>([]);
  const [round, setRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  // Start game with random colors
  const startGame = (rounds: number = 3) => {
    setTotalRounds(rounds);
    setRound(1);
    setScore(0);
    setAttempts(0);
    nextColor(shuffleArray([...COLOR_SETS]));
    setPhase('playing');
  };

  // Pick next color
  const nextColor = (remainingColors: ColorSet[]) => {
    if (remainingColors.length === 0) {
      setPhase('complete');
      return;
    }
    const color = remainingColors[0];
    setCurrentColor(color);
    setShades(createShades(color));
  };

  // Check answer
  const handleCheck = () => {
    setAttempts(prev => prev + 1);
    const isCorrect = checkOrder(shades);
    
    if (isCorrect) {
      setFeedback('correct');
      setScore(prev => prev + 1);
      
      setTimeout(() => {
        setFeedback(null);
        if (round >= totalRounds) {
          setPhase('complete');
        } else {
          setRound(prev => prev + 1);
          // Pick a new random color (excluding current)
          const remaining = COLOR_SETS.filter(c => c.name !== currentColor?.name);
          nextColor(shuffleArray(remaining));
        }
      }, 1500);
    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 1000);
    }
  };

  // ============================================
  // RENDER: MENU
  // ============================================
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-500 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Link 
              href="/games"
              className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Color Grading</h1>
              <p className="text-white/80 text-sm">Color Tablets Box III • Sensorial</p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <h3 className="font-bold text-gray-900 mb-3">How to Play</h3>
            <p className="text-gray-600 text-sm mb-4">
              Arrange the color tablets from <strong>lightest</strong> to <strong>darkest</strong>. 
              Drag and drop to reorder!
            </p>
            <div className="flex justify-center gap-1">
              {COLOR_SETS[0].shades.map((hex, i) => (
                <div
                  key={i}
                  className="w-8 h-12 rounded-lg shadow-sm"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">Light → Dark</p>
          </div>

          {/* Level Selection */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(3)}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <span className="text-3xl">🌱</span>
              <div>
                <h3 className="font-bold text-gray-900">Quick Practice</h3>
                <p className="text-gray-500 text-sm">3 colors • ~2 minutes</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(5)}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <span className="text-3xl">🌿</span>
              <div>
                <h3 className="font-bold text-gray-900">Standard</h3>
                <p className="text-gray-500 text-sm">5 colors • ~4 minutes</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame(9)}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <span className="text-3xl">🌳</span>
              <div>
                <h3 className="font-bold text-gray-900">Master Challenge</h3>
                <p className="text-gray-500 text-sm">All 9 colors • ~8 minutes</p>
              </div>
            </motion.button>
          </div>

          {/* Montessori Note */}
          <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/90 text-sm">
              <span className="font-bold">🎯 Montessori Goal:</span> Visual discrimination of color gradation. 
              Children develop sensitivity to subtle color differences, preparing them for art, design, and scientific observation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: COMPLETE
  // ============================================
  if (phase === 'complete') {
    const percentage = Math.round((score / totalRounds) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-4 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
        >
          <div className="text-6xl mb-4">🎨</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Beautiful Work!</h2>
          <p className="text-gray-500 mb-6">You&apos;re becoming a color expert!</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-600">{score}</div>
                <div className="text-sm text-gray-500">Perfect Grades</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{totalRounds}</div>
                <div className="text-sm text-gray-500">Colors Tried</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-2xl font-bold text-purple-600">{percentage}%</div>
              <div className="text-sm text-gray-500">Accuracy</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(totalRounds)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white rounded-xl font-bold hover:shadow-lg transition-shadow"
            >
              Play Again
            </button>
            <button
              onClick={() => setPhase('menu')}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
            >
              Change Level
            </button>
            <Link
              href="/games"
              className="block w-full py-3 text-gray-500 hover:text-gray-700"
            >
              ← Back to Games
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // RENDER: PLAYING
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-400 via-purple-400 to-fuchsia-500 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-4">
          <button
            onClick={() => setPhase('menu')}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
          >
            ←
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg flex items-center gap-2 justify-center">
              <span>{currentColor?.icon}</span>
              <span>{currentColor?.name}</span>
            </div>
            <div className="text-white/70 text-sm">
              Round {round} of {totalRounds}
            </div>
          </div>
          <div className="text-white font-bold">
            ⭐ {score}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-white/30 rounded-full mb-6 overflow-hidden">
          <motion.div 
            className="h-full bg-yellow-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((round - 1) / totalRounds) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Instructions */}
        <div className="text-center mb-4">
          <p className="text-white font-medium">
            Drag to arrange: <span className="opacity-70">Light</span> → <span className="font-bold">Dark</span>
          </p>
        </div>

        {/* Sortable Color Shades */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-4">
          <Reorder.Group 
            axis="x" 
            values={shades} 
            onReorder={setShades}
            className="flex gap-2 justify-center flex-wrap"
          >
            <AnimatePresence>
              {shades.map((shade) => (
                <Reorder.Item
                  key={shade.id}
                  value={shade}
                  whileDrag={{ scale: 1.1, zIndex: 10 }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    className="w-12 h-20 sm:w-14 sm:h-24 rounded-xl shadow-lg border-2 border-white/50"
                    style={{ backgroundColor: shade.hex }}
                    animate={{
                      scale: feedback === 'correct' ? [1, 1.1, 1] : 1,
                      rotate: feedback === 'incorrect' ? [-5, 5, -5, 5, 0] : 0,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </div>

        {/* Reference Bar */}
        <div className="mt-4 flex justify-center gap-1 opacity-50">
          <div className="text-xs text-white">Light</div>
          <div className="flex-1 h-2 bg-gradient-to-r from-white/80 to-gray-800 rounded-full mx-2" />
          <div className="text-xs text-white">Dark</div>
        </div>

        {/* Check Button */}
        <div className="mt-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheck}
            disabled={feedback !== null}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              feedback === 'correct'
                ? 'bg-green-500 text-white'
                : feedback === 'incorrect'
                ? 'bg-red-500 text-white animate-shake'
                : 'bg-white text-purple-600 hover:shadow-xl'
            }`}
          >
            {feedback === 'correct' ? '✓ Perfect!' : feedback === 'incorrect' ? '✗ Try Again' : 'Check Order'}
          </motion.button>
        </div>

        {/* Feedback Message */}
        <AnimatePresence>
          {feedback === 'incorrect' && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-white/90 mt-4"
            >
              Hint: Look for the lightest shade first!
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
