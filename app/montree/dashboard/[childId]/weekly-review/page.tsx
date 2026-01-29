// /app/montree/dashboard/[childId]/weekly-review/page.tsx
// Weekly Review - AI-generated reports with tabs
// Teacher | Parent | AI Analysis views

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';

// ============================================
// TYPES
// ============================================

interface TeacherReport {
  type: 'teacher';
  child_name: string;
  child_age: number;
  week_range: string;
  summary: string;
  metrics: {
    total_works: number;
    concentration_score: number;
    concentration_assessment: string;
    avg_duration?: number;
    expected_duration: number;
  };
  area_breakdown: {
    area: string;
    percentage: number;
    expected_range: string;
    status: 'healthy' | 'low' | 'high';
  }[];
  sensitive_periods: {
    name: string;
    status: string;
    confidence: number;
    evidence: string[];
  }[];
  flags: {
    type: 'red' | 'yellow';
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  recommendations: {
    work_name: string;
    area: string;
    score: number;
    reasons: string[];
  }[];
}

interface ParentReport {
  type: 'parent';
  child_name: string;
  greeting: string;
  highlights: string[];
  areas_explored: {
    area_name: string;
    emoji: string;
    works: string[];
    description: string;
  }[];
  home_suggestions: string[];
  closing: string;
}

interface AIReport {
  type: 'ai_analysis';
  child_name: string;
  child_age: number;
  profile: {
    concentration: string;
    emotional: string;
    social: string;
  };
  sensitive_periods_analysis: string;
  developmental_trajectory: string;
  concerns: {
    severity: string;
    issue: string;
    evidence: string;
    recommendation: string;
  }[];
  two_week_plan: string[];
  observation_questions: string[];
  parent_communication_points: string[];
}

// ============================================
// HELPER: Get week boundaries
// ============================================

function getWeekBoundaries(date: Date = new Date()): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);
  
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  
  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function WeeklyReviewPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [activeTab, setActiveTab] = useState<'teacher' | 'parent' | 'ai'>('teacher');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [reports, setReports] = useState<{
    teacher?: TeacherReport;
    parent?: ParentReport;
    ai_analysis?: AIReport;
  }>({});
  const [childName, setChildName] = useState('');
  const [weekRange, setWeekRange] = useState(getWeekBoundaries());

  // Fetch or generate reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/montree/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          week_start: weekRange.start,
          week_end: weekRange.end,
          report_types: ['teacher', 'parent', 'ai_analysis'],
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setReports(data.reports);
        setChildName(data.analysis_summary?.child_name || '');
      } else {
        toast.error(data.error || 'Failed to generate reports');
      }
    } catch (err) {
      toast.error('Failed to fetch reports');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (childId) fetchReports();
  }, [childId, weekRange]);

  // Regenerate reports
  const regenerate = async () => {
    setGenerating(true);
    await fetchReports();
    setGenerating(false);
    toast.success('Reports regenerated!');
  };

  // Week navigation
  const goToPrevWeek = () => {
    const prevMonday = new Date(weekRange.start);
    prevMonday.setDate(prevMonday.getDate() - 7);
    setWeekRange(getWeekBoundaries(prevMonday));
  };

  const goToNextWeek = () => {
    const nextMonday = new Date(weekRange.start);
    nextMonday.setDate(nextMonday.getDate() + 7);
    setWeekRange(getWeekBoundaries(nextMonday));
  };

  // Notify parents
  const notifyParents = async () => {
    setNotifying(true);
    try {
      const weekNum = Math.ceil((new Date(weekRange.start).getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const res = await fetch('/api/montree/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          weekNumber: weekNum,
          year: new Date(weekRange.start).getFullYear()
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Parents notified!');
      } else {
        toast.error(data.error || 'Failed to notify');
      }
    } catch {
      toast.error('Failed to send notifications');
    }
    setNotifying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.back()}
              className="text-slate-500 hover:text-slate-700"
            >
              ← Back
            </button>
            <h1 className="font-bold text-slate-800">Weekly Review</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={notifyParents}
                disabled={notifying || loading}
                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
                title="Notify Parents"
              >
                {notifying ? '...' : '📧'}
              </button>
              <button
                onClick={regenerate}
                disabled={generating}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                title="Regenerate"
              >
                {generating ? '...' : '🔄'}
              </button>
            </div>
          </div>
          
          {/* Week Selector */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button onClick={goToPrevWeek} className="text-slate-400 hover:text-slate-600">
              ◀
            </button>
            <span className="text-sm text-slate-600">
              {new Date(weekRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' - '}
              {new Date(weekRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={goToNextWeek} className="text-slate-400 hover:text-slate-600">
              ▶
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex border-b">
            {[
              { key: 'teacher', label: '📊 Teacher', color: 'blue' },
              { key: 'parent', label: '💝 Parent', color: 'pink' },
              { key: 'ai', label: '🧠 AI Analysis', color: 'purple' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent mx-auto mb-3" />
            <p className="text-slate-500">Generating reports...</p>
          </div>
        ) : (
          <>
            {activeTab === 'teacher' && reports.teacher && (
              <TeacherReportView report={reports.teacher} />
            )}
            {activeTab === 'parent' && reports.parent && (
              <ParentReportView report={reports.parent} />
            )}
            {activeTab === 'ai' && reports.ai_analysis && (
              <AIReportView report={reports.ai_analysis} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// TEACHER REPORT VIEW
// ============================================

function TeacherReportView({ report }: { report: TeacherReport }) {
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="font-bold text-slate-800 mb-2">{report.child_name}</h2>
        <p className="text-sm text-slate-600">{report.summary}</p>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">📈 Metrics</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard 
            label="Total Works" 
            value={report.metrics.total_works} 
          />
          <MetricCard 
            label="Concentration" 
            value={`${report.metrics.concentration_score}/100`}
            subtext={report.metrics.concentration_assessment}
          />
          <MetricCard 
            label="Avg Duration" 
            value={report.metrics.avg_duration ? `${report.metrics.avg_duration.toFixed(0)} min` : 'N/A'}
            subtext={`Expected: ${report.metrics.expected_duration} min`}
          />
          <MetricCard 
            label="Age" 
            value={`${report.child_age} yrs`}
          />
        </div>
      </div>

      {/* Area Breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">📊 Area Balance</h3>
        <div className="space-y-2">
          {report.area_breakdown.map((area, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{area.area}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      area.status === 'healthy' ? 'bg-emerald-400' :
                      area.status === 'low' ? 'bg-amber-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min(100, area.percentage)}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-16 text-right">
                  {area.percentage}% <span className="text-slate-400">({area.expected_range})</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitive Periods */}
      {report.sensitive_periods.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">🌱 Sensitive Periods</h3>
          <div className="space-y-3">
            {report.sensitive_periods.map((sp, i) => (
              <div key={i} className="border-l-4 border-emerald-400 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{sp.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    sp.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    sp.status === 'emerging' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {sp.status} ({sp.confidence}%)
                  </span>
                </div>
                {sp.evidence.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">{sp.evidence.slice(0, 2).join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags */}
      {report.flags.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">⚠️ Attention Needed</h3>
          <div className="space-y-3">
            {report.flags.map((flag, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-xl ${
                  flag.type === 'red' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <p className={`font-medium ${flag.type === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                  {flag.issue}
                </p>
                <p className="text-xs text-slate-600 mt-1">{flag.evidence}</p>
                <p className="text-xs text-slate-500 mt-1 italic">💡 {flag.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">✨ Recommended Next</h3>
          <div className="space-y-2">
            {report.recommendations.slice(0, 5).map((rec, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-700">{rec.work_name}</p>
                  <p className="text-xs text-slate-500">{rec.reasons[0]}</p>
                </div>
                <span className="text-sm font-bold text-emerald-600">{rec.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PARENT REPORT VIEW
// ============================================

function ParentReportView({ report }: { report: ParentReport }) {
  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 shadow-sm border border-pink-100">
        <h2 className="text-xl font-bold text-rose-700 mb-2">
          Hello, {report.child_name.split(' ')[0]}'s Family! 👋
        </h2>
        <p className="text-rose-600">{report.greeting}</p>
      </div>

      {/* Highlights */}
      {report.highlights.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">🌟 This Week's Highlights</h3>
          <ul className="space-y-2">
            {report.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">★</span>
                <span className="text-slate-600">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas Explored */}
      {report.areas_explored.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">🎨 Areas Explored</h3>
          <div className="space-y-4">
            {report.areas_explored.map((area, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-medium text-slate-700">{area.area_name}</span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{area.description}</p>
                <div className="flex flex-wrap gap-1">
                  {area.works.map((w, j) => (
                    <span key={j} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Home Suggestions */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
        <h3 className="font-semibold text-emerald-700 mb-3">🏠 At Home Ideas</h3>
        <ul className="space-y-2">
          {report.home_suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              <span className="text-emerald-700 text-sm">{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Closing */}
      <div className="text-center py-4">
        <p className="text-slate-600 italic">{report.closing}</p>
        <p className="text-2xl mt-2">🐋</p>
      </div>
    </div>
  );
}

// ============================================
// AI ANALYSIS REPORT VIEW
// ============================================

function AIReportView({ report }: { report: AIReport }) {
  return (
    <div className="space-y-4">
      {/* Profile */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-purple-100">
        <h2 className="font-bold text-purple-800 mb-3">
          Developmental Profile: {report.child_name}
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <ProfileBadge label="Concentration" value={report.profile.concentration} />
          <ProfileBadge label="Emotional" value={report.profile.emotional} />
          <ProfileBadge label="Social" value={report.profile.social} />
        </div>
      </div>

      {/* Sensitive Periods */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-2">🌱 Sensitive Period Analysis</h3>
        <p className="text-sm text-slate-600">{report.sensitive_periods_analysis || 'Insufficient data.'}</p>
      </div>

      {/* Trajectory */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-2">📈 Developmental Trajectory</h3>
        <p className="text-sm text-slate-600">{report.developmental_trajectory}</p>
      </div>

      {/* Concerns */}
      {report.concerns.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-3">⚠️ Areas of Concern</h3>
          <div className="space-y-3">
            {report.concerns.map((c, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-lg ${
                  c.severity === 'red' ? 'bg-red-50' : 'bg-amber-50'
                }`}
              >
                <p className="font-medium text-slate-700">{c.issue}</p>
                <p className="text-xs text-slate-500 mt-1">{c.evidence}</p>
                <p className="text-xs text-slate-600 mt-1">→ {c.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Week Plan */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">📋 2-Week Action Plan</h3>
        <ol className="space-y-2">
          {report.two_week_plan.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-sm text-slate-600">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Observation Questions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">🔍 Observation Questions</h3>
        <ul className="space-y-2">
          {report.observation_questions.map((q, i) => (
            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="text-purple-400">?</span>
              {q}
            </li>
          ))}
        </ul>
      </div>

      {/* Parent Communication */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">💬 Parent Discussion Points</h3>
        <ul className="space-y-1">
          {report.parent_communication_points.map((p, i) => (
            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
              <span className="text-slate-400">•</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

function MetricCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </div>
  );
}

function ProfileBadge({ label, value }: { label: string; value: string }) {
  const colors: Record<string, string> = {
    strong: 'bg-emerald-100 text-emerald-700',
    moderate: 'bg-amber-100 text-amber-700',
    weak: 'bg-red-100 text-red-700',
    positive: 'bg-emerald-100 text-emerald-700',
    mixed: 'bg-amber-100 text-amber-700',
    negative: 'bg-red-100 text-red-700',
    thriving: 'bg-emerald-100 text-emerald-700',
    developing: 'bg-amber-100 text-amber-700',
    struggling: 'bg-red-100 text-red-700',
    unknown: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="text-center">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <span className={`text-xs px-2 py-1 rounded-full ${colors[value] || colors.unknown}`}>
        {value}
      </span>
    </div>
  );
}
