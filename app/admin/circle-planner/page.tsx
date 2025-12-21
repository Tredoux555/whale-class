// app/admin/circle-planner/page.tsx
// 36-Week Circle Time Curriculum Planner

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  CIRCLE_TIME_PLANS, 
  getCircleTimePlan, 
  getPlansByMonth,
  type CircleTimePlan 
} from '@/lib/circle-time/curriculum-plans';

export default function CirclePlannerPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const plansByMonth = getPlansByMonth();
  const selectedPlan = selectedWeek ? getCircleTimePlan(selectedWeek) : null;

  const handlePrint = () => {
    window.print();
  };

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
            {selectedPlan && (
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold"
              >
                🖨️ Print Plan
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!selectedPlan ? (
          /* Week Grid View */
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Select a Week Plan
            </h2>
            
            {/* Month Sections */}
            {Object.entries(plansByMonth).map(([month, plans]) => (
              <div key={month} className="mb-8">
                <h3 className="text-xl font-bold text-gray-700 mb-4 pb-2 border-b-2 border-orange-300">
                  {month}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {plans.map((plan) => (
                    <button
                      key={plan.week}
                      onClick={() => setSelectedWeek(plan.week)}
                      className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg hover:scale-105 transition-all text-center border-2 border-transparent hover:border-orange-400"
                    >
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        Week {plan.week}
                      </div>
                      <div className="text-sm font-medium text-gray-800 mb-1">
                        {plan.theme}
                      </div>
                      <div className="text-xs text-gray-500">
                        {plan.dates}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Week Plan Detail View */
          <div>
            {/* Week Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 mb-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    Week {selectedPlan.week}: {selectedPlan.theme}
                  </h2>
                  <p className="text-lg opacity-90">{selectedPlan.dates}</p>
                  <p className="text-sm opacity-80 mt-1">{selectedPlan.monthTopic}</p>
                </div>
                <button
                  onClick={() => setSelectedWeek(null)}
                  className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 font-bold"
                >
                  ← Back to Weeks
                </button>
              </div>
              
              {/* Navigation */}
              <div className="flex gap-2">
                {selectedPlan.week > 1 && (
                  <button
                    onClick={() => setSelectedWeek(selectedPlan.week - 1)}
                    className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 font-bold"
                  >
                    ← Previous Week
                  </button>
                )}
                {selectedPlan.week < 36 && (
                  <button
                    onClick={() => setSelectedWeek(selectedPlan.week + 1)}
                    className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 font-bold"
                  >
                    Next Week →
                  </button>
                )}
              </div>
            </div>

            {/* Opening Circle */}
            <PlanSection
              title="🌅 Opening Circle"
              color="from-yellow-400 to-orange-400"
            >
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Greeting:</h4>
                  <p className="text-gray-700">{selectedPlan.openingCircle.greeting}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Song:</h4>
                  <p className="text-gray-700">{selectedPlan.openingCircle.song}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Movement:</h4>
                  <p className="text-gray-700">{selectedPlan.openingCircle.movement}</p>
                </div>
              </div>
            </PlanSection>

            {/* Main Lesson */}
            <PlanSection
              title={`📚 Main Lesson: ${selectedPlan.mainLesson.topic}`}
              color="from-blue-400 to-indigo-400"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Topic:</h4>
                  <p className="text-lg font-semibold text-gray-700">{selectedPlan.mainLesson.topic}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Discussion Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    {selectedPlan.mainLesson.discussion.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Activity:</h4>
                  <p className="text-gray-700">{selectedPlan.mainLesson.activity}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-2">Materials:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.mainLesson.materials.map((material, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {material}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </PlanSection>

            {/* Literacy */}
            <PlanSection
              title="📖 Literacy"
              color="from-purple-400 to-pink-400"
            >
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Big Book:</h4>
                  <p className="text-gray-700">{selectedPlan.literacy.bigBook}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Focus Skill:</h4>
                  <p className="text-gray-700">{selectedPlan.literacy.focusSkill}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Vocabulary:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlan.literacy.vocabulary.map((word, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </PlanSection>

            {/* Closing Circle */}
            <PlanSection
              title="👋 Closing Circle"
              color="from-green-400 to-teal-400"
            >
              <div className="space-y-3">
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Reflection:</h4>
                  <p className="text-gray-700">{selectedPlan.closingCircle.reflection}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Song:</h4>
                  <p className="text-gray-700">{selectedPlan.closingCircle.song}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 mb-1">Transition:</h4>
                  <p className="text-gray-700">{selectedPlan.closingCircle.transition}</p>
                </div>
              </div>
            </PlanSection>

            {/* Social-Emotional */}
            <PlanSection
              title="💝 Social-Emotional Focus"
              color="from-pink-400 to-rose-400"
            >
              <p className="text-gray-700 text-lg">{selectedPlan.socialEmotional}</p>
            </PlanSection>

            {/* Home Connection */}
            <PlanSection
              title="🏠 Home Connection"
              color="from-cyan-400 to-blue-400"
            >
              <p className="text-gray-700 text-lg">{selectedPlan.homeConnection}</p>
            </PlanSection>

            {/* Print Button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={handlePrint}
                className="px-8 py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 shadow-lg"
              >
                🖨️ Print This Week's Plan
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Plan Section Component
function PlanSection({
  title,
  color,
  children
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
      <div className={`bg-gradient-to-r ${color} px-6 py-4 text-white font-bold text-lg`}>
        {title}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
