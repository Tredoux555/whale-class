// components/montree/AIInsightsTab.tsx
// AI-powered insights for student dashboard
// Session 69 - Japanese Engineer Standard 🎌

'use client';

import { useState } from 'react';

// ============================================
// TYPES
// ============================================

interface AIInsightsTabProps {
  childId: string;
  childName: string;
}

interface AnalyzeResult {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  area_insights: Array<{
    area: string;
    area_name: string;
    total_works: number;
    completed: number;
    in_progress: number;
    completion_percentage: number;
    insight: string;
  }>;
  developmental_stage: string;
  generated_at: string;
}

interface WorkSuggestion {
  work: {
    id: string;
    name: string;
    name_chinese?: string;
    area: string;
    area_name: string;
    category: string;
    description?: string;
    materials: string[];
    age_range: string;
  };
  readiness_score: number;
  reason: string;
  developmental_benefit: string;
  prerequisites_met: string[];
  prerequisites_missing: string[];
}

interface SuggestResult {
  suggestions: WorkSuggestion[];
  total_available_works: number;
  generated_at: string;
}

interface WeeklyReportResult {
  child: { id: string; name: string };
  period: { start: string; end: string };
  highlights: string[];
  narrative: string;
  next_steps: string[];
  areas_worked: Array<{
    area: string;
    area_name: string;
    works_completed: number;
    works_in_progress: number;
    works_presented: number;
  }>;
  works_this_week: Array<{
    work_name: string;
    area: string;
    status: string;
  }>;
  generated_at: string;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// AREA COLORS (matching existing design system)
// ============================================

const AREA_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  practical_life: { bg: 'bg-pink-100', text: 'text-pink-700', gradient: 'from-pink-500 to-rose-500' },
  sensorial: { bg: 'bg-purple-100', text: 'text-purple-700', gradient: 'from-purple-500 to-violet-500' },
  mathematics: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-indigo-500' },
  math: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-indigo-500' },
  language: { bg: 'bg-green-100', text: 'text-green-700', gradient: 'from-green-500 to-emerald-500' },
  cultural: { bg: 'bg-orange-100', text: 'text-orange-700', gradient: 'from-orange-500 to-amber-500' },
  culture: { bg: 'bg-orange-100', text: 'text-orange-700', gradient: 'from-orange-500 to-amber-500' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AIInsightsTab({ childId, childName }: AIInsightsTabProps) {
  // Analysis state
  const [analyzeState, setAnalyzeState] = useState<LoadingState>('idle');
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Suggestions state
  const [suggestState, setSuggestState] = useState<LoadingState>('idle');
  const [suggestResult, setSuggestResult] = useState<SuggestResult | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Weekly report state
  const [reportState, setReportState] = useState<LoadingState>('idle');
  const [reportResult, setReportResult] = useState<WeeklyReportResult | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // ========================================
  // API CALLS
  // ========================================

  const fetchAnalysis = async () => {
    if (analyzeState === 'loading') return;
    
    setAnalyzeState('loading');
    setAnalyzeError(null);
    
    try {
      const res = await fetch('/api/montree/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to analyze');
      }
      
      const data = await res.json();
      setAnalyzeResult(data);
      setAnalyzeState('success');
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed');
      setAnalyzeState('error');
    }
  };

  const fetchSuggestions = async () => {
    if (suggestState === 'loading') return;
    
    setSuggestState('loading');
    setSuggestError(null);
    
    try {
      const res = await fetch('/api/montree/ai/suggest-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, limit: 5 }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get suggestions');
      }
      
      const data = await res.json();
      setSuggestResult(data);
      setSuggestState('success');
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Suggestions failed');
      setSuggestState('error');
    }
  };

  const fetchWeeklyReport = async () => {
    if (reportState === 'loading') return;
    
    setReportState('loading');
    setReportError(null);
    
    try {
      const res = await fetch('/api/montree/ai/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate report');
      }
      
      const data = await res.json();
      setReportResult(data);
      setReportState('success');
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Report failed');
      setReportState('error');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // ========================================
  // RENDER HELPERS
  // ========================================

  const LoadingSpinner = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
        <span className="text-2xl animate-bounce">🐋</span>
      </div>
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );

  const ErrorMessage = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
      <p className="text-red-600 mb-3">❌ {message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
      >
        Try Again
      </button>
    </div>
  );

  const ActionButton = ({ 
    onClick, 
    loading, 
    icon, 
    label,
    variant = 'primary'
  }: { 
    onClick: () => void; 
    loading: boolean;
    icon: string;
    label: string;
    variant?: 'primary' | 'secondary';
  }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
        ${variant === 'primary' 
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
      `}
    >
      <span className="text-lg">{loading ? '⏳' : icon}</span>
      <span>{loading ? 'Loading...' : label}</span>
    </button>
  );

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
            🧠
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Insights</h2>
            <p className="text-emerald-100 text-sm">Developmental analysis for {childName}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Developmental Analysis */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-bold text-gray-900">Developmental Analysis</h3>
                <p className="text-sm text-gray-500">Overall strengths and growth areas</p>
              </div>
            </div>
            {analyzeState !== 'success' && (
              <ActionButton
                onClick={fetchAnalysis}
                loading={analyzeState === 'loading'}
                icon="✨"
                label="Analyze"
              />
            )}
          </div>
        </div>
        
        <div className="p-4">
          {analyzeState === 'idle' && (
            <p className="text-gray-400 text-center py-6">
              Click "Analyze" to generate developmental insights
            </p>
          )}
          
          {analyzeState === 'loading' && (
            <LoadingSpinner text="Analyzing developmental progress..." />
          )}
          
          {analyzeState === 'error' && (
            <ErrorMessage message={analyzeError || 'Unknown error'} onRetry={fetchAnalysis} />
          )}
          
          {analyzeState === 'success' && analyzeResult && (
            <AnalysisDisplay result={analyzeResult} onRefresh={fetchAnalysis} />
          )}
        </div>
      </section>

      {/* Section 2: Suggested Next Works */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-bold text-gray-900">Suggested Next Works</h3>
                <p className="text-sm text-gray-500">Recommended based on readiness</p>
              </div>
            </div>
            {suggestState !== 'success' && (
              <ActionButton
                onClick={fetchSuggestions}
                loading={suggestState === 'loading'}
                icon="🎯"
                label="Suggest"
              />
            )}
          </div>
        </div>
        
        <div className="p-4">
          {suggestState === 'idle' && (
            <p className="text-gray-400 text-center py-6">
              Click "Suggest" to get personalized work recommendations
            </p>
          )}
          
          {suggestState === 'loading' && (
            <LoadingSpinner text="Finding optimal next works..." />
          )}
          
          {suggestState === 'error' && (
            <ErrorMessage message={suggestError || 'Unknown error'} onRetry={fetchSuggestions} />
          )}
          
          {suggestState === 'success' && suggestResult && (
            <SuggestionsDisplay result={suggestResult} onRefresh={fetchSuggestions} />
          )}
        </div>
      </section>

      {/* Section 3: Weekly Parent Report */}
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden print:shadow-none">
        <div className="p-4 border-b bg-gray-50 print:bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h3 className="font-bold text-gray-900">Weekly Parent Report</h3>
                <p className="text-sm text-gray-500">Share progress with parents</p>
              </div>
            </div>
            <div className="flex gap-2 print:hidden">
              {reportState === 'success' && (
                <ActionButton
                  onClick={handlePrintReport}
                  loading={false}
                  icon="🖨️"
                  label="Print"
                  variant="secondary"
                />
              )}
              {reportState !== 'success' && (
                <ActionButton
                  onClick={fetchWeeklyReport}
                  loading={reportState === 'loading'}
                  icon="📄"
                  label="Generate"
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {reportState === 'idle' && (
            <p className="text-gray-400 text-center py-6">
              Click "Generate" to create a parent-friendly progress report
            </p>
          )}
          
          {reportState === 'loading' && (
            <LoadingSpinner text="Writing weekly report..." />
          )}
          
          {reportState === 'error' && (
            <ErrorMessage message={reportError || 'Unknown error'} onRetry={fetchWeeklyReport} />
          )}
          
          {reportState === 'success' && reportResult && (
            <WeeklyReportDisplay result={reportResult} onRefresh={fetchWeeklyReport} />
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function AnalysisDisplay({ result, onRefresh }: { result: AnalyzeResult; onRefresh: () => void }) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-emerald-50 rounded-xl p-4">
        <p className="text-gray-700 leading-relaxed">{result.summary}</p>
      </div>

      {/* Developmental Stage */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-600">Stage:</span>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
          {result.developmental_stage}
        </span>
      </div>

      {/* Strengths & Growth Areas */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths */}
        <div className="bg-green-50 rounded-xl p-4">
          <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
            <span>💪</span> Strengths
          </h4>
          <ul className="space-y-1">
            {result.strengths.map((s, i) => (
              <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Growth Areas */}
        <div className="bg-amber-50 rounded-xl p-4">
          <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <span>🌱</span> Growth Areas
          </h4>
          <ul className="space-y-1">
            {result.growth_areas.map((g, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-amber-500">→</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Area Insights */}
      <div>
        <h4 className="font-bold text-gray-800 mb-3">Area Insights</h4>
        <div className="space-y-2">
          {result.area_insights.map((area) => {
            const colors = AREA_COLORS[area.area] || AREA_COLORS.practical_life;
            return (
              <div key={area.area} className={`${colors.bg} rounded-xl p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold ${colors.text}`}>{area.area_name}</span>
                  <span className={`text-sm ${colors.text}`}>
                    {area.completed}/{area.total_works} mastered ({area.completion_percentage}%)
                  </span>
                </div>
                <p className="text-sm text-gray-700">{area.insight}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Timestamp & Refresh */}
      <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-400">
        <span>Generated: {new Date(result.generated_at).toLocaleString()}</span>
        <button onClick={onRefresh} className="hover:text-emerald-600 transition-colors">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

function SuggestionsDisplay({ result, onRefresh }: { result: SuggestResult; onRefresh: () => void }) {
  return (
    <div className="space-y-3">
      {result.suggestions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No suggestions available - all works may be assigned already
        </p>
      ) : (
        <>
          {result.suggestions.map((suggestion, index) => {
            const colors = AREA_COLORS[suggestion.work.area] || AREA_COLORS.practical_life;
            const readinessPercent = Math.round(suggestion.readiness_score * 100);
            
            return (
              <div 
                key={suggestion.work.id} 
                className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white font-bold text-sm shadow`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900">{suggestion.work.name}</h4>
                    {suggestion.work.name_chinese && (
                      <p className="text-sm text-gray-500">{suggestion.work.name_chinese}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {suggestion.work.area_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {suggestion.work.category}
                      </span>
                    </div>
                  </div>
                  
                  {/* Readiness Score */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      readinessPercent >= 80 ? 'text-green-600' :
                      readinessPercent >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {readinessPercent}%
                    </div>
                    <div className="text-xs text-gray-400">ready</div>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-3 pt-3 border-t space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Why:</span> {suggestion.reason}
                  </p>
                  <p className="text-sm text-emerald-600">
                    <span className="font-medium">Benefit:</span> {suggestion.developmental_benefit}
                  </p>
                  
                  {/* Prerequisites */}
                  {suggestion.prerequisites_missing.length > 0 && (
                    <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                      <span className="font-medium">Missing prerequisites:</span>{' '}
                      {suggestion.prerequisites_missing.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          <p className="text-xs text-gray-400 text-center pt-2">
            {result.total_available_works} works available to assign
          </p>
        </>
      )}

      {/* Timestamp & Refresh */}
      <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-400">
        <span>Generated: {new Date(result.generated_at).toLocaleString()}</span>
        <button onClick={onRefresh} className="hover:text-emerald-600 transition-colors">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

function WeeklyReportDisplay({ result, onRefresh }: { result: WeeklyReportResult; onRefresh: () => void }) {
  return (
    <div className="space-y-4 print:space-y-6">
      {/* Report Header - Print Friendly */}
      <div className="hidden print:block text-center border-b pb-4">
        <h1 className="text-2xl font-bold">Weekly Progress Report</h1>
        <p className="text-lg">{result.child.name}</p>
        <p className="text-gray-500">
          {new Date(result.period.start).toLocaleDateString()} - {new Date(result.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Period Banner */}
      <div className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-4 print:bg-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-emerald-800">Week of {new Date(result.period.start).toLocaleDateString()}</h4>
            <p className="text-sm text-emerald-600">
              {result.works_this_week.length} works engaged
            </p>
          </div>
          <div className="text-3xl">📅</div>
        </div>
      </div>

      {/* Highlights */}
      {result.highlights.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-4 print:bg-yellow-100">
          <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
            <span>⭐</span> This Week's Highlights
          </h4>
          <ul className="space-y-1">
            {result.highlights.map((h, i) => (
              <li key={i} className="text-sm text-yellow-700">• {h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Narrative - The Main Story */}
      <div className="bg-white border rounded-xl p-5 print:border-2">
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {result.narrative}
        </p>
      </div>

      {/* Areas Worked */}
      {result.areas_worked.length > 0 && (
        <div>
          <h4 className="font-bold text-gray-800 mb-3">Areas of Focus</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {result.areas_worked.map((area) => {
              const colors = AREA_COLORS[area.area] || AREA_COLORS.practical_life;
              const total = area.works_completed + area.works_in_progress + area.works_presented;
              return (
                <div key={area.area} className={`${colors.bg} rounded-xl p-3 text-center`}>
                  <div className={`font-bold ${colors.text}`}>{area.area_name}</div>
                  <div className="text-2xl font-bold text-gray-800">{total}</div>
                  <div className="text-xs text-gray-500">works</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Steps */}
      {result.next_steps.length > 0 && (
        <div className="bg-emerald-50 rounded-xl p-4 print:bg-emerald-100">
          <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
            <span>🚀</span> Suggestions for Home
          </h4>
          <ul className="space-y-1">
            {result.next_steps.map((step, i) => (
              <li key={i} className="text-sm text-emerald-700">• {step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Works This Week - Collapsed by default */}
      {result.works_this_week.length > 0 && (
        <details className="bg-gray-50 rounded-xl overflow-hidden print:open">
          <summary className="p-4 cursor-pointer font-medium text-gray-700 hover:bg-gray-100">
            📋 Detailed Work List ({result.works_this_week.length} works)
          </summary>
          <div className="p-4 pt-0 border-t">
            <div className="space-y-1">
              {result.works_this_week.map((work, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1">
                  <span className="text-gray-700">{work.work_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    work.status === 'mastered' ? 'bg-green-100 text-green-700' :
                    work.status === 'practicing' ? 'bg-blue-100 text-blue-700' :
                    work.status === 'presented' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {work.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Timestamp & Refresh - Hidden in print */}
      <div className="flex items-center justify-between pt-2 border-t text-xs text-gray-400 print:hidden">
        <span>Generated: {new Date(result.generated_at).toLocaleString()}</span>
        <button onClick={onRefresh} className="hover:text-emerald-600 transition-colors">
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}
