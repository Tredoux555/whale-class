// components/07-LetterSoundMatchingGame.tsx
// Letter Sound Matching Game - ElevenLabs audio only
// BUG FIX: Added shake animation and wrong sound feedback

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

interface Word {
  word: string;
  picture: string;
  sound: string;
}

interface Letter {
  letter: string;
  sound: string;
  words: Word[];
}

const LetterSoundMatchingGame: React.FC = () => {
  const letterSequence: Letter[] = [
    { letter: 'A', sound: '/a/', words: [{ word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'bat', picture: '🦇', sound: 'bat' }] },
    { letter: 'B', sound: '/b/', words: [{ word: 'bat', picture: '🦇', sound: 'bat' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'apple', picture: '🍎', sound: 'apple' }] },
    { letter: 'C', sound: '/c/', words: [{ word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'dog', picture: '🐶', sound: 'dog' }] },
    { letter: 'D', sound: '/d/', words: [{ word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'bat', picture: '🦇', sound: 'bat' }, { word: 'cat', picture: '🐱', sound: 'cat' }] },
    { letter: 'E', sound: '/e/', words: [{ word: 'egg', picture: '🥚', sound: 'egg' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'apple', picture: '🍎', sound: 'apple' }] },
    { letter: 'F', sound: '/f/', words: [{ word: 'fish', picture: '🐠', sound: 'fish' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'cat', picture: '🐱', sound: 'cat' }] },
    { letter: 'G', sound: '/g/', words: [{ word: 'goat', picture: '🐐', sound: 'goat' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'egg', picture: '🥚', sound: 'egg' }] },
    { letter: 'H', sound: '/h/', words: [{ word: 'hat', picture: '🎩', sound: 'hat' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'dog', picture: '🐶', sound: 'dog' }] },
    { letter: 'I', sound: '/i/', words: [{ word: 'insect', picture: '🐛', sound: 'insect' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'fish', picture: '🐠', sound: 'fish' }] },
    { letter: 'J', sound: '/j/', words: [{ word: 'jam', picture: '🫙', sound: 'jam' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'bat', picture: '🦇', sound: 'bat' }] },
    { letter: 'K', sound: '/k/', words: [{ word: 'kite', picture: '🪁', sound: 'kite' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'cat', picture: '🐱', sound: 'cat' }] },
    { letter: 'L', sound: '/l/', words: [{ word: 'leg', picture: '🦵', sound: 'leg' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'egg', picture: '🥚', sound: 'egg' }] },
    { letter: 'M', sound: '/m/', words: [{ word: 'mop', picture: '🧹', sound: 'mop' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'fish', picture: '🐠', sound: 'fish' }] },
    { letter: 'N', sound: '/n/', words: [{ word: 'net', picture: '🥅', sound: 'net' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'apple', picture: '🍎', sound: 'apple' }] },
    { letter: 'O', sound: '/o/', words: [{ word: 'octopus', picture: '🐙', sound: 'octopus' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'bat', picture: '🦇', sound: 'bat' }] },
    { letter: 'P', sound: '/p/', words: [{ word: 'pig', picture: '🐷', sound: 'pig' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'dog', picture: '🐶', sound: 'dog' }] },
    { letter: 'Q', sound: '/kw/', words: [{ word: 'queen', picture: '👑', sound: 'queen' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'fish', picture: '🐠', sound: 'fish' }] },
    { letter: 'R', sound: '/r/', words: [{ word: 'rat', picture: '🐀', sound: 'rat' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'egg', picture: '🥚', sound: 'egg' }] },
    { letter: 'S', sound: '/s/', words: [{ word: 'sun', picture: '☀️', sound: 'sun' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'cat', picture: '🐱', sound: 'cat' }] },
    { letter: 'T', sound: '/t/', words: [{ word: 'top', picture: '🔝', sound: 'top' }, { word: 'bat', picture: '🦇', sound: 'bat' }, { word: 'dog', picture: '🐶', sound: 'dog' }] },
    { letter: 'U', sound: '/u/', words: [{ word: 'umbrella', picture: '☂️', sound: 'umbrella' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'fish', picture: '🐠', sound: 'fish' }] },
    { letter: 'V', sound: '/v/', words: [{ word: 'van', picture: '🚐', sound: 'van' }, { word: 'cat', picture: '🐱', sound: 'cat' }, { word: 'dog', picture: '🐶', sound: 'dog' }] },
    { letter: 'W', sound: '/w/', words: [{ word: 'web', picture: '🕸️', sound: 'web' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'bat', picture: '🦇', sound: 'bat' }] },
    { letter: 'X', sound: '/ks/', words: [{ word: 'box', picture: '📦', sound: 'box' }, { word: 'dog', picture: '🐶', sound: 'dog' }, { word: 'egg', picture: '🥚', sound: 'egg' }] },
    { letter: 'Y', sound: '/y/', words: [{ word: 'yak', picture: '🦬', sound: 'yak' }, { word: 'apple', picture: '🍎', sound: 'apple' }, { word: 'cat', picture: '🐱', sound: 'cat' }] },
    { letter: 'Z', sound: '/z/', words: [{ word: 'zebra', picture: '🦓', sound: 'zebra' }, { word: 'bat', picture: '🦇', sound: 'bat' }, { word: 'fish', picture: '🐠', sound: 'fish' }] },
  ];

  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [correctMatch, setCorrectMatch] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationWord, setCelebrationWord] = useState<Word | null>(null);
  const [shakeCard, setShakeCard] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentLetter = letterSequence[currentLetterIndex];

  useEffect(() => {
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
    setCorrectMatch(null);
    setShowCelebration(false);
    setShakeCard(null);
    setFeedback(null);
  }, [currentLetterIndex]);

  // Play letter sound using ElevenLabs
  const playLetterSound = async () => {
    await GameAudio.playLetter(currentLetter.letter.toLowerCase());
  };

  // Play word sound using ElevenLabs
  const playWordSound = async (word: string) => {
    try {
      await GameAudio.playWord(word.toLowerCase(), 'pink');
    } catch {
      // Some words might not be in pink, try as sight word
      try {
        await GameAudio.playSightWord(word.toLowerCase());
      } catch {
        console.warn(`Word "${word}" not found in audio library`);
      }
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, word: Word) => {
    e.preventDefault();

    if (word.word.toLowerCase().startsWith(currentLetter.letter.toLowerCase())) {
      // CORRECT
      setCorrectMatch(word.word);
      setCelebrationWord(word);
      setShowCelebration(true);
      setFeedback('✓ Correct!');
      await GameAudio.playCorrect();
      
      // Play the word
      setTimeout(() => {
        playWordSound(word.word);
      }, 500);

      setTimeout(() => {
        if (currentLetterIndex < letterSequence.length - 1) {
          setCurrentLetterIndex(currentLetterIndex + 1);
        } else {
          setCurrentLetterIndex(0);
        }
      }, 2000);
    } else {
      // WRONG - BUG FIX: Now shows shake and plays wrong sound
      setShakeCard(word.word);
      setFeedback('❌ Try again!');
      await GameAudio.playWrong();
      
      setTimeout(() => {
        setShakeCard(null);
        setFeedback(null);
      }, 1000);
    }
  };

  // Handle click on picture (alternative to drag)
  const handlePictureClick = async (word: Word) => {
    if (word.word.toLowerCase().startsWith(currentLetter.letter.toLowerCase())) {
      // CORRECT
      setCorrectMatch(word.word);
      setCelebrationWord(word);
      setShowCelebration(true);
      setFeedback('✓ Correct!');
      await GameAudio.playCorrect();
      
      setTimeout(() => {
        playWordSound(word.word);
      }, 500);

      setTimeout(() => {
        if (currentLetterIndex < letterSequence.length - 1) {
          setCurrentLetterIndex(currentLetterIndex + 1);
        } else {
          setCurrentLetterIndex(0);
        }
      }, 2000);
    } else {
      // WRONG
      setShakeCard(word.word);
      setFeedback('❌ Try again!');
      await GameAudio.playWrong();
      
      setTimeout(() => {
        setShakeCard(null);
        setFeedback(null);
      }, 1000);
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
    setFeedback(null);
    const shuffled = [...currentLetter.words].sort(() => Math.random() - 0.5);
    setShuffledWords(shuffled);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4 flex flex-col items-center justify-center">
      {/* Back button */}
      <div className="w-full max-w-4xl mb-4">
        <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <span className="text-xl">←</span>
          <span>Back to Games</span>
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <button onClick={goToPrevious} disabled={currentLetterIndex === 0} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            <ChevronLeft size={20} /> Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Letter Progress</p>
            <p className="text-gray-800 font-semibold">{currentLetterIndex + 1} of {letterSequence.length}</p>
          </div>

          <button onClick={goToNext} disabled={currentLetterIndex === letterSequence.length - 1} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            Next <ChevronRight size={20} />
          </button>
        </div>

        <div className="text-center">
          <p className="text-gray-600 text-lg mb-2">Tap the letter to hear its sound, then tap the matching picture!</p>
        </div>
      </div>

      {/* Main game */}
      <div className="w-full max-w-4xl">
        {/* Letter display */}
        <div className="mb-12 text-center">
          <div
            draggable
            onDragStart={handleDragStart}
            onClick={playLetterSound}
            className="inline-block bg-white rounded-2xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-shadow active:scale-95"
          >
            <p className="text-8xl font-bold text-indigo-600 mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentLetter.letter.toLowerCase()}
            </p>
            <button onClick={playLetterSound} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
              <Volume2 size={24} /> Play Sound
            </button>
          </div>
          <p className="text-gray-600 mt-4 text-sm">📌 Tap this letter to hear the sound, then tap the matching picture</p>
        </div>

        {/* Pictures */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          {shuffledWords.map((word, index) => {
            const isCorrect = correctMatch === word.word;
            const isShaking = shakeCard === word.word;

            return (
              <div
                key={index}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, word)}
                onClick={() => handlePictureClick(word)}
                className={`
                  bg-white rounded-2xl shadow-lg p-8 text-center cursor-pointer
                  transition-all duration-300 hover:shadow-xl hover:scale-105
                  ${isCorrect ? 'ring-4 ring-green-500 scale-110' : ''}
                  ${isShaking ? 'animate-shake ring-4 ring-red-500' : ''}
                `}
              >
                <div className="text-8xl mb-4 inline-block" onClick={(e) => { e.stopPropagation(); playWordSound(word.word); }}>
                  {word.picture}
                </div>
                <p className="text-gray-600 font-semibold text-lg mb-3 capitalize">{word.word}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); playWordSound(word.word); }}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 mx-auto transition"
                >
                  <Volume2 size={18} /> Say Name
                </button>
              </div>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`text-center mb-4 px-6 py-3 rounded-lg font-semibold text-lg inline-block w-full ${
            feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
          }`}>
            {feedback}
          </div>
        )}

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600">
              {celebrationWord?.picture} {celebrationWord?.word.toUpperCase()} starts with {currentLetter.letter.toLowerCase()}!
            </p>
          </div>
        )}

        {/* Reset */}
        <div className="text-center">
          <button onClick={resetCurrent} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
            <RotateCcw size={20} /> Reset This Letter
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LetterSoundMatchingGame;
