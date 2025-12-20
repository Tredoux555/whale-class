// components/games/LetterSoundGame.tsx
// Hear a sound, tap the correct letter

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase } from '@/lib/games/types';
import { ALL_LETTERS, VOWELS, CONSONANTS } from '@/lib/games/game-data';
import { speakLetterWithExample, playCorrectSound, playWrongSound } from '@/lib/games/sound-utils';
import GameWrapper, { CorrectFeedback, WrongFeedback, CompleteFeedback } from './GameWrapper';

interface Props {
  phase: GamePhase;
}

export default function LetterSoundGame({ phase }: Props) {
  const router = useRouter();
  const [letters, setLetters] = useState<typeof ALL_LETTERS>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);

  const totalQuestions = 10;

  // Initialize game
  useEffect(() => {
    // Shuffle and pick letters
    const allLetters = [...ALL_LETTERS];
    const shuffled = allLetters.sort(() => Math.random() - 0.5);
    setLetters(shuffled.slice(0, totalQuestions));
  }, []);

  // Generate options when current letter changes
  useEffect(() => {
    if (letters.length === 0 || currentIndex >= letters.length) return;

    const currentLetter = letters[currentIndex];
    const otherLetters = ALL_LETTERS
      .filter(l => l.letter !== currentLetter.letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(l => l.letter);

    const allOptions = [currentLetter.letter, ...otherLetters].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setHasSpoken(false);
  }, [currentIndex, letters]);

  // Play sound for current letter with example word
  const playSound = useCallback(() => {
    if (letters.length === 0 || currentIndex >= letters.length) return;
    speakLetterWithExample(letters[currentIndex].letter);
    setHasSpoken(true);
  }, [currentIndex, letters]);

  // Auto-play sound when question loads
  useEffect(() => {
    if (!hasSpoken && letters.length > 0 && currentIndex < letters.length) {
      const timer = setTimeout(playSound, 500);
      return () => clearTimeout(timer);
    }
  }, [hasSpoken, letters, currentIndex, playSound]);

  const handleAnswer = (selectedLetter: string) => {
    if (showCorrect || showWrong || gameComplete) return;

    const correct = letters[currentIndex].letter === selectedLetter;

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
    } else {
      setWrongAnswer(letters[currentIndex].letter);
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

  if (letters.length === 0) {
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
            setLetters([...ALL_LETTERS].sort(() => Math.random() - 0.5).slice(0, totalQuestions));
          }}
          onExit={() => router.push('/games')}
        />
      </GameWrapper>
    );
  }

  const currentLetter = letters[currentIndex];

  return (
    <GameWrapper 
      score={score} 
      totalQuestions={totalQuestions} 
      currentQuestion={currentIndex + 1}
      showCelebration={showCorrect}
    >
      <div className="relative">
        {showCorrect && <CorrectFeedback onComplete={handleNextQuestion} />}
        {showWrong && <WrongFeedback correctAnswer={wrongAnswer.toUpperCase()} onComplete={handleNextQuestion} />}

        {/* Question */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">
            Listen and find the letter!
          </h2>
          
          {/* Play Sound Button */}
          <button
            onClick={playSound}
            className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto shadow-xl hover:scale-110 transition-transform active:scale-95"
          >
            <span className="text-6xl text-white">🔊</span>
          </button>
          
          <p className="text-gray-500 mt-3">Tap to hear the sound again</p>
        </div>

        {/* Letter Options */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {options.map((letter, index) => (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleAnswer(letter)}
              disabled={showCorrect || showWrong}
              className="h-28 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center text-6xl font-bold text-gray-800 shadow-lg hover:scale-105 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Hint */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Hint: {currentLetter.word} starts with this letter {currentLetter.image}
          </p>
        </div>
      </div>
    </GameWrapper>
  );
}

