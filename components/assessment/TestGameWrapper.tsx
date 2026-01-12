// components/assessment/TestGameWrapper.tsx
// Shared wrapper for all test games with consistent UI

'use client';

import React, { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  skillName: string;
  currentItem: number;
  totalItems: number;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  onReady?: () => void;
}

export default function TestGameWrapper({
  children,
  skillName,
  currentItem,
  totalItems,
  gradientFrom,
  gradientVia,
  gradientTo,
  onReady
}: Props) {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Brief intro then start
    const timer = setTimeout(() => {
      setShowIntro(false);
      onReady?.();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [onReady]);

  if (showIntro) {
    return (
      <div 
        className={`relative flex flex-col h-full items-center justify-center bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo}`}
      >
        <div className="text-8xl mb-4 animate-bounce">🎮</div>
        <h2 className="text-3xl font-bold text-white mb-2">Get Ready!</h2>
        <p className="text-white/80 text-xl">{skillName}</p>
      </div>
    );
  }

  return (
    <div 
      className={`relative flex flex-col h-full bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo}`}
    >
      {/* Item counter - top right */}
      <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white font-bold text-sm">
          {currentItem} / {totalItems}
        </span>
      </div>
      
      {/* Game content */}
      {children}
    </div>
  );
}
