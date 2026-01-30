// components/assessment/EndingTestGame.tsx
// Ending Sounds test - "What ENDS with this sound?"
// Child hears a sound, taps the picture that ends with that sound
// Each picture has a 🔊 button to hear the word name

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ENDING_SOUNDS, type EndingSoundGroup, type SoundWord } from '@/lib/sound-games/sound-games-data';
import { GameAudio } from '@/lib/games/audio-paths';
import { WordImageSimple } from '@/components/sound-games/WordImage';
import ItemProgress from './ItemProgress';

interface ItemResult {
  item: string;
  targetSound: string;
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
  targetSound: string;
  targetWord: SoundWord;
  options: SoundWord[];
}

export default function EndingTestGame({ 
  itemCount = 5, 
  onComplete,
  onProgress 
}: Props) {
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [testStartTime] = useState<number>(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getDistractors = useCallback((targetSound: string, count: number): SoundWord[] => {
    const otherSounds = ENDING_SOUNDS.filter(s => s.sound !== targetSound);
    const allOtherWords = otherSounds.flatMap(s => s.words);
    const shuffled = [...allOtherWords].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  const generateAllRounds = useCallback((): GameRound[] => {
    const allRounds: GameRound[] = [];
    const usedSounds = new Set<string>();
    const shuffledSounds = [...ENDING_SOUNDS].sort(() => Math.random() - 0.5);
    
    for (const soundGroup of shuffledSounds) {
      if (allRounds.length >= itemCount) break;
      if (usedSounds.has(soundGroup.sound)) continue;
      
      usedSounds.add(soundGroup.sound);
      const targetWord = soundGroup.words[Math.floor(Math.random() * soundGroup.words.length)];
      const distractors = getDistractors(soundGroup.sound, 3);
      const options = [targetWord, ...distractors].sort(() => Math.random() - 0.5);
      
      allRounds.push({ targetSound: soundGroup.sound, targetWord, options });
    }
    
    return allRounds;
  }, [itemCount, getDistractors]);

  useEffect(() => {
    const generatedRounds = generateAllRounds();
    setRounds(generatedRounds);
    setRoundStartTime(Date.now());
    
    setTimeout(() => {
      if (generatedRounds[0]) {
        playSound(generatedRounds[0].targetSound);
      }
    }, 500);
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateAllRounds]);

  const playSound = async (sound: string) => {
    GameAudio.stop();
    setIsPlaying(true);
    try {
      await GameAudio.play(`/audio-new/letters/${sound}.mp3`);
    } catch (err) {
      console.error('Error playing sound:', err);
    }
    setIsPlaying(false);
  };

  const playWordAudio = async (word: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger selection
    if (showFeedback) return;
    
    setPlayingWord(word);
    try {
      await GameAudio.play(`/audio-new/words/${word}.mp3`);
    } catch (err) {
      console.error('Error playing word:', err);
    }
    setPlayingWord(null);
  };

  const handleSelect = async (selected: SoundWord) => {
    if (showFeedback || isPlaying) return;
    
    const currentRound = rounds[currentIndex];
    if (!currentRound) return;

    const isCorrect = selected.word === currentRound.targetWord.word;
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      item: currentRound.targetWord.word,
      targetSound: currentRound.targetSound,
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
          skillCode: 'ending_sounds',
          skillName: 'Ending Sounds',
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
            playSound(rounds[nextIndex].targetSound);
          }
        }, 300);
      }
    }, 1200);
  };

  const handleReplay = () => {
    if (!isPlaying && !showFeedback && rounds[currentIndex]) {
      playSound(rounds[currentIndex].targetSound);
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
    <div className="relative flex flex-col h-full bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 p-4">
      <ItemProgress current={currentIndex + 1} total={rounds.length} />

      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-3 font-medium">
          What ENDS with this sound? 🔚
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

      <div className="grid grid-cols-2 gap-3">
        {currentRound.options.map((option, index) => (
          <div 
            key={`${option.word}-${index}`}
            className="relative"
          >
            <button
              onClick={() => handleSelect(option)}
              disabled={showFeedback || isPlaying}
              className={`
                w-full aspect-square rounded-2xl border-4 transition-all overflow-hidden
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
                  size={100} 
                  className="w-full h-full max-w-[100px] max-h-[100px]" 
                />
              </div>
            </button>
            
            {/* Hear word button */}
            <button
              onClick={(e) => playWordAudio(option.word, e)}
              disabled={showFeedback}
              className={`
                absolute bottom-1 right-1 w-8 h-8 rounded-full 
                bg-blue-500 text-white flex items-center justify-center
                shadow-lg transition-transform
                ${playingWord === option.word ? 'animate-pulse scale-110' : 'hover:scale-110'}
                ${showFeedback ? 'opacity-50' : ''}
              `}
            >
              🔊
            </button>
          </div>
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
