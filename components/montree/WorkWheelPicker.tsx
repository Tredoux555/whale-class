// components/montree/WorkWheelPicker.tsx
// Wheel/drum-style picker for selecting works within a curriculum area
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';
import { getClassroomId } from '@/lib/montree/auth';

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered' | 'completed';
  sequence?: number;
}

interface WorkWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  area: string;
  works: Work[];
  currentWorkName?: string;
  onSelectWork: (work: Work, status: string) => void;
  onAddExtra?: (work: Work) => void; // Add as extra work (not focus)
  onWorkAdded?: () => void; // Callback to refresh curriculum after adding
}

export default function WorkWheelPicker({
  isOpen,
  onClose,
  area,
  works,
  currentWorkName,
  onSelectWork,
  onAddExtra,
  onWorkAdded,
}: WorkWheelPickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Add Work form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkName, setNewWorkName] = useState('');
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null); // null = end of list
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

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
        // Scroll after DOM has rendered the items - use multiple attempts for reliability
        requestAnimationFrame(() => {
          scrollToIndex(idx, false);
          // Second attempt after scroll container is fully ready
          setTimeout(() => scrollToIndex(idx, false), 100);
        });
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

  // Initialize insert position to current selection when form opens
  useEffect(() => {
    if (showAddForm && insertAfterIndex === null) {
      setInsertAfterIndex(selectedIndex);
    }
  }, [showAddForm, selectedIndex]);

  // Handle adding a new work
  const handleAddWork = async () => {
    if (!newWorkName.trim()) return;

    const classroomId = getClassroomId();
    if (!classroomId) {
      alert('No classroom found');
      return;
    }

    setIsAdding(true);
    try {
      // Get the sequence number from the selected position
      const afterWork = insertAfterIndex !== null ? works[insertAfterIndex] : null;
      const afterSequence = afterWork?.sequence;

      const response = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          name: newWorkName.trim(),
          area_key: area,
          after_sequence: afterSequence,
          is_custom: true,
        }),
      });

      if (response.ok) {
        setNewWorkName('');
        setShowAddForm(false);
        setInsertAfterIndex(null);
        onWorkAdded?.(); // Trigger refresh
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to add work');
      }
    } catch (error) {
      console.error('Add work error:', error);
      alert('Failed to add work');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  // Handle empty works array
  if (!works || works.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
        onClick={onClose}
      >
        <div className="text-center text-white p-8" onClick={e => e.stopPropagation()}>
          <span className="text-5xl mb-4 block">{areaConfig.icon}</span>
          <h2 className="font-bold text-xl mb-2">{areaConfig.name}</h2>
          <p className="text-white/70 mb-6">No works available in this area yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-white/20 rounded-xl text-white font-semibold hover:bg-white/30 transition-colors"
          >
            ➕ Add First Work
          </button>
          <button
            onClick={onClose}
            className="block mx-auto mt-4 text-white/60 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

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

      {/* Bottom Action Area */}
      <div
        className="pb-[max(1rem,env(safe-area-inset-bottom))] px-4 pt-4 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Add Work Form - expandable */}
        {showAddForm ? (
          <div className="bg-white/10 rounded-2xl p-4 space-y-3">
            <input
              type="text"
              value={newWorkName}
              onChange={(e) => setNewWorkName(e.target.value)}
              placeholder="Work name..."
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newWorkName.trim()) handleAddWork();
                if (e.key === 'Escape') setShowAddForm(false);
              }}
            />

            {/* Position selector - tap to open picker */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPositionPicker(true)}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors bg-white/20 text-white border border-white/30 flex items-center justify-center gap-2"
              >
                <span>After #{insertAfterIndex !== null ? works[insertAfterIndex]?.sequence || '?' : '?'}</span>
                <span className="text-white/60">▼</span>
              </button>
              <button
                onClick={() => setInsertAfterIndex(null)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  insertAfterIndex === null
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                End of list
              </button>
            </div>

            {/* Position Picker Modal */}
            {showPositionPicker && (
              <div className="absolute inset-0 bg-black/80 rounded-2xl flex flex-col z-10">
                <div className="p-3 border-b border-white/20 flex items-center justify-between">
                  <span className="text-white font-medium">Insert after position...</span>
                  <button
                    onClick={() => setShowPositionPicker(false)}
                    className="text-white/60 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto max-h-48">
                  {works.map((work, idx) => (
                    <button
                      key={work.id || idx}
                      onClick={() => {
                        setInsertAfterIndex(idx);
                        setShowPositionPicker(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm border-b border-white/10 flex items-center gap-3 ${
                        insertAfterIndex === idx ? 'bg-emerald-500/30 text-white' : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-white/50 w-8">#{work.sequence}</span>
                      <span className="flex-1 truncate">{work.name}</span>
                      {insertAfterIndex === idx && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddForm(false); setNewWorkName(''); }}
                className="flex-1 py-3 bg-white/20 text-white font-medium rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWork}
                disabled={!newWorkName.trim() || isAdding}
                className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add Work'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Add Work button - click highlighted work to change focus */}
            <button
              onClick={() => {
                if (selectedWork && onAddExtra) {
                  onAddExtra(selectedWork);
                  onClose();
                }
              }}
              disabled={!selectedWork || !onAddExtra}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl text-lg active:scale-98 transition-transform disabled:opacity-50"
            >
              Add Work
            </button>

            {/* Selected work name display */}
            <p className="text-center text-white/80 text-sm mt-1">
              {selectedWork?.name?.substring(0, 30)}{selectedWork?.name && selectedWork.name.length > 30 ? '...' : ''}
            </p>

            {/* Add custom work link */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              + Add custom work to {areaConfig.name}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
