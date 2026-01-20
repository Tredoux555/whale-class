'use client';

import { useEffect, useState } from 'react';

interface Recommendation {
  work_id: string;
  work_name: string;
  curriculum_area: string;
  parent_explanation: string;
  recommendation_reason: string;
}

interface AISuggestionsPanelProps {
  childAge: number;
  childName: string;
  completedWorkIds?: string[];
  onWorkSelect?: (work: Recommendation) => void;
}

const AREA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  practical_life: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  sensorial: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  mathematics: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  math: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  language: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cultural: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  culture: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

const AREA_ICONS: Record<string, string> = {
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  math: '🔢',
  language: '📖',
  cultural: '🌍',
  culture: '🌍',
};

export function AISuggestionsPanel({ 
  childAge, 
  childName,
  completedWorkIds = [],
  onWorkSelect 
}: AISuggestionsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [childAge, completedWorkIds]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        child_age: childAge.toString(),
        limit: '6'
      });
      
      if (completedWorkIds.length > 0) {
        params.set('completed_work_ids', completedWorkIds.join(','));
      }
      
      const res = await fetch(`/api/brain/recommend?${params}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      
      const data = await res.json();
      setRecommendations(data.recommendations || data.data || []);
    } catch (err) {
      console.error('Failed to fetch AI suggestions:', err);
      setError('Could not load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const formatArea = (area: string) => {
    return area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow">
            <span className="text-xl animate-pulse">🧠</span>
          </div>
          <div>
            <h3 className="font-bold text-purple-900">AI Suggestions</h3>
            <p className="text-sm text-purple-600">Thinking...</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 rounded-xl p-3 animate-pulse">
              <div className="h-4 bg-purple-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-purple-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-900">AI Suggestions Unavailable</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchRecommendations}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✨</span>
          <div>
            <h3 className="font-bold text-green-900">Great Progress!</h3>
            <p className="text-sm text-green-600">
              {childName} is on track. Keep observing for new interests!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl border border-purple-200 shadow-sm overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 hover:bg-white/30 transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow">
          <span className="text-xl">🧠</span>
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-purple-900">AI Suggestions</h3>
          <p className="text-sm text-purple-600">
            {recommendations.length} works recommended for {childName} (age {childAge.toFixed(1)})
          </p>
        </div>
        <svg 
          className={`w-5 h-5 text-purple-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content - Collapsible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {recommendations.map((rec, index) => {
            const colors = AREA_COLORS[rec.curriculum_area] || AREA_COLORS.practical_life;
            const icon = AREA_ICONS[rec.curriculum_area] || '📚';
            
            return (
              <div 
                key={rec.work_id}
                onClick={() => onWorkSelect?.(rec)}
                className={`bg-white rounded-xl p-3 shadow-sm border ${colors.border} hover:shadow-md transition-all ${onWorkSelect ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority number */}
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {/* Work name and area */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-gray-900 leading-tight">
                        {rec.work_name}
                      </h4>
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                        {icon} {formatArea(rec.curriculum_area)}
                      </span>
                    </div>
                    
                    {/* Parent explanation */}
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {rec.parent_explanation}
                    </p>
                    
                    {/* Recommendation reason */}
                    <div className="flex items-center gap-2 mt-2">
                      {rec.recommendation_reason.includes('Gateway') && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                          ⭐ Gateway
                        </span>
                      )}
                      <p className="text-xs text-purple-600 italic">
                        💡 {rec.recommendation_reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Refresh button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchRecommendations();
            }}
            className="w-full py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-white/50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>🔄</span> Refresh suggestions
          </button>
        </div>
      )}
    </div>
  );
}

export default AISuggestionsPanel;
