// components/10-SentenceBuilderGame.tsx
// Sentence Builder Game - Enhanced with hints, score, and consistent design

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';
import { soundGameAudio } from '@/lib/sound-games/sound-utils';
import { GAME_FONTS, GAME_ANIMATIONS, getRandomCelebration } from '@/lib/games/design-system';

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
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const targetWords = currentSentence.targetSentence.split(' ');

  useEffect(() => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setTries(0);
  }, [currentSentenceIndex]);

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
    await handleWordPlacement(draggedWord, draggedFromIndex);
    setDraggedWord(null);
    setDraggedFromIndex(null);
  };

  const handleWordClick = async (word: string, index: number) => {
    await handleWordPlacement(word, index);
  };

  const handleWordPlacement = async (word: string, fromIndex: number) => {
    const newBuilt = [...builtWords, word];

    if (word === targetWords[newBuilt.length - 1]) {
      // CORRECT
      setBuiltWords(newBuilt);
      const newAvailable = availableWords.filter((_, i) => i !== fromIndex);
      setAvailableWords(newAvailable);

      setFeedback('✓ Good!');
      await GameAudio.playCorrect();
      await playWord(word);

      // Check if sentence is complete
      if (newBuilt.join(' ') === currentSentence.targetSentence) {
        setScore(prev => prev + 1);
        setCelebration(getRandomCelebration('correct'));
        setShowCelebration(true);
        await GameAudio.playCelebration();

        setTimeout(() => {
          if (currentSentenceIndex < sentenceSequence.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
          } else {
            setCurrentSentenceIndex(0);
            setScore(0);
          }
        }, 2500);
      } else {
        setTimeout(() => setFeedback(''), 1000);
      }
    } else {
      // WRONG
      setTries(prev => prev + 1);
      setFeedback('❌ Not that word!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const removeWordFromSentence = (index: number) => {
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
    setTries(0);
  };

  // Get next needed word for hint
  const getNextNeededWord = () => {
    return targetWords[builtWords.length];
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
                {currentSentence.difficulty === 'easy' ? '🌱 Easy (3 words)' : 
                 currentSentence.difficulty === 'medium' ? '🌿 Medium (4-5 words)' : '🌳 Hard (5 words)'}
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
          {/* Picture */}
          <div className="text-center mb-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl">
            <p className="text-gray-600 font-bold mb-2">Build a sentence about:</p>
            <div className="text-8xl mb-2">{currentSentence.picture}</div>
            <p className="text-gray-700 text-lg font-bold">{currentSentence.pictureDescription}</p>
          </div>

          {/* Sentence Builder Area */}
          <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl">
            <p className="text-gray-600 font-bold mb-3 text-center">Your sentence:</p>
            
            <div onDragOver={handleDragOver} onDrop={handleDropInSentence}
              className="flex flex-wrap gap-3 justify-center items-center min-h-16 bg-white rounded-xl p-4 border-4 border-dashed border-indigo-400">
              {builtWords.length === 0 ? (
                <span className="text-gray-400 text-center">Tap words below to build...</span>
              ) : (
                builtWords.map((word, index) => (
                  <div key={index} className="relative group">
                    <button onClick={() => playWord(word)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-lg">
                      {word}
                    </button>
                    {index === builtWords.length - 1 && (
                      <button onClick={() => removeWordFromSentence(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Progress indicator */}
            <div className="text-center mt-3">
              <span className="text-sm text-gray-600">{builtWords.length} of {targetWords.length} words</span>
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`text-center mt-3 px-4 py-2 rounded-lg font-bold ${
                feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
              }`}>
                {feedback}
              </div>
            )}
          </div>

          {/* Hint after 2 tries */}
          {tries >= 2 && !showCelebration && getNextNeededWord() && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4 text-center animate-float">
              <p className="text-yellow-800 font-bold">
                💡 Hint: The next word is "<span className="text-xl">{getNextNeededWord()}</span>"
              </p>
            </div>
          )}

          {tries >= 1 && tries < 2 && !showCelebration && (
            <p className="text-orange-500 text-center text-sm mb-4 animate-pulse">
              💡 One more try for a hint!
            </p>
          )}

          {/* Available Words */}
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
            <p className="text-center text-gray-600 font-bold mb-3">Tap to add:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {availableWords.map((word, index) => (
                <div key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, word, index)}
                  onClick={() => handleWordClick(word, index)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-lg cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all min-w-[60px] text-center">
                  {word}
                </div>
              ))}
            </div>
          </div>

          {/* Celebration Overlay */}
          {showCelebration && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-pop max-w-md mx-4">
                <div className="text-7xl mb-4 animate-bounce">🎉</div>
                <p className="text-3xl font-bold text-green-600 mb-2">{celebration}</p>
                <p className="text-6xl mb-2">{currentSentence.picture}</p>
                <p className="text-2xl font-bold text-indigo-600">{currentSentence.targetSentence}</p>
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

export default SentenceBuilderGame;
