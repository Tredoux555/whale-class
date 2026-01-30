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

const STATUS_OPTIONS = [
  { key: 'presented', label: 'Present', icon: 'P', color: 'bg-amber-400' },
  { key: 'practicing', label: 'Practice', icon: 'Pr', color: 'bg-blue-400' },
  { key: 'mastered', label: 'Master', icon: '✓', color: 'bg-emerald-500' },
];

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
  const [showStatusPicker, setShowStatusPicker] = useState(false);

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

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setShowStatusPicker(false);
    }
  }, [isOpen]);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (wheelRef.current) {
      const itemHeight = 72; // Height of each work item
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
      const itemHeight = 72;
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

  // Handle work selection (tap on center item)
  const handleSelectWork = () => {
    if (works[selectedIndex]) {
      setShowStatusPicker(true);
    }
  };

  // Handle status selection
  const handleStatusSelect = (status: string) => {
    if (works[selectedIndex]) {
      onSelectWork(works[selectedIndex], status);
      setShowStatusPicker(false);
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
        className="flex-1 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient overlays for fade effect */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

        {/* Selection highlight */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-[72px] bg-white/10 rounded-2xl border-2 border-white/30 z-5 pointer-events-none" />

        {/* Scrollable wheel */}
        <div
          ref={wheelRef}
          className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          onScroll={handleScroll}
          style={{
            paddingTop: 'calc(50% - 36px)',
            paddingBottom: 'calc(50% - 36px)',
            scrollSnapType: 'y mandatory'
          }}
        >
          {works.map((work, index) => {
            const distance = Math.abs(index - selectedIndex);
            const opacity = distance === 0 ? 1 : distance === 1 ? 0.6 : 0.3;
            const scale = distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8;

            return (
              <div
                key={work.id || index}
                className="h-[72px] flex items-center justify-center px-6 snap-center cursor-pointer"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: 'opacity 0.2s, transform 0.2s'
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
                <div className="flex items-center gap-3 w-full max-w-md">
                  {/* Status indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${work.status === 'mastered' ? 'bg-emerald-500 text-white' :
                      work.status === 'practicing' ? 'bg-blue-400 text-white' :
                      work.status === 'presented' ? 'bg-amber-400 text-amber-900' :
                      'bg-white/20 text-white/60'}`}
                  >
                    {work.status === 'mastered' ? '✓' :
                     work.status === 'practicing' ? 'Pr' :
                     work.status === 'presented' ? 'P' : '○'}
                  </div>

                  {/* Work name */}
                  <div className="flex-1 text-white">
                    <p className={`font-medium ${distance === 0 ? 'text-lg' : 'text-base'}`}>
                      {work.name}
                    </p>
                    {work.name_chinese && distance === 0 && (
                      <p className="text-sm text-white/60">{work.name_chinese}</p>
                    )}
                  </div>

                  {/* Sequence number */}
                  {work.sequence && (
                    <span className="text-white/40 text-sm">#{work.sequence}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Area */}
      <div
        className="pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pt-4"
        onClick={e => e.stopPropagation()}
      >
        {showStatusPicker ? (
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <p className="text-center text-gray-800 font-medium">
              {selectedWork?.name}
            </p>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => handleStatusSelect(opt.key)}
                  className={`flex-1 py-3 rounded-xl font-semibold text-white ${opt.color} active:scale-95 transition-transform`}
                >
                  <span className="text-lg mr-1">{opt.icon}</span>
                  <span className="text-sm">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStatusPicker(false)}
              className="w-full py-2 text-gray-500 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleSelectWork}
            disabled={!selectedWork}
            className="w-full py-4 bg-white text-emerald-600 font-bold rounded-2xl text-lg active:scale-98 transition-transform disabled:opacity-50"
          >
            Select "{selectedWork?.name?.substring(0, 20)}{selectedWork?.name && selectedWork.name.length > 20 ? '...' : ''}"
          </button>
        )}
      </div>
    </div>
  );
}
