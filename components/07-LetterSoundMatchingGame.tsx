// components/LetterSoundMatchingGame.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface Word {
  word: string;
  picture: string; // emoji or description
  sound: string; // first letter sound
}

interface Letter {
  letter: string;
  sound: string;
  words: Word[];
}

const LetterSoundMatchingGame: React.FC = () => {
  // Complete letter progression matching your framework
  const letterSequence: Letter[] = [
    // Phase 1: A-G (Weeks 1-2)
    {
      letter: 'A',
      sound: '/a/',
      words: [
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'bat', picture: '🦇', sound: 'bat' }
      ]
    },
    {
      letter: 'B',
      sound: '/b/',
      words: [
        { word: 'bat', picture: '🦇', sound: 'bat' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'apple', picture: '🍎', sound: 'apple' }
      ]
    },
    {
      letter: 'C',
      sound: '/c/',
      words: [
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'dog', picture: '🐶', sound: 'dog' }
      ]
    },
    {
      letter: 'D',
      sound: '/d/',
      words: [
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'bat', picture: '🦇', sound: 'bat' },
        { word: 'cat', picture: '🐱', sound: 'cat' }
      ]
    },
    {
      letter: 'E',
      sound: '/e/',
      words: [
        { word: 'egg', picture: '🥚', sound: 'egg' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'apple', picture: '🍎', sound: 'apple' }
      ]
    },
    {
      letter: 'F',
      sound: '/f/',
      words: [
        { word: 'fish', picture: '🐠', sound: 'fish' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'cat', picture: '🐱', sound: 'cat' }
      ]
    },
    {
      letter: 'G',
      sound: '/g/',
      words: [
        { word: 'goat', picture: '🐐', sound: 'goat' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'egg', picture: '🥚', sound: 'egg' }
      ]
    },
    // Phase 2: H-N (Weeks 3-4)
    {
      letter: 'H',
      sound: '/h/',
      words: [
        { word: 'hat', picture: '🎩', sound: 'hat' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'dog', picture: '🐶', sound: 'dog' }
      ]
    },
    {
      letter: 'I',
      sound: '/i/',
      words: [
        { word: 'igloo', picture: '🏔️', sound: 'igloo' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'fish', picture: '🐠', sound: 'fish' }
      ]
    },
    {
      letter: 'J',
      sound: '/j/',
      words: [
        { word: 'jar', picture: '🫙', sound: 'jar' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'bat', picture: '🦇', sound: 'bat' }
      ]
    },
    {
      letter: 'K',
      sound: '/k/',
      words: [
        { word: 'kite', picture: '🪁', sound: 'kite' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'cat', picture: '🐱', sound: 'cat' }
      ]
    },
    {
      letter: 'L',
      sound: '/l/',
      words: [
        { word: 'lion', picture: '🦁', sound: 'lion' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'egg', picture: '🥚', sound: 'egg' }
      ]
    },
    {
      letter: 'M',
      sound: '/m/',
      words: [
        { word: 'monkey', picture: '🐵', sound: 'monkey' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'fish', picture: '🐠', sound: 'fish' }
      ]
    },
    {
      letter: 'N',
      sound: '/n/',
      words: [
        { word: 'nest', picture: '🪺', sound: 'nest' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'apple', picture: '🍎', sound: 'apple' }
      ]
    },
    // Phase 3: O-Z (Weeks 5-6)
    {
      letter: 'O',
      sound: '/o/',
      words: [
        { word: 'octopus', picture: '🐙', sound: 'octopus' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'bat', picture: '🦇', sound: 'bat' }
      ]
    },
    {
      letter: 'P',
      sound: '/p/',
      words: [
        { word: 'pig', picture: '🐷', sound: 'pig' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'dog', picture: '🐶', sound: 'dog' }
      ]
    },
    {
      letter: 'Q',
      sound: '/kw/',
      words: [
        { word: 'queen', picture: '👑', sound: 'queen' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'fish', picture: '🐠', sound: 'fish' }
      ]
    },
    {
      letter: 'R',
      sound: '/r/',
      words: [
        { word: 'rabbit', picture: '🐰', sound: 'rabbit' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'egg', picture: '🥚', sound: 'egg' }
      ]
    },
    {
      letter: 'S',
      sound: '/s/',
      words: [
        { word: 'sun', picture: '☀️', sound: 'sun' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'cat', picture: '🐱', sound: 'cat' }
      ]
    },
    {
      letter: 'T',
      sound: '/t/',
      words: [
        { word: 'tiger', picture: '🐯', sound: 'tiger' },
        { word: 'bat', picture: '🦇', sound: 'bat' },
        { word: 'dog', picture: '🐶', sound: 'dog' }
      ]
    },
    {
      letter: 'U',
      sound: '/u/',
      words: [
        { word: 'umbrella', picture: '☂️', sound: 'umbrella' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'fish', picture: '🐠', sound: 'fish' }
      ]
    },
    {
      letter: 'V',
      sound: '/v/',
      words: [
        { word: 'van', picture: '🚐', sound: 'van' },
        { word: 'cat', picture: '🐱', sound: 'cat' },
        { word: 'dog', picture: '🐶', sound: 'dog' }
      ]
    },
    {
      letter: 'W',
      sound: '/w/',
      words: [
        { word: 'whale', picture: '🐋', sound: 'whale' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'bat', picture: '🦇', sound: 'bat' }
      ]
    },
    {
      letter: 'X',
      sound: '/ks/',
      words: [
        { word: 'xylophone', picture: '🎵', sound: 'xylophone' },
        { word: 'dog', picture: '🐶', sound: 'dog' },
        { word: 'egg', picture: '🥚', sound: 'egg' }
      ]
    },
    {
      letter: 'Y',
      sound: '/y/',
      words: [
        { word: 'yo-yo', picture: '📍', sound: 'yo-yo' },
        { word: 'apple', picture: '🍎', sound: 'apple' },
        { word: 'cat', picture: '🐱', sound: 'cat' }
      ]
    },
    {
      letter: 'Z',
      sound: '/z/',
      words: [
        { word: 'zebra', picture: '🦓', sound: 'zebra' },
        { word: 'bat', picture: '🦇', sound: 'bat' },
        { word: 'fish', picture: '🐠', sound: 'fish' }
      ]
    }
  ];

  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);
  const [correctMatch, setCorrectMatch] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWord, setCelebrationWord] = useState<Word | null>(null);
  const dragItemRef = useRef<HTMLDivElement>(null);

  const currentLetter = letterSequence[currentLetterIndex];

  // Shuffle words on component mount and when letter changes
  useEffect(() => {
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    setDraggedLetter(null);
    setCorrectMatch(null);
    setShowCelebration(false);
  }, [currentLetterIndex]);

  // Play audio for letter sound
  const playLetterSound = () => {
    const utterance = new SpeechSynthesisUtterance(currentLetter.sound);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Play audio for word name
  const playWordSound = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedLetter(currentLetter.letter);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over picture
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop on picture
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, word: Word) => {
    e.preventDefault();

    // Check if the first letter of the word matches the letter sound
    if (word.word.toLowerCase().startsWith(currentLetter.letter.toLowerCase())) {
      setCorrectMatch(word.word);
      setCelebrationWord(word);
      setShowCelebration(true);

      // Wait for animation, then move to next letter
      setTimeout(() => {
        if (currentLetterIndex < letterSequence.length - 1) {
          setCurrentLetterIndex(currentLetterIndex + 1);
        } else {
          // Game complete - restart
          setCurrentLetterIndex(0);
        }
      }, 2000);
    } else {
      // Wrong match - shake effect
      setDraggedLetter(null);
    }
  };

  // Navigate to previous letter
  const goToPrevious = () => {
    if (currentLetterIndex > 0) {
      setCurrentLetterIndex(currentLetterIndex - 1);
    }
  };

  // Navigate to next letter
  const goToNext = () => {
    if (currentLetterIndex < letterSequence.length - 1) {
      setCurrentLetterIndex(currentLetterIndex + 1);
    }
  };

  // Reset current letter
  const resetCurrent = () => {
    setDraggedLetter(null);
    setCorrectMatch(null);
    setShowCelebration(false);
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 flex flex-col items-center justify-center">
      {/* Header with controls */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={goToPrevious}
            disabled={currentLetterIndex === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Letter Progress</p>
            <p className="text-gray-800 font-semibold">
              {currentLetterIndex + 1} of {letterSequence.length}
            </p>
          </div>

          <button
            onClick={goToNext}
            disabled={currentLetterIndex === letterSequence.length - 1}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-lg mb-2">Drag the letter to match the picture</p>
        </div>
      </div>

      {/* Main game area */}
      <div className="w-full max-w-4xl">
        {/* Letter display at top */}
        <div className="mb-12 text-center">
          <div
            draggable
            onDragStart={handleDragStart}
            ref={dragItemRef}
            className="inline-block bg-white rounded-2xl shadow-xl p-8 cursor-grab active:cursor-grabbing hover:shadow-2xl transition-shadow"
          >
            <p className="text-8xl font-bold text-indigo-600 mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>{currentLetter.letter.toLowerCase()}</p>
            <button
              onClick={playLetterSound}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
            >
              <Volume2 size={24} />
              Play Sound
            </button>
          </div>
          <p className="text-gray-600 mt-4 text-sm">📌 Drag this letter down to the matching picture</p>
        </div>

        {/* Pictures for matching */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          {shuffledWords.map((word, index) => {
            const isCorrect = correctMatch === word.word;

            return (
              <div
                key={index}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, word)}
                className={`
                  bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer
                  transition-all duration-300 hover:shadow-xl
                  ${isCorrect ? 'ring-4 ring-green-500' : 'hover:scale-105'}
                  ${isCorrect ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                `}
                style={
                  isCorrect
                    ? {
                        animation: 'spin-and-disappear 1.5s ease-in-out forwards'
                      }
                    : {}
                }
              >
                <div
                  className="text-8xl mb-4 inline-block"
                  onClick={() => playWordSound(word.word)}
                >
                  {word.picture}
                </div>
                <p className="text-gray-600 font-semibold text-lg mb-3 capitalize">{word.word}</p>
                <button
                  onClick={() => playWordSound(word.word)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto transition"
                >
                  <Volume2 size={18} />
                  Say Name
                </button>
              </div>
            );
          })}
        </div>

        {/* Celebration message */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600">
              {celebrationWord?.picture} {celebrationWord?.word.toUpperCase()} starts with {currentLetter.letter.toLowerCase()}!
            </p>
          </div>
        )}

        {/* Reset button */}
        <div className="text-center">
          <button
            onClick={resetCurrent}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
          >
            <RotateCcw size={20} />
            Reset This Letter
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin-and-disappear {
          0% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(1.1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(360deg);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }

        .shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
};

export default LetterSoundMatchingGame;
