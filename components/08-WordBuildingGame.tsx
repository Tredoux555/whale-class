// components/08-WordBuildingGame.tsx
// Word Building Game - Enhanced with hints, score, and consistent design

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration } from '@/lib/games/design-system';

interface GameWord {
  word: string;
  picture: string;
  letters: string[];
  difficulty: 'cvc' | '4-letter' | '5-letter';
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
    // Short E
    { word: 'bed', picture: '🛏️', letters: ['b', 'e', 'd', 'r', 'c'], difficulty: 'cvc' },
    { word: 'red', picture: '🔴', letters: ['r', 'e', 'd', 'b', 'h'], difficulty: 'cvc' },
    { word: 'net', picture: '🥅', letters: ['n', 'e', 't', 'g', 'w'], difficulty: 'cvc' },
    { word: 'pet', picture: '🐕', letters: ['p', 'e', 't', 'm', 's'], difficulty: 'cvc' },
    { word: 'hen', picture: '🐔', letters: ['h', 'e', 'n', 'p', 'd'], difficulty: 'cvc' },
    { word: 'pen', picture: '✏️', letters: ['p', 'e', 'n', 't', 'm'], difficulty: 'cvc' },
    { word: 'ten', picture: '🔟', letters: ['t', 'e', 'n', 's', 'b'], difficulty: 'cvc' },
    // Short I
    { word: 'big', picture: '🦣', letters: ['b', 'i', 'g', 'p', 'd'], difficulty: 'cvc' },
    { word: 'dig', picture: '⛏️', letters: ['d', 'i', 'g', 'f', 'r'], difficulty: 'cvc' },
    { word: 'pig', picture: '🐷', letters: ['p', 'i', 'g', 'b', 'w'], difficulty: 'cvc' },
    { word: 'bin', picture: '🗑️', letters: ['b', 'i', 'n', 'p', 't'], difficulty: 'cvc' },
    { word: 'pin', picture: '📌', letters: ['p', 'i', 'n', 'w', 's'], difficulty: 'cvc' },
    { word: 'sit', picture: '🪑', letters: ['s', 'i', 't', 'w', 'h'], difficulty: 'cvc' },
    { word: 'hit', picture: '⚾', letters: ['h', 'i', 't', 'b', 'w'], difficulty: 'cvc' },
    // Short O
    { word: 'box', picture: '📦', letters: ['b', 'o', 'x', 'f', 'h'], difficulty: 'cvc' },
    { word: 'fox', picture: '🦊', letters: ['f', 'o', 'x', 'b', 'c'], difficulty: 'cvc' },
    { word: 'hot', picture: '🔥', letters: ['h', 'o', 't', 'p', 'd'], difficulty: 'cvc' },
    { word: 'pot', picture: '🍲', letters: ['p', 'o', 't', 'h', 's'], difficulty: 'cvc' },
    { word: 'dog', picture: '🐶', letters: ['d', 'o', 'g', 'h', 'f'], difficulty: 'cvc' },
    { word: 'log', picture: '🪵', letters: ['l', 'o', 'g', 'c', 'b'], difficulty: 'cvc' },
    { word: 'hop', picture: '🦘', letters: ['h', 'o', 'p', 'b', 'm'], difficulty: 'cvc' },
    { word: 'mop', picture: '🧹', letters: ['m', 'o', 'p', 'h', 't'], difficulty: 'cvc' },
    { word: 'top', picture: '🎪', letters: ['t', 'o', 'p', 'h', 's'], difficulty: 'cvc' },
    // Short U
    { word: 'bug', picture: '🐛', letters: ['b', 'u', 'g', 'h', 't'], difficulty: 'cvc' },
    { word: 'hug', picture: '🤗', letters: ['h', 'u', 'g', 'b', 'p'], difficulty: 'cvc' },
    { word: 'mug', picture: '☕', letters: ['m', 'u', 'g', 'h', 'p'], difficulty: 'cvc' },
    { word: 'rug', picture: '🧶', letters: ['r', 'u', 'g', 't', 'b'], difficulty: 'cvc' },
    { word: 'bus', picture: '🚌', letters: ['b', 'u', 's', 'h', 't'], difficulty: 'cvc' },
    { word: 'cut', picture: '✂️', letters: ['c', 'u', 't', 'b', 'h'], difficulty: 'cvc' },
    { word: 'nut', picture: '🥜', letters: ['n', 'u', 't', 'h', 'p'], difficulty: 'cvc' },
    { word: 'sun', picture: '☀️', letters: ['s', 'u', 'n', 'r', 'b'], difficulty: 'cvc' },
    { word: 'cup', picture: '🥤', letters: ['c', 'u', 'p', 's', 'b'], difficulty: 'cvc' },
    // 4-letter words
    { word: 'bell', picture: '🔔', letters: ['b', 'e', 'l', 'l', 't', 's'], difficulty: '4-letter' },
    { word: 'hill', picture: '⛰️', letters: ['h', 'i', 'l', 'l', 'b', 'f'], difficulty: '4-letter' },
    { word: 'ball', picture: '⚽', letters: ['b', 'a', 'l', 'l', 't', 'c'], difficulty: '4-letter' },
    { word: 'call', picture: '📞', letters: ['c', 'a', 'l', 'l', 'f', 'b'], difficulty: '4-letter' },
    { word: 'fall', picture: '🍂', letters: ['f', 'a', 'l', 'l', 'b', 'c'], difficulty: '4-letter' },
    { word: 'fill', picture: '🫗', letters: ['f', 'i', 'l', 'l', 'h', 'b'], difficulty: '4-letter' },
    { word: 'pill', picture: '💊', letters: ['p', 'i', 'l', 'l', 'b', 's'], difficulty: '4-letter' },
    { word: 'pull', picture: '🪢', letters: ['p', 'u', 'l', 'l', 'f', 'b'], difficulty: '4-letter' },
    // 5-letter words
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
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

  const currentWord = wordSequence[currentWordIndex];
  const wordLength = currentWord.word.length;

  useEffect(() => {
    const shuffled = [...currentWord.letters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
    setDroppedLetters(new Array(wordLength).fill(null));
    setFeedback('');
    setShowCelebration(false);
    setTries(0);
  }, [currentWordIndex, wordLength]);

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
    await handleLetterPlacement(draggedLetter, draggedFromIndex, position);
    setDraggedLetter(null);
    setDraggedFromIndex(null);
  };

  // Click to place next letter (mobile-friendly)
  const handleLetterClick = async (letter: string, index: number) => {
    const nextEmptyPosition = droppedLetters.findIndex(l => l === null);
    if (nextEmptyPosition === -1) return;
    await handleLetterPlacement(letter, index, nextEmptyPosition);
  };

  const handleLetterPlacement = async (letter: string, fromIndex: number, position: number) => {
    if (droppedLetters[position] !== null) {
      setFeedback('This box is already filled!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
      return;
    }

    if (letter === currentWord.word[position]) {
      // CORRECT
      const newDropped = [...droppedLetters];
      newDropped[position] = letter;
      setDroppedLetters(newDropped);

      const newAvailable = availableLetters.filter((_, i) => i !== fromIndex);
      setAvailableLetters(newAvailable);

      setFeedback('✓ Correct!');
      await GameAudio.playCorrect();
      await playLetterSound(letter);

      // Check if complete
      const filledCount = newDropped.filter(l => l !== null).length;
      if (filledCount === wordLength && newDropped.slice(0, wordLength).join('') === currentWord.word) {
        setScore(prev => prev + 1);
        setShowCelebration(true);
        setCelebration(getRandomCelebration('correct'));
        await GameAudio.playCelebration();
        
        setTimeout(() => playWordSound(), 500);

        setTimeout(() => {
          if (currentWordIndex < wordSequence.length - 1) {
            setCurrentWordIndex(currentWordIndex + 1);
          } else {
            setCurrentWordIndex(0);
            setScore(0);
          }
        }, 2500);
      }
    } else {
      // WRONG
      setTries(prev => prev + 1);
      setFeedback('❌ Not quite! Try again.');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const removeLetterFromBox = (position: number) => {
    const letter = droppedLetters[position];
    if (!letter) return;
    
    const newDropped = [...droppedLetters];
    newDropped[position] = null;
    setDroppedLetters(newDropped);
    setAvailableLetters([...availableLetters, letter].sort(() => Math.random() - 0.5));
  };

  const resetWord = () => {
    const shuffled = [...currentWord.letters].sort(() => Math.random() - 0.5);
    setAvailableLetters(shuffled);
    setDroppedLetters(new Array(wordLength).fill(null));
    setFeedback('');
    setShowCelebration(false);
    setTries(0);
  };

  const goToPrevious = () => {
    if (currentWordIndex > 0) setCurrentWordIndex(currentWordIndex - 1);
  };

  const goToNext = () => {
    if (currentWordIndex < wordSequence.length - 1) setCurrentWordIndex(currentWordIndex + 1);
  };

  // Get next needed letter for hint
  const getNextNeededLetter = () => {
    const nextEmpty = droppedLetters.findIndex(l => l === null);
    if (nextEmpty === -1) return null;
    return currentWord.word[nextEmpty];
  };

  const getDifficultyColors = () => {
    switch (currentWord.difficulty) {
      case 'cvc': return 'from-green-400 via-emerald-400 to-teal-400';
      case '4-letter': return 'from-blue-400 via-indigo-400 to-purple-400';
      case '5-letter': return 'from-purple-400 via-pink-400 to-rose-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColors()} p-4`}
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" 
            className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-colors">
            ← Back
          </Link>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            ⭐ {score}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/20 rounded-2xl p-3 mb-6">
          <div className="flex justify-between items-center mb-2">
            <button onClick={goToPrevious} disabled={currentWordIndex === 0}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-white font-bold text-center">
              <div>Word {currentWordIndex + 1} of {wordSequence.length}</div>
              <div className="text-xs opacity-80">
                {currentWord.difficulty === 'cvc' ? '🌱 CVC' : 
                 currentWord.difficulty === '4-letter' ? '🌿 4-Letter' : '🌳 5-Letter'}
              </div>
            </div>
            <button onClick={goToNext} disabled={currentWordIndex === wordSequence.length - 1}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentWordIndex + 1) / wordSequence.length) * 100}%` }} />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          {/* Picture & Word */}
          <div className="text-center mb-6">
            <div className="text-8xl mb-3 cursor-pointer hover:scale-110 transition-transform" onClick={playWordSound}>
              {currentWord.picture}
            </div>
            <p className="text-4xl font-bold text-indigo-600 mb-3">{currentWord.word}</p>
            <button onClick={playWordSound} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 mx-auto transition-colors shadow-lg">
              <Volume2 size={20} /> Hear Word
            </button>
          </div>

          {/* Available Letters */}
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
            <p className="text-center text-gray-700 font-bold mb-3">Tap letters to spell the word:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {availableLetters.map((letter, index) => (
                <div key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, letter, index)}
                  onClick={() => handleLetterClick(letter, index)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-2xl cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all min-w-[50px] text-center">
                  {letter.toLowerCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Drop Zones */}
          <div className="mb-6 text-center">
            <div className="flex gap-3 justify-center mb-4">
              {Array.from({ length: wordLength }).map((_, position) => (
                <div key={position}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropInBox(e, position)}
                  className={`
                    w-16 h-20 rounded-xl border-4 border-dashed flex items-center justify-center text-3xl font-bold cursor-pointer transition-all
                    ${droppedLetters[position] ? 'bg-green-100 border-green-500 shadow-lg' : 'bg-gray-100 border-gray-300 hover:border-indigo-500'}
                  `}>
                  {droppedLetters[position] ? (
                    <div className="relative" onClick={() => removeLetterFromBox(position)}>
                      <span className="text-indigo-600">{droppedLetters[position]}</span>
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</div>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-4xl">_</span>
                  )}
                </div>
              ))}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`inline-block px-6 py-2 rounded-lg font-bold ${
                feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
              }`}>
                {feedback}
              </div>
            )}
          </div>

          {/* Hint after 2 tries */}
          {tries >= 2 && !showCelebration && getNextNeededLetter() && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4 text-center animate-float">
              <p className="text-yellow-800 font-bold">
                💡 Hint: The next letter is <span className="text-2xl">{getNextNeededLetter()?.toUpperCase()}</span>
              </p>
            </div>
          )}

          {tries >= 1 && tries < 2 && !showCelebration && (
            <p className="text-orange-500 text-center text-sm mb-4 animate-pulse">
              💡 One more try for a hint!
            </p>
          )}

          {/* Celebration Overlay */}
          {showCelebration && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-pop max-w-md mx-4">
                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                <p className="text-3xl font-bold text-green-600 mb-2">{celebration}</p>
                <p className="text-5xl mb-2">{currentWord.picture}</p>
                <p className="text-2xl font-bold text-indigo-600">{currentWord.word.toUpperCase()}</p>
              </div>
            </div>
          )}

          {/* Reset */}
          {!showCelebration && (
            <div className="text-center">
              <button onClick={resetWord} 
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto transition-colors shadow-lg">
                <RotateCcw size={20} /> Reset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordBuildingGame;
