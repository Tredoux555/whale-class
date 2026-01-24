// app/games/color-match/page.tsx
// Color Matching Game - Montessori Color Tablets Box I & II
// Match pairs of identical colors
// Session 63 - Jan 24, 2026
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GamePhase = 'menu' | 'playing' | 'complete';
type Level = 'box1' | 'box2';

interface ColorCard {
  id: string;
  colorName: string;
  hex: string;
  pairId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

// ============================================
// COLOR DATA - True Montessori Color Tablets
// ============================================
const BOX_1_COLORS = [
  { name: 'Red', hex: '#E53935' },
  { name: 'Yellow', hex: '#FDD835' },
  { name: 'Blue', hex: '#1E88E5' },
];

const BOX_2_COLORS = [
  { name: 'Red', hex: '#E53935' },
  { name: 'Yellow', hex: '#FDD835' },
  { name: 'Blue', hex: '#1E88E5' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Green', hex: '#43A047' },
  { name: 'Purple', hex: '#8E24AA' },
  { name: 'Brown', hex: '#795548' },
  { name: 'Pink', hex: '#EC407A' },
  { name: 'Gray', hex: '#757575' },
  { name: 'Black', hex: '#212121' },
  { name: 'White', hex: '#FAFAFA' },
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

const createCards = (colors: { name: string; hex: string }[]): ColorCard[] => {
  const cards: ColorCard[] = [];
  colors.forEach((color, index) => {
    // Create pair of cards
    cards.push({
      id: `${index}-a`,
      colorName: color.name,
      hex: color.hex,
      pairId: `pair-${index}`,
      isFlipped: false,
      isMatched: false,
    });
    cards.push({
      id: `${index}-b`,
      colorName: color.name,
      hex: color.hex,
      pairId: `pair-${index}`,
      isFlipped: false,
      isMatched: false,
    });
  });
  return shuffleArray(cards);
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function ColorMatchGame() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [level, setLevel] = useState<Level>('box1');
  const [cards, setCards] = useState<ColorCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Initialize game
  const startGame = (selectedLevel: Level) => {
    setLevel(selectedLevel);
    const colors = selectedLevel === 'box1' ? BOX_1_COLORS : BOX_2_COLORS;
    setCards(createCards(colors));
    setFlippedCards([]);
    setMatches(0);
    setAttempts(0);
    setPhase('playing');
  };

  // Handle card flip
  const handleCardClick = useCallback((cardId: string) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isMatched || card.isFlipped) return;
    if (flippedCards.length >= 2) return;

    // Flip the card
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));
    setFlippedCards(prev => [...prev, cardId]);
  }, [cards, flippedCards, isChecking]);

  // Check for match when 2 cards are flipped
  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      setAttempts(prev => prev + 1);

      const [first, second] = flippedCards;
      const card1 = cards.find(c => c.id === first);
      const card2 = cards.find(c => c.id === second);

      if (card1 && card2 && card1.pairId === card2.pairId) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.pairId === card1.pairId ? { ...c, isMatched: true } : c
          ));
          setMatches(prev => prev + 1);
          setFlippedCards([]);
          setIsChecking(false);
        }, 600);
      } else {
        // No match - flip back
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            flippedCards.includes(c.id) ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedCards, cards]);

  // Check for game complete
  useEffect(() => {
    const totalPairs = level === 'box1' ? 3 : 11;
    if (matches === totalPairs && phase === 'playing') {
      setTimeout(() => setPhase('complete'), 500);
    }
  }, [matches, level, phase]);

  // ============================================
  // RENDER: MENU
  // ============================================
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 p-4">
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
              <h1 className="text-2xl font-bold text-white">Color Matching</h1>
              <p className="text-white/80 text-sm">Color Tablets • Sensorial</p>
            </div>
          </div>

          {/* Level Selection */}
          <div className="space-y-4">
            {/* Box I - Primary Colors */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('box1')}
              className="w-full bg-white rounded-2xl p-6 shadow-xl text-left"
            >
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {BOX_1_COLORS.map((color, i) => (
                    <div 
                      key={i}
                      className="w-10 h-10 rounded-lg border-2 border-white shadow-md"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Box I - Primary</h3>
                  <p className="text-gray-500 text-sm">3 pairs • Red, Yellow, Blue</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                  Ages 2.5-3
                </span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                  Beginner
                </span>
              </div>
            </motion.button>

            {/* Box II - Secondary Colors */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('box2')}
              className="w-full bg-white rounded-2xl p-6 shadow-xl text-left"
            >
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-4 gap-1">
                  {BOX_2_COLORS.slice(0, 8).map((color, i) => (
                    <div 
                      key={i}
                      className="w-5 h-5 rounded border border-white shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Box II - All Colors</h3>
                  <p className="text-gray-500 text-sm">11 pairs • Full spectrum</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                  Ages 3-4
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-medium">
                  Intermediate
                </span>
              </div>
            </motion.button>
          </div>

          {/* Montessori Note */}
          <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/90 text-sm">
              <span className="font-bold">🎯 Montessori Goal:</span> Visual discrimination of color. 
              Children learn to identify and match identical colors, building the foundation for 
              later color grading work.
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
    const totalPairs = level === 'box1' ? 3 : 11;
    const efficiency = Math.round((totalPairs / attempts) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-4 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Perfect Match!</h2>
          <p className="text-gray-500 mb-6">You matched all the colors!</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-600">{totalPairs}</div>
                <div className="text-sm text-gray-500">Pairs Matched</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{attempts}</div>
                <div className="text-sm text-gray-500">Attempts</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-2xl font-bold text-purple-600">{efficiency}%</div>
              <div className="text-sm text-gray-500">Efficiency</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(level)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg transition-shadow"
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
  const totalPairs = level === 'box1' ? 3 : 11;
  const gridCols = level === 'box1' ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => setPhase('menu')}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
          >
            ←
          </button>
          <div className="text-center">
            <div className="text-white font-bold text-lg">
              {matches} / {totalPairs} pairs
            </div>
            <div className="text-white/70 text-sm">
              {attempts} attempts
            </div>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-white/30 rounded-full mb-6 overflow-hidden">
          <motion.div 
            className="h-full bg-yellow-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(matches / totalPairs) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Game Board */}
        <div className={`grid ${gridCols} gap-3`}>
          <AnimatePresence>
            {cards.map((card) => (
              <motion.button
                key={card.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: card.isMatched ? 0.95 : 1, 
                  opacity: card.isMatched ? 0.6 : 1 
                }}
                whileHover={{ scale: card.isMatched ? 0.95 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || card.isFlipped || isChecking}
                className={`aspect-square rounded-xl shadow-lg transition-all duration-300 ${
                  card.isMatched ? 'cursor-default' : 'cursor-pointer'
                }`}
                style={{
                  backgroundColor: card.isFlipped || card.isMatched ? card.hex : '#ffffff',
                }}
              >
                {!card.isFlipped && !card.isMatched && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl">🎨</span>
                  </div>
                )}
                {card.isMatched && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl">✓</span>
                  </div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Hint */}
        <div className="mt-6 text-center">
          <p className="text-white/80 text-sm">
            Tap cards to find matching color pairs
          </p>
        </div>
      </div>
    </div>
  );
}
