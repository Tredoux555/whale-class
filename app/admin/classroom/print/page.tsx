'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface WorkAssignment {
  id: string;
  work_name: string;
  work_name_chinese?: string;
  area: string;
  progress_status: string;
}

interface ChildWithAssignments {
  id: string;
  name: string;
  assignments: WorkAssignment[];
}

const AREA_ORDER = ['practical_life', 'sensorial', 'math', 'language', 'culture'];
const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  math: 'Math',
  language: 'Language',
  culture: 'Culture',
};

function PrintContent() {
  const searchParams = useSearchParams();
  const week = searchParams.get('week') || '';
  const year = searchParams.get('year') || '';
  
  const [children, setChildren] = useState<ChildWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (week && year) {
      fetchData();
    }
  }, [week, year]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/weekly-planning/by-plan?week=${week}&year=${year}`);
      const data = await res.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
    setLoading(false);
  }

  // Auto-print when data loads
  useEffect(() => {
    if (!loading && children.length > 0) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, children]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .child-card {
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Print button - hidden when printing */}
      <div className="no-print fixed top-4 right-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          🖨️ Print
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          ✕ Close
        </button>
      </div>

      {/* Print content */}
      <div className="max-w-[210mm] mx-auto p-4 bg-white">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <h1 className="text-2xl font-bold">🐋 Whale Class Weekly Plan</h1>
          <p className="text-lg font-semibold mt-1">Week {week}, {year}</p>
          <p className="text-sm text-gray-500">{today}</p>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mb-4 text-xs">
          <span>○ = Not Started</span>
          <span>P = Presented</span>
          <span>Pr = Practicing</span>
          <span>M = Mastered</span>
        </div>

        {/* Children Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {children.map(child => (
            <div key={child.id} className="child-card border border-gray-300 rounded p-2">
              {/* Child name */}
              <div className="font-bold text-base border-b border-gray-200 pb-1 mb-2">
                {child.name}
              </div>
              
              {/* Works by area */}
              <div className="space-y-1">
                {AREA_ORDER.map(area => {
                  const areaWorks = child.assignments.filter(a => a.area === area);
                  if (areaWorks.length === 0) return null;
                  
                  return (
                    <div key={area} className="flex">
                      <span className="font-semibold w-8 text-xs text-gray-600">
                        {AREA_LABELS[area]?.charAt(0)}:
                      </span>
                      <div className="flex-1">
                        {areaWorks.map((work, i) => (
                          <div key={work.id} className="flex items-center gap-1">
                            <span className="w-4 h-4 border border-gray-400 rounded-sm inline-flex items-center justify-center text-[10px]">
                              {work.progress_status === 'mastered' ? '✓' : ''}
                            </span>
                            <span className="text-xs">{work.work_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          Whale Class • Beijing International School • {children.length} children • {children.reduce((sum, c) => sum + c.assignments.length, 0)} works
        </div>
      </div>
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PrintContent />
    </Suspense>
  );
}
