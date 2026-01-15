// app/admin/schools/[slug]/english-reports/page.tsx
// Weekly English Reports - CONNECTED TO DATABASE
// Reads progress from child_work_progress (what you tap in classroom app)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface EnglishWork {
  id: string;
  name: string;
}

interface WeekWork {
  id: string;
  name: string;
  status: number;
  updatedAt: string;
}

interface Child {
  id: string;
  name: string;
  gender: 'he' | 'she' | 'they';
  order: number;
  currentWork: string | null;
  thisWeekWorks: WeekWork[];
  savedLog: {
    works_done: any[];
    next_work: string;
    report_text: string;
  } | null;
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

const PERFORMANCE = [
  { value: 'excellent', label: '🌟 Excellent', desc: 'did very well' },
  { value: 'good', label: '✅ Good', desc: "didn't have much trouble" },
  { value: 'struggled', label: '💪 Struggled', desc: 'found it challenging' },
  { value: 'repeat', label: '🔄 Repeat', desc: 'needs more practice' },
];

// Map work_id to display code
const workIdToCode = (id: string): string => {
  const map: Record<string, string> = {
    'eng_bs': 'BS',
    'eng_es': 'ES',
    'eng_ms': 'MS',
    'eng_wbw_a': 'WBW/a/',
    'eng_wbw_e': 'WBW/e/',
    'eng_wbw_i': 'WBW/i/',
    'eng_wbw_o': 'WBW/o/',
    'eng_wbw_u': 'WBW/u/',
    'eng_wfw_a': 'WFW/a/',
    'eng_wfw_e': 'WFW/e/',
    'eng_wfw_i': 'WFW/i/',
    'eng_wfw_o': 'WFW/o/',
    'eng_wfw_u': 'WFW/u/',
    'eng_pr_a': 'PR/a/',
    'eng_pr_e': 'PR/e/',
    'eng_pr_i': 'PR/i/',
    'eng_pr_o': 'PR/o/',
    'eng_pr_u': 'PR/u/',
    'eng_prph_1': 'PrPh Red 1',
    'eng_prph_2': 'PrPh Red 2',
    'eng_prph_3': 'PrPh Red 3',
    'eng_prph_4': 'PrPh Red 4',
    'eng_prph_5': 'PrPh Red 5',
    'eng_prph_6': 'PrPh Red 6',
    'eng_prph_7': 'PrPh Red 7',
    'eng_prph_8': 'PrPh Red 8',
    'eng_prph_9': 'PrPh Red 9',
    'eng_prph_10': 'PrPh Red 10',
    'eng_bl_init': 'BL/init/',
    'eng_bl_final': 'BL/final/',
  };
  return map[id] || id;
};

export default function EnglishReportsPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Week calculation
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [children, setChildren] = useState<Child[]>([]);
  const [englishWorks, setEnglishWorks] = useState<EnglishWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Record<string, LocalLog>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // Fetch data from database
  useEffect(() => {
    fetchData();
  }, [selectedWeek]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/english-reports?week=${selectedWeek}&year=${now.getFullYear()}`);
      const data = await res.json();
      
      if (data.children) {
        setChildren(data.children);
        
        // Initialize local logs from database + this week's works
        const initialLogs: Record<string, LocalLog> = {};
        data.children.forEach((child: Child) => {
          const savedLog = child.savedLog;
          const thisWeekWorks = child.thisWeekWorks || [];
          
          // Convert this week's works to work entries
          const autoWorks: WorkEntry[] = thisWeekWorks.map(w => ({
            work: workIdToCode(w.id),
            performance: w.status === 3 ? 'excellent' : w.status === 2 ? 'good' : 'good',
          }));
          
          initialLogs[child.id] = {
            works: savedLog?.works_done?.length ? savedLog.works_done : autoWorks,
            nextWork: savedLog?.next_work || '',
            reportText: savedLog?.report_text || '',
          };
        });
        setLogs(initialLogs);
      }
      
      if (data.englishWorks) {
        setEnglishWorks(data.englishWorks);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get log for child
  const getLog = (childId: string): LocalLog => {
    return logs[childId] || { works: [], nextWork: '', reportText: '' };
  };

  // Update log
  const updateLog = (childId: string, updates: Partial<LocalLog>) => {
    setLogs(prev => ({
      ...prev,
      [childId]: { ...getLog(childId), ...updates }
    }));
  };

  // Add work entry
  const addWork = (childId: string) => {
    const log = getLog(childId);
    updateLog(childId, {
      works: [...log.works, { work: '', performance: 'good' }]
    });
  };

  // Update work entry
  const updateWorkEntry = (childId: string, index: number, updates: Partial<WorkEntry>) => {
    const log = getLog(childId);
    const newWorks = [...log.works];
    newWorks[index] = { ...newWorks[index], ...updates };
    updateLog(childId, { works: newWorks });
  };

  // Remove work entry
  const removeWork = (childId: string, index: number) => {
    const log = getLog(childId);
    updateLog(childId, { works: log.works.filter((_, i) => i !== index) });
  };

  // Save report to database
  const saveReport = async (childId: string) => {
    setSaving(childId);
    try {
      const log = getLog(childId);
      const child = children.find(c => c.id === childId);
      
      await fetch('/api/english-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          week: selectedWeek,
          year: now.getFullYear(),
          worksDone: log.works,
          nextWork: log.nextWork,
          reportText: log.reportText || generateReport(child!),
        }),
      });
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(null);
    }
  };

  // Generate report text
  const generateReport = (child: Child): string => {
    const log = getLog(child.id);
    const pronoun = child.gender === 'she' ? 'she' : child.gender === 'he' ? 'he' : 'they';
    const verb = child.gender === 'they' ? 'were' : 'was';
    
    // If custom text, use it
    if (log.reportText.trim()) {
      return log.reportText;
    }
    
    // No works
    if (log.works.length === 0 || log.works.every(w => !w.work)) {
      if (log.nextWork) {
        return `${child.name} didn't come through to do any English work this week. Next week we can do the ${log.nextWork}.`;
      }
      return `${child.name} didn't come through to do any English work this week. However ${pronoun} seems to be becoming more comfortable with English requests and remains quite active in the English circle.`;
    }
    
    // Build report
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

  // Copy all
  const copyAll = () => {
    const header = `Week ${selectedWeek} English summary\n\n`;
    const reports = children.map(child => generateReport(child)).join('\n\n');
    navigator.clipboard.writeText(header + reports);
    alert('Copied to clipboard!');
  };

  // Build dropdown options from english works
  const workOptions = englishWorks.map(w => ({
    code: workIdToCode(w.id),
    name: w.name,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 sticky top-0 z-20 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-500 hover:text-white text-sm">← Back</Link>
            <div>
              <h1 className="text-white font-medium">📝 Weekly English Reports</h1>
              <p className="text-slate-500 text-xs">Whale Class • Week {selectedWeek} • {children.length} students</p>
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
        <div className="max-w-3xl mx-auto px-4 py-2 flex gap-2">
          <button onClick={copyAll} className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-500">
            📋 Copy All
          </button>
          <button onClick={() => setShowPreview(true)} className="px-4 py-1.5 bg-slate-800 text-white rounded text-sm hover:bg-slate-700">
            👁️ Preview
          </button>
          <button onClick={fetchData} className="px-4 py-1.5 bg-slate-800 text-white rounded text-sm hover:bg-slate-700">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Children List */}
      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {children.map((child) => {
          const log = getLog(child.id);
          const hasThisWeekWorks = child.thisWeekWorks?.length > 0;
          
          return (
            <div key={child.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              {/* Child Header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-500">
                  {child.order}
                </span>
                <span className="font-bold text-white">{child.name}</span>
                <span className="text-slate-600 text-xs">({child.gender})</span>
                {hasThisWeekWorks && (
                  <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded">
                    {child.thisWeekWorks.length} work{child.thisWeekWorks.length > 1 ? 's' : ''} this week
                  </span>
                )}
                {child.currentWork && (
                  <span className="text-xs text-slate-500 ml-auto">
                    Current: {child.currentWork}
                  </span>
                )}
              </div>
              
              {/* Auto-detected works from classroom app */}
              {hasThisWeekWorks && (
                <div className="mb-3 p-2 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                  <p className="text-xs text-teal-400 mb-1">📱 From Classroom App:</p>
                  <div className="flex flex-wrap gap-1">
                    {child.thisWeekWorks.map((w, i) => (
                      <span key={i} className="text-xs bg-teal-600/30 text-teal-300 px-2 py-0.5 rounded">
                        {workIdToCode(w.id)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
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
                      {workOptions.map(w => (
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
                  {workOptions.map(w => (
                    <option key={w.code} value={w.code}>{w.code}</option>
                  ))}
                </select>
              </div>
              
              {/* Report Text */}
              <textarea
                value={log.reportText || generateReport(child)}
                onChange={(e) => updateLog(child.id, { reportText: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white text-sm resize-none mb-2"
              />
              
              {/* Save Button */}
              <button
                onClick={() => saveReport(child.id)}
                disabled={saving === child.id}
                className="text-xs text-slate-500 hover:text-teal-400"
              >
                {saving === child.id ? 'Saving...' : '💾 Save report'}
              </button>
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
              {children.map(child => (
                <p key={child.id} className="leading-relaxed">{generateReport(child)}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
