// components/12-BigToSmallLetterMatchingGame.tsx
// Big to Small Letter Matching - Enhanced with hints, score, and consistent design

'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration } from '@/lib/games/design-system';

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
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

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
    setWrongAttempt(null);
    setTries(0);
  };

  const playLetterSound = async (letter: LetterPair) => {
    const { GameAudio } = await import('@/lib/games/audio-paths');
    GameAudio.playLetterNow(letter.smallLetter.toLowerCase());
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, letter: LetterPair) => {
    setDraggedLetter(letter);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnBigLetter = async (e: React.DragEvent<HTMLDivElement>, bigLetter: LetterPair) => {
    e.preventDefault();
    if (!draggedLetter) return;
    await handleMatch(draggedLetter, bigLetter);
    setDraggedLetter(null);
  };

  // Click to select then click to match
  const [selectedSmall, setSelectedSmall] = useState<LetterPair | null>(null);

  const handleSmallLetterClick = (letter: LetterPair) => {
    const pairKey = `${letter.smallLetter}-${letter.bigLetter}`;
    if (matchedPairs.has(pairKey)) return;
    
    playLetterSound(letter);
    setSelectedSmall(letter);
  };

  const handleBigLetterClick = async (bigLetter: LetterPair) => {
    if (!selectedSmall) {
      playLetterSound(bigLetter);
      return;
    }
    await handleMatch(selectedSmall, bigLetter);
    setSelectedSmall(null);
  };

  const handleMatch = async (small: LetterPair, big: LetterPair) => {
    const { GameAudio } = await import('@/lib/games/audio-paths');

    if (small.bigLetter === big.bigLetter) {
      // CORRECT MATCH
      const pairKey = `${small.smallLetter}-${big.bigLetter}`;
      const newMatched = new Set(matchedPairs);
      newMatched.add(pairKey);
      setMatchedPairs(newMatched);

      await GameAudio.playCorrect();
      playLetterSound(small);

      if (newMatched.size === 5) {
        setScore(prev => prev + 1);
        setCelebration(getRandomCelebration('correct'));
        setShowCelebration(true);
        await GameAudio.playCelebration();

        setTimeout(() => {
          if (currentSetIndex < 5) {
            setCurrentSetIndex(currentSetIndex + 1);
          } else {
            setShowAlphabetComplete(true);
          }
        }, 2500);
      }
    } else {
      // WRONG MATCH
      setTries(prev => prev + 1);
      setWrongAttempt(big.bigLetter);
      await GameAudio.playWrong();
      setTimeout(() => setWrongAttempt(null), 800);
    }
  };

  const goToPrevious = () => {
    if (currentSetIndex > 0) setCurrentSetIndex(currentSetIndex - 1);
  };

  const goToNext = () => {
    if (currentSetIndex < 5) setCurrentSetIndex(currentSetIndex + 1);
  };

  const resetSet = () => {
    generateNewSet();
    setSelectedSmall(null);
  };

  // Get unmatched letters for hint
  const getUnmatchedPairs = () => {
    return smallLetters.filter(l => !matchedPairs.has(`${l.smallLetter}-${l.bigLetter}`));
  };

  // Alphabet complete screen
  if (showAlphabetComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 flex flex-col items-center justify-center p-4"
        style={{ fontFamily: GAME_FONTS.display }}>
        <style>{GAME_ANIMATIONS}</style>
        
        <div className="bg-white rounded-3xl p-8 max-w-lg text-center shadow-2xl animate-pop">
          <div className="text-8xl mb-4">🏆</div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Alphabet Master!</h1>
          <p className="text-xl text-gray-600 mb-4">You matched all 26 letters!</p>
          
          <div className="text-3xl mb-4 leading-relaxed">
            A B C D E F G H I J K L M<br/>
            N O P Q R S T U V W X Y Z
          </div>
          
          <div className="flex justify-center gap-4 mb-6">
            {[1, 2, 3].map((star) => (
              <span key={star} className="text-5xl animate-pulse">⭐</span>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={() => { setCurrentSetIndex(0); setShowAlphabetComplete(false); setScore(0); }}
              className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-xl transition-colors shadow-lg">
              🔄 Play Again
            </button>
            <Link href="/games" 
              className="block w-full py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-2xl font-bold text-xl transition-colors">
              ← All Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 p-4"
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>

      <div className="max-w-6xl mx-auto">
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
            <button onClick={goToPrevious} disabled={currentSetIndex === 0}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-white font-bold text-center">
              <div>Set {currentSetIndex + 1} of 6</div>
              <div className="text-xs opacity-80">{matchedPairs.size}/5 matched</div>
            </div>
            <button onClick={goToNext} disabled={currentSetIndex === 5}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentSetIndex * 5 + matchedPairs.size) / 30) * 100}%` }} />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Match Small to Big!</h2>
            <p className="text-gray-500">Tap a small letter, then tap its matching big letter</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Small Letters */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl">
              <p className="text-center font-bold text-blue-700 mb-4">Small Letters</p>
              <div className="space-y-3">
                {smallLetters.map((letter, idx) => {
                  const isMatched = matchedPairs.has(`${letter.smallLetter}-${letter.bigLetter}`);
                  const isSelected = selectedSmall?.smallLetter === letter.smallLetter;
                  return (
                    <div key={idx}
                      draggable={!isMatched}
                      onDragStart={(e) => handleDragStart(e, letter)}
                      onClick={() => handleSmallLetterClick(letter)}
                      className={`
                        p-4 rounded-xl text-center text-5xl font-bold transition-all cursor-pointer
                        ${isMatched ? 'bg-green-500 text-white opacity-60' : 
                          isSelected ? 'bg-indigo-600 text-white ring-4 ring-yellow-400 scale-105' :
                          'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105 active:scale-95'}
                      `}>
                      {letter.smallLetter}
                      {isMatched && ' ✓'}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Big Letters */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-4 rounded-2xl">
              <p className="text-center font-bold text-orange-700 mb-4">Big Letters</p>
              <div className="space-y-3">
                {bigLetters.map((letter, idx) => {
                  const matchingSmall = smallLetters.find(l => l.bigLetter === letter.bigLetter);
                  const isMatched = matchingSmall && matchedPairs.has(`${matchingSmall.smallLetter}-${letter.bigLetter}`);
                  const isWrong = wrongAttempt === letter.bigLetter;
                  return (
                    <div key={idx}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropOnBigLetter(e, letter)}
                      onClick={() => handleBigLetterClick(letter)}
                      className={`
                        p-4 rounded-xl text-center text-5xl font-bold transition-all cursor-pointer
                        ${isMatched ? 'bg-green-500 text-white opacity-60' : 
                          isWrong ? 'bg-red-500 text-white animate-shake' :
                          'bg-orange-500 hover:bg-orange-600 text-white border-4 border-dashed border-orange-600 hover:scale-105 active:scale-95'}
                      `}>
                      {letter.bigLetter}
                      {isMatched && ' ✓'}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Selection indicator */}
          {selectedSmall && !showCelebration && (
            <div className="bg-indigo-100 border-2 border-indigo-400 rounded-xl p-3 mb-4 text-center">
              <p className="text-indigo-800 font-bold">
                Now tap the big letter that matches: <span className="text-3xl">{selectedSmall.smallLetter}</span>
              </p>
            </div>
          )}

          {/* Hint after 2 wrong tries */}
          {tries >= 2 && !showCelebration && getUnmatchedPairs().length > 0 && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4 text-center animate-float">
              <p className="text-yellow-800 font-bold">
                💡 Hint: <span className="text-2xl">{getUnmatchedPairs()[0].smallLetter}</span> matches with <span className="text-2xl">{getUnmatchedPairs()[0].bigLetter}</span>
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
                <p className="text-xl text-gray-600">All 5 pairs matched!</p>
                <p className="text-gray-500 mt-2">Moving to next set...</p>
              </div>
            </div>
          )}

          {/* Reset */}
          {!showCelebration && (
            <div className="text-center">
              <button onClick={resetSet} 
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

export default BigToSmallLetterMatchingGame;
