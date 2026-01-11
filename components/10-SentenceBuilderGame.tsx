// components/10-SentenceBuilderGame.tsx
// Sentence Builder Game - FIXED GRAMMAR
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
  // FIXED: All sentences now have proper grammar
  const sentenceSequence: GameSentenceBuilder[] = [
    // Easy - 3-4 words
    { picture: '🐱', pictureDescription: 'A cat sitting', targetSentence: 'the cat sat', words: ['the', 'cat', 'sat'], distractorWords: ['dog', 'ran', 'bat'], difficulty: 'easy' },
    { picture: '🦇', pictureDescription: 'A big bat', targetSentence: 'the bat is big', words: ['the', 'bat', 'is', 'big'], distractorWords: ['cat', 'sat', 'small'], difficulty: 'easy' },
    { picture: '👨', pictureDescription: 'A man running', targetSentence: 'the man ran', words: ['the', 'man', 'ran'], distractorWords: ['cat', 'sat', 'van'], difficulty: 'easy' },
    { picture: '🚐', pictureDescription: 'A red van', targetSentence: 'the van is red', words: ['the', 'van', 'is', 'red'], distractorWords: ['bat', 'big', 'blue'], difficulty: 'easy' },
    // Medium - 4-5 words
    { picture: '🐱', pictureDescription: 'A big cat', targetSentence: 'the cat is big', words: ['the', 'cat', 'is', 'big'], distractorWords: ['dog', 'bat', 'sat', 'hot'], difficulty: 'medium' },
    { picture: '🐶', pictureDescription: 'A red dog', targetSentence: 'the dog is red', words: ['the', 'dog', 'is', 'red'], distractorWords: ['cat', 'bat', 'sat', 'hot'], difficulty: 'medium' },
    { picture: '🐔', pictureDescription: 'A hen sitting', targetSentence: 'the hen sat down', words: ['the', 'hen', 'sat', 'down'], distractorWords: ['cat', 'ran', 'big', 'up'], difficulty: 'medium' },
    { picture: '🐷', pictureDescription: 'A hot pig', targetSentence: 'the pig is hot', words: ['the', 'pig', 'is', 'hot'], distractorWords: ['dog', 'cat', 'big', 'cold'], difficulty: 'medium' },
    // Medium - 6 words with articles FIXED
    { picture: '📍', pictureDescription: 'A cat on a mat', targetSentence: 'the cat sat on the mat', words: ['the', 'cat', 'sat', 'on', 'the', 'mat'], distractorWords: ['dog', 'ran', 'in'], difficulty: 'medium' },
    { picture: '📦', pictureDescription: 'A dog in a box', targetSentence: 'the dog is in the box', words: ['the', 'dog', 'is', 'in', 'the', 'box'], distractorWords: ['cat', 'on', 'bed'], difficulty: 'medium' },
    // Hard - 5 words
    { picture: '🐱', pictureDescription: 'A cat and dog', targetSentence: 'the cat and dog play', words: ['the', 'cat', 'and', 'dog', 'play'], distractorWords: ['bat', 'sat', 'run', 'sleep'], difficulty: 'hard' },
    { picture: '🐶', pictureDescription: 'A dog running to me', targetSentence: 'the dog ran to me', words: ['the', 'dog', 'ran', 'to', 'me'], distractorWords: ['cat', 'sat', 'in', 'you'], difficulty: 'hard' },
    // FIXED: Capital I
    { picture: '🐱', pictureDescription: 'I can see a cat', targetSentence: 'I can see the cat', words: ['I', 'can', 'see', 'the', 'cat'], distractorWords: ['dog', 'hear', 'smell', 'bat'], difficulty: 'hard' },
    { picture: '⚽', pictureDescription: 'A very big ball', targetSentence: 'the ball is very big', words: ['the', 'ball', 'is', 'very', 'big'], distractorWords: ['bat', 'small', 'hot', 'round'], difficulty: 'hard' },
  ];

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [tries, setTries] = useState(0);
  const [score, setScore] = useState(0);
  const [celebration, setCelebration] = useState('');

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const targetWords = currentSentence.targetSentence.split(' ');

  useEffect(() => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    setAvailableWords(allWords.sort(() => Math.random() - 0.5));
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setTries(0);
  }, [currentSentenceIndex]);

  const playWord = async (word: string) => {
    await soundGameAudio.playWord(word.toLowerCase());
  };

  const handleWordClick = async (word: string, index: number) => {
    const newBuilt = [...builtWords, word];
    const expectedWord = targetWords[newBuilt.length - 1];

    // Case-insensitive comparison
    if (word.toLowerCase() === expectedWord.toLowerCase()) {
      setBuiltWords(newBuilt);
      setAvailableWords(availableWords.filter((_, i) => i !== index));
      setFeedback('✓ Good!');
      await GameAudio.playCorrect();
      await playWord(word);

      if (newBuilt.length === targetWords.length) {
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
      setTries(prev => prev + 1);
      setFeedback('❌ Not that word!');
      await GameAudio.playWrong();
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const removeWordFromSentence = (index: number) => {
    if (index === builtWords.length - 1) {
      const word = builtWords[index];
      setBuiltWords(builtWords.slice(0, -1));
      setAvailableWords([...availableWords, word].sort(() => Math.random() - 0.5));
      setFeedback('');
    }
  };

  const resetSentence = () => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    setAvailableWords(allWords.sort(() => Math.random() - 0.5));
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setTries(0);
  };

  const getNextNeededWord = () => targetWords[builtWords.length];

  const getDifficultyColors = () => {
    switch (currentSentence.difficulty) {
      case 'easy': return 'from-green-400 via-emerald-400 to-teal-400';
      case 'medium': return 'from-blue-400 via-indigo-400 to-purple-400';
      case 'hard': return 'from-purple-400 via-pink-400 to-rose-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColors()} p-4`} style={{ fontFamily: GAME_FONTS.display }}>
      <style>{GAME_ANIMATIONS}</style>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl hover:bg-white/30">← Back</Link>
          <div className="text-white font-bold bg-white/20 px-4 py-2 rounded-xl">⭐ {score}</div>
        </div>

        {/* Progress */}
        <div className="bg-white/20 rounded-2xl p-3 mb-6">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => currentSentenceIndex > 0 && setCurrentSentenceIndex(currentSentenceIndex - 1)} disabled={currentSentenceIndex === 0}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg"><ChevronLeft size={18} /></button>
            <div className="text-white font-bold text-center">
              <div>Sentence {currentSentenceIndex + 1} of {sentenceSequence.length}</div>
              <div className="text-xs opacity-80">{currentSentence.difficulty === 'easy' ? '🌱 Easy' : currentSentence.difficulty === 'medium' ? '🌿 Medium' : '🌳 Hard'}</div>
            </div>
            <button onClick={() => currentSentenceIndex < sentenceSequence.length - 1 && setCurrentSentenceIndex(currentSentenceIndex + 1)} disabled={currentSentenceIndex === sentenceSequence.length - 1}
              className="bg-white/30 hover:bg-white/40 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg"><ChevronRight size={18} /></button>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${((currentSentenceIndex + 1) / sentenceSequence.length) * 100}%` }} />
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
            <div className="flex flex-wrap gap-3 justify-center items-center min-h-16 bg-white rounded-xl p-4 border-4 border-dashed border-indigo-400">
              {builtWords.length === 0 ? (
                <span className="text-gray-400">Tap words below to build...</span>
              ) : (
                builtWords.map((word, index) => (
                  <div key={index} className="relative group">
                    <button onClick={() => playWord(word)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg text-lg">{word}</button>
                    {index === builtWords.length - 1 && (
                      <button onClick={() => removeWordFromSentence(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100"><X size={14} /></button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="text-center mt-3"><span className="text-sm text-gray-600">{builtWords.length} of {targetWords.length} words</span></div>
            {feedback && <div className={`text-center mt-3 px-4 py-2 rounded-lg font-bold ${feedback.includes('✓') ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{feedback}</div>}
          </div>

          {/* Hint */}
          {tries >= 2 && !showCelebration && getNextNeededWord() && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl p-4 mb-4 text-center animate-pulse">
              <p className="text-yellow-800 font-bold">💡 Hint: Next word is "<span className="text-xl">{getNextNeededWord()}</span>"</p>
            </div>
          )}

          {/* Available Words */}
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
            <p className="text-center text-gray-600 font-bold mb-3">Tap to add:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {availableWords.map((word, index) => (
                <div key={index} onClick={() => handleWordClick(word, index)}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-lg cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all">{word}</div>
              ))}
            </div>
          </div>

          {/* Celebration */}
          {showCelebration && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-bounce max-w-md mx-4">
                <div className="text-7xl mb-4">🎉</div>
                <p className="text-3xl font-bold text-green-600 mb-2">{celebration}</p>
                <p className="text-6xl mb-2">{currentSentence.picture}</p>
                <p className="text-2xl font-bold text-indigo-600">{currentSentence.targetSentence}</p>
              </div>
            </div>
          )}

          {/* Reset */}
          {!showCelebration && (
            <div className="text-center">
              <button onClick={resetSentence} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 mx-auto"><RotateCcw size={20} /> Reset</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SentenceBuilderGame;
