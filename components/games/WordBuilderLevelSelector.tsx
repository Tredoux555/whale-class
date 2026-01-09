'use client';

import { useState } from 'react';
import {
  PINK_LEVELS,
  BLUE_LEVELS,
  GREEN_LEVELS,
  SERIES_INFO,
  getTotalWordCount,
  getSeriesWordCount,
  type WordBuilderLevel,
} from '@/lib/games/word-builder-levels';

interface WordBuilderLevelSelectorProps {
  onSelectLevel: (levelId: string) => void;
  onSelectAll: () => void;
  onBack?: () => void;
}

type SeriesKey = 'pink' | 'blue' | 'green';

const SERIES_STYLES: Record<
  SeriesKey,
  {
    border: string;
    bg: string;
    headerBorder: string;
    headerBg: string;
    cardBorder: string;
    cardHover: string;
    badge: string;
  }
> = {
  pink: {
    border: 'border-pink-300',
    bg: 'bg-pink-50',
    headerBorder: 'border-l-pink-400',
    headerBg: 'bg-gradient-to-r from-pink-50 to-white',
    cardBorder: 'border-t-pink-400',
    cardHover: 'hover:bg-pink-50 active:bg-pink-100',
    badge: 'bg-pink-100 text-pink-700',
  },
  blue: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    headerBorder: 'border-l-blue-400',
    headerBg: 'bg-gradient-to-r from-blue-50 to-white',
    cardBorder: 'border-t-blue-400',
    cardHover: 'hover:bg-blue-50 active:bg-blue-100',
    badge: 'bg-blue-100 text-blue-700',
  },
  green: {
    border: 'border-green-300',
    bg: 'bg-green-50',
    headerBorder: 'border-l-green-400',
    headerBg: 'bg-gradient-to-r from-green-50 to-white',
    cardBorder: 'border-t-green-400',
    cardHover: 'hover:bg-green-50 active:bg-green-100',
    badge: 'bg-green-100 text-green-700',
  },
};

export default function WordBuilderLevelSelector({
  onSelectLevel,
  onSelectAll,
  onBack,
}: WordBuilderLevelSelectorProps) {
  const [expandedSeries, setExpandedSeries] = useState<Set<SeriesKey>>(
    new Set(['pink', 'blue', 'green'])
  );

  const toggleSeries = (series: SeriesKey) => {
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(series)) {
        next.delete(series);
      } else {
        next.add(series);
      }
      return next;
    });
  };

  const renderSeriesSection = (
    series: SeriesKey,
    levels: WordBuilderLevel[]
  ) => {
    const info = SERIES_INFO[series];
    const styles = SERIES_STYLES[series];
    const isExpanded = expandedSeries.has(series);
    const wordCount = getSeriesWordCount(series);

    return (
      <section key={series} className="mb-6">
        {/* Series Header */}
        <button
          onClick={() => toggleSeries(series)}
          className={`w-full flex items-center justify-between p-4 rounded-lg border-l-4 ${styles.headerBorder} ${styles.headerBg} transition-all duration-200 active:scale-[0.99]`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{info.icon}</span>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-800">{info.name}</h2>
              <p className="text-sm text-gray-600">
                {info.subtitle} • {wordCount} words
              </p>
            </div>
          </div>
          <span
            className={`text-2xl transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </button>

        {/* Level Cards Grid */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[1000px] opacity-100 mt-4' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {levels.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                styles={styles}
                onSelect={() => onSelectLevel(level.id)}
              />
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-4 pb-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-all active:scale-95"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">Back</span>
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-800 mx-auto">
          🔤 Word Builder
        </h1>
        {onBack && <div className="w-20" />} {/* Spacer for centering */}
      </header>

      {/* Instructions */}
      <div className="text-center mb-6 px-4">
        <p className="text-gray-600">
          Choose a level to practice specific sounds, or try all words!
        </p>
      </div>

      {/* Series Sections */}
      <div className="max-w-4xl mx-auto">
        {renderSeriesSection('pink', PINK_LEVELS)}
        {renderSeriesSection('blue', BLUE_LEVELS)}
        {renderSeriesSection('green', GREEN_LEVELS)}

        {/* All Words Button */}
        <button
          onClick={onSelectAll}
          className="w-full mt-6 p-5 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] active:shadow-md"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div>ALL WORDS</div>
              <div className="text-sm font-normal opacity-90">
                Practice everything! ({getTotalWordCount()}+ words)
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Level Card Component
// =============================================================================

interface LevelCardProps {
  level: WordBuilderLevel;
  styles: (typeof SERIES_STYLES)[SeriesKey];
  onSelect: () => void;
}

function LevelCard({ level, styles, onSelect }: LevelCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        relative flex flex-col items-center p-4 
        bg-white rounded-xl shadow-md 
        border-t-4 ${styles.cardBorder}
        ${styles.cardHover}
        transition-all duration-150
        active:scale-95 active:shadow-sm
      `}
    >
      {/* Icon */}
      <span className="text-4xl mb-2">{level.icon}</span>

      {/* Level Name */}
      <h3 className="font-bold text-gray-800 text-sm text-center">
        {level.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 text-center mt-1 line-clamp-1">
        {level.description}
      </p>

      {/* Word Count Badge */}
      <span
        className={`
          absolute top-2 right-2 
          px-2 py-0.5 rounded-full 
          text-xs font-medium
          ${styles.badge}
        `}
      >
        {level.words.length}
      </span>
    </button>
  );
}
