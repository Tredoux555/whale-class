// app/games/odd-even/page.tsx
// Odd/Even Counters - Montessori Cards and Counters
// Discover the odd/even pattern by placing counters
// Session 63 - Jan 24, 2026
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TYPES
// ============================================
type GamePhase = 'menu' | 'build' | 'identify' | 'complete';

interface NumberCard {
  number: number;
  countersPlaced: number;
  isComplete: boolean;
}

// ============================================
// HELPERS
// ============================================
const isOdd = (n: number): boolean => n % 2 !== 0;

// Create visual counter layout for a number
const getCounterLayout = (count: number): { pairs: number; hasLonely: boolean } => {
  const pairs = Math.floor(count / 2);
  const hasLonely = count % 2 !== 0;
  return { pairs, hasLonely };
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function OddEvenGame() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [cards, setCards] = useState<NumberCard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [countersToPlace, setCountersToPlace] = useState(0);
  const [score, setScore] = useState(0);
  const [showPattern, setShowPattern] = useState(false);

  // Initialize build phase
  const startBuildPhase = () => {
    const newCards: NumberCard[] = [];
    for (let i = 1; i <= 10; i++) {
      newCards.push({ number: i, countersPlaced: 0, isComplete: false });
    }
    setCards(newCards);
    setCurrentCard(0);
    setCountersToPlace(1);
    setPhase('build');
  };

  // Start identify phase (quiz)
  const startIdentifyPhase = () => {
    setScore(0);
    setCurrentCard(0);
    setPhase('identify');
  };

  // Handle placing a counter in build phase
  const handlePlaceCounter = () => {
    if (countersToPlace <= 0) return;
    
    setCards(prev => prev.map((card, idx) => 
      idx === currentCard 
        ? { ...card, countersPlaced: card.countersPlaced + 1 }
        : card
    ));
    setCountersToPlace(prev => prev - 1);
  };

  // Move to next card in build phase
  useEffect(() => {
    if (phase === 'build' && countersToPlace === 0) {
      // Mark current card as complete
      setCards(prev => prev.map((card, idx) => 
        idx === currentCard ? { ...card, isComplete: true } : card
      ));
      
      // Check if all cards are done
      if (currentCard >= 9) {
        // Show pattern discovery screen
        setTimeout(() => setShowPattern(true), 500);
      } else {
        // Move to next card
        setTimeout(() => {
          setCurrentCard(prev => prev + 1);
          setCountersToPlace(currentCard + 2); // Next number
        }, 800);
      }
    }
  }, [countersToPlace, currentCard, phase]);

  // Handle odd/even guess in identify phase
  const handleGuess = (guessOdd: boolean) => {
    const number = (currentCard % 10) + 1; // Random-ish order
    const numbers = [3, 8, 1, 6, 9, 4, 7, 2, 10, 5]; // Mixed order
    const actualNumber = numbers[currentCard];
    const correct = guessOdd === isOdd(actualNumber);
    
    if (correct) {
      setScore(prev => prev + 1);
    }

    if (currentCard >= 9) {
      setTimeout(() => setPhase('complete'), 500);
    } else {
      setCurrentCard(prev => prev + 1);
    }
  };

  // ============================================
  // RENDER: MENU
  // ============================================
  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 p-4">
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
              <h1 className="text-2xl font-bold text-white">Odd & Even</h1>
              <p className="text-white/80 text-sm">Cards and Counters • Mathematics</p>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <h3 className="font-bold text-gray-900 mb-4 text-center">Discover the Pattern!</h3>
            <div className="flex justify-center gap-4">
              {/* Odd Example */}
              <div className="text-center">
                <div className="w-12 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                  </div>
                  <div className="w-4 h-4 rounded-full bg-red-500 opacity-70" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Odd (lonely one)</p>
              </div>

              {/* Even Example */}
              <div className="text-center">
                <div className="w-12 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                  <span className="text-2xl font-bold text-blue-600">4</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                  </div>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Even (all pairs)</p>
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startBuildPhase}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <span className="text-3xl">🔴</span>
              <div>
                <h3 className="font-bold text-gray-900">Build the Pattern</h3>
                <p className="text-gray-500 text-sm">Place counters under each number</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startIdentifyPhase}
              className="w-full bg-white rounded-2xl p-5 shadow-xl text-left flex items-center gap-4"
            >
              <span className="text-3xl">🎯</span>
              <div>
                <h3 className="font-bold text-gray-900">Odd or Even Quiz</h3>
                <p className="text-gray-500 text-sm">Test your pattern knowledge</p>
              </div>
            </motion.button>
          </div>

          {/* Montessori Note */}
          <div className="mt-6 bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/90 text-sm">
              <span className="font-bold">🎯 Montessori Goal:</span> Understanding odd and even numbers visually. 
              Odd numbers have a &quot;lonely&quot; counter that can&apos;t find a partner!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: BUILD PHASE
  // ============================================
  if (phase === 'build') {
    if (showPattern) {
      // Pattern discovery screen
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-4">
          <div className="max-w-2xl mx-auto pt-8">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              🎉 You discovered the pattern!
            </h2>
            
            {/* All cards with counters */}
            <div className="bg-white rounded-2xl p-4 shadow-xl mb-6">
              <div className="flex justify-center gap-2 flex-wrap">
                {cards.map((card) => {
                  const { pairs, hasLonely } = getCounterLayout(card.number);
                  return (
                    <div key={card.number} className="text-center">
                      <div className={`w-10 h-14 rounded-lg flex items-center justify-center mb-1 ${
                        isOdd(card.number) ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        <span className={`text-lg font-bold ${
                          isOdd(card.number) ? 'text-orange-600' : 'text-blue-600'
                        }`}>{card.number}</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        {[...Array(pairs)].map((_, i) => (
                          <div key={i} className="flex gap-0.5">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        ))}
                        {hasLonely && (
                          <div className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {isOdd(card.number) ? 'Odd' : 'Even'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pattern explanation */}
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-white text-center mb-6">
              <p className="font-bold mb-2">The Pattern:</p>
              <p className="text-sm">
                <span className="text-orange-200">Odd numbers</span> (1, 3, 5, 7, 9) have a <strong>lonely counter</strong> at the bottom.<br/>
                <span className="text-blue-200">Even numbers</span> (2, 4, 6, 8, 10) have <strong>all pairs</strong> - no lonely ones!
              </p>
            </div>

            {/* Next action */}
            <div className="space-y-3">
              <button
                onClick={startIdentifyPhase}
                className="w-full py-4 bg-white text-emerald-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl"
              >
                Test Your Knowledge! →
              </button>
              <button
                onClick={() => setPhase('menu')}
                className="w-full py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30"
              >
                Back to Menu
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Building counters
    const currentCardData = cards[currentCard];
    const { pairs, hasLonely } = getCounterLayout(currentCardData.countersPlaced);

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pt-4">
            <button
              onClick={() => setPhase('menu')}
              className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
            >
              ←
            </button>
            <div className="text-white font-bold">
              Card {currentCard + 1} of 10
            </div>
            <div className="w-10" />
          </div>

          {/* Progress */}
          <div className="h-3 bg-white/30 rounded-full mb-6 overflow-hidden">
            <motion.div 
              className="h-full bg-white rounded-full"
              animate={{ width: `${(currentCard / 10) * 100}%` }}
            />
          </div>

          {/* Current Card */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            {/* Number Card */}
            <motion.div 
              key={currentCardData.number}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-24 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <span className="text-5xl font-bold text-blue-600">{currentCardData.number}</span>
            </motion.div>

            {/* Counter Display Area */}
            <div className="min-h-[80px] flex flex-col items-center justify-center gap-2 mb-6 p-4 bg-gray-50 rounded-xl">
              {currentCardData.countersPlaced > 0 ? (
                <>
                  {[...Array(pairs)].map((_, i) => (
                    <motion.div 
                      key={`pair-${i}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-red-500 shadow-md" />
                      <div className="w-8 h-8 rounded-full bg-red-500 shadow-md" />
                    </motion.div>
                  ))}
                  {hasLonely && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 rounded-full bg-red-400 shadow-md"
                    />
                  )}
                </>
              ) : (
                <p className="text-gray-400">Place {currentCardData.number} counters here</p>
              )}
            </div>

            {/* Counter Bank */}
            <div className="mb-4">
              <p className="text-gray-500 text-sm mb-2">
                {countersToPlace > 0 ? `Tap to place ${countersToPlace} more counter${countersToPlace > 1 ? 's' : ''}:` : '✓ All placed!'}
              </p>
              {countersToPlace > 0 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handlePlaceCounter}
                  className="w-16 h-16 rounded-full bg-red-500 shadow-xl mx-auto flex items-center justify-center text-white text-2xl"
                >
                  🔴
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: IDENTIFY PHASE (QUIZ)
  // ============================================
  if (phase === 'identify') {
    const numbers = [3, 8, 1, 6, 9, 4, 7, 2, 10, 5];
    const currentNumber = numbers[currentCard];
    const { pairs, hasLonely } = getCounterLayout(currentNumber);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-indigo-400 to-blue-500 p-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pt-4">
            <button
              onClick={() => setPhase('menu')}
              className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30"
            >
              ←
            </button>
            <div className="text-white font-bold">
              ⭐ {score} / {currentCard}
            </div>
            <div className="text-white/70">
              {currentCard + 1}/10
            </div>
          </div>

          {/* Progress */}
          <div className="h-3 bg-white/30 rounded-full mb-8 overflow-hidden">
            <motion.div 
              className="h-full bg-yellow-400 rounded-full"
              animate={{ width: `${(currentCard / 10) * 100}%` }}
            />
          </div>

          {/* Question */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            <h3 className="text-gray-500 mb-4">Is this number odd or even?</h3>
            
            {/* Number with counters */}
            <motion.div
              key={currentNumber}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6"
            >
              <div className="w-20 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-4xl font-bold text-gray-700">{currentNumber}</span>
              </div>
              
              {/* Show counters as hint */}
              <div className="flex flex-col items-center gap-1">
                {[...Array(pairs)].map((_, i) => (
                  <div key={i} className="flex gap-1">
                    <div className="w-5 h-5 rounded-full bg-red-500" />
                    <div className="w-5 h-5 rounded-full bg-red-500" />
                  </div>
                ))}
                {hasLonely && (
                  <div className="w-5 h-5 rounded-full bg-red-400 animate-pulse" />
                )}
              </div>
            </motion.div>

            {/* Answer Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGuess(true)}
                className="py-4 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-xl font-bold text-lg shadow-lg"
              >
                Odd
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleGuess(false)}
                className="py-4 bg-gradient-to-r from-blue-400 to-indigo-400 text-white rounded-xl font-bold text-lg shadow-lg"
              >
                Even
              </motion.button>
            </div>
          </div>

          <p className="text-center text-white/70 mt-4 text-sm">
            Hint: Look for the lonely counter!
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: COMPLETE
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 p-4 flex items-center justify-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
      >
        <div className="text-6xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className="text-gray-500 mb-6">You know your odds and evens!</p>
        
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="text-5xl font-bold text-emerald-600 mb-2">{score}/10</div>
          <div className="text-gray-500">Correct Answers</div>
          <div className="mt-4 text-lg">
            {score === 10 ? '⭐ Perfect!' : score >= 8 ? '🌟 Excellent!' : score >= 6 ? '👍 Good job!' : '💪 Keep practicing!'}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={startIdentifyPhase}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:shadow-lg"
          >
            Try Again
          </button>
          <button
            onClick={startBuildPhase}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Build Pattern Again
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
