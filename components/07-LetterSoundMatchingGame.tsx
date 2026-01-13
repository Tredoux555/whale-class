// components/07-LetterSoundMatchingGame.tsx
// Letter Sound Matching Game - Enhanced with hints, stars, and consistent design

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration } from '@/lib/games/design-system';
import { WordImageSimple } from '@/components/sound-games/WordImage';

interface Word {
  word: string;
  sound: string;
}

interface Letter {
  letter: string;
  sound: string;
  words: Word[];
}

const LetterSoundMatchingGame: React.FC = () => {
  const letterSequence: Letter[] = [
    { letter: 'A', sound: '/a/', words: [{ word: 'apple', sound: 'apple' }, { word: 'dog', sound: 'dog' }, { word: 'bat', sound: 'bat' }] },
    { letter: 'B', sound: '/b/', words: [{ word: 'bat', sound: 'bat' }, { word: 'cat', sound: 'cat' }, { word: 'apple', sound: 'apple' }] },
    { letter: 'C', sound: '/c/', words: [{ word: 'cat', sound: 'cat' }, { word: 'apple', sound: 'apple' }, { word: 'dog', sound: 'dog' }] },
    { letter: 'D', sound: '/d/', words: [{ word: 'dog', sound: 'dog' }, { word: 'bat', sound: 'bat' }, { word: 'cat', sound: 'cat' }] },
    { letter: 'E', sound: '/e/', words: [{ word: 'egg', sound: 'egg' }, { word: 'dog', sound: 'dog' }, { word: 'apple', sound: 'apple' }] },
    { letter: 'F', sound: '/f/', words: [{ word: 'fish', sound: 'fish' }, { word: 'apple', sound: 'apple' }, { word: 'cat', sound: 'cat' }] },
    { letter: 'G', sound: '/g/', words: [{ word: 'goat', sound: 'goat' }, { word: 'cat', sound: 'cat' }, { word: 'egg', sound: 'egg' }] },
    { letter: 'H', sound: '/h/', words: [{ word: 'hat', sound: 'hat' }, { word: 'apple', sound: 'apple' }, { word: 'dog', sound: 'dog' }] },
    { letter: 'I', sound: '/i/', words: [{ word: 'insect', sound: 'insect' }, { word: 'cat', sound: 'cat' }, { word: 'fish', sound: 'fish' }] },
    { letter: 'J', sound: '/j/', words: [{ word: 'jam', sound: 'jam' }, { word: 'apple', sound: 'apple' }, { word: 'bat', sound: 'bat' }] },
    { letter: 'K', sound: '/k/', words: [{ word: 'cat', sound: 'cat' }, { word: 'dog', sound: 'dog' }, { word: 'apple', sound: 'apple' }] },
    { letter: 'L', sound: '/l/', words: [{ word: 'leg', sound: 'leg' }, { word: 'apple', sound: 'apple' }, { word: 'egg', sound: 'egg' }] },
    { letter: 'M', sound: '/m/', words: [{ word: 'mop', sound: 'mop' }, { word: 'cat', sound: 'cat' }, { word: 'fish', sound: 'fish' }] },
    { letter: 'N', sound: '/n/', words: [{ word: 'net', sound: 'net' }, { word: 'dog', sound: 'dog' }, { word: 'apple', sound: 'apple' }] },
    { letter: 'O', sound: '/o/', words: [{ word: 'octopus', sound: 'octopus' }, { word: 'apple', sound: 'apple' }, { word: 'bat', sound: 'bat' }] },
    { letter: 'P', sound: '/p/', words: [{ word: 'pig', sound: 'pig' }, { word: 'cat', sound: 'cat' }, { word: 'dog', sound: 'dog' }] },
    { letter: 'Q', sound: '/kw/', words: [{ word: 'cup', sound: 'cup' }, { word: 'apple', sound: 'apple' }, { word: 'fish', sound: 'fish' }] },
    { letter: 'R', sound: '/r/', words: [{ word: 'rat', sound: 'rat' }, { word: 'dog', sound: 'dog' }, { word: 'egg', sound: 'egg' }] },
    { letter: 'S', sound: '/s/', words: [{ word: 'sun', sound: 'sun' }, { word: 'apple', sound: 'apple' }, { word: 'cat', sound: 'cat' }] },
    { letter: 'T', sound: '/t/', words: [{ word: 'top', sound: 'top' }, { word: 'bat', sound: 'bat' }, { word: 'dog', sound: 'dog' }] },
    { letter: 'U', sound: '/u/', words: [{ word: 'umbrella', sound: 'umbrella' }, { word: 'apple', sound: 'apple' }, { word: 'fish', sound: 'fish' }] },
    { letter: 'V', sound: '/v/', words: [{ word: 'van', sound: 'van' }, { word: 'cat', sound: 'cat' }, { word: 'dog', sound: 'dog' }] },
    { letter: 'W', sound: '/w/', words: [{ word: 'web', sound: 'web' }, { word: 'apple', sound: 'apple' }, { word: 'bat', sound: 'bat' }] },
    { letter: 'X', sound: '/ks/', words: [{ word: 'box', sound: 'box' }, { word: 'dog', sound: 'dog' }, { word: 'egg', sound: 'egg' }] },
    { letter: 'Y', sound: '/y/', words: [{ word: 'yak', sound: 'yak' }, { word: 'apple', sound: 'apple' }, { word: 'cat', sound: 'cat' }] },
    { letter: 'Z', sound: '/z/', words: [{ word: 'zebra', sound: 'zebra' }, { word: 'bat', sound: 'bat' }, { word: 'fish', sound: 'fish' }] },
  ];

  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [correctMatch, setCorrectMatch] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWord, setCelebrationWord] = useState<Word | null>(null);
  const [shakeCard, setShakeCard] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

  const currentLetter = letterSequence[currentLetterIndex];
  const correctWord = currentLetter.words.find(w => 
    w.word.toLowerCase().startsWith(currentLetter.letter.toLowerCase())
  );

  useEffect(() => {
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    setCorrectMatch(null);
    setShowCelebration(false);
    setShakeCard(null);
    setTries(0);
  }, [currentLetterIndex]);

  const playLetterSound = async () => {
    await GameAudio.playLetter(currentLetter.letter.toLowerCase());
  };

  const playWordSound = async (word: string) => {
    try {
      await GameAudio.playWord(word.toLowerCase(), 'pink');
    } catch {
      try {
        await GameAudio.playSightWord(word.toLowerCase());
      } catch {
        console.warn(`Word "${word}" not found`);
      }
    }
  };

  const handlePictureClick = async (word: Word) => {
    if (correctMatch) return;

    if (word.word.toLowerCase().startsWith(currentLetter.letter.toLowerCase())) {
      // CORRECT
      setScore(prev => prev + 1);
      setCorrectMatch(word.word);
      setCelebrationWord(word);
      setShowCelebration(true);
      setCelebration(getRandomCelebration('correct'));
      await GameAudio.playCorrect();
      
      setTimeout(() => playWordSound(word.word), 500);

      setTimeout(() => {
        if (currentLetterIndex < letterSequence.length - 1) {
          setCurrentLetterIndex(currentLetterIndex + 1);
        } else {
          setCurrentLetterIndex(0);
          setScore(0);
        }
      }, 2500);
    } else {
      // WRONG
      setTries(prev => prev + 1);
      setShakeCard(word.word);
      await GameAudio.playWrong();
      
      setTimeout(() => setShakeCard(null), 800);
    }
  };

  const goToPrevious = () => {
    if (currentLetterIndex > 0) setCurrentLetterIndex(currentLetterIndex - 1);
  };

  const goToNext = () => {
    if (currentLetterIndex < letterSequence.length - 1) setCurrentLetterIndex(currentLetterIndex + 1);
  };

  const resetCurrent = () => {
    setCorrectMatch(null);
    setShowCelebration(false);
    setShakeCard(null);
    setTries(0);
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 p-4"
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" 
            className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2">
            ← Back
          </Link>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">
            ⭐ {score}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white/20 rounded-2xl p-3 mb-6">
          <div className="flex justify-between items-center mb-2">
            <button onClick={goToPrevious} disabled={currentLetterIndex === 0} 
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronLeft size={20} /> Prev
            </button>
            <div className="text-white font-bold">
              Letter {currentLetterIndex + 1} of {letterSequence.length}
            </div>
            <button onClick={goToNext} disabled={currentLetterIndex === letterSequence.length - 1}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-1 transition-colors">
              Next <ChevronRight size={20} />
            </button>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentLetterIndex + 1) / letterSequence.length) * 100}%` }} />
          </div>
        </div>

        {/* Letter Display */}
        <div className="text-center mb-8">
          <div onClick={playLetterSound}
            className="inline-block bg-white rounded-3xl shadow-2xl p-8 cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            <p className="text-9xl font-bold text-indigo-600 mb-4">
              {currentLetter.letter.toLowerCase()}
            </p>
            <button onClick={playLetterSound} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto transition-colors shadow-lg">
              <Volume2 size={24} /> Hear Sound
            </button>
          </div>
          <p className="text-white/90 mt-4">Tap the letter to hear its sound, then find the matching picture!</p>
        </div>

        {/* Pictures - Now using real images that fill the frame */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {shuffledWords.map((word, index) => {
            const isCorrect = correctMatch === word.word;
            const isShaking = shakeCard === word.word;

            return (
              <div key={index}
                onClick={() => handlePictureClick(word)}
                className={`
                  bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer
                  transition-all duration-300 hover:shadow-2xl hover:scale-105 active:scale-95
                  ${isCorrect ? 'ring-4 ring-green-500 scale-110' : ''}
                  ${isShaking ? 'animate-shake ring-4 ring-red-500' : ''}
                  border-4 border-white
                `}>
                {/* Image fills the card */}
                <div className="aspect-square relative">
                  <WordImageSimple word={word.word} size={200} className="!w-full !h-full !rounded-none" />
                </div>
                {/* Label bar at bottom */}
                <div className="bg-white p-2 text-center">
                  <p className="text-gray-700 font-bold text-base capitalize">{word.word}</p>
                  <button onClick={(e) => { e.stopPropagation(); playWordSound(word.word); }}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-colors text-sm mx-auto mt-1">
                    <Volume2 size={14} /> Say
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Hint after 2 tries */}
        {tries >= 2 && !correctMatch && correctWord && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-6 text-center animate-float">
            <p className="text-yellow-800 font-bold text-lg flex items-center justify-center gap-2">
              💡 Hint: Look for <WordImageSimple word={correctWord.word} size={40} /> ({correctWord.word})!
            </p>
          </div>
        )}

        {/* Try again hint */}
        {tries >= 1 && tries < 2 && !correctMatch && (
          <div className="text-center mb-4">
            <p className="text-white/80 animate-pulse">💡 One more try for a hint!</p>
          </div>
        )}

        {/* Celebration Overlay */}
        {showCelebration && celebrationWord && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-pop max-w-md mx-4">
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <p className="text-3xl font-bold text-green-600 mb-2">{celebration}</p>
              <div className="flex justify-center mb-2">
                <WordImageSimple word={celebrationWord.word} size={100} />
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {celebrationWord.word.toUpperCase()} starts with {currentLetter.letter.toLowerCase()}!
              </p>
            </div>
          </div>
        )}

        {/* Reset */}
        <div className="text-center">
          <button onClick={resetCurrent} 
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto transition-colors shadow-lg">
            <RotateCcw size={20} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default LetterSoundMatchingGame;
