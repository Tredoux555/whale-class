// components/assessment/MiddleTestGame.tsx
// Middle Sounds test - "What sound is in the MIDDLE?"
// Child hears the word, taps the letter for the middle vowel sound

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { GameAudio } from '@/lib/games/audio-paths';
import ItemProgress from './ItemProgress';

interface ItemResult {
  item: string;
  targetSound: string;
  correct: boolean;
  selectedSound: string;
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
  word: CVCWord;
  options: string[]; // 4 letters: correct vowel + 3 distractors
}

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w'];

export default function MiddleTestGame({ 
  itemCount = 4, 
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

  // Generate distractor letters (mix of consonants, not the correct vowel)
  const getDistractors = useCallback((correctVowel: string): string[] => {
    // Get 3 random consonants as distractors
    const shuffledConsonants = [...CONSONANTS].sort(() => Math.random() - 0.5);
    return shuffledConsonants.slice(0, 3);
  }, []);

  const generateAllRounds = useCallback((): GameRound[] => {
    const allRounds: GameRound[] = [];
    const usedWords = new Set<string>();
    
    // Shuffle vowels to get variety
    const shuffledVowels = [...VOWELS].sort(() => Math.random() - 0.5);
    
    for (const vowel of shuffledVowels) {
      if (allRounds.length >= itemCount) break;
      
      const vowelWords = CVC_WORDS.filter(w => 
        w.middleSound === vowel && !usedWords.has(w.word)
      );
      
      if (vowelWords.length > 0) {
        const randomWord = vowelWords[Math.floor(Math.random() * vowelWords.length)];
        usedWords.add(randomWord.word);
        
        const distractors = getDistractors(vowel);
        const options = [vowel, ...distractors].sort(() => Math.random() - 0.5);
        
        allRounds.push({ word: randomWord, options });
      }
    }
    
    // Fill remaining if needed
    while (allRounds.length < itemCount) {
      const remaining = CVC_WORDS.filter(w => !usedWords.has(w.word));
      if (remaining.length === 0) break;
      
      const randomWord = remaining[Math.floor(Math.random() * remaining.length)];
      usedWords.add(randomWord.word);
      
      const distractors = getDistractors(randomWord.middleSound);
      const options = [randomWord.middleSound, ...distractors].sort(() => Math.random() - 0.5);
      
      allRounds.push({ word: randomWord, options });
    }
    
    return allRounds.sort(() => Math.random() - 0.5);
  }, [itemCount, getDistractors]);

  useEffect(() => {
    const generatedRounds = generateAllRounds();
    setRounds(generatedRounds);
    setRoundStartTime(Date.now());
    
    // Play the first word after a short delay
    setTimeout(() => {
      if (generatedRounds[0]) {
        playWord(generatedRounds[0].word.word);
      }
    }, 500);
    
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, [generateAllRounds]);

  const playWord = async (word: string) => {
    GameAudio.stop();
    setIsPlaying(true);
    try {
      // Play the full word
      await GameAudio.play(`/audio-new/words/${word}.mp3`);
    } catch (err) {
      console.error('Error playing word:', err);
    }
    setIsPlaying(false);
  };

  const handleSelect = async (selectedLetter: string) => {
    if (showFeedback || isPlaying) return;
    
    const currentRound = rounds[currentIndex];
    if (!currentRound) return;

    const isCorrect = selectedLetter === currentRound.word.middleSound;
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      item: currentRound.word.word,
      targetSound: currentRound.word.middleSound,
      correct: isCorrect,
      selectedSound: selectedLetter,
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
          skillCode: 'middle_sounds',
          skillName: 'Middle Sounds',
          correctCount,
          totalCount: newResults.length,
          itemsData: newResults,
          durationSeconds
        });
      } else {
        setCurrentIndex(nextIndex);
        setRoundStartTime(Date.now());
        onProgress?.(nextIndex + 1, rounds.length);
        
        // Play next word
        setTimeout(() => {
          if (rounds[nextIndex]) {
            playWord(rounds[nextIndex].word.word);
          }
        }, 300);
      }
    }, 1200);
  };

  const handleReplay = () => {
    if (!isPlaying && !showFeedback && rounds[currentIndex]) {
      playWord(rounds[currentIndex].word.word);
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
    <div className="relative flex flex-col h-full bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 p-4">
      <ItemProgress current={currentIndex + 1} total={rounds.length} />

      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <p className="text-white text-xl mb-4 font-medium">
          What sound is in the MIDDLE? 🎵
        </p>
        
        {/* Big speaker button to hear the word */}
        <button
          onClick={handleReplay}
          disabled={isPlaying || showFeedback}
          className={`bg-white rounded-3xl p-8 shadow-xl mb-4 transition-transform ${
            isPlaying ? 'animate-pulse scale-105' : 'hover:scale-105'
          }`}
        >
          <span className="text-8xl">🔊</span>
        </button>
        
        <p className="text-white/80 text-lg">
          {isPlaying ? 'Listen to the word...' : 'Tap to hear the word'}
        </p>
      </div>

      {/* Letter options - 2x2 grid */}
      <div className="grid grid-cols-2 gap-4">
        {currentRound.options.map((letter, index) => {
          const isCorrectAnswer = showFeedback && letter === currentRound.word.middleSound;
          
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
              <span className="text-7xl font-bold text-gray-800 assessment-letter">
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
