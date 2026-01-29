// components/montree/AreaSpinnerWheel.tsx
// iOS-style picker wheel for selecting works within an area
// Long-press on area emoji → wheel appears → swipe to select

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface SpinnerWork {
  id: string;
  name: string;
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered';
}

interface AreaSpinnerWheelProps {
  isOpen: boolean;
  onClose: () => void;
  area: string;
  areaIcon: string;
  areaLabel: string;
  works: SpinnerWork[];
  currentWorkId: string | null;
  onSelect: (work: SpinnerWork) => void;
}

// ============================================
// CONSTANTS
// ============================================

const ITEM_HEIGHT = 44; // Height of each item in pixels
const VISIBLE_ITEMS = 5; // Number of visible items in the wheel
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

// ============================================
// COMPONENT
// ============================================

export default function AreaSpinnerWheel({
  isOpen,
  onClose,
  area,
  areaIcon,
  areaLabel,
  works,
  currentWorkId,
  onSelect,
}: AreaSpinnerWheelProps) {
  // Find initial index
  const initialIndex = currentWorkId 
    ? works.findIndex(w => w.id === currentWorkId)
    : 0;
  
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, initialIndex));
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset selected index when works change or modal opens
  useEffect(() => {
    if (isOpen) {
      const idx = currentWorkId ? works.findIndex(w => w.id === currentWorkId) : 0;
      setSelectedIndex(Math.max(0, idx));
      setScrollOffset(0);
    }
  }, [isOpen, currentWorkId, works]);

  // Handle touch/mouse start
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
  }, []);

  // Handle touch/mouse move
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    
    const delta = startY - clientY;
    setScrollOffset(delta);
    
    // Calculate new index based on scroll
    const indexDelta = Math.round(delta / ITEM_HEIGHT);
    const newIndex = Math.max(0, Math.min(works.length - 1, selectedIndex + indexDelta));
    
    if (newIndex !== selectedIndex + indexDelta) {
      // Haptic feedback at boundaries (if available)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [isDragging, startY, selectedIndex, works.length]);

  // Handle touch/mouse end
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    const indexDelta = Math.round(scrollOffset / ITEM_HEIGHT);
    const newIndex = Math.max(0, Math.min(works.length - 1, selectedIndex + indexDelta));
    
    setSelectedIndex(newIndex);
    setScrollOffset(0);
    setIsDragging(false);
    
    // Haptic feedback on selection
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, [isDragging, scrollOffset, selectedIndex, works.length]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = (e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Handle confirm
  const handleConfirm = () => {
    if (works[selectedIndex]) {
      onSelect(works[selectedIndex]);
    }
    onClose();
  };

  // Calculate current visual offset
  const currentOffset = scrollOffset;
  const visualIndex = selectedIndex + (currentOffset / ITEM_HEIGHT);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={onClose}
              className="text-blue-500 font-medium px-2 py-1"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{areaIcon}</span>
              <span className="font-semibold text-gray-800">{areaLabel}</span>
            </div>
            <button
              onClick={handleConfirm}
              className="text-blue-500 font-semibold px-2 py-1"
            >
              Done
            </button>
          </div>

          {/* Wheel Container */}
          <div 
            ref={containerRef}
            className="relative overflow-hidden select-none"
            style={{ height: WHEEL_HEIGHT }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* Selection highlight bar */}
            <div 
              className="absolute left-0 right-0 bg-gray-100 pointer-events-none"
              style={{ 
                top: ITEM_HEIGHT * 2,
                height: ITEM_HEIGHT,
              }}
            />
            
            {/* Gradient overlays for depth effect */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />

            {/* Items */}
            <div 
              className="absolute inset-x-0 transition-transform"
              style={{ 
                transform: `translateY(${ITEM_HEIGHT * 2 - (visualIndex * ITEM_HEIGHT)}px)`,
                transitionDuration: isDragging ? '0ms' : '150ms',
              }}
            >
              {works.map((work, index) => {
                const distance = Math.abs(index - visualIndex);
                const opacity = Math.max(0.3, 1 - distance * 0.25);
                const scale = Math.max(0.85, 1 - distance * 0.05);
                
                return (
                  <div
                    key={work.id}
                    className="flex items-center justify-center px-4"
                    style={{ 
                      height: ITEM_HEIGHT,
                      opacity,
                      transform: `scale(${scale})`,
                    }}
                  >
                    <span className="text-lg text-gray-800 truncate max-w-[280px]">
                      {work.name}
                    </span>
                    {work.status && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                        {work.status === 'mastered' ? '✓' : 
                         work.status === 'practicing' ? '◐' :
                         work.status === 'presented' ? '○' : '—'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Safe area padding for iOS */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
