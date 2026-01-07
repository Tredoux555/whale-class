// components/08-WordBuildingGame.tsx
// Word Building Game - ElevenLabs audio only
// BUG FIX: Added distractor letters for all words

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

interface GameWord {
  word: string;
  picture: string;
  letters: string[];
  difficulty: 'cvc' | '4-letter' | '5-letter';
}

// Helper to add distractors to any word
function addDistractors(word: string, baseLetters: string[]): string[] {
  const distractorPool = 'bcdfghjklmnpqrstvwxyz'.split('').filter(l => !word.includes(l));
  const shuffledDistractors = [...distractorPool].sort(() => Math.random() - 0.5);
  const neededDistractors = Math.max(0, 5 - baseLetters.length);
  return [...baseLetters, ...shuffledDistractors.slice(0, neededDistractors + 2)];
}

const WordBuildingGame: React.FC = () => {
  const wordSequence: GameWord[] = [
    // CVC words - Short A
    { word: 'cat', picture: '🐱', letters: ['c', 'a', 't', 'b', 'd'], difficulty: 'cvc' },
    { word: 'bat', picture: '🦇', letters: ['b', 'a', 't', 'c', 'r'], difficulty: 'cvc' },
    { word: 'hat', picture: '🎩', letters: ['h', 'a', 't', 'c', 'b'], difficulty: 'cvc' },
    { word: 'rat', picture: '🐀', letters: ['r', 'a', 't', 'h', 'c'], difficulty: 'cvc' },
    { word: 'mat', picture: '📍', letters: ['m', 'a', 't', 'b', 'r'], difficulty: 'cvc' },
    { word: 'sat', picture: '🪑', letters: ['s', 'a', 't', 'c', 'h'], difficulty: 'cvc' },
    { word: 'van', picture: '🚐', letters: ['v', 'a', 'n', 't', 'c'], difficulty: 'cvc' },
    { word: 'can', picture: '🥫', letters: ['c', 'a', 'n', 'r', 'f'], difficulty: 'cvc' },
    { word: 'fan', picture: '🌀', letters: ['f', 'a', 'n', 'c', 'v'], difficulty: 'cvc' },
    { word: 'pan', picture: '🍳', letters: ['p', 'a', 'n', 'c', 'f'], difficulty: 'cvc' },
    { word: 'bag', picture: '👜', letters: ['b', 'a', 'g', 't', 'c'], difficulty: 'cvc' },
    
    // CVC words - Short E
    { word: 'bed', picture: '🛏️', letters: ['b', 'e', 'd', 'r', 'c'], difficulty: 'cvc' },
    { word: 'red', picture: '🔴', letters: ['r', 'e', 'd', 'b', 'h'], difficulty: 'cvc' },
    { word: 'net', picture: '🥅', letters: ['n', 'e', 't', 'g', 'w'], difficulty: 'cvc' },
    { word: 'pet', picture: '🐕', letters: ['p', 'e', 't', 'm', 's'], difficulty: 'cvc' },
    { word: 'wet', picture: '💧', letters: ['w', 'e', 't', 'g', 'p'], difficulty: 'cvc' },
    { word: 'hen', picture: '🐔', letters: ['h', 'e', 'n', 'p', 'd'], difficulty: 'cvc' },
    { word: 'pen', picture: '✏️', letters: ['p', 'e', 'n', 't', 'm'], difficulty: 'cvc' },
    { word: 'ten', picture: '🔟', letters: ['t', 'e', 'n', 's', 'b'], difficulty: 'cvc' },
    
    // CVC words - Short I
    { word: 'big', picture: '🦣', letters: ['b', 'i', 'g', 'p', 'd'], difficulty: 'cvc' },
    { word: 'dig', picture: '⛏️', letters: ['d', 'i', 'g', 'f', 'r'], difficulty: 'cvc' },
    { word: 'pig', picture: '🐷', letters: ['p', 'i', 'g', 'b', 'w'], difficulty: 'cvc' },
    { word: 'wig', picture: '👴', letters: ['w', 'i', 'g', 'd', 'h'], difficulty: 'cvc' },
    { word: 'bin', picture: '🗑️', letters: ['b', 'i', 'n', 'p', 't'], difficulty: 'cvc' },
    { word: 'pin', picture: '📌', letters: ['p', 'i', 'n', 'w', 's'], difficulty: 'cvc' },
    { word: 'sit', picture: '🪑', letters: ['s', 'i', 't', 'w', 'h'], difficulty: 'cvc' },
    { word: 'hit', picture: '⚾', letters: ['h', 'i', 't', 'b', 'w'], difficulty: 'cvc' },
    
    // CVC words - Short O
    { word: 'box', picture: '📦', letters: ['b', 'o', 'x', 'f', 'h'], difficulty: 'cvc' },
    { word: 'fox', picture: '🦊', letters: ['f', 'o', 'x', 'b', 'c'], difficulty: 'cvc' },
    { word: 'hot', picture: '🔥', letters: ['h', 'o', 't', 'p', 'd'], difficulty: 'cvc' },
    { word: 'pot', picture: '🍲', letters: ['p', 'o', 't', 'h', 's'], difficulty: 'cvc' },
    { word: 'dog', picture: '🐶', letters: ['d', 'o', 'g', 'h', 'f'], difficulty: 'cvc' },
    { word: 'log', picture: '🪵', letters: ['l', 'o', 'g', 'c', 'b'], difficulty: 'cvc' },
    { word: 'hop', picture: '🦘', letters: ['h', 'o', 'p', 'b', 'm'], difficulty: 'cvc' },
    { word: 'mop', picture: '🧹', letters: ['m', 'o', 'p', 'h', 't'], difficulty: 'cvc' },
    { word: 'top', picture: '🎪', letters: ['t', 'o', 'p', 'h', 's'], difficulty: 'cvc' },
    
    // CVC words - Short U
    { word: 'bug', picture: '🐛', letters: ['b', 'u', 'g', 'h', 't'], difficulty: 'cvc' },
    { word: 'hug', picture: '🤗', letters: ['h', 'u', 'g', 'b', 'p'], difficulty: 'cvc' },
    { word: 'mug', picture: '☕', letters: ['m', 'u', 'g', 'h', 'p'], difficulty: 'cvc' },
    { word: 'rug', picture: '🧶', letters: ['r', 'u', 'g', 't', 'b'], difficulty: 'cvc' },
    { word: 'bus', picture: '🚌', letters: ['b', 'u', 's', 'h', 't'], difficulty: 'cvc' },
    { word: 'cut', picture: '✂️', letters: ['c', 'u', 't', 'b', 'h'], difficulty: 'cvc' },
    { word: 'nut', picture: '🥜', letters: ['n', 'u', 't', 'h', 'p'], difficulty: 'cvc' },
    { word: 'sun', picture: '☀️', letters: ['s', 'u', 'n', 'r', 'b'], difficulty: 'cvc' },
    { word: 'cup', picture: '🥤', letters: ['c', 'u', 'p', 's', 'b'], difficulty: 'cvc' },
    
    // 4-letter words - BUG FIX: Added distractor letters
    { word: 'bell', picture: '🔔', letters: ['b', 'e', 'l', 'l', 't', 's'], difficulty: '4-letter' },
    { word: 'hill', picture: '⛰️', letters: ['h', 'i', 'l', 'l', 'b', 'f'], difficulty: '4-letter' },
    { word: 'ball', picture: '⚽', letters: ['b', 'a', 'l', 'l', 't', 'c'], difficulty: '4-letter' },
    { word: 'call', picture: '📞', letters: ['c', 'a', 'l', 'l', 'f', 'b'], difficulty: '4-letter' },
    { word: 'fall', picture: '🍂', letters: ['f', 'a', 'l', 'l', 'b', 'c'], difficulty: '4-letter' },
    { word: 'fill', picture: '🫗', letters: ['f', 'i', 'l', 'l', 'h', 'b'], difficulty: '4-letter' },
    { word: 'pill', picture: '💊', letters: ['p', 'i', 'l', 'l', 'b', 's'], difficulty: '4-letter' },
    { word: 'pull', picture: '🪢', letters: ['p', 'u', 'l', 'l', 'f', 'b'], difficulty: '4-letter' },
    
    // 5-letter words - BUG FIX: Added distractor letters (was missing!)
    { word: 'smell', picture: '👃', letters: ['s', 'm', 'e', 'l', 'l', 'p', 't'], difficulty: '5-letter' },
    { word: 'spill', picture: '🚰', letters: ['s', 'p', 'i', 'l', 'l', 'k', 'f'], difficulty: '5-letter' },
    { word: 'small', picture: '👶', letters: ['s', 'm', 'a', 'l', 'l', 'b', 't'], difficulty: '5-letter' },
    { word: 'still', picture: '⏸️', letters: ['s', 't', 'i', 'l', 'l', 'p', 'k'], difficulty: '5-letter' },
    { word: 'spell', picture: '✨', letters: ['s', 'p', 'e', 'l', 'l', 'm', 'b'], difficulty: '5-letter' },
    { word: 'shell', picture: '🐚', letters: ['s', 'h', 'e', 'l', 'l', 'w', 't'], difficulty: '5-letter' },
    { word: 'skill', picture: '🎯', letters: ['s', 'k', 'i', 'l', 'l', 'p', 'f'], difficulty: '5-letter' },
  ];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [droppedLetters, setDroppedLetters] = useState<(string | null)[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

  const currentWord = wordSequence[currentWordIndex];
  const wordLength = currentWord.word.length;
  const isComplete = droppedLetters.filter(l => l !== null).length === wordLength && 
                     droppedLetters.slice(0, wordLength).join('') === currentWord.word;

  useEffect(() => {
    const shuffled = [...currentWord.letters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
    setDroppedLetters(new Array(wordLength).fill(null));
    setFeedback('');
    setShowCelebration(false);
  }, [currentWordIndex, wordLength]);

  // Play word sound using ElevenLabs
  const playWordSound = async () => {
    try {
      await GameAudio.playWord(currentWord.word, 'pink');
    } catch {
      try {
        await GameAudio.playWord(currentWord.word, 'blue');
      } catch {
        console.warn(`Word "${currentWord.word}" not found`);
      }
    }
  };

  // Play letter sound
  const playLetterSound = async (letter: string) => {
    await GameAudio.playLetter(letter.toLowerCase());
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, letter: string, index: number) => {
    setDraggedLetter(letter);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropInBox = async (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();

    if (!draggedLetter || draggedFromIndex === null) return;

    // Check if position already filled
    if (droppedLetters[position] !== null) {
      setFeedback('This box is already filled!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
      return;
    }

    // Check if correct letter for position
    if (draggedLetter === currentWord.word[position]) {
      const newDropped = [...droppedLetters];
      newDropped[position] = draggedLetter;
      setDroppedLetters(newDropped);

      const newAvailable = availableLetters.filter((_, i) => i !== draggedFromIndex);
      setAvailableLetters(newAvailable);

      setFeedback('✓ Correct!');
      await GameAudio.playCorrect();
      await playLetterSound(draggedLetter);

      // Check if complete
      const filledCount = newDropped.filter(l => l !== null).length;
      if (filledCount === wordLength && newDropped.slice(0, wordLength).join('') === currentWord.word) {
        setShowCelebration(true);
        await GameAudio.playCelebration();
        
        setTimeout(() => {
          playWordSound();
        }, 500);

        setTimeout(() => {
          if (currentWordIndex < wordSequence.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
          } else {
            setCurrentWordIndex(0);
          }
        }, 2500);
      }
    } else {
      setFeedback('❌ Not quite! Try again.');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }

    setDraggedLetter(null);
    setDraggedFromIndex(null);
  };

  const removeLetterFromBox = (position: number) => {
    const letter = droppedLetters[position];
    if (letter) {
      const newDropped = [...droppedLetters];
      newDropped[position] = null;
      setDroppedLetters(newDropped);
      setAvailableLetters([...availableLetters, letter]);
    }
  };

  const resetWord = () => {
    setAvailableLetters([...currentWord.letters].sort(() => Math.random() - 0.5));
    setDroppedLetters(new Array(wordLength).fill(null));
    setFeedback('');
    setShowCelebration(false);
  };

  const goToPrevious = () => {
    if (currentWordIndex > 0) setCurrentWordIndex(currentWordIndex - 1);
  };

  const goToNext = () => {
    if (currentWordIndex < wordSequence.length - 1) setCurrentWordIndex(currentWordIndex + 1);
  };

  const getDifficultyColor = () => {
    switch (currentWord.difficulty) {
      case 'cvc': return 'from-blue-50 to-blue-100';
      case '4-letter': return 'from-purple-50 to-purple-100';
      case '5-letter': return 'from-pink-50 to-pink-100';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColor()} p-4 flex flex-col items-center justify-center`}>
      {/* Back button */}
      <div className="w-full max-w-2xl mb-4">
        <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <span className="text-xl">←</span>
          <span>Back to Games</span>
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={goToPrevious} disabled={currentWordIndex === 0} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            <ChevronLeft size={20} /> Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Word Progress</p>
            <p className="text-gray-800 font-semibold">{currentWordIndex + 1} of {wordSequence.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {currentWord.difficulty === 'cvc' && '3-Letter CVC'}
              {currentWord.difficulty === '4-letter' && '4-Letter Word'}
              {currentWord.difficulty === '5-letter' && '5-Letter Word'}
            </p>
          </div>

          <button onClick={goToNext} disabled={currentWordIndex === wordSequence.length - 1} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
        {/* Picture */}
        <div className="text-center mb-8">
          <div className="inline-block text-8xl mb-4 cursor-pointer hover:scale-110 transition-transform" onClick={playWordSound} title="Click to hear the word">
            {currentWord.picture}
          </div>
          <p className="text-5xl font-bold text-indigo-600 mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            {currentWord.word}
          </p>
          <button onClick={playWordSound} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
            <Volume2 size={20} /> Hear Word
          </button>
        </div>

        {/* Available letters */}
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
          <p className="text-center text-gray-700 font-semibold mb-4">Available Letters (Drag these below)</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {availableLetters.map((letter, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, letter, index)}
                onClick={() => playLetterSound(letter)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-2xl cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-all hover:scale-110"
                style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
              >
                {letter.toLowerCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Drop zones */}
        <div className="mb-8 text-center">
          <p className="text-gray-700 font-semibold mb-4">Drag letters here to build the word:</p>
          <div className="flex gap-3 justify-center mb-6">
            {Array.from({ length: wordLength }).map((_, position) => (
              <div
                key={position}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropInBox(e, position)}
                className={`
                  w-20 h-24 rounded-xl border-4 border-dashed flex items-center justify-center text-4xl font-bold cursor-pointer transition-all duration-200
                  ${droppedLetters[position] ? 'bg-green-200 border-green-500 shadow-lg' : 'bg-gray-100 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'}
                `}
              >
                {droppedLetters[position] ? (
                  <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => removeLetterFromBox(position)} title="Click to remove">
                    <span className="text-indigo-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>{droppedLetters[position]}</span>
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</div>
                  </div>
                ) : (
                  <span className="text-gray-300 text-5xl">_</span>
                )}
              </div>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`inline-block px-6 py-3 rounded-lg font-semibold text-lg mb-4 ${feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {feedback}
            </div>
          )}
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600">{currentWord.picture} {currentWord.word}</p>
          </div>
        )}

        {/* Reset */}
        {!showCelebration && (
          <div className="text-center">
            <button onClick={resetWord} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
              <RotateCcw size={20} /> Reset Word
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordBuildingGame;
