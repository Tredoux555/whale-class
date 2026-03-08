'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AREA_CONFIG } from '@/lib/montree/types';
import { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { useI18n } from '@/lib/montree/i18n';

interface WorkItem {
  id?: string;
  name: string;
  name_chinese?: string;
  area_id?: string;
}

interface SearchResult {
  work: WorkItem;
  areaKey: string;
  areaName: string;
  areaColor: string;
  areaIcon: string;
}

interface WorkSearchBarProps {
  curriculum: Record<string, WorkItem[]>;
  onSelectWork: (work: WorkItem, areaKey: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  maxResults?: number;
}

export default function WorkSearchBar({
  curriculum,
  onSelectWork,
  onFocus,
  placeholder: placeholderProp,
  maxResults = 8,
}: WorkSearchBarProps) {
  const { t } = useI18n();
  const placeholder = placeholderProp || t('weekview.findWork');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  // Search across all areas
  const results = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    const matches: SearchResult[] = [];

    for (const [areaKey, works] of Object.entries(curriculum)) {
      const normalized = normalizeArea(areaKey);
      const config = AREA_CONFIG[normalized] || { name: areaKey, icon: '?', color: '#888' };

      for (const work of works) {
        if (
          work.name.toLowerCase().includes(q) ||
          (work.name_chinese && work.name_chinese.toLowerCase().includes(q))
        ) {
          matches.push({
            work,
            areaKey: normalized,
            areaName: config.name,
            areaColor: config.color,
            areaIcon: config.icon,
          });
          if (matches.length >= maxResults) return matches;
        }
      }
    }
    return matches;
  }, [debouncedQuery, curriculum, maxResults]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focus when results change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [results]);

  const selectResult = useCallback((result: SearchResult) => {
    onSelectWork(result.work, result.areaKey);
    setQuery('');
    setDebouncedQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onSelectWork]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      selectResult(results[focusedIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-emerald-300 transition-all">
        <span className="text-gray-400 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (query.trim()) setIsOpen(true); onFocus?.(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 w-32 sm:w-44"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setDebouncedQuery(''); setIsOpen(false); }}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && debouncedQuery.trim() && (
        <div className="absolute top-full right-0 mt-1 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {t('weekview.noWorksFound')}
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, i) => (
                <button
                  key={`${result.areaKey}-${result.work.name}`}
                  onClick={() => selectResult(result)}
                  className={`w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                    i === focusedIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Area dot */}
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: result.areaColor }}
                  >
                    {result.areaIcon}
                  </span>
                  {/* Work info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {result.work.name}
                    </div>
                    {result.work.name_chinese && (
                      <div className="text-xs text-gray-400 truncate">
                        {result.work.name_chinese}
                      </div>
                    )}
                  </div>
                  {/* Area label */}
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {result.areaName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
