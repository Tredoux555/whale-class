// components/montree/reports/WeekSelector.tsx
// Week picker component for selecting report week
// Phase 3 - Session 54

'use client';

import React, { useMemo } from 'react';
import { getWeekBounds, formatDateISO, formatWeekRange } from '@/lib/montree/reports/types';

interface WeekOption {
  start: string;
  end: string;
  label: string;
  isCurrent: boolean;
}

interface WeekSelectorProps {
  selectedWeek: { start: string; end: string } | null;
  onWeekChange: (week: { start: string; end: string }) => void;
  weeksToShow?: number;
}

export default function WeekSelector({ 
  selectedWeek, 
  onWeekChange,
  weeksToShow = 8 
}: WeekSelectorProps) {
  
  // Generate list of recent weeks
  const weeks = useMemo(() => {
    const result: WeekOption[] = [];
    const today = new Date();
    
    for (let i = 0; i < weeksToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (i * 7));
      
      const { start, end } = getWeekBounds(date);
      const startStr = formatDateISO(start);
      const endStr = formatDateISO(end);
      
      result.push({
        start: startStr,
        end: endStr,
        label: i === 0 ? 'This Week' : i === 1 ? 'Last Week' : formatWeekRange(startStr, endStr),
        isCurrent: i === 0,
      });
    }
    
    return result;
  }, [weeksToShow]);

  const isSelected = (week: WeekOption) => {
    return selectedWeek?.start === week.start && selectedWeek?.end === week.end;
  };

  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4 scrollbar-hide">
      {weeks.map((week) => (
        <button
          key={week.start}
          onClick={() => onWeekChange({ start: week.start, end: week.end })}
          className={`
            flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${isSelected(week)
              ? 'bg-blue-500 text-white shadow-md'
              : week.isCurrent
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          {week.label}
        </button>
      ))}
    </div>
  );
}

// ============================================
// COMPACT VERSION FOR INLINE USE
// ============================================

export function WeekSelectorCompact({ 
  selectedWeek, 
  onWeekChange 
}: {
  selectedWeek: { start: string; end: string } | null;
  onWeekChange: (week: { start: string; end: string }) => void;
}) {
  const today = new Date();
  const { start: thisWeekStart, end: thisWeekEnd } = getWeekBounds(today);
  
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const { start: lastWeekStart, end: lastWeekEnd } = getWeekBounds(lastWeek);

  const thisWeek = {
    start: formatDateISO(thisWeekStart),
    end: formatDateISO(thisWeekEnd),
  };
  
  const lastWeekObj = {
    start: formatDateISO(lastWeekStart),
    end: formatDateISO(lastWeekEnd),
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => onWeekChange(thisWeek)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          selectedWeek?.start === thisWeek.start
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        This Week
      </button>
      <button
        onClick={() => onWeekChange(lastWeekObj)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          selectedWeek?.start === lastWeekObj.start
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        Last Week
      </button>
    </div>
  );
}
