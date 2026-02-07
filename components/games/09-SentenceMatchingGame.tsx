// components/09-SentenceMatchingGame.tsx
// Sentence Matching Game - Enhanced with hints, score, and consistent design

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { soundGameAudio } from '@/lib/sound-games/sound-utils';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration } from '@/lib/games/design-system';

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
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const correctPicture = currentSentence.pictures[currentSentence.correctPictureIndex];

  useEffect(() => {
    const shuffled = [...currentSentence.pictures].sort(() => Math.random() - 0.5);
    setShuffledPictures(shuffled);
    setMatchedPicture(null);
    setShowCelebration(false);
    setShakeIndex(null);
    setTries(0);
  }, [currentSentenceIndex]);

  const playWord = async (word: string) => {
    const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
    await soundGameAudio.playWord(cleanWord);
  };

  const playSentence = async () => {
    for (const word of currentSentence.words) {
      await playWord(word);
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const handlePictureClick = async (picture: string, index: number) => {
    if (matchedPicture) return;

    if (picture === correctPicture) {
      // CORRECT
      setScore(prev => prev + 1);
      setMatchedPicture(picture);
      setCelebration(getRandomCelebration('correct'));
      setShowCelebration(true);
      await GameAudio.playCorrect();

      setTimeout(() => {
        if (currentSentenceIndex < sentenceSequence.length - 1) {
          setCurrentSentenceIndex(currentSentenceIndex + 1);
        } else {
          setCurrentSentenceIndex(0);
          setScore(0);
        }
      }, 2500);
    } else {
      // WRONG
      setTries(prev => prev + 1);
      setShakeIndex(index);
      await GameAudio.playWrong();
      
      setTimeout(() => setShakeIndex(null), 800);
    }
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
    setShowCelebration(false);
    setShakeIndex(null);
    setTries(0);
  };

  const getDifficultyColors = () => {
    switch (currentSentence.difficulty) {
      case 'easy': return 'from-green-400 via-emerald-400 to-teal-400';
      case 'medium': return 'from-blue-400 via-indigo-400 to-purple-400';
      case 'hard': return 'from-purple-400 via-pink-400 to-rose-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColors()} p-4`}
      style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>

      <div className="max-w-5xl mx-auto">
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
            <button onClick={goToPrevious} disabled={currentSentenceIndex === 0}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="text-white font-bold text-center">
              <div>Sentence {currentSentenceIndex + 1} of {sentenceSequence.length}</div>
              <div className="text-xs opacity-80">
                {currentSentence.difficulty === 'easy' ? '🌱 Easy' : 
                 currentSentence.difficulty === 'medium' ? '🌿 Medium' : '🌳 Hard'}
              </div>
            </div>
            <button onClick={goToNext} disabled={currentSentenceIndex === sentenceSequence.length - 1}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${((currentSentenceIndex + 1) / sentenceSequence.length) * 100}%` }} />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          {/* Sentence Display */}
          <div className="text-center mb-6">
            <p className="text-gray-500 mb-3">Read the sentence and find the matching picture:</p>
            <div className="text-2xl md:text-3xl leading-relaxed mb-4 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-2xl">
              {currentSentence.sentence.split(' ').map((word, index) => (
                <span key={index}
                  onClick={() => playWord(word)}
                  className="inline-block mr-2 mb-2 px-3 py-1 rounded-lg hover:bg-blue-200 cursor-pointer transition-colors font-bold text-gray-800">
                  {word}
                </span>
              ))}
            </div>
            <button onClick={playSentence} 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto transition-colors shadow-lg">
              <Volume2 size={20} /> Hear Sentence
            </button>
          </div>

          {/* Pictures */}
          <div className="mb-6">
            <p className="text-center text-gray-600 font-bold mb-4">Tap the matching picture:</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {shuffledPictures.map((picture, index) => {
                const isMatched = matchedPicture === picture;
                const isShaking = shakeIndex === index;

                return (
                  <div key={index}
                    onClick={() => handlePictureClick(picture, index)}
                    className={`
                      text-7xl p-6 rounded-2xl cursor-pointer transition-all duration-200 shadow-lg
                      min-w-[120px] min-h-[120px] flex items-center justify-center
                      ${isMatched ? 'bg-green-200 ring-4 ring-green-500 scale-110' : 'bg-gradient-to-br from-yellow-100 to-orange-100 hover:from-yellow-200 hover:to-orange-200 hover:scale-110 active:scale-95'}
                      ${isShaking ? 'animate-shake ring-4 ring-red-500' : ''}
                    `}>
                    {picture}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hint after 2 tries */}
          {tries >= 2 && !matchedPicture && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4 text-center animate-float">
              <p className="text-yellow-800 font-bold text-lg">
                💡 Hint: Look for <span className="text-4xl">{correctPicture}</span>
              </p>
            </div>
          )}

          {tries >= 1 && tries < 2 && !matchedPicture && (
            <p className="text-orange-500 text-center text-sm mb-4 animate-pulse">
              💡 One more try for a hint!
            </p>
          )}

          {/* Answer Box */}
          <div className="flex justify-center mb-6">
            <div className={`
              w-32 h-32 rounded-2xl border-4 border-dashed flex items-center justify-center transition-all
              ${matchedPicture ? 'bg-green-100 border-green-500 shadow-lg' : 'bg-gray-100 border-gray-300'}
            `}>
              {matchedPicture ? (
                <div className="text-7xl animate-bounce">{matchedPicture}</div>
              ) : (
                <span className="text-5xl text-gray-300">?</span>
              )}
            </div>
          </div>

          {/* Celebration Overlay */}
          {showCelebration && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-pop max-w-md mx-4">
                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                <p className="text-3xl font-bold text-green-600 mb-2">{celebration}</p>
                <p className="text-6xl mb-2">{correctPicture}</p>
                <p className="text-xl text-gray-600">{currentSentence.sentence}</p>
              </div>
            </div>
          )}

          {/* Reset */}
          {!showCelebration && (
            <div className="text-center">
              <button onClick={resetSentence} 
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

export default SentenceMatchingGame;
