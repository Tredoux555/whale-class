'use client';

import { useState, useEffect, useRef } from 'react';
import { Work } from '../types';

export default function CurriculumPicker({
  areaId,
  areaName,
  icon,
  color,
  works,
  selectedWorkId,
  onSelect,
  onAddCustomWork,
}: {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  works: Work[];
  selectedWorkId: string | null;
  onSelect: (workId: string | null, workName?: string) => void;
  onAddCustomWork: (areaId: string, workName: string, afterSequence: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customWorkName, setCustomWorkName] = useState('');
  const [insertAfterIndex, setInsertAfterIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddCustom(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when showing add custom form
  useEffect(() => {
    if (showAddCustom && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showAddCustom, insertAfterIndex]);

  const selectedWork = works.find(w => w.id === selectedWorkId);
  const displayLabel = selectedWork?.name || 'Not started yet';

  // Filter works by search query
  const filteredWorks = searchQuery.trim()
    ? works.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : works;

  const handleAddCustomWork = () => {
    if (!customWorkName.trim()) return;
    const afterSeq = insertAfterIndex >= 0 ? works[insertAfterIndex]?.sequence || 0 : 0;
    onAddCustomWork(areaId, customWorkName.trim(), afterSeq);
    setCustomWorkName('');
    setShowAddCustom(false);
    setInsertAfterIndex(-1);
  };

  // Long press / right-click handler for sequence numbers
  const handleNumberContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setInsertAfterIndex(index);
    setShowAddCustom(true);
    setCustomWorkName('');
  };

  const handleNumberTouchStart = (index: number) => {
    longPressTimerRef.current = setTimeout(() => {
      setInsertAfterIndex(index);
      setShowAddCustom(true);
      setCustomWorkName('');
    }, 500); // 500ms long press
  };

  const handleNumberTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left flex items-center gap-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors shadow-sm"
        style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
      >
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">{areaName}</p>
          <p className="text-slate-700 font-medium truncate">{displayLabel}</p>
        </div>
        <span className="text-slate-400 text-sm">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search Bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${areaName.toLowerCase()}...`}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 text-sm placeholder-slate-400 focus:border-blue-400 outline-none"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Not started option (only show when not searching) */}
            {!searchQuery && (
              <button
                onClick={() => { onSelect(null); setIsOpen(false); setSearchQuery(''); }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 ${
                  selectedWorkId === null ? 'bg-blue-50' : ''
                }`}
              >
                <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-400">—</span>
                <span className="text-slate-500 flex-1">Not started yet</span>
                {selectedWorkId === null && <span className="text-blue-500">✓</span>}
              </button>
            )}

            {/* Works list */}
            {filteredWorks.length === 0 && searchQuery && (
              <div className="px-4 py-6 text-center text-slate-400 text-sm">
                No works matching &quot;{searchQuery}&quot;
              </div>
            )}

            {filteredWorks.map((work) => {
              const originalIndex = works.findIndex(w => w.id === work.id);
              return (
                <div key={work.id} className="relative">
                  <div
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 ${
                      selectedWorkId === work.id ? 'bg-blue-50' : ''
                    } border-b border-slate-50 cursor-pointer`}
                    onClick={() => { onSelect(work.id, work.name); setIsOpen(false); setSearchQuery(''); }}
                  >
                    {/* Sequence number - long press or right click to add work after */}
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-400 hover:ring-offset-1 transition-all active:scale-95"
                      style={{ backgroundColor: color }}
                      title="Long press or right-click to add work after this"
                      onContextMenu={(e) => handleNumberContextMenu(e, originalIndex)}
                      onTouchStart={() => handleNumberTouchStart(originalIndex)}
                      onTouchEnd={handleNumberTouchEnd}
                      onTouchCancel={handleNumberTouchEnd}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {originalIndex + 1}
                    </span>
                    <span className={`flex-1 truncate ${work.isCustom ? 'text-amber-600' : 'text-slate-700'}`}>
                      {work.name}
                      {work.isCustom && <span className="text-xs ml-1 opacity-60">(custom)</span>}
                    </span>
                    {selectedWorkId === work.id && <span className="text-blue-500">✓</span>}
                  </div>

                  {showAddCustom && insertAfterIndex === originalIndex && (
                    <div className="px-4 py-3 bg-amber-50 border-y border-amber-200">
                      <p className="text-amber-700 text-xs mb-2 font-medium">
                        ➕ Add work after &quot;{work.name}&quot;
                      </p>
                      <input
                        ref={customInputRef}
                        type="text"
                        value={customWorkName}
                        onChange={(e) => setCustomWorkName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && customWorkName.trim()) {
                            handleAddCustomWork();
                          } else if (e.key === 'Escape') {
                            setShowAddCustom(false);
                            setInsertAfterIndex(-1);
                          }
                        }}
                        placeholder="Enter custom work name..."
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm placeholder-slate-400 mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddCustomWork}
                          disabled={!customWorkName.trim()}
                          className="flex-1 py-2 bg-amber-500 text-white text-sm rounded-lg font-medium disabled:opacity-50"
                        >
                          Add Work
                        </button>
                        <button
                          onClick={() => { setShowAddCustom(false); setInsertAfterIndex(-1); }}
                          className="px-3 py-2 bg-slate-200 text-slate-600 text-sm rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {showAddCustom && insertAfterIndex === -1 && (
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                <input
                  type="text"
                  value={customWorkName}
                  onChange={(e) => setCustomWorkName(e.target.value)}
                  placeholder="Enter custom work name..."
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-700 text-sm placeholder-slate-400 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCustomWork}
                    className="flex-1 py-2 bg-amber-500 text-white text-sm rounded-lg font-medium"
                  >
                    Add at Beginning
                  </button>
                  <button
                    onClick={() => { setShowAddCustom(false); setInsertAfterIndex(-1); }}
                    className="px-3 py-2 bg-slate-200 text-slate-600 text-sm rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add Custom Work Footer */}
          <div className="border-t border-slate-100 p-2 bg-slate-50">
            <p className="text-slate-400 text-xs mb-1 px-2">Can&apos;t find the work? Add custom:</p>
            <div className="flex gap-1 flex-wrap mb-2">
              <button
                onClick={() => { setShowAddCustom(true); setInsertAfterIndex(-1); }}
                className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200"
              >
                + At Beginning
              </button>
              {works.length > 0 && (
                <button
                  onClick={() => { setShowAddCustom(true); setInsertAfterIndex(works.length - 1); }}
                  className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg hover:bg-amber-200"
                >
                  + At End
                </button>
              )}
            </div>
            <p className="text-slate-400 text-xs px-2 flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: color }}>•</span>
              <span>Long-press or right-click a number to insert after it</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
