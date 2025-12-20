'use client';

import React from 'react';
import { useActivityGuidance } from '@/lib/hooks/useActivityGuidance';

interface Props {
  workId: string;
  workName: string;
  childId?: string;
  currentLevel?: number;
  onClose?: () => void;
}

export default function ActivityGuidancePanel({
  workId,
  workName,
  childId,
  currentLevel,
  onClose,
}: Props) {
  const { data, loading, error, getGuidance } = useActivityGuidance();

  React.useEffect(() => {
    getGuidance(workId, childId, currentLevel);
  }, [workId, childId, currentLevel, getGuidance]);

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">✨ AI Teaching Guide</h2>
            <p className="text-purple-100 text-sm">{workName}</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-4" />
              <p className="text-gray-500">Generating guidance...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
        )}

        {data?.guidance && (
          <div className="space-y-6">
            {/* Level Focus */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-1">
                🎯 Focus for Level {data.level}
              </h3>
              <p className="text-purple-800">{data.guidance.levelFocus}</p>
            </div>

            {/* Presentation Steps */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">📋 Presentation Steps</h3>
              <div className="space-y-3">
                {data.guidance.presentationSteps.map((step) => (
                  <div key={step.step} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {step.step}
                    </div>
                    <div>
                      <p className="text-gray-900">{step.action}</p>
                      <p className="text-sm text-indigo-600 mt-1">💡 {step.keyPoint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">⚠️ Common Mistakes to Watch</h3>
              <ul className="space-y-2">
                {data.guidance.commonMistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-amber-500">•</span>
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>

            {/* Readiness Indicators */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">✅ Ready for Next Level When...</h3>
              <ul className="space-y-2">
                {data.guidance.readinessIndicators.map((indicator, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-green-500">✓</span>
                    {indicator}
                  </li>
                ))}
              </ul>
            </div>

            {/* Extensions */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">🚀 Extensions & Variations</h3>
              <div className="flex flex-wrap gap-2">
                {data.guidance.extensions.map((ext, i) => (
                  <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                    {ext}
                  </span>
                ))}
              </div>
            </div>

            {/* Parent Explanation */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-1">👨‍👩‍👧 For Parents</h3>
              <p className="text-sm text-blue-800">{data.guidance.parentExplanation}</p>
            </div>

            {/* 1688 Link */}
            {data.work.chineseName && (
              <a
                href={`https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(data.work.chineseName)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-orange-600 hover:text-orange-700"
              >
                🔍 Find materials on 1688.com ({data.work.chineseName})
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


