// app/admin/circle-planner/page.tsx
// Simplified Circle Time Planner

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { THEME_LIBRARY } from '@/lib/circle-time/theme-library';
import { DAY_CONFIG, generateWeeklyPlan } from '@/lib/circle-time/weekly-structure';
import { WeeklyTheme, DailyPlan, DayOfWeek } from '@/lib/circle-time/types';

export default function CirclePlannerPage() {
  const [selectedTheme, setSelectedTheme] = useState<WeeklyTheme | null>(null);
  const [weekOf, setWeekOf] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split('T')[0];
  });
  const [weeklyPlan, setWeeklyPlan] = useState<DailyPlan[] | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday');

  const handleThemeSelect = (theme: WeeklyTheme) => {
    setSelectedTheme(theme);
    const plan = generateWeeklyPlan(theme, weekOf);
    setWeeklyPlan(plan);
  };

  const currentDayPlan = weeklyPlan?.find(d => d.day === selectedDay);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                🌅 Circle Time Planner
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Week of:</label>
              <input
                type="date"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
                className="border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Theme Selector */}
        {!selectedTheme ? (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Choose a Theme for the Week
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {THEME_LIBRARY.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeSelect(theme)}
                  className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg hover:scale-105 transition-all text-center"
                  style={{ borderBottom: `4px solid ${theme.color}` }}
                >
                  <div className="text-5xl mb-3">{theme.icon}</div>
                  <div className="font-bold text-gray-800">{theme.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    2 books • 1 song
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Selected Theme Header */}
            <div 
              className="rounded-2xl p-6 mb-6 text-white"
              style={{ backgroundColor: selectedTheme.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-6xl">{selectedTheme.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold">Theme: {selectedTheme.name}</h2>
                    <p className="opacity-90">Song: {selectedTheme.song.title}</p>
                    <p className="opacity-90 text-sm">
                      Books: {selectedTheme.book1.title} • {selectedTheme.book2.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedTheme(null);
                    setWeeklyPlan(null);
                  }}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
                >
                  Change Theme
                </button>
              </div>
            </div>

            {/* Vocabulary Flashcards */}
            <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-3">📇 Theme Vocabulary</h3>
              <div className="flex flex-wrap gap-2">
                {selectedTheme.flashcards.map((word, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${selectedTheme.color}20`, color: selectedTheme.color }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(Object.keys(DAY_CONFIG) as DayOfWeek[]).map((day) => {
                const config = DAY_CONFIG[day];
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-shrink-0 px-4 py-3 rounded-xl font-bold transition-all ${
                      selectedDay === day
                        ? 'text-white shadow-lg scale-105'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    style={selectedDay === day ? { backgroundColor: config.color } : {}}
                  >
                    <span className="mr-2">{config.icon}</span>
                    <span className="capitalize">{day}</span>
                    <span className="hidden sm:inline text-xs ml-2 opacity-80">
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Day Plan */}
            {currentDayPlan && (
              <div className="space-y-4">
                {/* Day Header */}
                <div 
                  className="rounded-xl p-4 text-white"
                  style={{ backgroundColor: DAY_CONFIG[selectedDay].color }}
                >
                  <h3 className="text-xl font-bold">
                    {DAY_CONFIG[selectedDay].icon} {DAY_CONFIG[selectedDay].label}
                  </h3>
                  <p className="opacity-90 capitalize">{selectedDay}</p>
                </div>

                {/* Segments */}
                <DaySegment 
                  title="🌅 Warmup" 
                  segment={currentDayPlan.warmup}
                  color={DAY_CONFIG[selectedDay].color}
                />
                <DaySegment 
                  title="📖 Main Activity" 
                  segment={currentDayPlan.main}
                  color={DAY_CONFIG[selectedDay].color}
                />
                <DaySegment 
                  title="🎨 Activities" 
                  segment={currentDayPlan.activities}
                  color={DAY_CONFIG[selectedDay].color}
                />
                <DaySegment 
                  title="👋 Closing" 
                  segment={currentDayPlan.closing}
                  color={DAY_CONFIG[selectedDay].color}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700"
              >
                🖨️ Print Week Plan
              </button>
              <Link
                href="/admin/phonics-planner"
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
              >
                🔤 Phonics Activities →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Segment Component
function DaySegment({ 
  title, 
  segment, 
  color 
}: { 
  title: string; 
  segment: { title: string; duration: string; content: string; materials?: string[]; notes?: string };
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div 
        className="px-4 py-2 text-white font-bold flex justify-between items-center"
        style={{ backgroundColor: color }}
      >
        <span>{title}: {segment.title}</span>
        <span className="text-sm opacity-90">{segment.duration}</span>
      </div>
      <div className="p-4">
        <div className="whitespace-pre-wrap text-gray-700">
          {segment.content}
        </div>
        
        {segment.materials && segment.materials.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <span className="font-bold text-gray-600 text-sm">Materials: </span>
            <span className="text-gray-600 text-sm">
              {segment.materials.join(' • ')}
            </span>
          </div>
        )}
        
        {segment.notes && (
          <div className="mt-2 p-2 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            💡 {segment.notes}
          </div>
        )}
      </div>
    </div>
  );
}
