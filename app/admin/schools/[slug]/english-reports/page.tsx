// app/admin/schools/[slug]/english-reports/page.tsx
// Weekly English Reports - Matches your English Progression EXACTLY
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  order: number;
  gender: 'he' | 'she';
}

interface WorkEntry {
  work: string;
  performance: 'excellent' | 'good' | 'struggled' | 'repeat';
}

interface WeeklyLog {
  childId: string;
  works: WorkEntry[];
  nextWork: string;
  reportText: string;
}

// 18 WHALE CLASS STUDENTS - EXACT ORDER with GENDER
const WHALE_CLASS: Child[] = [
  { id: '1', name: 'Rachel', order: 1, gender: 'she' },
  { id: '2', name: 'Yueze', order: 2, gender: 'he' },
  { id: '3', name: 'Lucky', order: 3, gender: 'she' },
  { id: '4', name: 'Austin', order: 4, gender: 'he' },
  { id: '5', name: 'Minxi', order: 5, gender: 'she' },
  { id: '6', name: 'Leo', order: 6, gender: 'he' },
  { id: '7', name: 'Joey', order: 7, gender: 'he' },
  { id: '8', name: 'Eric', order: 8, gender: 'he' },
  { id: '9', name: 'Jimmy', order: 9, gender: 'he' },
  { id: '10', name: 'Kevin', order: 10, gender: 'he' },
  { id: '11', name: 'Niuniu', order: 11, gender: 'she' },
  { id: '12', name: 'Amy', order: 12, gender: 'she' },
  { id: '13', name: 'Henry', order: 13, gender: 'he' },
  { id: '14', name: 'Segina', order: 14, gender: 'she' },
  { id: '15', name: 'Hayden', order: 15, gender: 'he' },
  { id: '16', name: 'KK', order: 16, gender: 'he' },
  { id: '17', name: 'Kayla', order: 17, gender: 'she' },
  { id: '18', name: 'Stella', order: 18, gender: 'she' },
];

// ENGLISH WORKS - EXACT MATCH to /english progression page
const ENGLISH_WORKS = [
  // Sound Games
  { code: 'BS', name: 'Beginning Sounds' },
  { code: 'ES', name: 'Ending Sounds' },
  { code: 'MS', name: 'Middle Sounds' },
  // Word Building
  { code: 'WBW/a/', name: 'Word Building: Short A' },
  { code: 'WBW/e/', name: 'Word Building: Short E' },
  { code: 'WBW/i/', name: 'Word Building: Short I' },
  { code: 'WBW/o/', name: 'Word Building: Short O' },
  { code: 'WBW/u/', name: 'Word Building: Short U' },
  // Word Family
  { code: 'WFW/a/', name: 'Word Family: Short A' },
  { code: 'WFW/e/', name: 'Word Family: Short E' },
  { code: 'WFW/i/', name: 'Word Family: Short I' },
  { code: 'WFW/o/', name: 'Word Family: Short O' },
  { code: 'WFW/u/', name: 'Word Family: Short U' },
  // Pink Reading
  { code: 'PR/a/', name: 'Pink Reading: Short A' },
  { code: 'PR/e/', name: 'Pink Reading: Short E' },
  { code: 'PR/i/', name: 'Pink Reading: Short I' },
  { code: 'PR/o/', name: 'Pink Reading: Short O' },
  { code: 'PR/u/', name: 'Pink Reading: Short U' },
  // Primary Phonics
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
  // Blends
  { code: 'BL/init/', name: 'Initial Blends' },
  { code: 'BL/final/', name: 'Final Blends' },
];

const PERFORMANCE = [
  { value: 'excellent', label: 'Excellent', desc: 'did very well' },
  { value: 'good', label: 'Good', desc: "didn't have much trouble" },
  { value: 'struggled', label: 'Struggled', desc: 'really struggled' },
  { value: 'repeat', label: 'Needs repeat', desc: 'found it difficult' },
];


export default function EnglishReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Week calculation
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [logs, setLogs] = useState<Record<string, WeeklyLog>>({});
  const [showPreview, setShowPreview] = useState(false);

  // Initialize or get log for child
  const getLog = (childId: string): WeeklyLog => {
    return logs[childId] || {
      childId,
      works: [],
      nextWork: '',
      reportText: '',
    };
  };

  // Update the full log
  const updateLog = (childId: string, updates: Partial<WeeklyLog>) => {
    setLogs(prev => ({
      ...prev,
      [childId]: { ...getLog(childId), ...updates }
    }));
  };

  // Add a work entry
  const addWork = (childId: string) => {
    const log = getLog(childId);
    updateLog(childId, {
      works: [...log.works, { work: '', performance: 'good' }]
    });
  };

  // Update a specific work entry
  const updateWorkEntry = (childId: string, index: number, updates: Partial<WorkEntry>) => {
    const log = getLog(childId);
    const newWorks = [...log.works];
    newWorks[index] = { ...newWorks[index], ...updates };
    updateLog(childId, { works: newWorks });
  };

  // Remove a work entry
  const removeWork = (childId: string, index: number) => {
    const log = getLog(childId);
    const newWorks = log.works.filter((_, i) => i !== index);
    updateLog(childId, { works: newWorks });
  };

  // Generate report text for a child
  const generateReport = (child: Child): string => {
    const log = getLog(child.id);
    const pronoun = child.gender === 'she' ? 'she' : 'he';
    const possessive = child.gender === 'she' ? 'her' : 'his';
    const Pronoun = child.gender === 'she' ? 'She' : 'He';
    
    // If custom report text exists, use it
    if (log.reportText.trim()) {
      return log.reportText;
    }
    
    // No works done
    if (log.works.length === 0 || log.works.every(w => !w.work)) {
      if (log.nextWork) {
        return `${child.name} didn't come through to do any English work this week. Next week we can do the ${log.nextWork}.`;
      }
      return `${child.name} didn't come through to do any English work this week. However ${pronoun} seems to be becoming more comfortable with English requests and remains quite active in the English circle.`;
    }
    
    // Build report from works
    let report = '';
    
    if (log.works.length === 1 && log.works[0].work) {
      const w = log.works[0];
      const perf = PERFORMANCE.find(p => p.value === w.performance);
      report = `${child.name} did the ${w.work} -- ${pronoun} ${perf?.desc || 'did well'}.`;
    } else {
      // Multiple works
      const worksList = log.works.filter(w => w.work).map(w => w.work);
      if (worksList.length === 2) {
        report = `${child.name} did the ${worksList[0]} and the ${worksList[1]}.`;
      } else if (worksList.length > 2) {
        const last = worksList.pop();
        report = `${child.name} did the ${worksList.join(', ')}, and the ${last}.`;
      }
    }
    
    // Add next work
    if (log.nextWork) {
      report += ` Next week we can do the ${log.nextWork}.`;
    }
    
    return report;
  };

  // Copy all reports
  const copyAll = () => {
    const header = `Week ${selectedWeek} English summary\n\n`;
    const reports = WHALE_CLASS.map(child => generateReport(child)).join('\n\n');
    navigator.clipboard.writeText(header + reports);
    alert('Copied to clipboard!');
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
              <p className="text-slate-500 text-xs">Whale Class • Week {selectedWeek}</p>
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

      {/* Actions Bar */}
      <div className="border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-2">
          <button onClick={copyAll} className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-500">
            📋 Copy All
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
              
              {/* Works Done This Week */}
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
                    <button
                      onClick={() => removeWork(child.id, index)}
                      className="text-slate-600 hover:text-red-400 px-2"
                    >×</button>
                  </div>
                ))}
                
                <button
                  onClick={() => addWork(child.id)}
                  className="text-teal-500 text-sm hover:text-teal-400"
                >
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
              
              {/* Editable Report Text */}
              <textarea
                value={log.reportText || generateReport(child)}
                onChange={(e) => updateLog(child.id, { reportText: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm resize-none"
                placeholder="Edit report text..."
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
                <p key={child.id} className="leading-relaxed">
                  {generateReport(child)}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
