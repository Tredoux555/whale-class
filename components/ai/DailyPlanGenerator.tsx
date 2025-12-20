'use client';

import React, { useState } from 'react';
import { useDailyPlan } from '@/lib/hooks/useDailyPlan';

interface Props {
  childId: string;
  childName: string;
}

const AREA_COLORS: Record<string, string> = {
  'Practical Life': '#4CAF50',
  'Sensorial': '#FF9800',
  'Mathematics': '#2196F3',
  'Language': '#E91E63',
  'Cultural': '#9C27B0',
};

const TYPE_BADGES = {
  new: { bg: 'bg-green-100', text: 'text-green-700', label: 'New' },
  continue: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Continue' },
  review: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Review' },
};

export default function DailyPlanGenerator({ childId, childName }: Props) {
  const { data, loading, error, generatePlan } = useDailyPlan();
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      await generatePlan(childId);
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              ✨ AI Daily Plan
            </h2>
            <p className="text-sm text-gray-500">
              Personalized activities for {childName}
            </p>
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
                <span>🪄</span>
                Generate Today's Plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}

        {!data?.plan && !loading && !error && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🎯</div>
            <p>Click "Generate Today's Plan" to get AI-powered activity suggestions</p>
          </div>
        )}

        {data?.plan && (
          <div className="space-y-6">
            {/* Greeting */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg">
              <p className="text-lg text-purple-900">{data.plan.greeting}</p>
            </div>

            {/* Activities */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Today's Activities</h3>
              <div className="space-y-3">
                {data.plan.activities.map((activity, index) => {
                  const isExpanded = expanded === `${index}`;
                  const badge = TYPE_BADGES[activity.type];
                  const areaColor = AREA_COLORS[activity.area] || '#666';

                  return (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => setExpanded(isExpanded ? null : `${index}`)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: areaColor }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{activity.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{activity.area}</span>
                            <span>•</span>
                            <span>{activity.duration}</span>
                          </div>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="pt-4 space-y-4">
                            <div>
                              <p className="text-sm text-gray-600">{activity.description}</p>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Materials</h4>
                              <div className="flex flex-wrap gap-2">
                                {activity.materials.map((m, i) => (
                                  <span key={i} className="text-sm px-2 py-1 bg-white rounded border">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Presentation Tips</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {activity.presentationTips.map((tip, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-purple-500">💡</span>
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Signs of Mastery</h4>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {activity.signsOfMastery.map((sign, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-500">✓</span>
                                    {sign}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Schedule */}
            {data.plan.schedule && data.plan.schedule.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Suggested Schedule</h3>
                <div className="relative pl-6 border-l-2 border-purple-200 space-y-4">
                  {data.plan.schedule.map((item, index) => (
                    <div key={index} className="relative">
                      <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-purple-500" />
                      <div className="text-sm">
                        <span className="font-medium text-purple-600">{item.time}</span>
                        <span className="text-gray-600 ml-2">{item.activity}</span>
                        {item.notes && (
                          <p className="text-gray-400 text-xs mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parent Note */}
            {data.plan.parentNote && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-1">📝 Note for Parents</h4>
                <p className="text-sm text-blue-800">{data.plan.parentNote}</p>
              </div>
            )}

            {/* Generated timestamp */}
            <p className="text-xs text-gray-400 text-center">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


