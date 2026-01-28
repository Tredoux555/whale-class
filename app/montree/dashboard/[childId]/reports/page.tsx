// /montree/dashboard/[childId]/reports/page.tsx
// Session 112: Reports - generate weekly reports with parent descriptions
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';

interface ReportWork {
  name: string;
  area: string;
  status_label: string;
  parent_explanation?: string;
  why_it_matters?: string;
  notes?: string;
}

interface Report {
  child?: { name: string };
  generated_at?: string;
  works_by_area?: Record<string, ReportWork[]>;
}

const AREA_EMOJIS: Record<string, string> = {
  practical_life: '🧹', sensorial: '👁️', mathematics: '🔢', 
  math: '🔢', language: '📚', cultural: '🌍',
};

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;
  const session = getSession();
  
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    fetch(`/api/montree/progress?child_id=${childId}`)
      .then(r => r.json())
      .then(data => { setActivityCount(data.progress?.length || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [childId]);

  const generateReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/montree/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          week_start: new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0],
          week_end: new Date().toISOString().split('T')[0],
        }),
      });
      const data = await res.json();
      if (data.success && data.report?.content) {
        setReport(data.report.content);
        toast.success('Report generated!');
      } else { toast.error('Failed'); }
    } catch { toast.error('Failed'); }
    setGenerating(false);
  };

  if (loading) return <div className="bg-white rounded-2xl p-8 text-center"><div className="animate-pulse text-3xl mb-2">📄</div></div>;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />
      
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">📄</div>
          <div><h3 className="font-bold text-lg">Weekly Report</h3><p className="text-white/80 text-sm">{activityCount} activities</p></div>
        </div>
        <button onClick={generateReport} disabled={generating || activityCount === 0}
          className="w-full py-4 bg-white text-emerald-600 font-bold rounded-xl disabled:opacity-50">
          {generating ? '⏳ Generating...' : '✨ Generate Report'}
        </button>
      </div>

      {report && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="border-b pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-800">Weekly Progress Report</h2>
            <p className="text-emerald-600 font-medium">{report.child?.name}</p>
            <p className="text-sm text-gray-500">{session?.classroom?.name} • {report.generated_at}</p>
          </div>
          
          {report.works_by_area && Object.entries(report.works_by_area).map(([area, works]) => (
            <div key={area} className="border rounded-xl overflow-hidden mb-4">
              <div className="bg-emerald-100 px-4 py-2 flex items-center gap-2">
                <span className="text-xl">{AREA_EMOJIS[area.toLowerCase().replace(' ', '_')] || '📋'}</span>
                <span className="font-semibold">{area}</span>
              </div>
              <div className="divide-y">
                {works.map((work, i) => (
                  <div key={i} className="p-4">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{work.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        work.status_label === 'Mastered' ? 'bg-green-100 text-green-700' :
                        work.status_label === 'Practicing' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>{work.status_label}</span>
                    </div>
                    {work.parent_explanation && <p className="text-sm text-gray-600 mb-2">{work.parent_explanation}</p>}
                    {work.why_it_matters && <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded">💡 {work.why_it_matters}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          <button onClick={() => window.print()} className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl mt-4">
            🖨️ Print Report
          </button>
        </div>
      )}
    </div>
  );
}
