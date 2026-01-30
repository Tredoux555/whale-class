// components/assessment/BlendingTestGame.tsx
// Sound Blending test - "Put the sounds together!"
// Child hears c...a...t and taps the picture of "cat"

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { GameAudio } from '@/lib/games/audio-paths';
import { WordImageSimple } from '@/components/sound-games/WordImage';
import ItemProgress from './ItemProgress';

interface ItemResult {
  item: string;
  sounds: string[];
  correct: boolean;
  selectedWord: string;
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
  targetWord: CVCWord;
  options: CVCWord[];
}

export default function BlendingTestGame({ 
  itemCount = 5, 
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
  const [currentSoundIndex, setCurrentSoundIndex] = useState(-1);
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getDistractors = useCallback((target: CVCWord, count: number): CVCWord[] => {
    const others = CVC_WORDS.filter(w => w.word !== target.word);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const generateAllRounds = useCallback((): GameRound[] => {
    const shuffled = [...CVC_WORDS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, itemCount);
    
    return selected.map(targetWord => ({
      targetWord,
      options: [targetWord, ...getDistractors(targetWord, 3)].sort(() => Math.random() - 0.5)
    }));
  }, [itemCount, getDistractors]);

  useEffect(() => {
    const generatedRounds = generateAllRounds();
    setRounds(generatedRounds);
    setRoundStartTime(Date.now());
    
    setTimeout(() => {
      if (generatedRounds[0]) {
        playSoundsSequence(generatedRounds[0].targetWord.sounds);
      }
    }, 500);
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateAllRounds]);

  const playSoundsSequence = async (sounds: string[]) => {
    GameAudio.stop();
    setIsPlaying(true);
    
    for (let i = 0; i < sounds.length; i++) {
      setCurrentSoundIndex(i);
      try {
        await GameAudio.play(`/audio-new/letters/${sounds[i]}.mp3`);
        if (i < sounds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    }
    
    setCurrentSoundIndex(-1);
    setIsPlaying(false);
  };

  const handleSelect = async (selected: CVCWord) => {
    if (showFeedback || isPlaying) return;
    
    const currentRound = rounds[currentIndex];
    if (!currentRound) return;

    const isCorrect = selected.word === currentRound.targetWord.word;
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      item: currentRound.targetWord.word,
      sounds: currentRound.targetWord.sounds,
      correct: isCorrect,
      selectedWord: selected.word,
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
          skillCode: 'blending',
          skillName: 'Sound Blending',
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
            playSoundsSequence(rounds[nextIndex].targetWord.sounds);
          }
        }, 300);
      }
    }, 1200);
  };

  const handleReplay = () => {
    if (!isPlaying && !showFeedback && rounds[currentIndex]) {
      playSoundsSequence(rounds[currentIndex].targetWord.sounds);
    }
  };

  const currentRound = rounds[currentIndex];
  if (!currentRound) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-pulse">🌳</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-green-400 via-emerald-400 to-teal-400 p-4">
      <ItemProgress current={currentIndex + 1} total={rounds.length} />

      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-4 font-medium">
          Put the sounds together! 🧩
        </p>
        
        <div className="flex gap-3 mb-4">
          {currentRound.targetWord.sounds.map((sound, i) => (
            <div
              key={i}
              className={`
                w-16 h-16 rounded-full flex items-center justify-center
                text-2xl font-bold transition-all
                ${currentSoundIndex === i 
                  ? 'bg-yellow-300 scale-125 ring-4 ring-yellow-200' 
                  : 'bg-white/80'
                }
              `}
            >
              {isPlaying && currentSoundIndex === i ? '🔊' : '🔈'}
            </div>
          ))}
        </div>
        
        <button
          onClick={handleReplay}
          disabled={isPlaying || showFeedback}
          className={`text-6xl transition-transform ${
            isPlaying ? 'animate-pulse' : 'hover:scale-110'
          }`}
        >
          🔊
        </button>
        <p className="text-white/80 mt-2">
          {isPlaying ? 'Listen carefully...' : 'Tap to hear again'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {currentRound.options.map((option, index) => (
          <button
            key={`${option.word}-${index}`}
            onClick={() => handleSelect(option)}
            disabled={showFeedback || isPlaying}
            className={`
              aspect-square rounded-2xl border-4 transition-all overflow-hidden
              ${showFeedback && option.word === currentRound.targetWord.word
                ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                : 'bg-white border-white/80 hover:scale-[1.02]'
              }
              ${showFeedback || isPlaying ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="w-full h-full p-2 flex items-center justify-center">
              <WordImageSimple 
                word={option.word} 
                size={120} 
                className="w-full h-full max-w-[120px] max-h-[120px]" 
              />
            </div>
          </button>
        ))}
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
