// components/09-SentenceMatchingGame.tsx
// Sentence Matching Game - ElevenLabs audio only

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { soundGameAudio } from '@/lib/sound-games/sound-utils';

interface GameSentence {
  sentence: string;
  words: string[];
  pictures: string[];
  correctPictureIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const SentenceMatchingGame: React.FC = () => {
  const sentenceSequence: GameSentence[] = [
    // Easy sentences
    { sentence: 'The cat sat.', words: ['the', 'cat', 'sat'], pictures: ['🐱', '🐶', '🦇'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The bat is big.', words: ['the', 'bat', 'is', 'big'], pictures: ['🦇', '🐱', '🎩'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The man ran.', words: ['the', 'man', 'ran'], pictures: ['👨', '👋', '🐀'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The van is red.', words: ['the', 'van', 'is', 'red'], pictures: ['🚐', '🚌', '🚗'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The bed is red.', words: ['the', 'bed', 'is', 'red'], pictures: ['🛏️', '🔴', '💡'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The pig is big.', words: ['the', 'pig', 'is', 'big'], pictures: ['🐷', '🦣', '🌀'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The mug is hot.', words: ['the', 'mug', 'is', 'hot'], pictures: ['☕', '🔥', '🚌'], correctPictureIndex: 0, difficulty: 'easy' },
    { sentence: 'The bus is big.', words: ['the', 'bus', 'is', 'big'], pictures: ['🚌', '🦣', '☕'], correctPictureIndex: 0, difficulty: 'easy' },
    
    // Medium sentences
    { sentence: 'The cat and bat sat.', words: ['the', 'cat', 'and', 'bat', 'sat'], pictures: ['🐱', '🦇', '🐶'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The rat sat on the mat.', words: ['the', 'rat', 'sat', 'on', 'the', 'mat'], pictures: ['🐀', '🐱', '📍'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The hen sat on the net.', words: ['the', 'hen', 'sat', 'on', 'the', 'net'], pictures: ['🐔', '🥅', '🏠'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The dog is in the box.', words: ['the', 'dog', 'is', 'in', 'the', 'box'], pictures: ['🐶', '📦', '🔥'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The fox is in the log.', words: ['the', 'fox', 'is', 'in', 'the', 'log'], pictures: ['🦊', '🪵', '🌫️'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The bug is on the rug.', words: ['the', 'bug', 'is', 'on', 'the', 'rug'], pictures: ['🐛', '🧶', '☕'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The bell is loud.', words: ['the', 'bell', 'is', 'loud'], pictures: ['🔔', '🎵', '💵'], correctPictureIndex: 0, difficulty: 'medium' },
    { sentence: 'The cat is small.', words: ['the', 'cat', 'is', 'small'], pictures: ['🐱', '👶', '🦣'], correctPictureIndex: 0, difficulty: 'medium' },
    
    // Hard sentences
    { sentence: 'The ball is on the hill.', words: ['the', 'ball', 'is', 'on', 'the', 'hill'], pictures: ['⚽', '⛰️', '💵'], correctPictureIndex: 0, difficulty: 'hard' },
    { sentence: 'The cat will sit still.', words: ['the', 'cat', 'will', 'sit', 'still'], pictures: ['🐱', '⏸️', '🚀'], correctPictureIndex: 0, difficulty: 'hard' },
    { sentence: 'I can smell the fish.', words: ['i', 'can', 'smell', 'the', 'fish'], pictures: ['🐠', '👃', '🐶'], correctPictureIndex: 0, difficulty: 'hard' },
  ];

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [shuffledPictures, setShuffledPictures] = useState<string[]>([]);
  const [matchedPicture, setMatchedPicture] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);

  const currentSentence = sentenceSequence[currentSentenceIndex];

  useEffect(() => {
    const shuffled = [...currentSentence.pictures].sort(() => Math.random() - 0.5);
    setShuffledPictures(shuffled);
    setMatchedPicture(null);
    setFeedback('');
    setShowCelebration(false);
    setShakeIndex(null);
  }, [currentSentenceIndex]);

  // Play a word using ElevenLabs
  const playWord = async (word: string) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    await soundGameAudio.playWord(cleanWord);
  };

  // Play the whole sentence word by word
  const playSentence = async () => {
    for (const word of currentSentence.words) {
      await playWord(word);
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const handlePictureClick = async (picture: string, index: number) => {
    if (matchedPicture) return;

    if (picture === currentSentence.pictures[currentSentence.correctPictureIndex]) {
      // CORRECT
      setMatchedPicture(picture);
      setFeedback('✓ Correct!');
      setShowCelebration(true);
      await GameAudio.playCorrect();

      setTimeout(() => {
        if (currentSentenceIndex < sentenceSequence.length - 1) {
          setCurrentSentenceIndex(currentSentenceIndex + 1);
        } else {
          setCurrentSentenceIndex(0);
        }
      }, 2500);
    } else {
      // WRONG
      setShakeIndex(index);
      setFeedback('❌ Try again!');
      await GameAudio.playWrong();
      
      setTimeout(() => {
        setShakeIndex(null);
        setFeedback('');
      }, 1000);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Find the dropped picture and handle it
  };

  const goToPrevious = () => {
    if (currentSentenceIndex > 0) setCurrentSentenceIndex(currentSentenceIndex - 1);
  };

  const goToNext = () => {
    if (currentSentenceIndex < sentenceSequence.length - 1) setCurrentSentenceIndex(currentSentenceIndex + 1);
  };

  const resetSentence = () => {
    const shuffled = [...currentSentence.pictures].sort(() => Math.random() - 0.5);
    setShuffledPictures(shuffled);
    setMatchedPicture(null);
    setFeedback('');
    setShowCelebration(false);
    setShakeIndex(null);
  };

  const getDifficultyColor = () => {
    switch (currentSentence.difficulty) {
      case 'easy': return 'from-green-50 to-green-100';
      case 'medium': return 'from-blue-50 to-blue-100';
      case 'hard': return 'from-purple-50 to-purple-100';
      default: return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColor()} p-4 flex flex-col items-center justify-center`}>
      {/* Back button */}
      <div className="w-full max-w-5xl mb-4">
        <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <span className="text-xl">←</span>
          <span>Back to Games</span>
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-5xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button onClick={goToPrevious} disabled={currentSentenceIndex === 0} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            <ChevronLeft size={20} /> Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Sentence Progress</p>
            <p className="text-gray-800 font-semibold">{currentSentenceIndex + 1} of {sentenceSequence.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {currentSentence.difficulty === 'easy' && '🟩 Easy'}
              {currentSentence.difficulty === 'medium' && '🟦 Medium'}
              {currentSentence.difficulty === 'hard' && '🟪 Hard'}
            </p>
          </div>

          <button onClick={goToNext} disabled={currentSentenceIndex === sentenceSequence.length - 1} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* LEFT: Pictures */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-700 font-semibold mb-6 text-center">Tap the matching picture →</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {shuffledPictures.map((picture, index) => {
                const isMatched = matchedPicture === picture;
                const isShaking = shakeIndex === index;

                return (
                  <div
                    key={index}
                    onClick={() => handlePictureClick(picture, index)}
                    className={`
                      text-6xl p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg
                      ${isMatched ? 'bg-green-200 ring-4 ring-green-500 scale-110' : 'bg-yellow-100 hover:bg-yellow-200 hover:scale-110'}
                      ${isShaking ? 'animate-shake ring-4 ring-red-500' : ''}
                    `}
                  >
                    {picture}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Sentence */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-700 font-semibold mb-8 text-center">Read the sentence:</p>
            
            <div className="mb-8 text-center">
              <div className="text-2xl leading-relaxed mb-4" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
                {currentSentence.sentence.split(' ').map((word, index) => (
                  <span
                    key={index}
                    onClick={() => playWord(word)}
                    className="inline-block mr-3 mb-2 px-2 py-1 rounded hover:bg-blue-200 cursor-pointer transition-colors"
                    title="Click to hear"
                  >
                    {word}
                  </span>
                ))}
              </div>
              
              <button onClick={playSentence} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 mx-auto">
                <Volume2 size={20} /> Hear Sentence
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                w-40 h-40 rounded-2xl border-4 border-dashed flex items-center justify-center transition-all duration-200
                ${matchedPicture ? 'bg-green-200 border-green-500 shadow-lg' : 'bg-gray-100 border-gray-300 hover:border-indigo-500'}
              `}
            >
              {matchedPicture ? (
                <div className="text-8xl animate-bounce">{matchedPicture}</div>
              ) : (
                <span className="text-6xl text-gray-300">?</span>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`inline-block px-6 py-3 rounded-lg font-semibold text-lg mt-6 ${feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mt-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentSentence.pictures[currentSentence.correctPictureIndex]} matches the sentence!
            </p>
          </div>
        )}

        {/* Reset */}
        {!showCelebration && (
          <div className="text-center mt-8">
            <button onClick={resetSentence} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
              <RotateCcw size={20} /> Reset Sentence
            </button>
          </div>
        )}
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

export default SentenceMatchingGame;
