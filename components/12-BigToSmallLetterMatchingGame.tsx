// components/BigToSmallLetterMatchingGame.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface LetterPair {
  smallLetter: string;
  bigLetter: string;
  name: string;
}

const BigToSmallLetterMatchingGame: React.FC = () => {
  const letterSequence: LetterPair[] = [
    { smallLetter: 'a', bigLetter: 'A', name: 'Letter A' },
    { smallLetter: 'b', bigLetter: 'B', name: 'Letter B' },
    { smallLetter: 'c', bigLetter: 'C', name: 'Letter C' },
    { smallLetter: 'd', bigLetter: 'D', name: 'Letter D' },
    { smallLetter: 'e', bigLetter: 'E', name: 'Letter E' },
    { smallLetter: 'f', bigLetter: 'F', name: 'Letter F' },
    { smallLetter: 'g', bigLetter: 'G', name: 'Letter G' },
    { smallLetter: 'h', bigLetter: 'H', name: 'Letter H' },
    { smallLetter: 'i', bigLetter: 'I', name: 'Letter I' },
    { smallLetter: 'j', bigLetter: 'J', name: 'Letter J' },
    { smallLetter: 'k', bigLetter: 'K', name: 'Letter K' },
    { smallLetter: 'l', bigLetter: 'L', name: 'Letter L' },
    { smallLetter: 'm', bigLetter: 'M', name: 'Letter M' },
    { smallLetter: 'n', bigLetter: 'N', name: 'Letter N' },
    { smallLetter: 'o', bigLetter: 'O', name: 'Letter O' },
    { smallLetter: 'p', bigLetter: 'P', name: 'Letter P' },
    { smallLetter: 'q', bigLetter: 'Q', name: 'Letter Q' },
    { smallLetter: 'r', bigLetter: 'R', name: 'Letter R' },
    { smallLetter: 's', bigLetter: 'S', name: 'Letter S' },
    { smallLetter: 't', bigLetter: 'T', name: 'Letter T' },
    { smallLetter: 'u', bigLetter: 'U', name: 'Letter U' },
    { smallLetter: 'v', bigLetter: 'V', name: 'Letter V' },
    { smallLetter: 'w', bigLetter: 'W', name: 'Letter W' },
    { smallLetter: 'x', bigLetter: 'X', name: 'Letter X' },
    { smallLetter: 'y', bigLetter: 'Y', name: 'Letter Y' },
    { smallLetter: 'z', bigLetter: 'Z', name: 'Letter Z' },
  ];

  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [smallLetters, setSmallLetters] = useState<LetterPair[]>([]);
  const [bigLetters, setBigLetters] = useState<LetterPair[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set<string>());
  const [draggedLetter, setDraggedLetter] = useState<LetterPair | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAlphabetComplete, setShowAlphabetComplete] = useState(false);
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    generateNewSet();
  }, [currentSetIndex]);

  const generateNewSet = () => {
    const shuffled = [...letterSequence].sort(() => Math.random() - 0.5);
    const selectedLetters = shuffled.slice(0, 5);
    const smallShuffled = [...selectedLetters].sort(() => Math.random() - 0.5);
    const bigShuffled = [...selectedLetters].sort(() => Math.random() - 0.5);

    setSmallLetters(smallShuffled);
    setBigLetters(bigShuffled);
    setMatchedPairs(new Set());
    setDraggedLetter(null);
    setShowCelebration(false);
    setStars([]);
  };

  const playLetterSound = (letter: LetterPair) => {
    const utterance = new SpeechSynthesisUtterance(letter.name);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, letter: LetterPair) => {
    setDraggedLetter(letter);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBigLetter = (e: React.DragEvent<HTMLDivElement>, bigLetter: LetterPair) => {
    e.preventDefault();

    if (!draggedLetter) return;

    if (draggedLetter.bigLetter === bigLetter.bigLetter) {
      const pairKey = `${draggedLetter.smallLetter}-${bigLetter.bigLetter}`;
      const newMatched = new Set(matchedPairs);
      newMatched.add(pairKey);
      setMatchedPairs(newMatched);

      playLetterSound(draggedLetter);
      
      const burstStars = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.cos((i / 12) * Math.PI * 2) * 150,
        y: Math.sin((i / 12) * Math.PI * 2) * 150,
      }));
      setStars(burstStars);

      if (newMatched.size === 5) {
        setShowCelebration(true);
        setTimeout(() => setStars([]), 600);

        setTimeout(() => {
          if (currentSetIndex < 5) {
            setCurrentSetIndex(currentSetIndex + 1);
          } else {
            setShowAlphabetComplete(true);
          }
        }, 2500);
      } else {
        setTimeout(() => setStars([]), 600);
      }

      setDraggedLetter(null);
    }
  };

  const goToPrevious = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(currentSetIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentSetIndex < 5) {
      setCurrentSetIndex(currentSetIndex + 1);
    }
  };

  const resetSet = () => {
    generateNewSet();
  };

  const alphabetStars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 600,
    delay: Math.random() * 0.3,
  }));

  if (showAlphabetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          {alphabetStars.map((star) => (
            <div
              key={star.id}
              className="absolute text-6xl animate-bounce"
              style={{
                left: `calc(50% + ${star.x}px)`,
                top: `calc(50% + ${star.y}px)`,
                animation: `bounce 0.6s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${star.delay}s`,
                opacity: Math.random() * 0.8 + 0.2,
              }}
            >
              ⭐
            </div>
          ))}
        </div>

        <div className="relative z-10 text-center">
          <div className="mb-8 animate-pulse">
            <p className="text-9xl mb-4">🎉</p>
          </div>
          
          <h1 className="text-7xl font-bold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            Congratulations!
          </h1>
          
          <p className="text-5xl text-yellow-200 mb-8" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            You Completed the Alphabet!
          </p>

          <div className="text-6xl mb-8 animate-spin" style={{ animationDuration: '3s' }}>
            🌟 ✨ 🌟
          </div>

          <p className="text-4xl text-white mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            All 26 Letters Mastered!
          </p>

          <div className="text-5xl mb-8">
            A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
          </div>

          <div className="text-5xl mb-8">
            a b c d e f g h i j k l m n o p q r s t u v w x y z
          </div>

          <p className="text-3xl text-white font-bold mb-8" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            You are a READING SUPERSTAR! ⭐⭐⭐
          </p>

          <button
            onClick={() => window.location.href = '/'}
            className="bg-yellow-400 hover:bg-yellow-500 text-purple-700 font-bold py-4 px-8 rounded-2xl text-2xl transition-all hover:scale-110"
            style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
          >
            Play Again or Go Home 🏠
          </button>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateY(-50px) scale(1.2);
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPrevious}
            disabled={currentSetIndex === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Challenge Progress</p>
            <p className="text-gray-800 font-semibold">
              Set {currentSetIndex + 1} of 6
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Match 5 pairs: {matchedPairs.size} of 5 matched
            </p>
          </div>

          <button
            onClick={goToNext}
            disabled={currentSetIndex === 5}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <p className="text-gray-700 font-semibold mb-4 text-2xl" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            Match All 5 Pairs!
          </p>
          <p className="text-gray-500 text-sm">Click letters to hear the name, then drag small letters to big letters</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border-4 border-blue-300">
            <p className="text-center font-bold text-blue-700 mb-6" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              Small Letters (Drag from here)
            </p>
            <div className="space-y-6">
              {smallLetters.map((letter, idx) => {
                const isMatched = matchedPairs.has(`${letter.smallLetter}-${letter.bigLetter}`);
                return (
                  <div
                    key={idx}
                    draggable={!isMatched}
                    onDragStart={(e) => handleDragStart(e, letter)}
                    onClick={() => playLetterSound(letter)}
                    className={`p-6 rounded-xl text-center text-6xl font-bold transition-all cursor-grab active:cursor-grabbing ${
                      isMatched
                        ? 'bg-green-500 text-white opacity-50 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg hover:scale-105'
                    }`}
                    style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
                  >
                    {letter.smallLetter}
                    {isMatched && ' ✓'}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-2xl border-4 border-yellow-300">
            <p className="text-center font-bold text-yellow-700 mb-6" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              Big Letters (Drag to here)
            </p>
            <div className="space-y-6">
              {bigLetters.map((letter, idx) => {
                const isMatched = matchedPairs.has(`${smallLetters.find(l => l.bigLetter === letter.bigLetter)?.smallLetter}-${letter.bigLetter}`);
                return (
                  <div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropOnBigLetter(e, letter)}
                    onClick={() => playLetterSound(letter)}
                    className={`p-6 rounded-xl text-center text-6xl font-bold transition-all ${
                      isMatched
                        ? 'bg-green-500 text-white opacity-50 border-4 border-green-600'
                        : 'bg-yellow-500 text-white border-4 border-dashed border-yellow-600'
                    }`}
                    style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
                  >
                    {letter.bigLetter}
                    {isMatched && ' ✓'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-center mb-8 p-6 bg-blue-50 rounded-xl border-2 border-blue-200">
          <p className="text-gray-700 font-bold text-lg" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            💡 Find and drag each small letter to match its big letter! ({matchedPairs.size}/5 matched)
          </p>
        </div>

        {stars.length > 0 && (
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
            {stars.map((star) => (
              <div
                key={star.id}
                className="absolute text-5xl animate-ping"
                style={{
                  left: `calc(50% + ${star.x}px)`,
                  top: `calc(50% + ${star.y}px)`,
                  animation: `ping 0.6s cubic-bezier(0, 0, 0.2, 1)`,
                }}
              >
                ⭐
              </div>
            ))}
          </div>
        )}

        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              All Matched!
            </p>
            <p className="text-2xl text-purple-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              Excellent! You matched all 5 pairs! ✨
            </p>
            <p className="text-lg mt-4 text-gray-600">Moving to next set...</p>
          </div>
        )}

        {!showCelebration && (
          <div className="text-center">
            <button
              onClick={resetSet}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
            >
              <RotateCcw size={20} />
              Reset Set
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl mt-8 bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
        <p className="font-bold text-gray-800 mb-3" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
          📢 How to Play:
        </p>
        <ol className="text-sm text-gray-700 space-y-2" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
          <li>1️⃣ You see 5 small letters on the LEFT and 5 big letters on the RIGHT</li>
          <li>2️⃣ Click any letter to hear its name</li>
          <li>3️⃣ Drag a small letter to match it with the same big letter</li>
          <li>4️⃣ When they match, both turn GREEN with a checkmark ✓</li>
          <li>5️⃣ Match all 5 pairs to see the stars! 🌟 Congratulations!</li>
          <li>6️⃣ Complete 6 sets to master all 26 letters!</li>
        </ol>
      </div>

      <div className="w-full max-w-6xl mt-8 bg-yellow-50 rounded-xl shadow-lg p-6 border-2 border-yellow-300">
        <p className="font-bold text-yellow-800 mb-2" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
          💪 Tips for Success:
        </p>
        <ul className="text-sm text-yellow-900 space-y-1" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
          <li>• Listen to the letter name by clicking it multiple times</li>
          <li>• Small letters (a, b, c) are on the LEFT</li>
          <li>• Big letters (A, B, C) are on the RIGHT</li>
          <li>• Each set has 5 different randomized letters to match</li>
          <li>• Once matched, letters turn green and stop accepting drags</li>
          <li>• Complete all 6 sets to learn all 26 letters!</li>
        </ul>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default BigToSmallLetterMatchingGame;
