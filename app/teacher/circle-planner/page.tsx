'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CIRCLE_TIME_CURRICULUM, CircleTimePlan, DayPlan } from '@/lib/circle-time/curriculum-data';
import LessonDocuments from '@/components/circle-time/LessonDocuments';
import TeacherNotes from '@/components/circle-time/TeacherNotes';

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
                body { font-family: 'Comic Sans MS', cursive; padding: 20px; }
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/teacher/dashboard" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                🌅 Circle Time Planner
              </h1>
              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-sm rounded-full">
                {teacherName}
              </span>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/flashcard-maker"
                className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
              >
                🎵 Video Cards
              </Link>
              <Link
                href="/admin/card-generator"
                className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
              >
                🎴 3-Part Cards
              </Link>
              {selectedWeek && (
                <button
                  onClick={handlePrint}
                  className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
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
            <h2 className="text-xl font-bold mb-4">Select a Week (36 Weeks)</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-3">
              {CIRCLE_TIME_CURRICULUM.map((week) => (
                <button
                  key={week.week}
                  onClick={() => {
                    setSelectedWeek(week.week);
                    setSelectedDay('monday');
                  }}
                  className="bg-white rounded-xl p-3 shadow hover:shadow-lg hover:scale-105 transition-all text-center"
                  style={{ borderLeft: `4px solid ${week.color}` }}
                >
                  <div className="text-2xl mb-1">{week.icon}</div>
                  <div className="text-xs font-bold">Week {week.week}</div>
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

            {/* Two Column Layout for Week View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Content (2/3 width) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Week At A Glance - Prep Summary */}
                <div className="bg-white rounded-xl p-5 shadow-sm border-2 border-dashed border-amber-300">
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
                </div>

                {/* Day Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2">
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
                        <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                          <div className="font-bold text-orange-700">📌 Focus</div>
                          <div>{dayPlan.focus}</div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="font-bold text-yellow-700">☀️ Warmup (5-10 min)</div>
                          <div className="whitespace-pre-line">{dayPlan.warmup}</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="font-bold text-blue-700">📚 Main Lesson (10-15 min)</div>
                          <div className="whitespace-pre-line">{dayPlan.main}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="font-bold text-green-700">🎯 Activities (10-15 min)</div>
                          <div className="whitespace-pre-line">{dayPlan.activities}</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="font-bold text-purple-700">👋 Closing (5 min)</div>
                          <div className="whitespace-pre-line">{dayPlan.closing}</div>
                        </div>
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
              </div>

              {/* Right Column - Documents & Notes (1/3 width) */}
              <div className="space-y-4">
                {/* Lesson Documents */}
                <LessonDocuments weekNumber={plan.week} />
                
                {/* Teacher Notes Board */}
                <TeacherNotes 
                  weekNumber={plan.week} 
                  currentTeacher={teacherName || undefined}
                />
              </div>
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
