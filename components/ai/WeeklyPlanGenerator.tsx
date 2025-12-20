'use client';

import React, { useState } from 'react';
import { useWeeklyPlan } from '@/lib/hooks/useWeeklyPlan';

interface Props {
  childId: string;
  childName: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const AREAS = [
  { id: 'practical-life', name: 'Practical Life', icon: '🌱' },
  { id: 'sensorial', name: 'Sensorial', icon: '🔶' },
  { id: 'math', name: 'Mathematics', icon: '🔢' },
  { id: 'language', name: 'Language', icon: '📚' },
  { id: 'cultural', name: 'Cultural', icon: '🌍' },
];

export default function WeeklyPlanGenerator({ childId, childName }: Props) {
  const { data, loading, error, generatePlan } = useWeeklyPlan();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [activeDay, setActiveDay] = useState<string>('Monday');

  const toggleArea = (areaId: string) => {
    setSelectedAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const handleGenerate = async () => {
    try {
      const focusAreas = selectedAreas.length > 0
        ? AREAS.filter(a => selectedAreas.includes(a.id)).map(a => a.name)
        : undefined;
      await generatePlan(childId, focusAreas);
    } catch (err) {
      // Error handled by hook
    }
  };

  const currentDayPlan = data?.plan?.days.find(d => d.day === activeDay);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📅 Weekly Lesson Plan</h2>
            <p className="text-sm text-gray-500">AI-generated plan for {childName}</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <span>📋</span>
                Generate Weekly Plan
              </>
            )}
          </button>
        </div>

        {/* Focus Area Selection */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Focus on specific areas (optional):</p>
          <div className="flex flex-wrap gap-2">
            {AREAS.map(area => (
              <button
                key={area.id}
                onClick={() => toggleArea(area.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  selectedAreas.includes(area.id)
                    ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {area.icon} {area.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        )}

        {!data?.plan && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">📆</div>
            <p>Generate a personalized weekly lesson plan</p>
          </div>
        )}

        {data?.plan && (
          <div className="space-y-6">
            {/* Weekly Goals */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🎯 Weekly Goals</h3>
              <ul className="space-y-1">
                {data.plan.weeklyGoals.map((goal, i) => (
                  <li key={i} className="text-sm text-purple-800 flex items-center gap-2">
                    <span>•</span> {goal}
                  </li>
                ))}
              </ul>
            </div>

            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {DAYS.map(day => {
                const dayPlan = data.plan?.days.find(d => d.day === day);
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeDay === day
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                    {dayPlan && (
                      <span className="ml-1 opacity-70">({dayPlan.activities.length})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Day Content */}
            {currentDayPlan ? (
              <div className="border rounded-lg p-4">
                {currentDayPlan.theme && (
                  <p className="text-sm text-indigo-600 mb-3">
                    Theme: {currentDayPlan.theme}
                  </p>
                )}
                <div className="space-y-3">
                  {currentDayPlan.activities.map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
                        ${activity.type === 'new' ? 'bg-green-500' :
                          activity.type === 'continue' ? 'bg-yellow-500' : 'bg-blue-500'}
                      `}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.name}</p>
                        <p className="text-xs text-gray-500">{activity.area}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          activity.type === 'new' ? 'bg-green-100 text-green-700' :
                          activity.type === 'continue' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {activity.type}
                        </span>
                        {activity.focusPoint && (
                          <p className="text-xs text-gray-400 mt-1">{activity.focusPoint}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No activities planned for {activeDay}
              </div>
            )}

            {/* Materials to Prep */}
            {data.plan.materialsToPrep.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">📦 Materials to Prepare</h3>
                <div className="flex flex-wrap gap-2">
                  {data.plan.materialsToPrep.map((m, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Teacher Notes */}
            {data.plan.teacherNotes && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-900 mb-1">👩‍🏫 Teacher Notes</h4>
                <p className="text-sm text-yellow-800">{data.plan.teacherNotes}</p>
              </div>
            )}

            {/* Parent Communication */}
            {data.plan.parentCommunication && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">💬 Parent Communication</h4>
                <p className="text-sm text-blue-800">{data.plan.parentCommunication}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


