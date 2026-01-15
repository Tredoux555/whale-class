// app/admin/schools/[slug]/english-reports/page.tsx
// Weekly English Reports Generator
// Auto-generates reports like "This week Rachel did WBW/a/..."
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  currentWork: string;
  currentWorkName: string;
}

interface WeeklyLog {
  childId: string;
  workDone: string;
  workDoneName: string;
  performance: 'excellent' | 'good' | 'needs_practice' | 'introduced' | 'none';
  nextWork: string;
  nextWorkName: string;
  notes: string;
  reportText: string;
}

// Mock children data
const MOCK_CHILDREN: Child[] = [
  { id: '1', name: 'Amy', currentWork: 'WBW/a/', currentWorkName: 'Word Building: Short A' },
  { id: '2', name: 'Ben', currentWork: 'BS', currentWorkName: 'Beginning Sounds' },
  { id: '3', name: 'Chloe', currentWork: 'WBW/e/', currentWorkName: 'Word Building: Short E' },
  { id: '4', name: 'David', currentWork: 'ES', currentWorkName: 'Ending Sounds' },
  { id: '5', name: 'Emma', currentWork: 'WBW/a/', currentWorkName: 'Word Building: Short A' },
  { id: '6', name: 'Frank', currentWork: 'MS', currentWorkName: 'Middle Sounds' },
  { id: '7', name: 'Grace', currentWork: 'WBW/i/', currentWorkName: 'Word Building: Short I' },
  { id: '8', name: 'Henry', currentWork: 'BS', currentWorkName: 'Beginning Sounds' },
  { id: '9', name: 'Ivy', currentWork: 'WBW/o/', currentWorkName: 'Word Building: Short O' },
  { id: '10', name: 'Jack', currentWork: 'PR/a/', currentWorkName: 'Pink Reading: Short A' },
  { id: '11', name: 'Kate', currentWork: 'WBW/e/', currentWorkName: 'Word Building: Short E' },
  { id: '12', name: 'Leo', currentWork: 'ES', currentWorkName: 'Ending Sounds' },
];

// English works for dropdown
const ENGLISH_WORKS = [
  { code: 'BS', name: 'Beginning Sounds' },
  { code: 'ES', name: 'Ending Sounds' },
  { code: 'MS', name: 'Middle Sounds' },
  { code: 'WBW/a/', name: 'Word Building: Short A' },
  { code: 'WBW/e/', name: 'Word Building: Short E' },
  { code: 'WBW/i/', name: 'Word Building: Short I' },
  { code: 'WBW/o/', name: 'Word Building: Short O' },
  { code: 'WBW/u/', name: 'Word Building: Short U' },
  { code: 'PR/a/', name: 'Pink Reading: Short A' },
  { code: 'PR/e/', name: 'Pink Reading: Short E' },
  { code: 'PR/i/', name: 'Pink Reading: Short I' },
  { code: 'PR/o/', name: 'Pink Reading: Short O' },
  { code: 'PR/u/', name: 'Pink Reading: Short U' },
];

const PERFORMANCE_OPTIONS = [
  { value: 'none', label: 'No work done', color: 'bg-slate-500' },
  { value: 'introduced', label: 'Just introduced', color: 'bg-blue-500' },
  { value: 'needs_practice', label: 'Needs practice', color: 'bg-amber-500' },
  { value: 'good', label: 'Did well', color: 'bg-green-500' },
  { value: 'excellent', label: 'Excellent', color: 'bg-emerald-500' },
];

function generateReportText(
  childName: string,
  workDone: string,
  workDoneName: string,
  performance: string,
  nextWork: string,
  nextWorkName: string,
  notes: string
): string {
  if (performance === 'none' || !workDone) {
    return `${childName} is continuing to develop their spoken English skills. They are engaging well in classroom activities and building confidence with the language.`;
  }

  let performanceText = '';
  switch (performance) {
    case 'excellent':
      performanceText = 'did excellently with it and showed strong understanding';
      break;
    case 'good':
      performanceText = 'did quite well with it';
      break;
    case 'needs_practice':
      performanceText = 'is working on it and needs a little more practice';
      break;
    case 'introduced':
      performanceText = 'was introduced to it this week';
      break;
    default:
      performanceText = 'worked on it';
  }

  let report = `This week ${childName} did the ${workDone} (${workDoneName}). They ${performanceText}.`;
  
  if (nextWork && nextWork !== workDone) {
    report += ` Next week we will do the ${nextWork}.`;
  } else if (nextWork) {
    report += ` We will continue with ${nextWork} next week.`;
  }

  if (notes) {
    report += ` ${notes}`;
  }

  return report;
}

export default function EnglishReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Get current week
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [children] = useState<Child[]>(MOCK_CHILDREN);
  const [logs, setLogs] = useState<Record<string, WeeklyLog>>({});
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const updateLog = (childId: string, updates: Partial<WeeklyLog>) => {
    setLogs(prev => {
      const child = children.find(c => c.id === childId);
      const current = prev[childId] || {
        childId,
        workDone: child?.currentWork || '',
        workDoneName: child?.currentWorkName || '',
        performance: 'good' as const,
        nextWork: '',
        nextWorkName: '',
        notes: '',
        reportText: '',
      };
      
      const updated = { ...current, ...updates };
      
      // Auto-generate report text
      const workDoneName = ENGLISH_WORKS.find(w => w.code === updated.workDone)?.name || updated.workDone;
      const nextWorkName = ENGLISH_WORKS.find(w => w.code === updated.nextWork)?.name || updated.nextWork;
      
      updated.reportText = generateReportText(
        child?.name || '',
        updated.workDone,
        workDoneName,
        updated.performance,
        updated.nextWork,
        nextWorkName,
        updated.notes
      );
      
      return { ...prev, [childId]: updated };
    });
  };

  const getLog = (childId: string): WeeklyLog => {
    const child = children.find(c => c.id === childId);
    return logs[childId] || {
      childId,
      workDone: child?.currentWork || '',
      workDoneName: child?.currentWorkName || '',
      performance: 'good',
      nextWork: getNextWork(child?.currentWork || ''),
      nextWorkName: '',
      notes: '',
      reportText: '',
    };
  };

  const getNextWork = (currentWork: string): string => {
    const index = ENGLISH_WORKS.findIndex(w => w.code === currentWork);
    if (index >= 0 && index < ENGLISH_WORKS.length - 1) {
      return ENGLISH_WORKS[index + 1].code;
    }
    return currentWork;
  };

  const copyAllReports = () => {
    const reports = children.map(child => {
      const log = getLog(child.id);
      if (log.reportText) return log.reportText;
      return generateReportText(
        child.name,
        log.workDone,
        log.workDoneName,
        log.performance,
        log.nextWork,
        log.nextWorkName,
        log.notes
      );
    }).join('\n\n');
    
    navigator.clipboard.writeText(reports);
    alert('All reports copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/admin/schools/${slug}`} className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Back
            </Link>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">English Reports</h1>
              <p className="text-slate-400 text-sm">Week {selectedWeek}, {selectedYear}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-400 transition-colors text-sm"
            >
              Preview All
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Info */}
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 mb-6">
          <p className="text-teal-200 text-sm">
            <strong className="text-teal-400">Weekly Reports</strong> — 
            Select what work each child did and their performance. Reports auto-generate.
          </p>
        </div>

        {/* Children List */}
        <div className="space-y-3">
          {children.map((child) => {
            const log = getLog(child.id);
            const isExpanded = expandedChild === child.id;
            const perf = PERFORMANCE_OPTIONS.find(p => p.value === log.performance);
            
            return (
              <div
                key={child.id}
                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Child Header - Always visible */}
                <button
                  onClick={() => setExpandedChild(isExpanded ? null : child.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-white">
                      {child.name[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-white">{child.name}</div>
                      <div className="text-sm text-slate-400">Current: {child.currentWork}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium text-white ${perf?.color || 'bg-slate-600'}`}>
                      {perf?.label || 'Not set'}
                    </div>
                    <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                {/* Expanded Form */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Work Done */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Work Done This Week</label>
                        <select
                          value={log.workDone}
                          onChange={(e) => updateLog(child.id, { workDone: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          <option value="">No work</option>
                          {ENGLISH_WORKS.map(w => (
                            <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Performance */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Performance</label>
                        <select
                          value={log.performance}
                          onChange={(e) => updateLog(child.id, { performance: e.target.value as any })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {PERFORMANCE_OPTIONS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Next Work */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Next Week's Work</label>
                        <select
                          value={log.nextWork}
                          onChange={(e) => updateLog(child.id, { nextWork: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        >
                          {ENGLISH_WORKS.map(w => (
                            <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Notes */}
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Extra Notes</label>
                        <input
                          type="text"
                          value={log.notes}
                          onChange={(e) => updateLog(child.id, { notes: e.target.value })}
                          placeholder="Optional notes..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                    
                    {/* Generated Report Preview */}
                    <div className="bg-slate-900 rounded-lg p-3">
                      <div className="text-xs text-slate-400 mb-1">Generated Report:</div>
                      <p className="text-white text-sm leading-relaxed">
                        {log.reportText || generateReportText(
                          child.name,
                          log.workDone,
                          ENGLISH_WORKS.find(w => w.code === log.workDone)?.name || '',
                          log.performance,
                          log.nextWork,
                          ENGLISH_WORKS.find(w => w.code === log.nextWork)?.name || '',
                          log.notes
                        )}
                      </p>
                      <button
                        onClick={() => {
                          const text = log.reportText || generateReportText(
                            child.name,
                            log.workDone,
                            ENGLISH_WORKS.find(w => w.code === log.workDone)?.name || '',
                            log.performance,
                            log.nextWork,
                            ENGLISH_WORKS.find(w => w.code === log.nextWork)?.name || '',
                            log.notes
                          );
                          navigator.clipboard.writeText(text);
                        }}
                        className="mt-2 text-xs text-teal-400 hover:text-teal-300"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={copyAllReports}
            className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-400 transition-colors"
          >
            📋 Copy All Reports
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
          >
            👁️ Preview All
          </button>
        </div>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">All Reports - Week {selectedWeek}</h2>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {children.map(child => {
                const log = getLog(child.id);
                const text = log.reportText || generateReportText(
                  child.name,
                  log.workDone,
                  ENGLISH_WORKS.find(w => w.code === log.workDone)?.name || '',
                  log.performance,
                  log.nextWork,
                  ENGLISH_WORKS.find(w => w.code === log.nextWork)?.name || '',
                  log.notes
                );
                
                return (
                  <div key={child.id} className="bg-slate-900 rounded-lg p-3">
                    <div className="text-sm text-slate-400 mb-1 font-bold">{child.name}</div>
                    <p className="text-white text-sm">{text}</p>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={copyAllReports}
                className="w-full py-2.5 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-400"
              >
                📋 Copy All to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
