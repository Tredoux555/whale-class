// components/games/MissingLetterGame.tsx
// Fill in the missing letter

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase } from '@/lib/games/types';
import { PINK_SERIES_WORDS, BLUE_SERIES_WORDS } from '@/lib/games/game-data';
import { speakWord } from '@/lib/games/sound-utils';
import GameWrapper, { CorrectFeedback, WrongFeedback, CompleteFeedback } from './GameWrapper';

interface Props {
  phase: GamePhase;
  level: string;
}

interface WordData {
  word: string;
  image: string;
}

export default function MissingLetterGame({ phase, level }: Props) {
  const router = useRouter();
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [missingIndex, setMissingIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [gameComplete, setGameComplete] = useState(false);

  const totalQuestions = 10;

  // Get words based on phase
  useEffect(() => {
    let wordList: WordData[] = [];

    if (phase === 'pink-series') {
      const key = level as keyof typeof PINK_SERIES_WORDS;
      wordList = PINK_SERIES_WORDS[key] || PINK_SERIES_WORDS['short-a'];
    } else if (phase === 'blue-series') {
      Object.values(BLUE_SERIES_WORDS).forEach(arr => wordList.push(...arr));
    }

    const shuffled = wordList.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
  }, [phase, level]);

  // Setup missing letter for current word
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const currentWord = words[currentIndex].word;
    // Randomly choose which letter to hide
    const randomIndex = Math.floor(Math.random() * currentWord.length);
    setMissingIndex(randomIndex);

    const correctLetter = currentWord[randomIndex];
    const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const otherLetters = allLetters
      .filter(l => l !== correctLetter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [correctLetter, ...otherLetters].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [currentIndex, words]);

  const getDisplayWord = (): string => {
    if (words.length === 0 || currentIndex >= words.length) return '';
    const word = words[currentIndex].word;
    return word
      .split('')
      .map((letter, index) => index === missingIndex ? '_' : letter)
      .join(' ');
  };

  const handleAnswer = (letter: string) => {
    if (showCorrect || showWrong) return;

    const correct = letter === words[currentIndex].word[missingIndex];

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      speakWord(words[currentIndex].word);
    } else {
      setWrongAnswer(words[currentIndex].word[missingIndex]);
      setShowWrong(true);
    }
  };

  const handleNextQuestion = () => {
    setShowCorrect(false);
    setShowWrong(false);
    setWrongAnswer('');

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
        {showWrong && <WrongFeedback correctAnswer={wrongAnswer} onComplete={handleNextQuestion} />}

        {/* Picture hint */}
        <div className="text-center mb-6">
          <div className="text-7xl mb-2">{currentWord.image}</div>
          <h2 className="text-xl font-bold text-gray-700">
            Find the missing letter!
          </h2>
        </div>

        {/* Word with blank */}
        <div className="text-center mb-8">
          <div 
            className="text-5xl font-bold text-gray-800 tracking-widest"
            style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
          >
            {getDisplayWord()}
          </div>
        </div>

        {/* Letter Options */}
        <div className="flex justify-center gap-4">
          {options.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleAnswer(letter)}
              disabled={showCorrect || showWrong}
              className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-500 text-white rounded-2xl text-3xl font-bold shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>
    </GameWrapper>
  );
}

