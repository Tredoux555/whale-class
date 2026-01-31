// components/montree/WorkWheelPicker.tsx
// Wheel/drum-style picker for selecting works within a curriculum area
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered';
  sequence?: number;
}

interface WorkWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  area: string;
  works: Work[];
  currentWorkName?: string;
  onSelectWork: (work: Work, status: string) => void;
}

export default function WorkWheelPicker({
  isOpen,
  onClose,
  area,
  works,
  currentWorkName,
  onSelectWork,
}: WorkWheelPickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const areaConfig = AREA_CONFIG[area] || AREA_CONFIG[area.replace('math', 'mathematics')] || {
    name: area, icon: '📋', color: '#888'
  };

  // Find initial index based on currentWorkName
  useEffect(() => {
    if (isOpen && currentWorkName && works.length > 0) {
      const idx = works.findIndex(w =>
        w.name?.toLowerCase() === currentWorkName?.toLowerCase()
      );
      if (idx >= 0) {
        setSelectedIndex(idx);
        // Scroll to position after render
        setTimeout(() => scrollToIndex(idx, false), 50);
      }
    }
  }, [isOpen, currentWorkName, works]);


  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (wheelRef.current) {
      const itemHeight = 80; // Height of each work item
      const scrollPos = index * itemHeight;
      wheelRef.current.scrollTo({
        top: scrollPos,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Handle scroll end to snap to nearest item
  const handleScroll = useCallback(() => {
    if (wheelRef.current) {
      const itemHeight = 80;
      const scrollTop = wheelRef.current.scrollTop;
      const newIndex = Math.round(scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, works.length - 1));

      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  }, [selectedIndex, works.length]);

  // Handle work selection - simple: just select and default to not_started
  const handleSelectWork = () => {
    if (works[selectedIndex]) {
      onSelectWork(works[selectedIndex], 'not_started');
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedWork = works[selectedIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-white">
          <button onClick={onClose} className="p-2 -ml-2">
            <span className="text-2xl">✕</span>
          </button>
          <div className="text-center">
            <span className="text-3xl">{areaConfig.icon}</span>
            <h2 className="font-bold text-lg">{areaConfig.name}</h2>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Wheel Container */}
      <div
        className="flex-1 relative overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient overlays for fade effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

        {/* Selection highlight - centered in container */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[80px] bg-white/15 rounded-2xl border-2 border-white/40 z-5 pointer-events-none" />

        {/* Scrollable wheel */}
        <div
          ref={wheelRef}
          className="flex-1 overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
          style={{
            scrollSnapType: 'y mandatory'
          }}
        >
          {/* Top spacer to center first item */}
          <div style={{ height: 'calc(50% - 40px)' }} />
          {works.map((work, index) => {
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
            const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8;

            return (
              <div
                key={work.id || index}
                className="h-[80px] flex items-center justify-center px-6 snap-center cursor-pointer"
                style={{
                  transform: `scale(${scale})`,
                  transition: 'transform 0.2s'
                }}
                onClick={() => {
                  if (index === selectedIndex) {
                    handleSelectWork();
                  } else {
                    setSelectedIndex(index);
                    scrollToIndex(index);
                  }
                }}
              >
                <div className={`flex items-center gap-3 w-full max-w-md transition-opacity duration-200 ${
                  distance === 0 ? 'opacity-100' : distance === 1 ? 'opacity-70' : 'opacity-40'
                }`}>
                  {/* Status indicator */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg
                    ${work.status === 'mastered' || work.status === 'completed' ? 'bg-emerald-500 text-white' :
                      work.status === 'practicing' ? 'bg-blue-500 text-white' :
                      work.status === 'presented' ? 'bg-amber-500 text-white' :
                      'bg-white/30 text-white'}`}
                  >
                    {work.status === 'mastered' || work.status === 'completed' ? '✓' :
                     work.status === 'practicing' ? 'Pr' :
                     work.status === 'presented' ? 'P' : '○'}
                  </div>

                  {/* Work name */}
                  <div className="flex-1">
                    <p className={`font-semibold text-white ${distance === 0 ? 'text-lg' : 'text-base'}`}>
                      {work.name}
                    </p>
                  </div>

                  {/* Sequence number */}
                  {work.sequence && (
                    <span className="text-white/60 text-sm font-medium">#{work.sequence}</span>
                  )}
                </div>
              </div>
            );
          })}
          {/* Bottom spacer to center last item */}
          <div style={{ height: 'calc(50% - 40px)' }} />
        </div>
      </div>

      {/* Bottom Action Area - Simplified: just Select button */}
      <div
        className="pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pt-4"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleSelectWork}
          disabled={!selectedWork}
          className="w-full py-4 bg-white text-emerald-600 font-bold rounded-2xl text-lg active:scale-98 transition-transform disabled:opacity-50"
        >
          Select "{selectedWork?.name?.substring(0, 20)}{selectedWork?.name && selectedWork.name.length > 20 ? '...' : ''}"
        </button>
      </div>
    </div>
  );
}
