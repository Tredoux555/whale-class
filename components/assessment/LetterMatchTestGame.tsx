// components/assessment/LetterMatchTestGame.tsx
// Letter Recognition test - "Find the matching letter!"
// Child sees a lowercase letter and taps the same letter from options
// Uses child-friendly font (Comic Neue) with single-story 'a'

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameAudio } from '@/lib/games/audio-paths';
import ItemProgress from './ItemProgress';

interface ItemResult {
  targetLetter: string;
  selectedLetter: string;
  correct: boolean;
  timeMs: number;
}

interface TestResult {
  skillCode: string;
  skillName: string;
  correctCount: number;
  totalCount: number;
  itemsData: ItemResult[];
  durationSeconds: number;
}

interface Props {
  itemCount?: number;
  onComplete: (result: TestResult) => void;
  onProgress?: (current: number, total: number) => void;
}

interface GameRound {
  targetLetter: string;
  options: string[];
}

// Lowercase letters only
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export default function LetterMatchTestGame({ 
  itemCount = 8, 
  onComplete,
  onProgress 
}: Props) {
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [testStartTime] = useState<number>(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getDistractors = useCallback((target: string, count: number): string[] => {
    const others = ALL_LETTERS.filter(l => l !== target);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const generateAllRounds = useCallback((): GameRound[] => {
    const shuffled = [...ALL_LETTERS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, itemCount);
    
    return selected.map((targetLetter) => {
      const distractors = getDistractors(targetLetter, 3);
      const options = [targetLetter, ...distractors].sort(() => Math.random() - 0.5);
      
      return {
        targetLetter,
        options
      };
    });
  }, [itemCount, getDistractors]);

  useEffect(() => {
    const generatedRounds = generateAllRounds();
    setRounds(generatedRounds);
    setRoundStartTime(Date.now());
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateAllRounds]);

  const handleSelect = async (selectedLetter: string) => {
    if (showFeedback) return;
    
    const currentRound = rounds[currentIndex];
    if (!currentRound) return;

    const isCorrect = selectedLetter === currentRound.targetLetter;
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      targetLetter: currentRound.targetLetter,
      selectedLetter,
      correct: isCorrect,
      timeMs
    };
    
    const newResults = [...results, itemResult];
    setResults(newResults);
    setLastCorrect(isCorrect);
    setShowFeedback(true);

    if (isCorrect) {
      await GameAudio.playCorrect();
    } else {
      await GameAudio.playWrong();
    }

    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= rounds.length) {
        const correctCount = newResults.filter(r => r.correct).length;
        const durationSeconds = Math.round((Date.now() - testStartTime) / 1000);
        
        onComplete({
          skillCode: 'letter_recognition',
          skillName: 'Letter Recognition',
          correctCount,
          totalCount: newResults.length,
          itemsData: newResults,
          durationSeconds
        });
      } else {
        setCurrentIndex(nextIndex);
        setRoundStartTime(Date.now());
        onProgress?.(nextIndex + 1, rounds.length);
      }
    }, 1200);
  };

  const currentRound = rounds[currentIndex];
  if (!currentRound) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-pulse">🐋</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-rose-400 via-pink-400 to-fuchsia-400 p-4">
      {/* Progress indicator */}
      <ItemProgress current={currentIndex + 1} total={rounds.length} />

      {/* Target letter display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-4 font-medium">
          Find the letter! 🔍
        </p>
        
        <div className="bg-white rounded-3xl p-8 shadow-2xl mb-4">
          <span className="text-8xl font-bold text-gray-800 assessment-letter">
            {currentRound.targetLetter}
          </span>
        </div>
        
        <p className="text-white/80 text-lg">
          Tap the same letter below! 👇
        </p>
      </div>

      {/* Letter options grid - all lowercase */}
      <div className="grid grid-cols-2 gap-4">
        {currentRound.options.map((letter, index) => {
          const isCorrectAnswer = showFeedback && letter === currentRound.targetLetter;
          
          return (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleSelect(letter)}
              disabled={showFeedback}
              className={`
                aspect-square rounded-2xl border-4 transition-all
                flex items-center justify-center
                ${isCorrectAnswer
                  ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                  : 'bg-white border-white/80 hover:scale-105'
                }
                ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-6xl font-bold text-gray-800 assessment-letter">
                {letter}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback overlay */}
      {showFeedback && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`text-8xl ${lastCorrect ? 'animate-bounce' : 'animate-pulse'}`}>
            {lastCorrect ? '⭐' : '💪'}
          </div>
        </div>
      )}
    </div>
  );
}
