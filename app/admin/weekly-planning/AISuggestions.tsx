'use client';

import { useState } from 'react';

interface Recommendation {
  work_id: string;
  work_name: string;
  curriculum_area: string;
  parent_explanation: string;
  recommendation_reason: string;
}

interface AISuggestionsProps {
  onAddWork?: (workId: string, workName: string) => void;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'from-amber-400 to-orange-500',
  sensorial: 'from-pink-400 to-rose-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-green-400 to-emerald-500',
  culture: 'from-purple-400 to-violet-500',
};

const AREA_ICONS: Record<string, string> = {
  practical_life: '🏠',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📖',
  culture: '🌍',
};

const AGE_PRESETS = [
  { label: '2.5 years', value: 2.5 },
  { label: '3 years', value: 3 },
  { label: '3.5 years', value: 3.5 },
  { label: '4 years', value: 4 },
  { label: '4.5 years', value: 4.5 },
  { label: '5 years', value: 5 },
  { label: '5.5 years', value: 5.5 },
  { label: '6 years', value: 6 },
];

export default function AISuggestions({ onAddWork }: AISuggestionsProps) {
  const [selectedAge, setSelectedAge] = useState<number>(4);
  const [customAge, setCustomAge] = useState<string>('4');
  const [useCustomAge, setUseCustomAge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);
    
    const age = useCustomAge ? parseFloat(customAge) : selectedAge;
    
    if (isNaN(age) || age < 2 || age > 6) {
      setError('Please enter a valid age between 2 and 6');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/brain/recommend?child_age=${age}&limit=8`);
      const data = await res.json();
      
      if (data.success) {
        setRecommendations(data.recommendations || []);
      } else {
        setError(data.error || 'Failed to get recommendations');
      }
    } catch (err) {
      console.error('Recommendation error:', err);
      setError('Failed to connect to recommendation engine');
    }
    
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="btn btn-gold btn-lg btn-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div className="text-left">
            <h3 className="font-bold text-lg">AI Work Suggestions</h3>
            <p className="text-indigo-100 text-sm">Powered by Montessori Brain™ - 213 works analyzed</p>
          </div>
        </div>
        <span className="text-2xl transform transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </button>

      {/* Expandable Content */}
      {expanded && (
        <div className="p-6">
          {/* Age Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Child Age</label>
            
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {AGE_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => {
                    setSelectedAge(preset.value);
                    setUseCustomAge(false);
                  }}
                  className={`btn btn-md ${
                    !useCustomAge && selectedAge === preset.value
                      ? 'btn-primary'
                      : 'btn-secondary on-light'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Custom Age Input */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomAge}
                  onChange={(e) => setUseCustomAge(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-600">Custom age:</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="2"
                max="6"
                value={customAge}
                onChange={(e) => {
                  setCustomAge(e.target.value);
                  setUseCustomAge(true);
                }}
                className="w-20 px-3 py-2 border rounded-lg text-sm"
                placeholder="4.5"
              />
              <span className="text-sm text-gray-500">years</span>
            </div>
          </div>

          {/* Get Recommendations Button */}
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="btn btn-gold btn-lg btn-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⚙️</span> Analyzing curriculum...
              </span>
            ) : (
              <span>🎯 Get Smart Recommendations</span>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 mb-4">
                ✨ Recommended Works for {useCustomAge ? customAge : selectedAge} year old
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.work_id}
                    className="relative rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all group"
                  >
                    {/* Gradient Header */}
                    <div className={`h-2 bg-gradient-to-r ${AREA_COLORS[rec.curriculum_area] || 'from-gray-400 to-gray-500'}`} />
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xl">{AREA_ICONS[rec.curriculum_area] || '📚'}</span>
                          <h5 className="font-semibold text-gray-900 mt-1">{rec.work_name}</h5>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">
                            {rec.curriculum_area.replace('_', ' ')}
                          </p>
                        </div>
                        {onAddWork && (
                          <button
                            onClick={() => onAddWork(rec.work_id, rec.work_name)}
                            className="btn btn-primary btn-sm opacity-0 group-hover:opacity-100"
                          >
                            + Add
                          </button>
                        )}
                      </div>

                      {/* Recommendation Reason Badge */}
                      <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                        <span>💡</span>
                        <span>{rec.recommendation_reason}</span>
                      </div>
                      
                      {/* Parent Explanation */}
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {rec.parent_explanation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Footer Note */}
              <p className="mt-4 text-center text-sm text-gray-500">
                💡 Recommendations based on sensitive periods, prerequisites, and curriculum balance
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && recommendations.length === 0 && !error && (
            <div className="mt-6 text-center py-8 text-gray-500">
              <span className="text-4xl">🎯</span>
              <p className="mt-2">Select an age and click "Get Smart Recommendations"</p>
              <p className="text-sm">The Brain will analyze 213 Montessori works to find the best fit</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
