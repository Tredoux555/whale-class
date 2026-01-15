// app/admin/schools/[slug]/english-reports/page.tsx
// Weekly English Reports Generator - Whale Class
// Matches Tredoux's report writing style exactly
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  order: number;
}

interface WeeklyLog {
  childId: string;
  workDone: string;
  performance: 'excellent' | 'good' | 'struggled' | 'repeat' | 'absent' | 'none';
  notes: string;
  nextWork: string;
  customReport: string;
}

// Your 18 Whale Class students in EXACT order
const WHALE_CLASS_CHILDREN: Child[] = [
  { id: '1', name: 'Rachel', order: 1 },
  { id: '2', name: 'Yueze', order: 2 },
  { id: '3', name: 'Lucky', order: 3 },
  { id: '4', name: 'Austin', order: 4 },
  { id: '5', name: 'Minxi', order: 5 },
  { id: '6', name: 'Leo', order: 6 },
  { id: '7', name: 'Joey', order: 7 },
  { id: '8', name: 'Eric', order: 8 },
  { id: '9', name: 'Jimmy', order: 9 },
  { id: '10', name: 'Kevin', order: 10 },
  { id: '11', name: 'Niuniu', order: 11 },
  { id: '12', name: 'Amy', order: 12 },
  { id: '13', name: 'Henry', order: 13 },
  { id: '14', name: 'Segina', order: 14 },
  { id: '15', name: 'Hayden', order: 15 },
  { id: '16', name: 'KK', order: 16 },
  { id: '17', name: 'Kayla', order: 17 },
  { id: '18', name: 'Stella', order: 18 },
];

// All English works you use (based on your reports)
const ENGLISH_WORKS = [
  // Matching/Puzzle Works
  { code: 'Big/Small letter puzzle', name: 'Big/Small Letter Puzzle', category: 'matching' },
  { code: 'Animal matching work', name: 'Animal Matching Work', category: 'matching' },
  { code: 'Baby animals matching work', name: 'Baby Animals Matching Work', category: 'matching' },
  
  // Three Part Cards
  { code: '3ptc /a/', name: 'Three Part Cards: Short A', category: '3ptc' },
  { code: '3ptc /e/', name: 'Three Part Cards: Short E', category: '3ptc' },
  { code: '3ptc /i/', name: 'Three Part Cards: Short I', category: '3ptc' },
  { code: '3ptc /o/', name: 'Three Part Cards: Short O', category: '3ptc' },
  { code: '3ptc /u/', name: 'Three Part Cards: Short U', category: '3ptc' },
  { code: '3ptc Mixed', name: 'Three Part Cards: Mixed', category: '3ptc' },
  
  // Word Building Work (WBW) - Individual vowels
  { code: 'WBW /a/', name: 'Word Building: Short A', category: 'wbw' },
  { code: 'WBW /e/', name: 'Word Building: Short E', category: 'wbw' },
  { code: 'WBW /i/', name: 'Word Building: Short I', category: 'wbw' },
  { code: 'WBW /o/', name: 'Word Building: Short O', category: 'wbw' },
  { code: 'WBW /u/', name: 'Word Building: Short U', category: 'wbw' },
  
  // Word Building Work (WBW) - 3ptc variants
  { code: 'WBW 3ptc /a/', name: 'Word Building 3ptc: Short A', category: 'wbw' },
  { code: 'WBW 3ptc /e/', name: 'Word Building 3ptc: Short E', category: 'wbw' },
  { code: 'WBW 3ptc /i/', name: 'Word Building 3ptc: Short I', category: 'wbw' },
  { code: 'WBW 3ptc /o/', name: 'Word Building 3ptc: Short O', category: 'wbw' },
  { code: 'WBW 3ptc /u/', name: 'Word Building 3ptc: Short U', category: 'wbw' },
  
  // Word Building Work (WBW) - Mixed boxes
  { code: 'WBW Mixed Box 1', name: 'Word Building Mixed Sounds Box 1', category: 'wbw' },
  { code: 'WBW Mixed Box 2', name: 'Word Building Mixed Sounds Box 2', category: 'wbw' },
  { code: 'WBW Mixed Box 3', name: 'Word Building Mixed Sounds Box 3', category: 'wbw' },
  
  // Word Family Work (WFW)
  { code: 'WFW /a/', name: 'Word Family: Short A', category: 'wfw' },
  { code: 'WFW /e/', name: 'Word Family: Short E', category: 'wfw' },
  { code: 'WFW /i/', name: 'Word Family: Short I', category: 'wfw' },
  { code: 'WFW /o/', name: 'Word Family: Short O', category: 'wfw' },
  { code: 'WFW /u/', name: 'Word Family: Short U', category: 'wfw' },
  
  // Sandpaper Letters (SPL)
  { code: 'SPL /a/', name: 'Sandpaper Letters: Short A', category: 'spl' },
  { code: 'SPL /e/', name: 'Sandpaper Letters: Short E', category: 'spl' },
  { code: 'SPL /i/', name: 'Sandpaper Letters: Short I', category: 'spl' },
  { code: 'SPL /o/', name: 'Sandpaper Letters: Short O', category: 'spl' },
  { code: 'SPL /u/', name: 'Sandpaper Letters: Short U', category: 'spl' },
  
  // Sound Games
  { code: 'I Spy games', name: 'I Spy Sound Games', category: 'sound' },
  { code: 'Beginning Sounds', name: 'Beginning Sounds', category: 'sound' },
  { code: 'Ending Sounds', name: 'Ending Sounds', category: 'sound' },
  
  // Pink Reading
  { code: 'PR /a/', name: 'Pink Reading: Short A', category: 'reading' },
  { code: 'PR /e/', name: 'Pink Reading: Short E', category: 'reading' },
  { code: 'PR /i/', name: 'Pink Reading: Short I', category: 'reading' },
  { code: 'PR /o/', name: 'Pink Reading: Short O', category: 'reading' },
  { code: 'PR /u/', name: 'Pink Reading: Short U', category: 'reading' },
  
  // Primary Phonics
  { code: 'PrPh Red 1', name: 'Primary Phonics Red 1', category: 'phonics' },
  { code: 'PrPh Red 2', name: 'Primary Phonics Red 2', category: 'phonics' },
  { code: 'PrPh Red 3', name: 'Primary Phonics Red 3', category: 'phonics' },
  { code: 'PrPh Red 4', name: 'Primary Phonics Red 4', category: 'phonics' },
  { code: 'PrPh Red 5', name: 'Primary Phonics Red 5', category: 'phonics' },
];

const PERFORMANCE_OPTIONS = [
  { value: 'excellent', label: 'Did very well', emoji: '🌟' },
  { value: 'good', label: 'Did well', emoji: '✅' },
  { value: 'struggled', label: 'Struggled', emoji: '💪' },
  { value: 'repeat', label: 'Needs repeat', emoji: '🔄' },
  { value: 'absent', label: 'Absent', emoji: '🏠' },
  { value: 'none', label: 'No English work', emoji: '⏭️' },
];


// Generate report text in Tredoux's style
function generateReport(
  name: string,
  workDone: string,
  performance: string,
  notes: string,
  nextWork: string
): string {
  // Absent
  if (performance === 'absent') {
    return `${name} was absent and I didn't get to see them this week. They can do the ${nextWork || 'scheduled work'} next week.`;
  }
  
  // No English work done
  if (performance === 'none' || !workDone) {
    if (notes) {
      return `${name} didn't make it to the English side of things. ${notes} Next week I will try to get them early to do the ${nextWork || 'English work'}.`;
    }
    return `${name} didn't come through to do any English work this week. However they seem to be becoming more comfortable with English requests and remains quite active in the English circle. Next week we can look at the ${nextWork || 'English work'}.`;
  }
  
  // Work was done
  let report = `${name} did the ${workDone}`;
  
  switch (performance) {
    case 'excellent':
      report += ` -- they did very well, asking for more.`;
      break;
    case 'good':
      report += ` -- they didn't have much trouble with it.`;
      break;
    case 'struggled':
      report += ` -- they really struggled, but did better than before.`;
      break;
    case 'repeat':
      report += ` -- they found it too difficult and we may need to fall back.`;
      break;
    default:
      report += `.`;
  }
  
  // Add notes
  if (notes) {
    report += ` ${notes}`;
  }
  
  // Next work
  if (nextWork) {
    report += ` Next week we can do the ${nextWork}.`;
  }
  
  return report;
}

export default function EnglishReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Get current week number
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [logs, setLogs] = useState<Record<string, WeeklyLog>>({});
  const [showPreview, setShowPreview] = useState(false);

  const updateLog = (childId: string, updates: Partial<WeeklyLog>) => {
    setLogs(prev => {
      const current = prev[childId] || {
        childId,
        workDone: '',
        performance: 'good' as const,
        notes: '',
        nextWork: '',
        customReport: '',
      };
      return { ...prev, [childId]: { ...current, ...updates } };
    });
  };

  const getLog = (childId: string): WeeklyLog => {
    return logs[childId] || {
      childId,
      workDone: '',
      performance: 'good',
      notes: '',
      nextWork: '',
      customReport: '',
    };
  };

  const getReportForChild = (child: Child): string => {
    const log = getLog(child.id);
    if (log.customReport) return log.customReport;
    return generateReport(child.name, log.workDone, log.performance, log.notes, log.nextWork);
  };

  const copyAllReports = () => {
    const header = `Week ${selectedWeek} English summary\n\n`;
    const reports = WHALE_CLASS_CHILDREN.map(child => getReportForChild(child)).join('\n\n');
    navigator.clipboard.writeText(header + reports);
    alert('All reports copied to clipboard!');
  };

  const downloadAsDoc = () => {
    const header = `Week ${selectedWeek} English summary\n\n`;
    const reports = WHALE_CLASS_CHILDREN.map(child => getReportForChild(child)).join('\n\n');
    const blob = new Blob([header + reports], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Individual_English_Report_week_${selectedWeek}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-400 hover:text-white text-sm">
              ← Back
            </Link>
            <div>
              <h1 className="text-lg font-bold text-white">📝 Weekly English Reports</h1>
              <p className="text-slate-400 text-xs">Whale Class • Week {selectedWeek}</p>
            </div>
          </div>
          
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm"
          >
            {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
              <option key={week} value={week}>Week {week}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto p-4">
        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={copyAllReports}
            className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-500"
          >
            📋 Copy All
          </button>
          <button
            onClick={downloadAsDoc}
            className="flex-1 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600"
          >
            💾 Download
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-600"
          >
            👁️ Preview
          </button>
        </div>

        {/* Children List */}
        <div className="space-y-2">
          {WHALE_CLASS_CHILDREN.map((child) => {
            const log = getLog(child.id);
            const perf = PERFORMANCE_OPTIONS.find(p => p.value === log.performance);
            
            return (
              <div key={child.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3">
                {/* Child Name & Number */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs text-slate-400">
                    {child.order}
                  </span>
                  <span className="font-bold text-white">{child.name}</span>
                  <span className="text-lg">{perf?.emoji}</span>
                </div>
                
                {/* Form Row */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {/* Work Done */}
                  <select
                    value={log.workDone}
                    onChange={(e) => updateLog(child.id, { workDone: e.target.value })}
                    className="col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    <option value="">Work done...</option>
                    {ENGLISH_WORKS.map(w => (
                      <option key={w.code} value={w.code}>{w.code}</option>
                    ))}
                  </select>
                  
                  {/* Performance */}
                  <select
                    value={log.performance}
                    onChange={(e) => updateLog(child.id, { performance: e.target.value as any })}
                    className="col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    {PERFORMANCE_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                    ))}
                  </select>
                  
                  {/* Next Work */}
                  <select
                    value={log.nextWork}
                    onChange={(e) => updateLog(child.id, { nextWork: e.target.value })}
                    className="col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  >
                    <option value="">Next week...</option>
                    {ENGLISH_WORKS.map(w => (
                      <option key={w.code} value={w.code}>{w.code}</option>
                    ))}
                  </select>
                  
                  {/* Notes */}
                  <input
                    type="text"
                    value={log.notes}
                    onChange={(e) => updateLog(child.id, { notes: e.target.value })}
                    placeholder="Notes..."
                    className="col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs"
                  />
                </div>
                
                {/* Custom Report Override */}
                <textarea
                  value={log.customReport}
                  onChange={(e) => updateLog(child.id, { customReport: e.target.value })}
                  placeholder={getReportForChild(child)}
                  rows={2}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs placeholder-slate-500"
                />
              </div>
            );
          })}
        </div>
      </main>


      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900">
              <h2 className="text-sm font-bold text-white">Week {selectedWeek} English Summary</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyAllReports}
                  className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-500"
                >
                  📋 Copy
                </button>
                <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[75vh]">
              <div className="bg-white text-black rounded-lg p-6 font-serif text-sm leading-relaxed space-y-4">
                <h3 className="font-bold text-center text-base mb-4">Week {selectedWeek} English summary</h3>
                
                {WHALE_CLASS_CHILDREN.map(child => (
                  <p key={child.id}>
                    {getReportForChild(child)}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
