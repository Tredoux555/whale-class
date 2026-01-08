// components/sound-games/WordImage.tsx
// Renders word images (Pixabay illustrations) with emoji fallback

'use client';

import Image from 'next/image';
import { getWordImage } from '@/lib/sound-games/word-images';

interface WordImageProps {
  word: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { container: 'w-16 h-16', image: 64, emoji: 'text-4xl' },
  md: { container: 'w-24 h-24', image: 96, emoji: 'text-6xl' },
  lg: { container: 'w-32 h-32', image: 128, emoji: 'text-7xl' },
  xl: { container: 'w-40 h-40', image: 160, emoji: 'text-8xl' },
};

export function WordImage({ word, size = 'lg', className = '' }: WordImageProps) {
  const { type, src } = getWordImage(word);
  const sizeConfig = SIZES[size];
  
  if (type === 'emoji') {
    return (
      <div className={`${sizeConfig.container} flex items-center justify-center ${className}`}>
        <span className={sizeConfig.emoji}>{src}</span>
      </div>
    );
  }
  
  return (
    <div className={`${sizeConfig.container} relative ${className}`}>
      <Image
        src={src}
        alt={word}
        fill
        className="object-contain"
        sizes={`${sizeConfig.image}px`}
      />
    </div>
  );
}

// Simple version that just returns img tag (for places where Next Image is overkill)
export function WordImageSimple({ word, size = 128, className = '' }: { word: string; size?: number; className?: string }) {
  const { type, src } = getWordImage(word);
  
  if (type === 'emoji') {
    return <span className={`text-7xl ${className}`}>{src}</span>;
  }
  
  return (
    <img
      src={src}
      alt={word}
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
