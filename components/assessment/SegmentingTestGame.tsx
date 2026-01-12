// components/assessment/SegmentingTestGame.tsx
// Sound Segmenting test - "How many sounds?"
// Child sees a picture, hears the sounds broken apart, taps the count

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { GameAudio } from '@/lib/games/audio-paths';
import { WordImageSimple } from '@/components/sound-games/WordImage';
import ItemProgress from './ItemProgress';

interface ItemResult {
  item: string;
  correctSounds: number;
  selectedSounds: number;
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

const SOUND_OPTIONS = [2, 3, 4];

export default function SegmentingTestGame({ 
  itemCount = 4, 
  onComplete,
  onProgress 
}: Props) {
  const [words, setWords] = useState<CVCWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [testStartTime] = useState<number>(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [currentSoundIndex, setCurrentSoundIndex] = useState(-1);
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const generateWords = useCallback((): CVCWord[] => {
    const shuffled = [...CVC_WORDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, itemCount);
  }, [itemCount]);

  useEffect(() => {
    const generatedWords = generateWords();
    setWords(generatedWords);
    setRoundStartTime(Date.now());
    
    setTimeout(() => {
      if (generatedWords[0]) {
        demonstrateSegmenting(generatedWords[0]);
      }
    }, 500);
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateWords]);

  const demonstrateSegmenting = async (word: CVCWord) => {
    GameAudio.stop();
    setIsPlaying(true);
    
    for (let i = 0; i < word.sounds.length; i++) {
      setCurrentSoundIndex(i);
      try {
        await GameAudio.play(`/audio-new/letters/${word.sounds[i]}.mp3`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error('Error playing sound:', err);
      }
    }
    
    setCurrentSoundIndex(-1);
    setIsPlaying(false);
  };

  const handleSelect = async (selectedCount: number) => {
    if (showFeedback || isPlaying) return;
    
    const currentWord = words[currentIndex];
    if (!currentWord) return;

    const correctCount = currentWord.sounds.length;
    const isCorrect = selectedCount === correctCount;
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      item: currentWord.word,
      correctSounds: correctCount,
      selectedSounds: selectedCount,
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
      
      if (nextIndex >= words.length) {
        const correct = newResults.filter(r => r.correct).length;
        const durationSeconds = Math.round((Date.now() - testStartTime) / 1000);
        
        onComplete({
          skillCode: 'segmenting',
          skillName: 'Sound Segmenting',
          correctCount: correct,
          totalCount: newResults.length,
          itemsData: newResults,
          durationSeconds
        });
      } else {
        setCurrentIndex(nextIndex);
        setRoundStartTime(Date.now());
        onProgress?.(nextIndex + 1, words.length);
        
        setTimeout(() => {
          if (words[nextIndex]) {
            demonstrateSegmenting(words[nextIndex]);
          }
        }, 300);
      }
    }, 1200);
  };

  const handleReplay = () => {
    if (!isPlaying && !showFeedback && words[currentIndex]) {
      demonstrateSegmenting(words[currentIndex]);
    }
  };

  const currentWord = words[currentIndex];
  if (!currentWord) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-pulse">🐋</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-400 p-4">
      <ItemProgress current={currentIndex + 1} total={words.length} />

      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-3 font-medium">
          How many sounds? 🎵
        </p>
        
        <div className="bg-white rounded-3xl p-4 shadow-xl mb-4">
          <WordImageSimple 
            word={currentWord.word} 
            size={130} 
            className="w-[130px] h-[130px]" 
          />
        </div>
        
        {/* Animated dots ONLY during playback - don't reveal count otherwise */}
        {isPlaying && (
          <div className="flex gap-2 mb-3">
            {currentWord.sounds.map((_, i) => (
              <div
                key={i}
                className={`
                  w-6 h-6 rounded-full transition-all
                  ${currentSoundIndex >= i
                    ? 'bg-yellow-300 scale-110'
                    : 'bg-white/30'
                  }
                `}
              />
            ))}
          </div>
        )}
        
        <button
          onClick={handleReplay}
          disabled={isPlaying || showFeedback}
          className={`text-5xl transition-transform ${
            isPlaying ? 'animate-pulse scale-110' : 'hover:scale-110'
          }`}
        >
          🔊
        </button>
        <p className="text-white/80 mt-2 text-sm">
          {isPlaying ? 'Count the sounds...' : 'Tap to hear again'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {SOUND_OPTIONS.map((count) => {
          const isCorrectAnswer = showFeedback && count === currentWord.sounds.length;
          
          return (
            <button
              key={count}
              onClick={() => handleSelect(count)}
              disabled={showFeedback || isPlaying}
              className={`
                aspect-square rounded-2xl border-4 transition-all
                flex flex-col items-center justify-center
                ${isCorrectAnswer
                  ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                  : 'bg-white border-white/80 hover:scale-105'
                }
                ${showFeedback || isPlaying ? 'cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-4xl font-bold text-gray-800">{count}</span>
              <div className="flex gap-1 mt-2">
                {Array(count).fill(0).map((_, i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-gray-400" />
                ))}
              </div>
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
