'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CIRCLE_TIME_CURRICULUM, CircleTimePlan, DayPlan } from '@/lib/circle-time/curriculum-data';
import LessonDocuments from '@/components/circle-time/LessonDocuments';
import TeacherNotes from '@/components/circle-time/TeacherNotes';
import ThemeSongPlayer from '@/components/circle-time/ThemeSongPlayer';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const DAY_LABELS = {
  monday: { label: 'Monday', icon: '🎵', focus: 'Theme Intro' },
  tuesday: { label: 'Tuesday', icon: '📖', focus: 'Book 1' },
  wednesday: { label: 'Wednesday', icon: '📚', focus: 'Book 2' },
  thursday: { label: 'Thursday', icon: '🎨', focus: 'Review & Create' },
  friday: { label: 'Friday', icon: '🔤', focus: 'Phonics Fun' },
};

export default function TeacherCirclePlannerPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<typeof DAYS[number]>('monday');
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
    } else {
      setTeacherName(name);
      setLoading(false);
    }
  }, [router]);

  const plan = selectedWeek ? CIRCLE_TIME_CURRICULUM.find(p => p.week === selectedWeek) : null;

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Week ${selectedWeek} - ${plan?.theme}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
                h1, h2, h3 { color: #333; }
                .section { margin: 15px 0; padding: 10px; border: 1px solid #ddd; border-radius: 8px; }
                .section-title { font-weight: bold; color: #666; margin-bottom: 5px; }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🌅</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🌅</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Circle Time Planner</h1>
                  <p className="text-sm text-gray-500">Montessori-aligned curriculum</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3 mr-4">
              <div className="bg-orange-100 rounded-xl px-3 py-1.5 text-center">
                <div className="text-lg font-bold text-orange-700">36</div>
                <div className="text-xs text-orange-600">Weeks</div>
              </div>
              <div className="bg-orange-100 rounded-xl px-3 py-1.5 text-center">
                <div className="text-lg font-bold text-orange-700">5</div>
                <div className="text-xs text-orange-600">Days</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-lg font-medium">
                {teacherName}
              </span>
              <Link
                href="/admin/flashcard-maker"
                className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                🎵 Video Cards
              </Link>
              <Link
                href="/admin/card-generator"
                className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
              >
                🎴 3-Part Cards
              </Link>
              {selectedWeek && (
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors text-sm font-medium"
                >
                  🖨️ Print
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!selectedWeek ? (
          /* ========== WEEK SELECTOR GRID ========== */
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select a Week</h2>
            <p className="text-gray-500 mb-6">36-week circle time curriculum with songs, books, and activities</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {CIRCLE_TIME_CURRICULUM.map((week) => (
                <button
                  key={week.week}
                  onClick={() => {
                    setSelectedWeek(week.week);
                    setSelectedDay('monday');
                  }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg hover:scale-105 transition-all text-center border border-gray-100 group"
                  style={{ borderLeftWidth: '4px', borderLeftColor: week.color }}
                >
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{week.icon}</div>
                  <div className="text-xs font-bold text-gray-700">Week {week.week}</div>
                  <div className="text-xs text-gray-500 truncate">{week.theme}</div>
                </button>
              ))}
            </div>
          </div>
        ) : plan ? (
          /* ========== WEEK VIEW ========== */
          <div>
            {/* Theme Header */}
            <div 
              className="rounded-2xl p-6 mb-6 text-white"
              style={{ backgroundColor: plan.color }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{plan.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold">Week {plan.week}: {plan.theme}</h2>
                    <p className="opacity-90">🎵 {plan.song.title}</p>
                    <p className="opacity-80 text-sm">
                      📖 {plan.books[0]?.title} • {plan.books[1]?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30"
                >
                  ← All Weeks
                </button>
              </div>
            </div>

            {/* Theme Song Player */}
            <ThemeSongPlayer
              weekNumber={plan.week}
              defaultTitle={plan.song.title}
              defaultActions={plan.song.actions}
              themeColor={plan.color}
            />

            {/* Week At A Glance - Prep Summary */}
            <div className="bg-white rounded-xl p-5 mb-4 shadow-sm border-2 border-dashed border-amber-300">
              <h3 className="font-bold text-gray-800 text-lg mb-4">📋 Week {plan.week} Prep Checklist</h3>
              
              {/* Song */}
              <div className="mb-4">
                <h4 className="font-bold text-gray-700 mb-2">🎵 Theme Song</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{plan.song.title}</span>
                  <a 
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(plan.song.title + ' kids song')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 inline-flex items-center gap-1"
                  >
                    ▶️ YouTube
                  </a>
                </div>
                <p className="text-sm text-gray-500 mt-1">Actions: {plan.song.actions}</p>
              </div>

              {/* Vocabulary */}
              <div className="mb-4">
                <h4 className="font-bold text-gray-700 mb-2">📇 Vocabulary ({plan.vocabulary.length} words)</h4>
                <div className="flex flex-wrap gap-2">
                  {plan.vocabulary.map((word, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-100 rounded-full text-sm">
                      {word}
                    </span>
                  ))}
                </div>
              </div>

              {/* Books */}
              <div className="mb-4">
                <h4 className="font-bold text-gray-700 mb-2">📚 Books</h4>
                <div className="space-y-2">
                  {plan.books.map((book, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap">
                      <span>📖</span>
                      <span className="font-medium">{book.title}</span>
                      <span className="text-gray-500 text-sm">by {book.author}</span>
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(book.title + ' read aloud')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full hover:bg-red-200"
                      >
                        ▶️ Read Aloud
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materials */}
              <div>
                <h4 className="font-bold text-gray-700 mb-2">🧰 Materials Needed</h4>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const allMaterials = new Set<string>();
                    DAYS.forEach(day => {
                      const dayPlan = plan[`${day}Plan` as keyof CircleTimePlan] as DayPlan | undefined;
                      dayPlan?.materials?.forEach(m => allMaterials.add(m));
                    });
                    
                    // Expand generic materials to specific items
                    const expandMaterial = (material: string): string[] => {
                      const lower = material.toLowerCase();
                      
                      // Vocabulary flashcards - use actual vocabulary
                      if (lower.includes('vocabulary') || lower.includes('flashcard')) {
                        return plan.vocabulary;
                      }
                      
                      // Weather-related cards - use vocabulary if weather theme
                      if ((lower.includes('weather') && (lower.includes('card') || lower.includes('picture') || lower.includes('symbol')))) {
                        if (plan.theme.toLowerCase().includes('weather')) {
                          return plan.vocabulary;
                        }
                        return ['sun', 'cloud', 'rain', 'snow', 'wind', 'storm', 'rainbow'];
                      }
                      
                      // Clothing cards - common clothing items
                      if (lower.includes('clothing') && lower.includes('card')) {
                        return ['t-shirt', 'shorts', 'jacket', 'raincoat', 'umbrella', 'boots', 'hat', 'scarf', 'mittens', 'sunglasses'];
                      }
                      
                      // Letter cards - extract letters from the Friday plan
                      if (lower.includes('letter') && lower.includes('card')) {
                        const fridayPlan = plan.fridayPlan;
                        const letterMatch = fridayPlan?.main?.match(/Focus letters?:?\s*([A-Z](?:\s*\([^)]+\))?,?\s*)+/i);
                        if (letterMatch) {
                          const letters = fridayPlan.main.match(/\b([A-Z])\s*\(/g)?.map(m => m[0]) || [];
                          return letters.length > 0 ? letters.map(l => `Letter ${l}`) : [material];
                        }
                        return [material];
                      }
                      
                      // Keep as-is for non-expandable items
                      return [material];
                    };
                    
                    // Group: generic items vs expanded items
                    const genericItems: string[] = [];
                    const expandedItems: string[] = [];
                    
                    Array.from(allMaterials).forEach(material => {
                      const expanded = expandMaterial(material);
                      if (expanded.length === 1 && expanded[0] === material) {
                        genericItems.push(material);
                      } else {
                        expandedItems.push(...expanded);
                      }
                    });
                    
                    // Remove duplicates from expanded
                    const uniqueExpanded = [...new Set(expandedItems)];
                    
                    return (
                      <>
                        {/* Generic materials */}
                        {genericItems.map((material, i) => (
                          <span key={`g-${i}`} className="px-3 py-1 bg-gray-100 border rounded-full text-sm">
                            {material}
                          </span>
                        ))}
                        {/* Expanded materials - different color to show these are searchable */}
                        {uniqueExpanded.length > 0 && (
                          <>
                            {uniqueExpanded.map((item, i) => (
                              <span key={`e-${i}`} className="px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full text-sm text-cyan-700">
                                📷 {item}
                              </span>
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Lesson Documents */}
            <div className="mb-4">
              <LessonDocuments weekNumber={plan.week} />
            </div>

            {/* Teacher Notes Board */}
            <div className="mb-4">
              <TeacherNotes weekNumber={plan.week} currentTeacher={teacherName || 'Teacher'} />
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                    selectedDay === day
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-orange-100'
                  }`}
                >
                  {DAY_LABELS[day].icon} {DAY_LABELS[day].label}
                </button>
              ))}
            </div>

            {/* Day Plan */}
            <div ref={printRef} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <span className="text-3xl">{DAY_LABELS[selectedDay].icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{DAY_LABELS[selectedDay].label}</h3>
                  <p className="text-gray-600">{DAY_LABELS[selectedDay].focus}</p>
                </div>
              </div>

              {(() => {
                const dayPlan = plan[`${selectedDay}Plan` as keyof CircleTimePlan] as DayPlan | undefined;
                if (!dayPlan) return null;

                return (
                  <div className="space-y-4">
                    {/* Focus */}
                    <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                      <div className="font-bold text-orange-700">📌 Focus</div>
                      <div>{dayPlan.focus}</div>
                    </div>

                    {/* Warmup */}
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="font-bold text-yellow-700">☀️ Warmup (5-10 min)</div>
                      <div className="whitespace-pre-line">{dayPlan.warmup}</div>
                    </div>

                    {/* Main */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-bold text-blue-700">📚 Main Lesson (10-15 min)</div>
                      <div className="whitespace-pre-line">{dayPlan.main}</div>
                    </div>

                    {/* Activities */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="font-bold text-green-700">🎯 Activities (10-15 min)</div>
                      <div className="whitespace-pre-line">{dayPlan.activities}</div>
                    </div>

                    {/* Closing */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="font-bold text-purple-700">👋 Closing (5 min)</div>
                      <div className="whitespace-pre-line">{dayPlan.closing}</div>
                    </div>

                    {/* Materials */}
                    {dayPlan.materials && dayPlan.materials.length > 0 && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-bold text-gray-700">🧰 Materials Needed</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {dayPlan.materials.map((m: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-white border rounded text-sm">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Week Navigation */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setSelectedWeek(Math.max(1, (selectedWeek || 1) - 1))}
                disabled={selectedWeek === 1}
                className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
              >
                ← Previous Week
              </button>
              <button
                onClick={() => setSelectedWeek(Math.min(36, (selectedWeek || 1) + 1))}
                disabled={selectedWeek === 36}
                className="px-4 py-2 bg-white rounded-lg shadow disabled:opacity-50"
              >
                Next Week →
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
