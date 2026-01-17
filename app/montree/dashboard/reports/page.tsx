// /montree/dashboard/reports/page.tsx
// Report Generation - Weekly, Monthly, Term
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get('student');
  
  const [selectedType, setSelectedType] = useState<'weekly' | 'monthly' | 'term'>('weekly');

  const reportTypes = [
    { id: 'weekly', name: 'Weekly', emoji: '📅', desc: 'Last 7 days progress' },
    { id: 'monthly', name: 'Monthly', emoji: '📆', desc: 'Full month overview' },
    { id: 'term', name: 'Term', emoji: '📚', desc: 'Complete term summary' },
  ] as const;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-500 text-sm">
          {studentId ? 'Generate report for student' : 'Generate class reports'}
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="space-y-2">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
              selectedType === type.id
                ? 'bg-teal-500/20 border-teal-500/50 text-white'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            <span className="text-2xl">{type.emoji}</span>
            <div className="text-left flex-1">
              <div className="font-medium">{type.name} Report</div>
              <div className="text-sm text-slate-500">{type.desc}</div>
            </div>
            {selectedType === type.id && (
              <span className="text-teal-400">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Coming Soon Notice */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-white font-semibold mb-2">Coming Soon</h2>
        <p className="text-slate-500 text-sm">
          One-tap report generation with photos and progress data.
          <br />
          WeChat-ready format included.
        </p>
      </div>

      {/* Preview of what's coming */}
      <div className="space-y-3">
        <h3 className="text-white font-medium">Report will include:</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: '📊', text: 'Progress summary' },
            { emoji: '📷', text: 'Work photos' },
            { emoji: '✅', text: 'Completed works' },
            { emoji: '🎯', text: 'Next goals' },
            { emoji: '💬', text: 'Teacher notes' },
            { emoji: '📱', text: 'WeChat format' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-800/30 rounded-lg p-3">
              <span>{item.emoji}</span>
              <span className="text-slate-400 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
