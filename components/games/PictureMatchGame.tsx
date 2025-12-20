// components/games/PictureMatchGame.tsx
// Match pictures to words

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase } from '@/lib/games/types';
import { PINK_SERIES_WORDS, BLUE_SERIES_WORDS, GREEN_SERIES_WORDS } from '@/lib/games/game-data';
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

export default function PictureMatchGame({ phase, level }: Props) {
  const router = useRouter();
  const [words, setWords] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<WordData[]>([]);
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
    } else if (phase === 'green-series') {
      Object.values(GREEN_SERIES_WORDS).forEach(arr => wordList.push(...arr));
    }

    const shuffled = wordList.sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
  }, [phase, level]);

  // Generate options for current word
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const current = words[currentIndex];
    
    // Get 3 wrong options from all available words
    let allWords: WordData[] = [];
    if (phase === 'pink-series') {
      Object.values(PINK_SERIES_WORDS).forEach(arr => allWords.push(...arr));
    } else if (phase === 'blue-series') {
      Object.values(BLUE_SERIES_WORDS).forEach(arr => allWords.push(...arr));
    } else {
      Object.values(GREEN_SERIES_WORDS).forEach(arr => allWords.push(...arr));
    }

    const otherWords = allWords
      .filter(w => w.word !== current.word)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [current, ...otherWords].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [currentIndex, words, phase]);

  const handleAnswer = (selectedWord: WordData) => {
    if (showCorrect || showWrong) return;

    const correct = selectedWord.word === words[currentIndex].word;

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      speakWord(selectedWord.word);
    } else {
      setWrongAnswer(words[currentIndex].word);
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

        {/* Picture */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            Find the word for this picture!
          </h2>
          <div className="inline-block bg-gradient-to-br from-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
            <span className="text-9xl">{currentWord.image}</span>
          </div>
        </div>

        {/* Word Options */}
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {options.map((option, index) => (
            <button
              key={`${option.word}-${index}`}
              onClick={() => handleAnswer(option)}
              disabled={showCorrect || showWrong}
              className="p-5 bg-white border-3 border-gray-200 rounded-2xl text-2xl font-bold text-gray-800 shadow-lg hover:scale-105 hover:border-purple-400 hover:shadow-xl transition-all disabled:opacity-50"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {option.word}
            </button>
          ))}
        </div>

        {/* Sound button */}
        <div className="text-center mt-6">
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

