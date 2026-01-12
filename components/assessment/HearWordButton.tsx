// components/assessment/HearWordButton.tsx
// Small speaker button to hear a word - for picture-based tests

'use client';

import React, { useState } from 'react';
import { GameAudio } from '@/lib/games/audio-paths';

interface Props {
  word: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function HearWordButton({ word, size = 'small', className = '' }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  const sizeClasses = {
    small: 'w-8 h-8 text-lg',
    medium: 'w-10 h-10 text-xl',
    large: 'w-12 h-12 text-2xl',
  };

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger parent click
    if (isPlaying) return;

    setIsPlaying(true);
    try {
      await GameAudio.play(`/audio-new/words/${word.toLowerCase()}.mp3`);
    } catch (err) {
      console.error('Error playing word audio:', err);
    }
    setIsPlaying(false);
  };

  return (
    <button
      onClick={handlePlay}
      disabled={isPlaying}
      className={`
        ${sizeClasses[size]}
        rounded-full bg-blue-500 hover:bg-blue-600 
        flex items-center justify-center
        transition-all shadow-md
        ${isPlaying ? 'animate-pulse scale-110' : 'hover:scale-110'}
        ${className}
      `}
      title={`Hear "${word}"`}
    >
      🔊
    </button>
  );
}
