// components/assessment/ReadingSentencesTestGame.tsx
// Sentence Reading test - Teacher-assisted
// Child reads Pink Series sentence aloud, teacher marks correct/incorrect

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRandomSentences, PINK_SENTENCES } from '@/lib/assessment/reading-data';
import { GameAudio } from '@/lib/games/audio-paths';
import ItemProgress from './ItemProgress';

interface SentenceData {
  id: number;
  text: string;
  audioPath: string;
  words: string[];
}

interface ItemResult {
  sentence: string;
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

export default function ReadingSentencesTestGame({ 
  itemCount = 5, 
  onComplete,
  onProgress 
}: Props) {
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [testStartTime] = useState<number>(Date.now());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showButtons, setShowButtons] = useState(true);

  useEffect(() => {
    const selectedSentences = getRandomSentences(itemCount);
    setSentences(selectedSentences);
    setRoundStartTime(Date.now());
  }, [itemCount]);

  const playSentence = async (audioPath: string) => {
    setIsPlaying(true);
    try {
      await GameAudio.play(audioPath);
    } catch (err) {
      console.error('Error playing sentence:', err);
    }
    setIsPlaying(false);
  };

  const handleMark = async (correct: boolean) => {
    const currentSentence = sentences[currentIndex];
    if (!currentSentence) return;

    setShowButtons(false);
    const timeMs = Date.now() - roundStartTime;

    const itemResult: ItemResult = {
      sentence: currentSentence.text,
      correct,
      timeMs
    };
    
    const newResults = [...results, itemResult];
    setResults(newResults);

    // Play feedback
    if (correct) {
      await GameAudio.playCorrect();
    }

    // Short delay then next
    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      
      if (nextIndex >= sentences.length) {
        const correctCount = newResults.filter(r => r.correct).length;
        const durationSeconds = Math.round((Date.now() - testStartTime) / 1000);
        
        onComplete({
          skillCode: 'reading_sentences',
          skillName: 'Sentence Reading',
          correctCount,
          totalCount: newResults.length,
          itemsData: newResults,
          durationSeconds
        });
      } else {
        setCurrentIndex(nextIndex);
        setRoundStartTime(Date.now());
        setShowButtons(true);
        onProgress?.(nextIndex + 1, sentences.length);
      }
    }, 800);
  };

  const currentSentence = sentences[currentIndex];
  if (!currentSentence) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-4xl animate-pulse">🐋</div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-gradient-to-br from-sky-400 via-blue-400 to-indigo-400 p-4">
      <ItemProgress current={currentIndex + 1} total={sentences.length} />

      {/* Instructions for teacher */}
      <div className="bg-white/20 rounded-xl p-3 mb-4">
        <p className="text-white text-sm text-center">
          👨‍🏫 Teacher: Ask child to read the sentence. Mark if correct.
        </p>
      </div>

      {/* Sentence display */}
      <div className="flex-1 flex flex-col items-center justify-center mb-4">
        <div className="bg-white rounded-3xl px-8 py-6 shadow-2xl mb-6 max-w-md">
          <p 
            className="text-4xl font-bold text-gray-800 text-center leading-relaxed"
            style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
          >
            {currentSentence.text}
          </p>
        </div>
        
        {/* Hear sentence button (for teacher verification) */}
        <button
          onClick={() => playSentence(currentSentence.audioPath)}
          disabled={isPlaying}
          className={`flex items-center gap-2 px-6 py-3 bg-white/30 rounded-full text-white font-medium transition-transform ${
            isPlaying ? 'animate-pulse' : 'hover:scale-105'
          }`}
        >
          <span className="text-2xl">🔊</span>
          <span>{isPlaying ? 'Playing...' : 'Hear Sentence'}</span>
        </button>
      </div>

      {/* Teacher marking buttons */}
      {showButtons && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleMark(true)}
            className="py-6 rounded-2xl bg-green-500 hover:bg-green-400 text-white font-bold text-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-3xl">✅</span>
            <span>Read It!</span>
          </button>
          
          <button
            onClick={() => handleMark(false)}
            className="py-6 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <span className="text-3xl">🔄</span>
            <span>Tried</span>
          </button>
        </div>
      )}
    </div>
  );
}
