// app/admin/schools/[slug]/english-reports/page.tsx
// Weekly English Reports - WORKING VERSION
// Uses hardcoded 18 students so you can generate reports NOW
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  gender: 'he' | 'she';
  order: number;
}

interface WorkEntry {
  work: string;
  performance: 'excellent' | 'good' | 'struggled' | 'repeat';
}

interface LocalLog {
  works: WorkEntry[];
  nextWork: string;
  reportText: string;
}

// YOUR 18 WHALE CLASS STUDENTS - EXACT ORDER FROM YOUR DOCX
const WHALE_CLASS: Child[] = [
  { id: '1', name: 'Rachel', gender: 'she', order: 1 },
  { id: '2', name: 'Yueze', gender: 'he', order: 2 },
  { id: '3', name: 'Lucky', gender: 'she', order: 3 },
  { id: '4', name: 'Austin', gender: 'he', order: 4 },
  { id: '5', name: 'Minxi', gender: 'she', order: 5 },
  { id: '6', name: 'Leo', gender: 'he', order: 6 },
  { id: '7', name: 'Joey', gender: 'he', order: 7 },
  { id: '8', name: 'Eric', gender: 'he', order: 8 },
  { id: '9', name: 'Jimmy', gender: 'he', order: 9 },
  { id: '10', name: 'Kevin', gender: 'he', order: 10 },
  { id: '11', name: 'Niuniu', gender: 'she', order: 11 },
  { id: '12', name: 'Amy', gender: 'she', order: 12 },
  { id: '13', name: 'Henry', gender: 'he', order: 13 },
  { id: '14', name: 'Segina', gender: 'she', order: 14 },
  { id: '15', name: 'Hayden', gender: 'he', order: 15 },
  { id: '16', name: 'KK', gender: 'he', order: 16 },
  { id: '17', name: 'Kayla', gender: 'she', order: 17 },
  { id: '18', name: 'Stella', gender: 'she', order: 18 },
];

// YOUR 30 ENGLISH WORKS
const ENGLISH_WORKS = [
  { code: 'BS', name: 'Beginning Sounds' },
  { code: 'ES', name: 'Ending Sounds' },
  { code: 'MS', name: 'Middle Sounds' },
  { code: 'WBW/a/', name: 'Word Building /a/' },
  { code: 'WBW/e/', name: 'Word Building /e/' },
  { code: 'WBW/i/', name: 'Word Building /i/' },
  { code: 'WBW/o/', name: 'Word Building /o/' },
  { code: 'WBW/u/', name: 'Word Building /u/' },
  { code: 'WFW/a/', name: 'Word Family /a/' },
  { code: 'WFW/e/', name: 'Word Family /e/' },
  { code: 'WFW/i/', name: 'Word Family /i/' },
  { code: 'WFW/o/', name: 'Word Family /o/' },
  { code: 'WFW/u/', name: 'Word Family /u/' },
  { code: 'PR/a/', name: 'Pink Reading /a/' },
  { code: 'PR/e/', name: 'Pink Reading /e/' },
  { code: 'PR/i/', name: 'Pink Reading /i/' },
  { code: 'PR/o/', name: 'Pink Reading /o/' },
  { code: 'PR/u/', name: 'Pink Reading /u/' },
  { code: 'PrPh Red 1', name: 'Primary Phonics Red 1' },
  { code: 'PrPh Red 2', name: 'Primary Phonics Red 2' },
  { code: 'PrPh Red 3', name: 'Primary Phonics Red 3' },
  { code: 'PrPh Red 4', name: 'Primary Phonics Red 4' },
  { code: 'PrPh Red 5', name: 'Primary Phonics Red 5' },
  { code: 'PrPh Red 6', name: 'Primary Phonics Red 6' },
  { code: 'PrPh Red 7', name: 'Primary Phonics Red 7' },
  { code: 'PrPh Red 8', name: 'Primary Phonics Red 8' },
  { code: 'PrPh Red 9', name: 'Primary Phonics Red 9' },
  { code: 'PrPh Red 10', name: 'Primary Phonics Red 10' },
  { code: 'BL/init/', name: 'Initial Blends' },
  { code: 'BL/final/', name: 'Final Blends' },
];

const PERFORMANCE = [
  { value: 'excellent', label: '🌟 Excellent', desc: 'did very well' },
  { value: 'good', label: '✅ Good', desc: "didn't have much trouble" },
  { value: 'struggled', label: '💪 Struggled', desc: 'found it challenging' },
  { value: 'repeat', label: '🔄 Repeat', desc: 'needs more practice' },
];

export default function EnglishReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [logs, setLogs] = useState<Record<string, LocalLog>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [showNextList, setShowNextList] = useState(false);

  const getLog = (childId: string): LocalLog => {
    return logs[childId] || { works: [], nextWork: '', reportText: '' };
  };

  const updateLog = (childId: string, updates: Partial<LocalLog>) => {
    setLogs(prev => ({
      ...prev,
      [childId]: { ...getLog(childId), ...updates }
    }));
  };

  const addWork = (childId: string) => {
    const log = getLog(childId);
    updateLog(childId, {
      works: [...log.works, { work: '', performance: 'good' }]
    });
  };

  const updateWorkEntry = (childId: string, index: number, updates: Partial<WorkEntry>) => {
    const log = getLog(childId);
    const newWorks = [...log.works];
    newWorks[index] = { ...newWorks[index], ...updates };
    updateLog(childId, { works: newWorks });
  };

  const removeWork = (childId: string, index: number) => {
    const log = getLog(childId);
    updateLog(childId, { works: log.works.filter((_, i) => i !== index) });
  };

  const generateReport = (child: Child): string => {
    const log = getLog(child.id);
    const pronoun = child.gender;
    
    if (log.reportText.trim()) {
      return log.reportText;
    }
    
    if (log.works.length === 0 || log.works.every(w => !w.work)) {
      if (log.nextWork) {
        return `${child.name} didn't come through to do any English work this week. Next week we can do the ${log.nextWork}.`;
      }
      return `${child.name} didn't come through to do any English work this week. However ${pronoun} seems to be becoming more comfortable with English requests and remains quite active in the English circle.`;
    }
    
    let report = '';
    const validWorks = log.works.filter(w => w.work);
    
    if (validWorks.length === 1) {
      const w = validWorks[0];
      const perf = PERFORMANCE.find(p => p.value === w.performance);
      report = `${child.name} did the ${w.work} -- ${pronoun} ${perf?.desc || 'did well'}.`;
    } else {
      const workNames = validWorks.map(w => w.work);
      if (workNames.length === 2) {
        report = `${child.name} did the ${workNames[0]} and the ${workNames[1]}.`;
      } else {
        const last = workNames.pop();
        report = `${child.name} did the ${workNames.join(', ')}, and the ${last}.`;
      }
    }
    
    if (log.nextWork) {
      report += ` Next week we can do the ${log.nextWork}.`;
    }
    
    return report;
  };

  const copyAll = () => {
    const header = `Week ${selectedWeek} English summary\n\n`;
    const reports = WHALE_CLASS.map(child => generateReport(child)).join('\n\n');
    navigator.clipboard.writeText(header + reports);
    alert('Copied to clipboard!');
  };

  const generateNextWeekList = (): string => {
    const lines: string[] = [`Week ${selectedWeek + 1} English Plan\n`];
    WHALE_CLASS.forEach(child => {
      const log = getLog(child.id);
      lines.push(`${child.name} - ${log.nextWork || '(no work set)'}`);
    });
    return lines.join('\n');
  };

  const copyNextWeekList = () => {
    navigator.clipboard.writeText(generateNextWeekList());
    alert('Next week list copied!');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 sticky top-0 z-20 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-500 hover:text-white text-sm">← Back</Link>
            <div>
              <h1 className="text-white font-medium">📝 Weekly English Reports</h1>
              <p className="text-slate-500 text-xs">Whale Class • Week {selectedWeek} • {WHALE_CLASS.length} students</p>
            </div>
          </div>
          
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-sm"
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Actions */}
      <div className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-2 flex-wrap">
          <button onClick={copyAll} className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-500">
            📋 Copy All Reports
          </button>
          <button onClick={() => setShowNextList(true)} className="px-4 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-500">
            📅 Next Week List
          </button>
          <button onClick={() => setShowPreview(true)} className="px-4 py-1.5 bg-slate-800 text-white rounded text-sm hover:bg-slate-700">
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Children List */}
      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {WHALE_CLASS.map((child) => {
          const log = getLog(child.id);
          
          return (
            <div key={child.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              {/* Child Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-500">
                  {child.order}
                </span>
                <span className="font-bold text-white">{child.name}</span>
                <span className="text-slate-600 text-xs">({child.gender})</span>
              </div>
              
              {/* Works Done */}
              <div className="space-y-2 mb-3">
                {log.works.map((entry, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={entry.work}
                      onChange={(e) => updateWorkEntry(child.id, index, { work: e.target.value })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                    >
                      <option value="">Select work...</option>
                      {ENGLISH_WORKS.map(w => (
                        <option key={w.code} value={w.code}>{w.code}</option>
                      ))}
                    </select>
                    <select
                      value={entry.performance}
                      onChange={(e) => updateWorkEntry(child.id, index, { performance: e.target.value as any })}
                      className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                    >
                      {PERFORMANCE.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <button onClick={() => removeWork(child.id, index)} className="text-slate-600 hover:text-red-400 px-2">×</button>
                  </div>
                ))}
                <button onClick={() => addWork(child.id)} className="text-teal-500 text-sm hover:text-teal-400">
                  + Add work
                </button>
              </div>
              
              {/* Next Week */}
              <div className="flex gap-2 items-center mb-3">
                <span className="text-slate-500 text-sm">Next week:</span>
                <select
                  value={log.nextWork}
                  onChange={(e) => updateLog(child.id, { nextWork: e.target.value })}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                >
                  <option value="">Select...</option>
                  {ENGLISH_WORKS.map(w => (
                    <option key={w.code} value={w.code}>{w.code}</option>
                  ))}
                </select>
              </div>
              
              {/* Report Text */}
              <textarea
                value={log.reportText || generateReport(child)}
                onChange={(e) => updateLog(child.id, { reportText: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm resize-none"
              />
            </div>
          );
        })}
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between bg-slate-100">
              <h2 className="font-bold text-slate-800">Week {selectedWeek} English Summary</h2>
              <div className="flex gap-2">
                <button onClick={copyAll} className="px-3 py-1 bg-teal-600 text-white rounded text-sm">📋 Copy</button>
                <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-800">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh] text-slate-800 space-y-4 font-serif">
              <h3 className="font-bold text-center mb-6">Week {selectedWeek} English summary</h3>
              {WHALE_CLASS.map(child => (
                <p key={child.id} className="leading-relaxed">{generateReport(child)}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Next Week List Modal */}
      {showNextList && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowNextList(false)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between bg-amber-50">
              <h2 className="font-bold text-slate-800">📅 Week {selectedWeek + 1} Plan</h2>
              <div className="flex gap-2">
                <button onClick={copyNextWeekList} className="px-3 py-1 bg-amber-600 text-white rounded text-sm">📋 Copy</button>
                <button onClick={() => setShowNextList(false)} className="text-slate-500 hover:text-slate-800">✕</button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <p className="text-xs text-slate-500 mb-3">Copy this list for your weekly planning:</p>
              <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm space-y-1">
                {WHALE_CLASS.map(child => {
                  const log = getLog(child.id);
                  return (
                    <div key={child.id} className="flex justify-between">
                      <span className="text-slate-700">{child.name}</span>
                      <span className={log.nextWork ? 'text-amber-600 font-medium' : 'text-slate-400'}>
                        {log.nextWork || '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
