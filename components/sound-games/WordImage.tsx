// components/sound-games/WordImage.tsx
// Displays DALL-E image with professional styling
// Updated: Jan 8, 2026 - Improved sizing and visual design

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

// Simple version - professional image display for games
export function WordImageSimple({ word, size = 120, className = '' }: Omit<WordImageProps, 'emoji'>) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = getWordImageUrl(word);
  
  // If no image URL or image failed to load, show placeholder
  if (!imageUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-inner ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-gray-400 text-4xl">🖼️</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl bg-white shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse"
        >
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={imageUrl}
        alt={word}
        width={size}
        height={size}
        className={`w-full h-full object-cover transition-all duration-300 ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.error(`Failed to load image for word: ${word}`);
          setImageError(true);
          setIsLoading(false);
        }}
        unoptimized
      />
    </div>
  );
}

// Game card version - for 2x2 option grids
export function WordImageCard({ word, size = 140, className = '' }: Omit<WordImageProps, 'emoji'>) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const imageUrl = getWordImageUrl(word);
  
  // If no image URL or image failed to load, show placeholder
  if (!imageUrl || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-slate-300" style={{ fontSize: size * 0.4 }}>🖼️</span>
      </div>
    );
  }
  
  return (
    <div 
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-400 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={imageUrl}
        alt={word}
        width={size}
        height={size}
        className={`w-full h-full object-cover transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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

// Full version with emoji fallback (legacy support)
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
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ width: size, height: size }}
    >
      {isLoading && (
        <span 
          className="absolute inset-0 flex items-center justify-center bg-gray-50"
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
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
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
