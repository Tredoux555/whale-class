// components/assessment/LetterSoundsTestGame.tsx
// Letter Sounds test - "What letter makes this sound?"
// Child hears a letter sound and taps the correct letter

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

const EASY_LETTERS = ['s', 'm', 'a', 't', 'p', 'n'];
const MEDIUM_LETTERS = ['b', 'c', 'd', 'f', 'g', 'h'];
const ALL_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export default function LetterSoundsTestGame({ 
  itemCount = 6, 
  onComplete,
  onProgress 
}: Props) {
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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
    const allRounds: GameRound[] = [];
    const easyShuffled = [...EASY_LETTERS].sort(() => Math.random() - 0.5);
    const mediumShuffled = [...MEDIUM_LETTERS].sort(() => Math.random() - 0.5);
    const combined = [...easyShuffled.slice(0, 3), ...mediumShuffled.slice(0, 3)];
    
    for (let i = 0; i < Math.min(itemCount, combined.length); i++) {
      const targetLetter = combined[i];
      const distractors = getDistractors(targetLetter, 3);
      const options = [targetLetter, ...distractors].sort(() => Math.random() - 0.5);
      allRounds.push({ targetLetter, options });
    }
    
    return allRounds;
  }, [itemCount, getDistractors]);

  useEffect(() => {
    const generatedRounds = generateAllRounds();
    setRounds(generatedRounds);
    setRoundStartTime(Date.now());
    
    setTimeout(() => {
      if (generatedRounds[0]) {
        playLetterSound(generatedRounds[0].targetLetter);
      }
    }, 500);
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateAllRounds]);

  const playLetterSound = async (letter: string) => {
    GameAudio.stop();
    setIsPlaying(true);
    try {
      await GameAudio.play(`/audio-new/letters/${letter}.mp3`);
    } catch (err) {
      console.error('Error playing letter sound:', err);
    }
    setIsPlaying(false);
  };

  const handleSelect = async (selectedLetter: string) => {
    if (showFeedback || isPlaying) return;
    
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
          skillCode: 'letter_sounds',
          skillName: 'Letter Sounds',
          correctCount,
          totalCount: newResults.length,
          itemsData: newResults,
          durationSeconds
        });
      } else {
        setCurrentIndex(nextIndex);
        setRoundStartTime(Date.now());
        onProgress?.(nextIndex + 1, rounds.length);
        
        setTimeout(() => {
          if (rounds[nextIndex]) {
            playLetterSound(rounds[nextIndex].targetLetter);
          }
        }, 300);
      }
    }, 1200);
  };

  const handleReplay = () => {
    if (!isPlaying && !showFeedback && rounds[currentIndex]) {
      playLetterSound(rounds[currentIndex].targetLetter);
    }
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
    <div className="relative flex flex-col h-full bg-gradient-to-br from-blue-400 via-sky-400 to-cyan-400 p-4">
      <ItemProgress current={currentIndex + 1} total={rounds.length} />

      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-4 font-medium">
          Which letter makes this sound? 🔤
        </p>
        
        <button
          onClick={handleReplay}
          disabled={isPlaying || showFeedback}
          className={`text-8xl transition-transform ${
            isPlaying ? 'animate-pulse scale-110' : 'hover:scale-110'
          }`}
        >
          🔊
        </button>
        <p className="text-white/80 mt-3 text-lg">
          {isPlaying ? 'Listen...' : 'Tap to hear again'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {currentRound.options.map((letter, index) => {
          const isCorrectAnswer = showFeedback && letter === currentRound.targetLetter;
          
          return (
            <button
              key={`${letter}-${index}`}
              onClick={() => handleSelect(letter)}
              disabled={showFeedback || isPlaying}
              className={`
                aspect-square rounded-2xl border-4 transition-all
                flex items-center justify-center
                ${isCorrectAnswer
                  ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                  : 'bg-white border-white/80 hover:scale-105'
                }
                ${showFeedback || isPlaying ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-6xl font-bold text-gray-800 assessment-letter">
                {letter}
              </span>
            </button>
          );
        })}
      </div>

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
