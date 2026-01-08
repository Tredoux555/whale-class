// components/sound-games/WordImage.tsx
// Displays DALL-E image with emoji fallback
// Created: Jan 8, 2026 - Fixed to use correct export name

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getWordImageUrl } from '@/lib/sound-games/word-images';

interface WordImageProps {
  word: string;
  emoji?: string;
  size?: number;
  className?: string;
}

// Simple version - just shows image (no emoji prop needed)
export function WordImageSimple({ word, size = 120, className = '' }: Omit<WordImageProps, 'emoji'>) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = getWordImageUrl(word);
  
  // If no image URL or image failed to load, show placeholder
  if (!imageUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-400 text-4xl">🖼️</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl animate-pulse"
        >
          <span className="text-gray-300 text-4xl">🖼️</span>
        </div>
      )}
      <Image
        src={imageUrl}
        alt={word}
        width={size}
        height={size}
        className={`object-contain rounded-xl transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.error(`Failed to load image for word: ${word}`);
          setImageError(true);
          setIsLoading(false);
        }}
        unoptimized // Supabase URLs don't need Next.js optimization
      />
    </div>
  );
}

// Full version with emoji fallback
export function WordImage({ word, emoji = '🖼️', size = 120, className = '' }: WordImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = getWordImageUrl(word);
  
  // If no image URL or image failed to load, show emoji
  if (!imageUrl || imageError) {
    return (
      <span 
        className={`flex items-center justify-center ${className}`}
        style={{ fontSize: `${size * 0.7}px`, width: size, height: size }}
        role="img"
        aria-label={word}
      >
        {emoji}
      </span>
    );
  }
  
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <span 
          className="absolute flex items-center justify-center"
          style={{ fontSize: `${size * 0.5}px` }}
        >
          {emoji}
        </span>
      )}
      <Image
        src={imageUrl}
        alt={word}
        width={size}
        height={size}
        className={`object-contain rounded-xl transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        unoptimized
      />
    </div>
  );
}
