// components/montree/reports/TeacherReportView.tsx
// Renders a teacher report beautifully — used in the Weekly Wrap review page
'use client';

import { useState } from 'react';
import type { TeacherReportContent } from '@/lib/montree/reports/teacher-report-generator';

const AREA_STYLES: Record<string, { emoji: string; color: string; bg: string }> = {
  practical_life: { emoji: '🧹', color: 'text-pink-700', bg: 'bg-pink-50' },
  sensorial: { emoji: '👁️', color: 'text-purple-700', bg: 'bg-purple-50' },
  mathematics: { emoji: '🔢', color: 'text-blue-700', bg: 'bg-blue-50' },
  language: { emoji: '📚', color: 'text-amber-700', bg: 'bg-amber-50' },
  cultural: { emoji: '🌍', color: 'text-green-700', bg: 'bg-green-50' },
};

function getAreaStyle(area: string) {
  return AREA_STYLES[area] || { emoji: '📋', color: 'text-gray-700', bg: 'bg-gray-50' };
}

interface Props {
  report: TeacherReportContent;
  childName: string;
  compact?: boolean; // If true, only shows key_insight + expandable sections
}

export default function TeacherReportView({ report, childName, compact = false }: Props) {
  const [expanded, setExpanded] = useState(!compact);
  const firstName = childName.split(' ')[0];

  if (compact && !expanded) {
    return (
      <div className="space-y-2">
        {/* Key insight preview */}
        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
          {report.key_insight}
        </p>
        {/* Flags summary */}
        {report.flags && report.flags.length > 0 && (
          <div className="flex gap-1.5">
            {report.flags.map((f, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                f.level === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {f.level === 'red' ? '🔴' : '🟡'} {f.issue.split('.')[0]}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-emerald-600 font-medium hover:underline"
        >
          View full teacher report →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {compact && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ← Collapse
        </button>
      )}

      {/* ═══ Developmental Snapshot ═══ */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Developmental Snapshot
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.developmental_snapshot}
        </p>
      </section>

      {/* ═══ Sensitive Periods ═══ */}
      {report.sensitive_periods && report.sensitive_periods.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Active Sensitive Periods
          </h4>
          <div className="space-y-3">
            {report.sensitive_periods.map((sp, i) => (
              <div key={i} className="border-l-4 border-violet-300 pl-3">
                <p className="text-sm font-semibold text-violet-800">
                  {sp.period}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    sp.status === 'active' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {sp.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{sp.evidence}</p>
                <p className="text-sm text-violet-600 mt-0.5 italic">{sp.implication}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Area Analyses ═══ */}
      {report.area_analyses && report.area_analyses.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Curriculum Areas
          </h4>
          <div className="space-y-3">
            {report.area_analyses.map((aa, i) => {
              const style = getAreaStyle(aa.area);
              return (
                <div key={i} className={`${style.bg} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{style.emoji}</span>
                    <span className={`text-sm font-bold ${style.color}`}>
                      {aa.area_label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {aa.works_count} {aa.works_count === 1 ? 'work' : 'works'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{aa.narrative}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ Concentration ═══ */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Concentration & Focus
        </h4>
        <div className="flex items-center gap-3 mb-2">
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={report.concentration.score >= 60 ? '#10b981' : report.concentration.score >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3"
                strokeDasharray={`${report.concentration.score * 0.94} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
              {report.concentration.score}
            </span>
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              report.concentration.assessment === 'strong' ? 'text-emerald-700' :
              report.concentration.assessment === 'moderate' ? 'text-amber-700' : 'text-gray-600'
            }`}>
              {report.concentration.assessment.charAt(0).toUpperCase() + report.concentration.assessment.slice(1)}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.concentration.narrative}
        </p>
      </section>

      {/* ═══ Normalization ═══ */}
      <section>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Normalization Journey
        </h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.normalization_narrative}
        </p>
      </section>

      {/* ═══ Flags ═══ */}
      {report.flags && report.flags.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Observations & Notes
          </h4>
          <div className="space-y-2">
            {report.flags.map((f, i) => (
              <div key={i} className={`rounded-lg p-3 ${
                f.level === 'red' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
              }`}>
                <p className={`text-sm font-semibold ${f.level === 'red' ? 'text-red-700' : 'text-amber-700'}`}>
                  {f.level === 'red' ? '🔴' : '🟡'} {f.issue}
                </p>
                <p className="text-sm text-gray-600 mt-1">{f.montessori_context}</p>
                <p className={`text-sm font-medium mt-1 ${f.level === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                  → {f.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ Recommendations ═══ */}
      {report.recommendations && report.recommendations.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Recommended Next Presentations
          </h4>
          <div className="space-y-2">
            {report.recommendations.map((rec, i) => {
              const style = getAreaStyle(rec.area);
              return (
                <div key={i} className="flex gap-3 items-start">
                  <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs ${style.bg}`}>
                    {style.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{rec.work}</p>
                    <p className="text-xs text-gray-500">{rec.area_label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{rec.reasoning}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══ Key Insight ═══ */}
      <section className="border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl px-4 py-3">
        <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">
          Key Insight
        </h4>
        <p className="text-sm text-gray-800 leading-relaxed font-medium">
          {report.key_insight}
        </p>
      </section>
    </div>
  );
}
