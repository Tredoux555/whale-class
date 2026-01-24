// app/games/hundred-board/page.tsx
// Hundred Board Game - Montessori Mathematics
// Place numbered tiles 1-100 on the grid
// Session 63 - Jan 24, 2026
'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GamePhase = 'menu' | 'playing' | 'complete';
type Level = 'ten' | 'twenty' | 'fifty' | 'hundred';

interface Tile {
  number: number;
  isPlaced: boolean;
}

interface GridCell {
  number: number;
  filled: boolean;
}

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

const getLevelMax = (level: Level): number => {
  switch (level) {
    case 'ten': return 10;
    case 'twenty': return 20;
    case 'fifty': return 50;
    case 'hundred': return 100;
  }
};

const createTiles = (max: number): Tile[] => {
  const tiles: Tile[] = [];
  for (let i = 1; i <= max; i++) {
    tiles.push({ number: i, isPlaced: false });
  }
  return shuffleArray(tiles);
};

const createGrid = (max: number): GridCell[] => {
  const grid: GridCell[] = [];
  for (let i = 1; i <= max; i++) {
    grid.push({ number: i, filled: false });
  }
  return grid;
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function HundredBoardGame() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [level, setLevel] = useState<Level>('ten');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [wrongCell, setWrongCell] = useState<number | null>(null);

  // Start game
  const startGame = (selectedLevel: Level) => {
    setLevel(selectedLevel);
    const max = getLevelMax(selectedLevel);
    setTiles(createTiles(max));
    setGrid(createGrid(max));
    setSelectedTile(null);
    setPlaced(0);
    setMistakes(0);
    setShowHint(false);
    setWrongCell(null);
    setPhase('playing');
  };

  // Handle tile selection
  const handleTileSelect = (number: number) => {
    const tile = tiles.find(t => t.number === number);
    if (tile && !tile.isPlaced) {
      setSelectedTile(number);
      setShowHint(false);
      setWrongCell(null);
    }
  };

  // Handle grid cell click
  const handleCellClick = useCallback((cellNumber: number) => {
    if (selectedTile === null) return;
    
    const cell = grid.find(c => c.number === cellNumber);
    if (!cell || cell.filled) return;

    if (selectedTile === cellNumber) {
      // Correct placement!
      setGrid(prev => prev.map(c => 
        c.number === cellNumber ? { ...c, filled: true } : c
      ));
      setTiles(prev => prev.map(t => 
        t.number === selectedTile ? { ...t, isPlaced: true } : t
      ));
      setPlaced(prev => prev + 1);
      setSelectedTile(null);
      setWrongCell(null);

      // Check for completion
      const max = getLevelMax(level);
      if (placed + 1 === max) {
        setTimeout(() => setPhase('complete'), 500);
      }
    } else {
      // Wrong placement
      setMistakes(prev => prev + 1);
      setWrongCell(cellNumber);
      setTimeout(() => setWrongCell(null), 500);
    }
  }, [selectedTile, grid, level, placed]);

  // Get grid dimensions
  const getGridCols = (): string => {
    switch (level) {
      case 'ten': return 'grid-cols-5';
      case 'twenty': return 'grid-cols-5';
      case 'fifty': return 'grid-cols-10';
      case 'hundred': return 'grid-cols-10';
    }
  };

  const getCellSize = (): string => {
    switch (level) {
      case 'ten': return 'w-14 h-14 text-xl';
      case 'twenty': return 'w-12 h-12 text-lg';
      case 'fifty': return 'w-8 h-8 text-sm';
      case 'hundred': return 'w-7 h-7 text-xs';
    }
  };

  // ============================================
  // RENDER: MENU
  // ============================================
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <Link 
              href="/montree/games"
              className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Hundred Board</h1>
              <p className="text-white/80 text-sm">Mathematics • Number Patterns</p>
            </div>
          </div>

          {/* Preview Grid */}
          <div className="bg-white rounded-2xl p-4 shadow-xl mb-6">
            <div className="grid grid-cols-10 gap-0.5">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 rounded flex items-center justify-center text-[8px] text-blue-600 font-medium"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Level Selection */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('ten')}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-green-600">10</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Numbers 1-10</h3>
                <p className="text-gray-500 text-sm">Perfect for beginners • Ages 3-4</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('twenty')}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">20</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Numbers 1-20</h3>
                <p className="text-gray-500 text-sm">Teen numbers practice • Ages 4-5</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('fifty')}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-purple-600">50</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Numbers 1-50</h3>
                <p className="text-gray-500 text-sm">Intermediate challenge • Ages 5-6</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => startGame('hundred')}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-orange-600">100</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Full Hundred Board</h3>
                <p className="text-gray-500 text-sm">Master challenge • Ages 5-6+</p>
              </div>
            </motion.button>
          </div>

          {/* Montessori Note */}
          <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/90 text-sm">
              <span className="font-bold">🎯 Montessori Goal:</span> Number sequence and patterns. 
              Children discover relationships between numbers, skip counting, and the structure of our number system.
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
    const max = getLevelMax(level);
    const accuracy = Math.round((max / (max + mistakes)) * 100);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-4 flex items-center justify-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Board Complete!</h2>
          <p className="text-gray-500 mb-6">You placed all {max} numbers!</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-emerald-600">{max}</div>
                <div className="text-sm text-gray-500">Numbers Placed</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{mistakes}</div>
                <div className="text-sm text-gray-500">Mistakes</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="text-2xl font-bold text-purple-600">{accuracy}%</div>
              <div className="text-sm text-gray-500">Accuracy</div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(level)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg transition-shadow"
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
              href="/montree/games"
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
  const max = getLevelMax(level);
  const availableTiles = tiles.filter(t => !t.isPlaced);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-2">
          <button
            onClick={() => setPhase('menu')}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
          >
            ←
          </button>
          <div className="text-center">
            <div className="text-white font-bold">
              {placed} / {max} placed
            </div>
          </div>
          <button
            onClick={() => setShowHint(!showHint)}
            className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
          >
            💡
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-white/30 rounded-full mb-4 overflow-hidden">
          <motion.div 
            className="h-full bg-yellow-400 rounded-full"
            animate={{ width: `${(placed / max) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Selected Tile Display */}
        <div className="text-center mb-4">
          {selectedTile ? (
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-block bg-yellow-400 text-yellow-900 px-6 py-2 rounded-xl font-bold text-xl shadow-lg"
            >
              {selectedTile} ← Tap where this goes
            </motion.div>
          ) : (
            <div className="text-white/80">
              Select a number tile below
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="bg-white/20 backdrop-blur rounded-2xl p-3 mb-4">
          <div className={`grid ${getGridCols()} gap-1`}>
            {grid.map((cell) => (
              <motion.button
                key={cell.number}
                onClick={() => handleCellClick(cell.number)}
                disabled={cell.filled || selectedTile === null}
                className={`${getCellSize()} rounded-lg font-bold transition-all ${
                  cell.filled
                    ? 'bg-emerald-400 text-white'
                    : wrongCell === cell.number
                    ? 'bg-red-400 text-white animate-shake'
                    : selectedTile !== null
                    ? 'bg-white/80 text-gray-400 hover:bg-yellow-200 cursor-pointer'
                    : 'bg-white/40 text-gray-300'
                } ${showHint && !cell.filled ? 'text-gray-600' : ''}`}
                whileHover={!cell.filled && selectedTile ? { scale: 1.1 } : {}}
                whileTap={!cell.filled && selectedTile ? { scale: 0.95 } : {}}
              >
                {cell.filled ? cell.number : (showHint ? cell.number : '')}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Available Tiles */}
        <div className="bg-white rounded-2xl p-4 shadow-xl">
          <p className="text-gray-500 text-sm mb-3 text-center">Tap a number to select it:</p>
          <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-y-auto">
            <AnimatePresence>
              {availableTiles.map((tile) => (
                <motion.button
                  key={tile.number}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTileSelect(tile.number)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                    selectedTile === tile.number
                      ? 'bg-yellow-400 text-yellow-900 ring-2 ring-yellow-600'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {tile.number}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
