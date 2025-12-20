// components/games/SightFlashGame.tsx
// Fast sight word recognition

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SIGHT_WORDS } from '@/lib/games/game-data';
import { speakWord, playCorrectSound, playWrongSound } from '@/lib/games/sound-utils';
import GameWrapper, { CorrectFeedback, WrongFeedback, CompleteFeedback } from './GameWrapper';

interface Props {
  level: string;
}

export default function SightFlashGame({ level }: Props) {
  const router = useRouter();
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [showWord, setShowWord] = useState(true);
  const [flashDuration, setFlashDuration] = useState(2000);

  const totalQuestions = 10;

  // Get words
  useEffect(() => {
    const levelKey = level as keyof typeof SIGHT_WORDS;
    const wordList = SIGHT_WORDS[levelKey] || SIGHT_WORDS['level-1'];
    const shuffled = [...wordList].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setWords(shuffled);
  }, [level]);

  const generateOptions = useCallback(() => {
    if (words.length === 0 || currentIndex >= words.length) return;

    const current = words[currentIndex];
    const allSightWords = Object.values(SIGHT_WORDS).flat();
    const otherWords = allSightWords
      .filter(w => w !== current)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [current, ...otherWords].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [currentIndex, words]);

  // Flash word then hide
  useEffect(() => {
    if (words.length === 0 || currentIndex >= words.length || showCorrect || showWrong) return;

    setShowWord(true);
    const timer = setTimeout(() => {
      setShowWord(false);
      generateOptions();
    }, flashDuration);

    return () => clearTimeout(timer);
  }, [currentIndex, words, flashDuration, showCorrect, showWrong, generateOptions]);

  const handleAnswer = (word: string) => {
    if (showCorrect || showWrong || showWord) return;

    const correct = word === words[currentIndex];

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      speakWord(word);
      // Speed up as player improves
      if (score > 0 && score % 3 === 0 && flashDuration > 800) {
        setFlashDuration(prev => prev - 200);
      }
    } else {
      setWrongAnswer(words[currentIndex]);
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
            setFlashDuration(2000);
            setWords(prev => [...prev].sort(() => Math.random() - 0.5));
          }}
          onExit={() => router.push('/games')}
        />
      </GameWrapper>
    );
  }

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

        {showWord ? (
          /* Flash Word Display */
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">Remember this word!</p>
            <div 
              className="text-7xl font-bold text-indigo-600 animate-pulse"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {words[currentIndex]}
            </div>
            <div className="mt-6">
              <div className="h-2 bg-gray-200 rounded-full max-w-xs mx-auto overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 animate-shrink"
                  style={{ animationDuration: `${flashDuration}ms` }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Answer Options */
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-8">
              Which word did you see?
            </h2>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {options.map((word, index) => (
                <button
                  key={`${word}-${index}`}
                  onClick={() => handleAnswer(word)}
                  disabled={showCorrect || showWrong}
                  className="p-5 bg-gradient-to-br from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-2xl text-2xl font-bold text-gray-800 shadow-lg hover:scale-105 hover:shadow-xl transition-all disabled:opacity-50"
                  style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-shrink {
            animation: shrink linear forwards;
          }
        `}</style>
      </div>
    </GameWrapper>
  );
}

