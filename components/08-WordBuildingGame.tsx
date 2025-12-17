// components/WordBuildingGame.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';

interface Word {
  word: string;
  picture: string;
  difficulty: 'cvc' | '4-letter' | '5-letter';
}

interface GameWord {
  word: string;
  picture: string;
  letters: string[];
  difficulty: 'cvc' | '4-letter' | '5-letter';
}

const WordBuildingGame: React.FC = () => {
  // Complete word progression - CVC → 4-letter → 5-letter
  const wordSequence: GameWord[] = [
    // Phase 1: CVC words - Short A (Weeks 13-14)
    { word: 'cat', picture: '🐱', letters: ['c', 'a', 't', 'b', 'd'], difficulty: 'cvc' },
    { word: 'bat', picture: '🦇', letters: ['b', 'a', 't', 'c', 'r'], difficulty: 'cvc' },
    { word: 'hat', picture: '🎩', letters: ['h', 'a', 't', 'c', 'b'], difficulty: 'cvc' },
    { word: 'rat', picture: '🐀', letters: ['r', 'a', 't', 'h', 'c'], difficulty: 'cvc' },
    { word: 'mat', picture: '📍', letters: ['m', 'a', 't', 'b', 'r'], difficulty: 'cvc' },
    { word: 'sat', picture: '🪑', letters: ['s', 'a', 't', 'c', 'h'], difficulty: 'cvc' },
    { word: 'fat', picture: '🐷', letters: ['f', 'a', 't', 'r', 'b'], difficulty: 'cvc' },
    { word: 'pat', picture: '👋', letters: ['p', 'a', 't', 'h', 's'], difficulty: 'cvc' },
    { word: 'van', picture: '🚐', letters: ['v', 'a', 'n', 't', 'c'], difficulty: 'cvc' },
    { word: 'ran', picture: '🏃', letters: ['r', 'a', 'n', 'b', 'p'], difficulty: 'cvc' },
    { word: 'can', picture: '🥫', letters: ['c', 'a', 'n', 'r', 'f'], difficulty: 'cvc' },
    { word: 'fan', picture: '🌀', letters: ['f', 'a', 'n', 'c', 'v'], difficulty: 'cvc' },
    { word: 'man', picture: '👨', letters: ['m', 'a', 'n', 'r', 'p'], difficulty: 'cvc' },
    { word: 'pan', picture: '🍳', letters: ['p', 'a', 'n', 'c', 'f'], difficulty: 'cvc' },
    { word: 'bag', picture: '👜', letters: ['b', 'a', 'g', 't', 'c'], difficulty: 'cvc' },
    { word: 'tag', picture: '🏷️', letters: ['t', 'a', 'g', 'b', 'r'], difficulty: 'cvc' },

    // Phase 2: CVC words - Short E (Weeks 17-18)
    { word: 'bed', picture: '🛏️', letters: ['b', 'e', 'd', 'r', 'c'], difficulty: 'cvc' },
    { word: 'red', picture: '🔴', letters: ['r', 'e', 'd', 'b', 'h'], difficulty: 'cvc' },
    { word: 'fed', picture: '🥘', letters: ['f', 'e', 'd', 'l', 't'], difficulty: 'cvc' },
    { word: 'let', picture: '🚀', letters: ['l', 'e', 't', 'b', 'p'], difficulty: 'cvc' },
    { word: 'met', picture: '👥', letters: ['m', 'e', 't', 'w', 'n'], difficulty: 'cvc' },
    { word: 'net', picture: '🥅', letters: ['n', 'e', 't', 'g', 'w'], difficulty: 'cvc' },
    { word: 'pet', picture: '🐕', letters: ['p', 'e', 't', 'm', 's'], difficulty: 'cvc' },
    { word: 'set', picture: '🧩', letters: ['s', 'e', 't', 'b', 'g'], difficulty: 'cvc' },
    { word: 'wet', picture: '💧', letters: ['w', 'e', 't', 'g', 'p'], difficulty: 'cvc' },
    { word: 'hen', picture: '🐔', letters: ['h', 'e', 'n', 'p', 'd'], difficulty: 'cvc' },
    { word: 'pen', picture: '✏️', letters: ['p', 'e', 'n', 't', 'm'], difficulty: 'cvc' },
    { word: 'ten', picture: '🔟', letters: ['t', 'e', 'n', 's', 'b'], difficulty: 'cvc' },
    { word: 'den', picture: '🏠', letters: ['d', 'e', 'n', 'h', 'c'], difficulty: 'cvc' },
    { word: 'men', picture: '👨‍👨‍👧', letters: ['m', 'e', 'n', 'w', 'r'], difficulty: 'cvc' },
    { word: 'bell', picture: '🔔', letters: ['b', 'e', 'l', 'l', 't'], difficulty: '4-letter' },
    { word: 'sell', picture: '🏪', letters: ['s', 'e', 'l', 'l', 'd'], difficulty: '4-letter' },

    // Phase 3: CVC words - Short I (Weeks 19-20)
    { word: 'bit', picture: '🐜', letters: ['b', 'i', 't', 'h', 'p'], difficulty: 'cvc' },
    { word: 'fit', picture: '💪', letters: ['f', 'i', 't', 'h', 's'], difficulty: 'cvc' },
    { word: 'hit', picture: '⚾', letters: ['h', 'i', 't', 'b', 'w'], difficulty: 'cvc' },
    { word: 'kit', picture: '📦', letters: ['k', 'i', 't', 's', 'p'], difficulty: 'cvc' },
    { word: 'lit', picture: '💡', letters: ['l', 'i', 't', 'h', 'g'], difficulty: 'cvc' },
    { word: 'pit', picture: '🕳️', letters: ['p', 'i', 't', 'b', 'n'], difficulty: 'cvc' },
    { word: 'sit', picture: '🪑', letters: ['s', 'i', 't', 'w', 'h'], difficulty: 'cvc' },
    { word: 'big', picture: '🦣', letters: ['b', 'i', 'g', 'p', 'd'], difficulty: 'cvc' },
    { word: 'dig', picture: '⛏️', letters: ['d', 'i', 'g', 'f', 'r'], difficulty: 'cvc' },
    { word: 'fig', picture: '🍈', letters: ['f', 'i', 'g', 'p', 'n'], difficulty: 'cvc' },
    { word: 'pig', picture: '🐷', letters: ['p', 'i', 'g', 'b', 'w'], difficulty: 'cvc' },
    { word: 'wig', picture: '👴', letters: ['w', 'i', 'g', 'd', 'h'], difficulty: 'cvc' },
    { word: 'bin', picture: '🗑️', letters: ['b', 'i', 'n', 'p', 't'], difficulty: 'cvc' },
    { word: 'fin', picture: '🐠', letters: ['f', 'i', 'n', 't', 'p'], difficulty: 'cvc' },
    { word: 'pin', picture: '📌', letters: ['p', 'i', 'n', 'w', 's'], difficulty: 'cvc' },
    { word: 'dip', picture: '🫔', letters: ['d', 'i', 'p', 'h', 'w'], difficulty: 'cvc' },
    { word: 'hip', picture: '🤸', letters: ['h', 'i', 'p', 'b', 'l'], difficulty: 'cvc' },
    { word: 'lip', picture: '👄', letters: ['l', 'i', 'p', 's', 'h'], difficulty: 'cvc' },
    { word: 'tip', picture: '👆', letters: ['t', 'i', 'p', 'n', 'z'], difficulty: 'cvc' },
    { word: 'zip', picture: '🤐', letters: ['z', 'i', 'p', 'd', 's'], difficulty: 'cvc' },

    // Phase 4: CVC words - Short O (Weeks 21-22)
    { word: 'box', picture: '📦', letters: ['b', 'o', 'x', 'f', 'h'], difficulty: 'cvc' },
    { word: 'fox', picture: '🦊', letters: ['f', 'o', 'x', 'b', 'c'], difficulty: 'cvc' },
    { word: 'hot', picture: '🔥', letters: ['h', 'o', 't', 'p', 'd'], difficulty: 'cvc' },
    { word: 'lot', picture: '📍', letters: ['l', 'o', 't', 'n', 'c'], difficulty: 'cvc' },
    { word: 'not', picture: '❌', letters: ['n', 'o', 't', 'h', 'b'], difficulty: 'cvc' },
    { word: 'pot', picture: '🍲', letters: ['p', 'o', 't', 'h', 's'], difficulty: 'cvc' },
    { word: 'rot', picture: '☠️', letters: ['r', 'o', 't', 'c', 'g'], difficulty: 'cvc' },
    { word: 'got', picture: '🎯', letters: ['g', 'o', 't', 'h', 'p'], difficulty: 'cvc' },
    { word: 'dog', picture: '🐶', letters: ['d', 'o', 'g', 'h', 'f'], difficulty: 'cvc' },
    { word: 'fog', picture: '🌫️', letters: ['f', 'o', 'g', 'j', 'b'], difficulty: 'cvc' },
    { word: 'hog', picture: '🐷', letters: ['h', 'o', 'g', 'd', 'l'], difficulty: 'cvc' },
    { word: 'jog', picture: '🏃', letters: ['j', 'o', 'g', 'f', 'n'], difficulty: 'cvc' },
    { word: 'log', picture: '🪵', letters: ['l', 'o', 'g', 'c', 'b'], difficulty: 'cvc' },
    { word: 'cop', picture: '👮', letters: ['c', 'o', 'p', 't', 'h'], difficulty: 'cvc' },
    { word: 'hop', picture: '🦘', letters: ['h', 'o', 'p', 'b', 'm'], difficulty: 'cvc' },
    { word: 'mop', picture: '🧹', letters: ['m', 'o', 'p', 'h', 't'], difficulty: 'cvc' },
    { word: 'top', picture: '🎪', letters: ['t', 'o', 'p', 'h', 's'], difficulty: 'cvc' },

    // Phase 5: CVC words - Short U (Weeks 21-22) + 4-5 letter words
    { word: 'bug', picture: '🐛', letters: ['b', 'u', 'g', 'h', 't'], difficulty: 'cvc' },
    { word: 'dug', picture: '⛏️', letters: ['d', 'u', 'g', 'h', 'b'], difficulty: 'cvc' },
    { word: 'hug', picture: '🤗', letters: ['h', 'u', 'g', 'b', 'p'], difficulty: 'cvc' },
    { word: 'jug', picture: '🫖', letters: ['j', 'u', 'g', 'b', 'r'], difficulty: 'cvc' },
    { word: 'mug', picture: '☕', letters: ['m', 'u', 'g', 'h', 'p'], difficulty: 'cvc' },
    { word: 'rug', picture: '🧶', letters: ['r', 'u', 'g', 't', 'b'], difficulty: 'cvc' },
    { word: 'tug', picture: '🚢', letters: ['t', 'u', 'g', 'r', 'h'], difficulty: 'cvc' },
    { word: 'bus', picture: '🚌', letters: ['b', 'u', 's', 'h', 't'], difficulty: 'cvc' },
    { word: 'cut', picture: '✂️', letters: ['c', 'u', 't', 'b', 'h'], difficulty: 'cvc' },
    { word: 'hut', picture: '🏚️', letters: ['h', 'u', 't', 'b', 'n'], difficulty: 'cvc' },
    { word: 'nut', picture: '🥜', letters: ['n', 'u', 't', 'h', 'p'], difficulty: 'cvc' },
    { word: 'put', picture: '📤', letters: ['p', 'u', 't', 's', 'b'], difficulty: 'cvc' },

    // Transition to 4-letter words
    { word: 'bell', picture: '🔔', letters: ['b', 'e', 'l', 'l', 't'], difficulty: '4-letter' },
    { word: 'hill', picture: '⛰️', letters: ['h', 'i', 'l', 'l', 'b'], difficulty: '4-letter' },
    { word: 'ball', picture: '⚽', letters: ['b', 'a', 'l', 'l', 't'], difficulty: '4-letter' },
    { word: 'call', picture: '📞', letters: ['c', 'a', 'l', 'l', 'f'], difficulty: '4-letter' },
    { word: 'fall', picture: '🍂', letters: ['f', 'a', 'l', 'l', 'b'], difficulty: '4-letter' },
    { word: 'bill', picture: '💵', letters: ['b', 'i', 'l', 'l', 'd'], difficulty: '4-letter' },
    { word: 'fill', picture: '🫗', letters: ['f', 'i', 'l', 'l', 'h'], difficulty: '4-letter' },
    { word: 'pill', picture: '💊', letters: ['p', 'i', 'l', 'l', 'b'], difficulty: '4-letter' },
    { word: 'pull', picture: '🪢', letters: ['p', 'u', 'l', 'l', 'f'], difficulty: '4-letter' },
    { word: 'bull', picture: '🐂', letters: ['b', 'u', 'l', 'l', 't'], difficulty: '4-letter' },

    // 5-letter words
    { word: 'smell', picture: '👃', letters: ['s', 'm', 'e', 'l', 'l'], difficulty: '5-letter' },
    { word: 'spill', picture: '🚰', letters: ['s', 'p', 'i', 'l', 'l'], difficulty: '5-letter' },
    { word: 'small', picture: '👶', letters: ['s', 'm', 'a', 'l', 'l'], difficulty: '5-letter' },
    { word: 'still', picture: '⏸️', letters: ['s', 't', 'i', 'l', 'l'], difficulty: '5-letter' },
    { word: 'stall', picture: '🏪', letters: ['s', 't', 'a', 'l', 'l'], difficulty: '5-letter' },
  ];

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [droppedLetters, setDroppedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

  const currentWord = wordSequence[currentWordIndex];
  const wordLength = currentWord.word.length;
  const isComplete = droppedLetters.length === wordLength && droppedLetters.join('') === currentWord.word;

  // Initialize available letters (shuffle them)
  useEffect(() => {
    const shuffled = [...currentWord.letters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
    setDroppedLetters([]);
    setFeedback('');
    setShowCelebration(false);
  }, [currentWordIndex]);

  // Play audio for word
  const playWordSound = () => {
    const utterance = new SpeechSynthesisUtterance(currentWord.word);
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
  };

  // Play audio for letter sound
  const playLetterSound = (letter: string) => {
    const letterName = letter.toUpperCase();
    const utterance = new SpeechSynthesisUtterance(letterName);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Handle letter drag start
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    letter: string,
    index: number
  ) => {
    setDraggedLetter(letter);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over drop zone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop in box
  const handleDropInBox = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    e.preventDefault();

    if (!draggedLetter || draggedFromIndex === null) return;

    // Check if this position is already filled
    if (droppedLetters[position]) {
      setFeedback('This box is already filled!');
      setTimeout(() => setFeedback(''), 2000);
      return;
    }

    // Check if this is the correct letter for this position
    if (draggedLetter === currentWord.word[position]) {
      const newDropped = [...droppedLetters];
      newDropped[position] = draggedLetter;
      setDroppedLetters(newDropped);

      // Remove from available letters
      const newAvailable = availableLetters.filter((_, i) => i !== draggedFromIndex);
      setAvailableLetters(newAvailable);

      setFeedback('✓ Correct!');

      // Check if word is complete
      if (newDropped.length === wordLength && newDropped.join('') === currentWord.word) {
        setShowCelebration(true);
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
      setTimeout(() => setFeedback(''), 2000);
    }

    setDraggedLetter(null);
    setDraggedFromIndex(null);
  };

  // Remove letter from box
  const removeLetterFromBox = (position: number) => {
    const letter = droppedLetters[position];
    const newDropped = droppedLetters.filter((_, i) => i !== position);
    setDroppedLetters(newDropped);

    // Add back to available letters
    setAvailableLetters([...availableLetters, letter]);
  };

  // Reset current word
  const resetWord = () => {
    setAvailableLetters([...currentWord.letters].sort(() => Math.random() - 0.5));
    setDroppedLetters([]);
    setFeedback('');
    setShowCelebration(false);
  };

  // Navigate
  const goToPrevious = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentWordIndex < wordSequence.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const getDifficultyColor = () => {
    switch (currentWord.difficulty) {
      case 'cvc':
        return 'from-blue-50 to-blue-100';
      case '4-letter':
        return 'from-purple-50 to-purple-100';
      case '5-letter':
        return 'from-pink-50 to-pink-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColor()} p-4 flex flex-col items-center justify-center`}>
      {/* Header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPrevious}
            disabled={currentWordIndex === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Word Progress</p>
            <p className="text-gray-800 font-semibold">
              {currentWordIndex + 1} of {wordSequence.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {currentWord.difficulty === 'cvc' && '3-Letter CVC'}
              {currentWord.difficulty === '4-letter' && '4-Letter Word'}
              {currentWord.difficulty === '5-letter' && '5-Letter Word'}
            </p>
          </div>

          <button
            onClick={goToNext}
            disabled={currentWordIndex === wordSequence.length - 1}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game container */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-8">
        
        {/* Picture at top */}
        <div className="text-center mb-8">
          <div
            className="inline-block text-8xl mb-4 cursor-pointer hover:scale-110 transition-transform"
            onClick={playWordSound}
            title="Click to hear the word"
          >
            {currentWord.picture}
          </div>
          <p className="text-5xl font-bold text-indigo-600 mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            {currentWord.word}
          </p>
          <button
            onClick={playWordSound}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
          >
            <Volume2 size={20} />
            Hear Word
          </button>
          <p className="text-gray-600 text-sm mt-3">Click the picture or button to hear the word</p>
        </div>

        {/* Difficulty indicator */}
        <div className="text-center mb-6">
          <div className="inline-block bg-indigo-100 px-4 py-2 rounded-full">
            <p className="text-indigo-700 font-bold text-sm">
              {currentWord.difficulty === 'cvc' && '🟦 CVC (3 Letters)'}
              {currentWord.difficulty === '4-letter' && '🟪 4-Letter Word'}
              {currentWord.difficulty === '5-letter' && '🟥 5-Letter Word'}
            </p>
          </div>
        </div>

        {/* Available letters to drag */}
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
                title={`Click to hear /⁠${letter}⁠/, drag to drop`}
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
                  w-20 h-24 rounded-xl border-4 border-dashed flex items-center justify-center
                  text-4xl font-bold cursor-drop
                  transition-all duration-200
                  ${
                    droppedLetters[position]
                      ? 'bg-green-200 border-green-500 shadow-lg'
                      : 'bg-gray-100 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                  }
                `}
              >
                {droppedLetters[position] ? (
                  <div
                    className="relative cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => removeLetterFromBox(position)}
                    title="Click to remove this letter"
                  >
                    <span className="text-indigo-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>{droppedLetters[position]}</span>
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity">
                      ✕
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-300 text-5xl">_</span>
                )}
              </div>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`inline-block px-6 py-3 rounded-lg font-semibold text-lg mb-4 ${
              feedback.includes('✓') 
                ? 'bg-green-200 text-green-800' 
                : 'bg-red-200 text-red-800'
            }`}>
              {feedback}
            </div>
          )}
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600">
              {currentWord.picture} {currentWord.word}
            </p>
            <p className="text-gray-600 mt-3">Next word coming...</p>
          </div>
        )}

        {/* Reset button */}
        {!showCelebration && (
          <div className="text-center">
            <button
              onClick={resetWord}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
            >
              <RotateCcw size={20} />
              Reset Word
            </button>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            {droppedLetters.length} of {wordLength} letters placed
          </p>
          {isComplete && (
            <p className="text-green-600 font-bold mt-2">✓ Word complete! Well done! 🌟</p>
          )}
        </div>
      </div>

      {/* Difficulty guide */}
      <div className="w-full max-w-2xl mt-8 bg-white rounded-xl shadow-lg p-6">
        <p className="font-bold text-gray-800 mb-3">📚 Difficulty Levels:</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-blue-600">🟦 CVC</p>
            <p className="text-gray-600">3-letter words</p>
            <p className="text-xs text-gray-500">cat, dog, sit</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-purple-600">🟪 4-Letter</p>
            <p className="text-gray-600">4-letter words</p>
            <p className="text-xs text-gray-500">bell, hill, ball</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-pink-600">🟥 5-Letter</p>
            <p className="text-gray-600">5-letter words</p>
            <p className="text-xs text-gray-500">smell, spill, small</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordBuildingGame;
