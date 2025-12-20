// components/games/WordBuildingGame.tsx
// Drag letters to build words

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase } from '@/lib/games/types';
import { PINK_SERIES_WORDS, BLUE_SERIES_WORDS, GREEN_SERIES_WORDS } from '@/lib/games/game-data';
import { speakWord, soundOutWord } from '@/lib/games/sound-utils';
import GameWrapper, { CorrectFeedback, WrongFeedback, CompleteFeedback } from './GameWrapper';

interface Props {
  phase: GamePhase;
  level: string;
}

interface WordData {
  word: string;
  image: string;
}

export default function WordBuildingGame({ phase, level }: Props) {
  const router = useRouter();
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const totalQuestions = 8;

  // Get words based on phase and level
  useEffect(() => {
    let wordList: WordData[] = [];

    if (phase === 'pink-series') {
      const key = level as keyof typeof PINK_SERIES_WORDS;
      wordList = PINK_SERIES_WORDS[key] || PINK_SERIES_WORDS['short-a'];
    } else if (phase === 'blue-series') {
      Object.values(BLUE_SERIES_WORDS).forEach(arr => wordList.push(...arr));
    } else if (phase === 'green-series') {
      Object.values(GREEN_SERIES_WORDS).forEach(arr => wordList.push(...arr));
    }

    const shuffled = wordList.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
  }, [phase, level]);

  // Setup letters for current word
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const currentWord = words[currentIndex].word;
    const letters = currentWord.split('');
    
    // Add some extra random letters for difficulty
    const extraLetters = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter(l => !letters.includes(l))
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(3, 6 - letters.length));

    const allLetters = [...letters, ...extraLetters].sort(() => Math.random() - 0.5);
    setAvailableLetters(allLetters);
    setSelectedLetters([]);
  }, [currentIndex, words]);

  const handleLetterClick = (letter: string, index: number) => {
    if (showCorrect || showWrong) return;

    setSelectedLetters(prev => [...prev, letter]);
    
    const newAvailable = [...availableLetters];
    newAvailable.splice(index, 1);
    setAvailableLetters(newAvailable);
  };

  const handleRemoveLetter = (index: number) => {
    if (showCorrect || showWrong) return;

    const letter = selectedLetters[index];
    
    const newSelected = [...selectedLetters];
    newSelected.splice(index, 1);
    setSelectedLetters(newSelected);
    
    setAvailableLetters(prev => [...prev, letter]);
  };

  const checkAnswer = () => {
    if (showCorrect || showWrong) return;
    
    const builtWord = selectedLetters.join('');
    const correct = builtWord === words[currentIndex].word;

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      speakWord(builtWord);
    } else {
      setShowWrong(true);
    }
  };

  const handleNextQuestion = () => {
    setShowCorrect(false);
    setShowWrong(false);

    if (currentIndex + 1 >= totalQuestions) {
      setGameComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-4xl animate-spin">🎮</div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <GameWrapper score={score} totalQuestions={totalQuestions} currentQuestion={totalQuestions}>
        <CompleteFeedback
          score={score}
          total={totalQuestions}
          onPlayAgain={() => {
            setCurrentIndex(0);
            setScore(0);
            setGameComplete(false);
            setWords(prev => [...prev].sort(() => Math.random() - 0.5));
          }}
          onExit={() => router.push('/games')}
        />
      </GameWrapper>
    );
  }

  const currentWord = words[currentIndex];

  return (
    <GameWrapper 
      score={score} 
      totalQuestions={totalQuestions} 
      currentQuestion={currentIndex + 1}
      showCelebration={showCorrect}
    >
      <div className="relative">
        {showCorrect && <CorrectFeedback onComplete={handleNextQuestion} />}
        {showWrong && <WrongFeedback correctAnswer={currentWord.word} onComplete={handleNextQuestion} />}

        {/* Picture hint */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-2">{currentWord.image}</div>
          <h2 className="text-xl font-bold text-gray-700">
            Build the word for this picture!
          </h2>
        </div>

        {/* Word building area */}
        <div className="bg-gray-100 rounded-2xl p-4 mb-6 min-h-[80px] flex items-center justify-center gap-2">
          {selectedLetters.length === 0 ? (
            <p className="text-gray-400 text-lg">Tap letters below to build the word</p>
          ) : (
            selectedLetters.map((letter, index) => (
              <button
                key={`selected-${index}`}
                onClick={() => handleRemoveLetter(index)}
                className="w-14 h-14 bg-blue-500 text-white rounded-xl text-3xl font-bold shadow-lg hover:scale-105 transition-transform"
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
              >
                {letter}
              </button>
            ))
          )}
        </div>

        {/* Available letters */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {availableLetters.map((letter, index) => (
            <button
              key={`available-${index}`}
              onClick={() => handleLetterClick(letter, index)}
              disabled={showCorrect || showWrong}
              className="w-14 h-14 bg-white border-2 border-gray-300 rounded-xl text-3xl font-bold text-gray-700 shadow hover:scale-110 hover:border-blue-400 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Check button */}
        <div className="text-center">
          <button
            onClick={checkAnswer}
            disabled={selectedLetters.length === 0 || showCorrect || showWrong}
            className="px-10 py-4 bg-green-500 text-white rounded-2xl text-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            ✓ Check
          </button>
        </div>

        {/* Sound buttons */}
        <div className="text-center mt-4 flex gap-3 justify-center">
          <button
            onClick={() => soundOutWord(currentWord.word)}
            className="px-4 py-2 bg-purple-100 text-purple-600 rounded-lg font-bold hover:bg-purple-200 transition-colors"
          >
            🔊 Sound it out
          </button>
          <button
            onClick={() => speakWord(currentWord.word)}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold hover:bg-blue-200 transition-colors"
          >
            🔊 Hear the word
          </button>
        </div>
      </div>
    </GameWrapper>
  );
}

