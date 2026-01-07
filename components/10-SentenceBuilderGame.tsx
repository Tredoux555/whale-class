// components/10-SentenceBuilderGame.tsx
// Sentence Builder Game - ElevenLabs audio only

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { soundGameAudio } from '@/lib/sound-games/sound-utils';

interface GameSentenceBuilder {
  picture: string;
  pictureDescription: string;
  targetSentence: string;
  words: string[];
  distractorWords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

const SentenceBuilderGame: React.FC = () => {
  const sentenceSequence: GameSentenceBuilder[] = [
    // Easy - 3 words
    { picture: '🐱', pictureDescription: 'A cat', targetSentence: 'the cat sat', words: ['the', 'cat', 'sat'], distractorWords: ['dog', 'ran', 'bat'], difficulty: 'easy' },
    { picture: '🦇', pictureDescription: 'A bat', targetSentence: 'the bat is', words: ['the', 'bat', 'is'], distractorWords: ['cat', 'sat', 'big'], difficulty: 'easy' },
    { picture: '👨', pictureDescription: 'A man running', targetSentence: 'the man ran', words: ['the', 'man', 'ran'], distractorWords: ['cat', 'sat', 'van'], difficulty: 'easy' },
    { picture: '🚐', pictureDescription: 'A van', targetSentence: 'the van is', words: ['the', 'van', 'is'], distractorWords: ['bat', 'big', 'red'], difficulty: 'easy' },
    
    // Medium - 4 words
    { picture: '🐱', pictureDescription: 'A big cat', targetSentence: 'the cat is big', words: ['the', 'cat', 'is', 'big'], distractorWords: ['dog', 'bat', 'sat', 'hot'], difficulty: 'medium' },
    { picture: '🐶', pictureDescription: 'A red dog', targetSentence: 'the dog is red', words: ['the', 'dog', 'is', 'red'], distractorWords: ['cat', 'bat', 'sat', 'hot'], difficulty: 'medium' },
    { picture: '🐔', pictureDescription: 'A hen sitting down', targetSentence: 'the hen sat down', words: ['the', 'hen', 'sat', 'down'], distractorWords: ['cat', 'ran', 'big', 'up'], difficulty: 'medium' },
    { picture: '🐷', pictureDescription: 'A hot pig', targetSentence: 'the pig is hot', words: ['the', 'pig', 'is', 'hot'], distractorWords: ['dog', 'cat', 'big', 'cold'], difficulty: 'medium' },
    
    // Medium - 5 words with on/in
    { picture: '📍', pictureDescription: 'A cat on a mat', targetSentence: 'the cat sat on mat', words: ['the', 'cat', 'sat', 'on', 'mat'], distractorWords: ['dog', 'ran', 'in', 'bed'], difficulty: 'medium' },
    { picture: '📦', pictureDescription: 'A dog in a box', targetSentence: 'the dog is in box', words: ['the', 'dog', 'is', 'in', 'box'], distractorWords: ['cat', 'on', 'bed', 'bat'], difficulty: 'medium' },
    
    // Hard - 5 words
    { picture: '🐱', pictureDescription: 'A cat and dog playing', targetSentence: 'the cat and dog play', words: ['the', 'cat', 'and', 'dog', 'play'], distractorWords: ['bat', 'sat', 'run', 'sleep'], difficulty: 'hard' },
    { picture: '🐶', pictureDescription: 'A dog running to a boy', targetSentence: 'the dog ran to me', words: ['the', 'dog', 'ran', 'to', 'me'], distractorWords: ['cat', 'sat', 'in', 'you'], difficulty: 'hard' },
    { picture: '🐱', pictureDescription: 'A cat we can see', targetSentence: 'i can see the cat', words: ['i', 'can', 'see', 'the', 'cat'], distractorWords: ['dog', 'hear', 'smell', 'bat'], difficulty: 'hard' },
    { picture: '⚽', pictureDescription: 'A very big ball', targetSentence: 'the ball is very big', words: ['the', 'ball', 'is', 'very', 'big'], distractorWords: ['bat', 'small', 'hot', 'round'], difficulty: 'hard' },
  ];

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const targetWords = currentSentence.targetSentence.split(' ');

  useEffect(() => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
  }, [currentSentenceIndex]);

  // Play a word using ElevenLabs
  const playWord = async (word: string) => {
    await soundGameAudio.playWord(word.toLowerCase());
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, word: string, index: number) => {
    setDraggedWord(word);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropInSentence = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedWord || draggedFromIndex === null) return;

    const newBuilt = [...builtWords, draggedWord];

    // Check if word is correct for this position
    if (draggedWord === targetWords[newBuilt.length - 1]) {
      setBuiltWords(newBuilt);
      const newAvailable = availableWords.filter((_, i) => i !== draggedFromIndex);
      setAvailableWords(newAvailable);

      setFeedback('✓ Good!');
      await GameAudio.playCorrect();
      await playWord(draggedWord);

      // Check if sentence is complete
      if (newBuilt.join(' ') === currentSentence.targetSentence) {
        setShowCelebration(true);
        await GameAudio.playCelebration();

        setTimeout(() => {
          if (currentSentenceIndex < sentenceSequence.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
          } else {
            setCurrentSentenceIndex(0);
          }
        }, 2500);
      } else {
        setTimeout(() => setFeedback(''), 1000);
      }
    } else {
      // Wrong word
      setFeedback('❌ Not that word!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }

    setDraggedWord(null);
    setDraggedFromIndex(null);
  };

  // Alternative: click to add word
  const handleWordClick = async (word: string, index: number) => {
    const newBuilt = [...builtWords, word];

    if (word === targetWords[newBuilt.length - 1]) {
      setBuiltWords(newBuilt);
      const newAvailable = availableWords.filter((_, i) => i !== index);
      setAvailableWords(newAvailable);

      setFeedback('✓ Good!');
      await GameAudio.playCorrect();
      await playWord(word);

      if (newBuilt.join(' ') === currentSentence.targetSentence) {
        setShowCelebration(true);
        await GameAudio.playCelebration();

        setTimeout(() => {
          if (currentSentenceIndex < sentenceSequence.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
          } else {
            setCurrentSentenceIndex(0);
          }
        }, 2500);
      } else {
        setTimeout(() => setFeedback(''), 1000);
      }
    } else {
      setFeedback('❌ Not that word!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const removeWordFromSentence = (index: number) => {
    // Only allow removing the last word
    if (index === builtWords.length - 1) {
      const word = builtWords[index];
      const newBuilt = builtWords.slice(0, -1);
      setBuiltWords(newBuilt);
      setAvailableWords([...availableWords, word].sort(() => Math.random() - 0.5));
      setFeedback('');
    }
  };

  const goToPrevious = () => {
    if (currentSentenceIndex > 0) setCurrentSentenceIndex(currentSentenceIndex - 1);
  };

  const goToNext = () => {
    if (currentSentenceIndex < sentenceSequence.length - 1) setCurrentSentenceIndex(currentSentenceIndex + 1);
  };

  const resetSentence = () => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
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
              {currentSentence.difficulty === 'easy' && '🟩 Easy (3 words)'}
              {currentSentence.difficulty === 'medium' && '🟦 Medium (4-5 words)'}
              {currentSentence.difficulty === 'hard' && '🟪 Hard (5 words)'}
            </p>
          </div>

          <button onClick={goToNext} disabled={currentSentenceIndex === sentenceSequence.length - 1} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            Next <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8">
        {/* Picture */}
        <div className="text-center mb-8 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl border-4 border-orange-300">
          <p className="text-gray-700 font-semibold mb-4">Build a sentence about this picture:</p>
          <div className="text-9xl mb-4">{currentSentence.picture}</div>
          <p className="text-gray-600 text-lg font-semibold" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            {currentSentence.pictureDescription}
          </p>
        </div>

        {/* Sentence builder area */}
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border-2 border-indigo-300">
          <p className="text-gray-700 font-semibold mb-4 text-center">Tap words to build the sentence:</p>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropInSentence}
            className="flex flex-wrap gap-3 justify-center items-center min-h-20 bg-white rounded-xl p-4 border-4 border-dashed border-indigo-400"
          >
            {builtWords.length === 0 ? (
              <span className="text-gray-400 text-center text-lg">Tap words below to build...</span>
            ) : (
              builtWords.map((word, index) => (
                <div key={index} className="relative group">
                  <button
                    onClick={() => playWord(word)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-5 rounded-lg transition-all text-lg"
                    style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
                  >
                    {word}
                  </button>
                  {index === builtWords.length - 1 && (
                    <button
                      onClick={() => removeWordFromSentence(index)}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-center mt-4 px-6 py-3 rounded-lg font-semibold inline-block w-full text-lg ${feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {feedback}
            </div>
          )}

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">{builtWords.length} of {targetWords.length} words</p>
          </div>
        </div>

        {/* Available words */}
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
          <p className="text-center text-gray-700 font-semibold mb-4">Available Words (Tap to add)</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {availableWords.map((word, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, word, index)}
                onClick={() => handleWordClick(word, index)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-lg cursor-pointer shadow-md hover:shadow-lg transition-all hover:scale-110"
                style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600 mb-2" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentSentence.targetSentence}
            </p>
            <p className="text-lg text-gray-700">{currentSentence.picture} {currentSentence.pictureDescription}</p>
          </div>
        )}

        {/* Reset */}
        {!showCelebration && (
          <div className="text-center">
            <button onClick={resetSentence} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition">
              <RotateCcw size={20} /> Reset Sentence
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentenceBuilderGame;
