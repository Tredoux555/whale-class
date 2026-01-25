// app/admin/classroom/AISuggestions.tsx
// AI-powered work recommendations component
// Uses /api/brain/recommend endpoint

'use client';

import { useState, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
}

interface Recommendation {
  work_id: string;
  work_name: string;
  curriculum_area: string;
  parent_explanation: string;
  recommendation_reason: string;
}

interface Props {
  children: Child[];
  onSelectWork?: (workId: string, childId: string, workName: string) => void;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-amber-100 text-amber-700',
  sensorial: 'bg-pink-100 text-pink-700',
  mathematics: 'bg-green-100 text-green-700',
  language: 'bg-blue-100 text-blue-700',
  cultural: 'bg-purple-100 text-purple-700',
};

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📖',
  cultural: '🌍',
};

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let years = today.getFullYear() - birth.getFullYear();
  const months = today.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  const monthFraction = ((today.getMonth() - birth.getMonth() + 12) % 12) / 12;
  return Math.round((years + monthFraction) * 10) / 10;
}

export default function AISuggestions({ children, onSelectWork }: Props) {
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [children]);

  useEffect(() => {
    if (selectedChild?.date_of_birth) {
      fetchRecommendations();
    }
  }, [selectedChild]);

  async function fetchRecommendations() {
    if (!selectedChild?.date_of_birth) {
      setRecommendations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const age = calculateAge(selectedChild.date_of_birth);
      const res = await fetch(`/api/brain/recommend?child_age=${age}&limit=5`);
      const data = await res.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      } else {
        setError(data.error || 'Failed to fetch');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  if (children.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-white">AI Suggestions</span>
          <span className="text-indigo-200 text-sm ml-2">Brain-powered recommendations</span>
        </div>
        <span className="text-white">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {/* Child Selector */}
          <div className="mb-4">
            <p className="text-xs text-indigo-600 mb-2 font-medium">Select student:</p>
            <div className="flex flex-wrap gap-1.5">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedChild?.id === child.id
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-white text-indigo-600 border border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  {child.name}
                  {child.date_of_birth && (
                    <span className="opacity-70 ml-1">
                      {calculateAge(child.date_of_birth)}y
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
              <span className="ml-2 text-indigo-600 text-sm">Analyzing...</span>
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500 text-sm">{error}</div>
          ) : !selectedChild?.date_of_birth ? (
            <div className="text-center py-4 text-indigo-400 text-sm">
              Add birth date to get recommendations
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-4 text-indigo-400 text-sm">
              No recommendations available
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.work_id}
                  className="bg-white rounded-lg p-3 border border-indigo-100 hover:border-indigo-300 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{rec.work_name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${AREA_COLORS[rec.curriculum_area]}`}>
                          {AREA_ICONS[rec.curriculum_area]}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 mt-0.5">{rec.recommendation_reason}</p>
                    </div>

                    {/* Action */}
                    {onSelectWork && (
                      <button
                        onClick={() => onSelectWork(rec.work_id, selectedChild.id, rec.work_name)}
                        className="px-2 py-1 bg-indigo-500 text-white rounded text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        + Assign
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
