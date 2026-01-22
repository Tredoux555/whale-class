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
  name_chinese?: string;
  photo_url?: string;
  assignments: WorkAssignment[];
}

const AREA_ORDER = ['practical_life', 'sensorial', 'math', 'language', 'culture'];

const AREA_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  practical_life: { label: 'Practical Life', icon: '🧹', color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8' },
  sensorial: { label: 'Sensorial', icon: '👁️', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  math: { label: 'Math', icon: '🔢', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  mathematics: { label: 'Math', icon: '🔢', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  language: { label: 'Language', icon: '📖', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  culture: { label: 'Culture', icon: '🌍', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  cultural: { label: 'Culture', icon: '🌍', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

const STATUS_CONFIG: Record<string, { label: string; symbol: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', symbol: '○', color: '#6B7280', bg: '#F3F4F6' },
  presented: { label: 'Presented', symbol: 'P', color: '#D97706', bg: '#FEF3C7' },
  practicing: { label: 'Practicing', symbol: 'Pr', color: '#2563EB', bg: '#DBEAFE' },
  mastered: { label: 'Mastered', symbol: '✓', color: '#059669', bg: '#D1FAE5' },
};

function PrintContent() {
  const searchParams = useSearchParams();
  const week = searchParams.get('week') || '';
  const year = searchParams.get('year') || '';
  const mode = searchParams.get('mode') || 'grid'; // grid, cards, wall
  
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐋</div>
          <p className="text-gray-600">Loading weekly plan...</p>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const totalWorks = children.reduce((sum, c) => sum + c.assignments.length, 0);
  const masteredCount = children.reduce((sum, c) => 
    sum + c.assignments.filter(a => a.progress_status === 'mastered').length, 0);

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
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
            page-break-inside: avoid;
          }
          .page-break {
            page-break-before: always;
          }
        }
        @media screen {
          body {
            background: #f3f4f6;
          }
        }
      `}</style>

      {/* Control Panel - hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white shadow-lg z-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ← Back
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Print Preview</h1>
              <p className="text-sm text-gray-500">Week {week}, {year} • {children.length} children</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mode selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'grid', label: '📊 Grid' },
                { id: 'cards', label: '🃏 Cards' },
                { id: 'wall', label: '🖼️ Wall' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('mode', m.id);
                    window.history.replaceState({}, '', url);
                    window.location.reload();
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    mode === m.id 
                      ? 'bg-white shadow text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              🖨️ Print
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="no-print h-16" />

      {/* Print content */}
      <div className="max-w-[210mm] mx-auto p-4 bg-white shadow-xl my-4 print:shadow-none print:my-0">
        
        {/* Beautiful Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl p-6 mb-6 print:rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🐋</div>
              <div>
                <h1 className="text-2xl font-bold">Whale Class Weekly Plan</h1>
                <p className="text-blue-100 mt-1">Week {week}, {year}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{children.length}</div>
              <div className="text-blue-200 text-sm">Children</div>
            </div>
          </div>
          
          {/* Stats bar */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-white/20">
            <div>
              <span className="text-2xl font-bold">{totalWorks}</span>
              <span className="text-blue-200 text-sm ml-2">total works</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-green-300">{masteredCount}</span>
              <span className="text-blue-200 text-sm ml-2">mastered</span>
            </div>
            <div className="ml-auto text-right text-sm text-blue-200">
              {today}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-4 text-xs print:gap-3">
          <span className="font-semibold text-gray-600">Status:</span>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <span 
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                {config.symbol}
              </span>
              <span className="text-gray-600">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Children Grid - Default Mode */}
        {mode === 'grid' && (
          <div className="grid grid-cols-2 gap-3">
            {children.map((child, idx) => (
              <ChildCard key={child.id} child={child} index={idx} compact />
            ))}
          </div>
        )}

        {/* Cards Mode - One per page section */}
        {mode === 'cards' && (
          <div className="space-y-4">
            {children.map((child, idx) => (
              <div key={child.id} className={idx > 0 && idx % 4 === 0 ? 'page-break' : ''}>
                <ChildCard child={child} index={idx} />
              </div>
            ))}
          </div>
        )}

        {/* Wall Mode - Large display cards */}
        {mode === 'wall' && (
          <div className="grid grid-cols-1 gap-6">
            {children.map((child, idx) => (
              <div key={child.id} className={idx > 0 ? 'page-break' : ''}>
                <ChildCardLarge child={child} index={idx} />
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t-2 border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="text-lg">🐋</span>
            <span>Whale Class • Beijing International School</span>
          </div>
          <div>
            Printed: {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </>
  );
}

// Compact Child Card for Grid Mode
function ChildCard({ child, index, compact = false }: { child: ChildWithAssignments; index: number; compact?: boolean }) {
  const gradients = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-violet-500',
    'from-blue-500 to-indigo-500',
    'from-cyan-500 to-teal-500',
    'from-emerald-500 to-green-500',
    'from-amber-500 to-orange-500',
  ];
  
  return (
    <div className="child-card border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Child Header */}
      <div className={`bg-gradient-to-r ${gradients[index % gradients.length]} p-3 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
            {child.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-lg">{child.name}</div>
            {child.name_chinese && (
              <div className="text-white/80 text-sm">{child.name_chinese}</div>
            )}
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-bold">{child.assignments.length}</div>
            <div className="text-white/80 text-xs">works</div>
          </div>
        </div>
      </div>
      
      {/* Works by Area */}
      <div className={`p-3 space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {AREA_ORDER.map(area => {
          const areaWorks = child.assignments.filter(a => 
            a.area === area || a.area === (area === 'math' ? 'mathematics' : area)
          );
          if (areaWorks.length === 0) return null;
          
          const config = AREA_CONFIG[area];
          
          return (
            <div key={area}>
              {/* Area label */}
              <div 
                className="flex items-center gap-1 px-2 py-0.5 rounded-t font-semibold"
                style={{ backgroundColor: config.bg, color: config.color }}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="ml-auto text-xs opacity-70">{areaWorks.length}</span>
              </div>
              
              {/* Works */}
              <div 
                className="border-l-2 border-b border-r rounded-b px-2 py-1 space-y-0.5"
                style={{ borderColor: config.border }}
              >
                {areaWorks.map(work => {
                  const status = STATUS_CONFIG[work.progress_status] || STATUS_CONFIG.not_started;
                  return (
                    <div key={work.id} className="flex items-center gap-2">
                      <span 
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.symbol}
                      </span>
                      <span className="truncate">{work.work_name}</span>
                      {work.work_name_chinese && (
                        <span className="text-gray-400 text-[10px] shrink-0">
                          {work.work_name_chinese}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {child.assignments.length === 0 && (
          <div className="text-center text-gray-400 py-4">
            No works assigned this week
          </div>
        )}
      </div>
    </div>
  );
}

// Large Child Card for Wall Display
function ChildCardLarge({ child, index }: { child: ChildWithAssignments; index: number }) {
  const gradients = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-violet-500',
    'from-blue-500 to-indigo-500',
    'from-cyan-500 to-teal-500',
    'from-emerald-500 to-green-500',
    'from-amber-500 to-orange-500',
  ];
  
  const masteredCount = child.assignments.filter(a => a.progress_status === 'mastered').length;
  const practicingCount = child.assignments.filter(a => a.progress_status === 'practicing').length;
  
  return (
    <div className="child-card border-2 border-gray-200 rounded-2xl overflow-hidden bg-white">
      {/* Large Header */}
      <div className={`bg-gradient-to-r ${gradients[index % gradients.length]} p-6 text-white`}>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold">
            {child.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-bold text-3xl">{child.name}</div>
            {child.name_chinese && (
              <div className="text-white/80 text-xl mt-1">{child.name_chinese}</div>
            )}
          </div>
          <div className="text-right">
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{child.assignments.length}</div>
                <div className="text-white/80 text-sm">Works</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-300">{masteredCount}</div>
                <div className="text-white/80 text-sm">Mastered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-200">{practicingCount}</div>
                <div className="text-white/80 text-sm">Practicing</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Works Grid */}
      <div className="p-6">
        <div className="grid grid-cols-5 gap-4">
          {AREA_ORDER.map(area => {
            const areaWorks = child.assignments.filter(a => 
              a.area === area || a.area === (area === 'math' ? 'mathematics' : area)
            );
            const config = AREA_CONFIG[area];
            
            return (
              <div key={area}>
                <div 
                  className="text-center p-2 rounded-t-lg font-bold"
                  style={{ backgroundColor: config.bg, color: config.color }}
                >
                  <span className="text-xl">{config.icon}</span>
                  <div className="text-sm">{config.label}</div>
                </div>
                <div 
                  className="border-2 border-t-0 rounded-b-lg p-2 min-h-[100px] space-y-1"
                  style={{ borderColor: config.border }}
                >
                  {areaWorks.length === 0 ? (
                    <div className="text-gray-300 text-center text-sm">—</div>
                  ) : (
                    areaWorks.map(work => {
                      const status = STATUS_CONFIG[work.progress_status] || STATUS_CONFIG.not_started;
                      return (
                        <div 
                          key={work.id} 
                          className="flex items-center gap-1 text-sm p-1 rounded"
                          style={{ backgroundColor: status.bg }}
                        >
                          <span 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                            style={{ color: status.color }}
                          >
                            {status.symbol}
                          </span>
                          <span className="truncate text-xs">{work.work_name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐋</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
