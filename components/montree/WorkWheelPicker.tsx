// components/montree/WorkWheelPicker.tsx
// Wheel/drum-style picker for selecting works within a curriculum area
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { AREA_CONFIG } from '@/lib/montree/types';
import { getClassroomId } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';

interface Work {
  id: string;
  name: string;
  name_chinese?: string;
  status?: 'not_started' | 'presented' | 'practicing' | 'mastered' | 'completed';
  sequence?: number;
  dbSequence?: number;
}

interface WorkWheelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  area: string;
  works: Work[];
  currentWorkName?: string;
  onSelectWork: (work: Work, status: string) => void;
  onAddExtra?: (work: Work) => void;
  onWorkAdded?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  mastered: '#10b981',
  completed: '#10b981',
  practicing: '#3b82f6',
  presented: '#f59e0b',
};

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
  const { t } = useI18n();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newWorkName, setNewWorkName] = useState('');
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [positionSearch, setPositionSearch] = useState('');
  const positionSearchRef = useRef<HTMLInputElement>(null);

  const areaConfig = AREA_CONFIG[area] || AREA_CONFIG[area.replace('math', 'mathematics')] || {
    name: area, icon: '📋', color: '#888'
  };

  // Type-to-jump: scroll wheel to first matching work
  useEffect(() => {
    if (!searchText.trim() || works.length === 0) return;
    const needle = searchText.toLowerCase();
    const matchIdx = works.findIndex(w => w.name.toLowerCase().includes(needle));
    if (matchIdx >= 0 && matchIdx !== selectedIndex) {
      setSelectedIndex(matchIdx);
      scrollToIndex(matchIdx);
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, [searchText, works]);

  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
    } else {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && currentWorkName && works.length > 0) {
      const idx = works.findIndex(w =>
        w.name?.toLowerCase() === currentWorkName?.toLowerCase()
      );
      if (idx >= 0) {
        setSelectedIndex(idx);
        requestAnimationFrame(() => {
          scrollToIndex(idx, false);
          setTimeout(() => scrollToIndex(idx, false), 100);
        });
      }
    }
  }, [isOpen, currentWorkName, works]);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (wheelRef.current) {
      const itemHeight = 64;
      wheelRef.current.scrollTo({
        top: index * itemHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (wheelRef.current) {
      const itemHeight = 64;
      const newIndex = Math.round(wheelRef.current.scrollTop / itemHeight);
      const clampedIndex = Math.max(0, Math.min(newIndex, works.length - 1));
      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  }, [selectedIndex, works.length]);

  const handleSelectWork = () => {
    if (works[selectedIndex]) {
      onSelectWork(works[selectedIndex], works[selectedIndex].status || 'not_started');
      onClose();
    }
  };

  useEffect(() => {
    if (showAddForm && insertAfterIndex === null) {
      setInsertAfterIndex(selectedIndex);
    }
  }, [showAddForm, selectedIndex]);

  const handleAddWork = async () => {
    if (!newWorkName.trim()) return;
    const classroomId = getClassroomId();
    if (!classroomId) { toast.error('No classroom found'); return; }

    setIsAdding(true);
    try {
      const afterWork = insertAfterIndex !== null ? works[insertAfterIndex] : null;
      const afterSequence = afterWork?.dbSequence ?? afterWork?.sequence;
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
        onWorkAdded?.();
      } else {
        const err = await response.json().catch(() => ({ error: 'Failed to add work' }));
        toast.error(err.error || 'Failed to add work');
      }
    } catch (error) {
      console.error('Add work error:', error);
      toast.error('Failed to add work');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  if (!works || works.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
        <div className="text-center text-white p-8" onClick={e => e.stopPropagation()}>
          <div
            className="w-14 h-14 rounded-2xl inline-flex items-center justify-center text-white text-2xl mx-auto mb-3"
            style={{ backgroundColor: areaConfig.color }}
          >
            {areaConfig.icon}
          </div>
          <h2 className="font-semibold text-xl mb-1">{areaConfig.name}</h2>
          <p className="text-white/50 mb-6 text-sm">{t('workWheel.noWorksAvailable')}</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors text-sm"
          >
            + {t('workWheel.addFirstWork')}
          </button>
          <button onClick={onClose} className="block mx-auto mt-4 text-white/40 hover:text-white/70 text-sm">
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  const selectedWork = works[selectedIndex];
  const statusColor = selectedWork ? (STATUS_COLORS[selectedWork.status || ''] || null) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>

      {/* Header */}
      <div className="pt-[max(0.75rem,env(safe-area-inset-top))] px-5 pb-3 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between text-white">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 -ml-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="text-center">
            <div
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-white text-lg mx-auto mb-1"
              style={{ backgroundColor: areaConfig.color }}
            >
              {areaConfig.icon}
            </div>
            <h2 className="font-semibold text-base tracking-tight">{areaConfig.name}</h2>
          </div>
          <div className="w-10" />
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder={t('workWheel.typeToSearch')}
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white/8 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/30 focus:bg-white/12 text-sm transition-colors"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Wheel Container */}
      <div className="flex-1 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Fade overlays */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />

        {/* Selection highlight */}
        <div
          className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-[64px] rounded-2xl z-5 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${areaConfig.color}18, ${areaConfig.color}08)`,
            border: `1.5px solid ${areaConfig.color}40`,
          }}
        />

        {/* Scrollable wheel */}
        <div
          ref={wheelRef}
          className="h-full overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
          style={{ scrollSnapType: 'y mandatory' }}
        >
          <div style={{ height: 'calc(50% - 32px)' }} />
          {works.map((work, index) => {
            const distance = Math.abs(index - selectedIndex);
            const isSelected = distance === 0;
            const sc = isSelected ? 1 : distance === 1 ? 0.95 : 0.88;
            const op = isSelected ? 1 : distance === 1 ? 0.55 : 0.25;
            const sColor = STATUS_COLORS[work.status || ''] || null;

            return (
              <div
                key={work.id || index}
                className="h-[64px] flex items-center px-7 snap-center cursor-pointer"
                style={{ transform: `scale(${sc})`, opacity: op, transition: 'all 0.2s ease-out' }}
                onClick={() => {
                  if (index === selectedIndex) handleSelectWork();
                  else { setSelectedIndex(index); scrollToIndex(index); }
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  {/* Status dot */}
                  <div className="w-5 flex justify-center shrink-0">
                    {sColor ? (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sColor, boxShadow: `0 0 6px ${sColor}60` }} />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </div>

                  {/* Work name */}
                  <p className={`flex-1 truncate transition-all ${
                    isSelected
                      ? 'text-white font-semibold text-[15px]'
                      : 'text-white/80 font-normal text-sm'
                  }`}>
                    {work.name}
                  </p>

                  {/* Status label for selected */}
                  {isSelected && work.status && work.status !== 'not_started' && (
                    <span
                      className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: sColor || '#fff',
                        backgroundColor: (sColor || '#fff') + '18',
                      }}
                    >
                      {work.status === 'mastered' || work.status === 'completed' ? 'Mastered' :
                       work.status === 'practicing' ? 'Practicing' : 'Presented'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ height: 'calc(50% - 32px)' }} />
        </div>
      </div>

      {/* Bottom Action Area */}
      <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))] px-5 pt-3 shrink-0" onClick={e => e.stopPropagation()}>
        {showAddForm ? (
          <div className="bg-white/6 border border-white/10 rounded-2xl p-4 space-y-3">
            <input
              type="text"
              value={newWorkName}
              onChange={(e) => setNewWorkName(e.target.value)}
              placeholder={t('workWheel.workNamePlaceholder')}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-white/8 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/30 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newWorkName.trim()) handleAddWork();
                if (e.key === 'Escape') setShowAddForm(false);
              }}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setShowPositionPicker(true)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-medium bg-white/8 text-white/70 border border-white/10 flex items-center justify-center gap-1.5 truncate hover:bg-white/12 transition-colors"
              >
                <span className="truncate">After: {insertAfterIndex !== null ? works[insertAfterIndex]?.name || '?' : '?'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 opacity-40"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button
                onClick={() => setInsertAfterIndex(null)}
                className={`py-2.5 px-4 rounded-xl text-xs font-medium transition-colors ${
                  insertAfterIndex === null ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                {t('workWheel.endOfList')}
              </button>
            </div>

            {/* Position Picker */}
            {showPositionPicker && (
              <div className="fixed inset-0 bg-black/90 flex flex-col z-50" onClick={() => { setShowPositionPicker(false); setPositionSearch(''); }}>
                <div className="flex-1 flex flex-col max-w-lg mx-auto w-full" onClick={e => e.stopPropagation()}>
                  <div className="pt-[max(1rem,env(safe-area-inset-top))] px-5 pb-3 shrink-0">
                    <div className="flex items-center justify-between text-white">
                      <button onClick={() => { setShowPositionPicker(false); setPositionSearch(''); }} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                      <h2 className="font-semibold text-base">{t('workWheel.insertAfterPosition')}</h2>
                      <div className="w-10" />
                    </div>
                    <div className="mt-3 relative">
                      <input
                        ref={positionSearchRef}
                        type="text"
                        value={positionSearch}
                        onChange={e => setPositionSearch(e.target.value)}
                        placeholder={t('workWheel.typeToSearch')}
                        autoFocus
                        className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white/8 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-white/30 text-sm transition-colors"
                      />
                      <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                      </svg>
                      {positionSearch && (
                        <button onClick={() => setPositionSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {works
                      .map((work, idx) => ({ work, idx }))
                      .filter(({ work }) => !positionSearch.trim() || work.name.toLowerCase().includes(positionSearch.toLowerCase()))
                      .map(({ work, idx }) => {
                        const isSel = insertAfterIndex === idx;
                        return (
                          <button
                            key={work.id || idx}
                            onClick={() => { setInsertAfterIndex(idx); setShowPositionPicker(false); setPositionSearch(''); }}
                            className={`w-full text-left px-4 py-3 rounded-xl mb-1 flex items-center gap-3 transition-colors ${
                              isSel ? 'bg-white/12 border border-white/20' : 'border border-transparent hover:bg-white/6'
                            }`}
                          >
                            <span className="flex-1 text-white/90 text-sm font-medium truncate">{work.name}</span>
                            {isSel && (
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" className="shrink-0"><path d="M20 6L9 17l-5-5"/></svg>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddForm(false); setNewWorkName(''); }}
                className="flex-1 py-3 bg-white/8 text-white/60 font-medium rounded-xl text-sm hover:bg-white/12 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddWork}
                disabled={!newWorkName.trim() || isAdding}
                className="flex-1 py-3 font-semibold rounded-xl text-sm disabled:opacity-40 transition-colors text-white"
                style={{ backgroundColor: areaConfig.color }}
              >
                {isAdding ? t('common.adding') : t('workWheel.addWork')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Primary action */}
            <button
              onClick={() => {
                if (!selectedWork) return;
                if (onAddExtra) { onAddExtra(selectedWork); onClose(); }
                else { onSelectWork(selectedWork, selectedWork.status || 'not_started'); onClose(); }
              }}
              disabled={!selectedWork}
              className="w-full py-3.5 text-white font-semibold rounded-2xl text-[15px] active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ backgroundColor: areaConfig.color }}
            >
              {onAddExtra ? t('workWheel.addWork') : t('common.select')}
            </button>

            {/* Selected work name */}
            {selectedWork && (
              <p className="text-center text-white/40 text-xs tracking-wide">
                {selectedWork.name}
              </p>
            )}

            {/* Add custom work */}
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2 text-white/30 text-xs font-medium hover:text-white/60 transition-colors"
            >
              + {t('workWheel.addCustomWork').replace('{area}', areaConfig.name)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
