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

const AREA_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string; prefix: string }> = {
  practical_life: { label: 'Practical Life', icon: '🧹', color: '#DB2777', bg: '#FDF2F8', border: '#FBCFE8', prefix: 'P' },
  sensorial: { label: 'Sensorial', icon: '👁️', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', prefix: 'S' },
  math: { label: 'Math', icon: '🔢', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', prefix: 'M' },
  mathematics: { label: 'Math', icon: '🔢', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', prefix: 'M' },
  language: { label: 'Language', icon: '📖', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', prefix: 'L' },
  culture: { label: 'Culture', icon: '🌍', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', prefix: 'C' },
  cultural: { label: 'Culture', icon: '🌍', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', prefix: 'C' },
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
  const mode = searchParams.get('mode') || 'list';
  
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
            background: #e5e7eb;
          }
        }
      `}</style>

      {/* Control Panel */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white shadow-lg z-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
              ← Back
            </button>
            <div>
              <h1 className="font-bold text-gray-800">Print Preview</h1>
              <p className="text-sm text-gray-500">Week {week}, {year} • {children.length} children</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'list', label: '📋 List' },
                { id: 'notes', label: '📝 Notes' },
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
                    mode === m.id ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            
            <a href="/admin/weekly-planning" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">
              📤 Upload
            </a>
            
            <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              🖨️ Print
            </button>
          </div>
        </div>
      </div>

      <div className="no-print h-16" />

      {/* Print Container - A4 proportions */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl my-4 print:shadow-none print:my-0">
        
        {/* ============ LIST MODE - Minimal worksheet for writing ============ */}
        {mode === 'list' && (
          <div className="p-1">
            <div className="flex items-center gap-2 border-b border-gray-400 pb-1 mb-1">
              <span className="text-lg">🐋</span>
              <span className="font-bold text-sm">Week {week}</span>
            </div>
            <div className="grid grid-cols-2 gap-0">
              {children.map((child, idx) => (
                <div 
                  key={child.id} 
                  className="child-card border border-gray-400 flex flex-col overflow-hidden"
                  style={{ height: '54mm' }}
                >
                  <div className="bg-gray-200 px-2 py-0.5 border-b border-gray-400 shrink-0">
                    <span className="font-bold text-xs text-gray-900">{child.name}</span>
                  </div>
                  <div className="px-2 py-1 text-[10px] leading-tight flex-1">
                    {AREA_ORDER.map(area => {
                      const config = AREA_CONFIG[area];
                      const areaWorks = child.assignments.filter(a => 
                        a.area === area || 
                        a.area === (area === 'math' ? 'mathematics' : area) || 
                        a.area === (area === 'culture' ? 'cultural' : area)
                      );
                      return areaWorks.map((work) => (
                        <div key={work.id}>
                          <span className="font-bold" style={{ color: config.color }}>{config.prefix}:</span>{' '}
                          <span className="text-gray-700">{work.work_name}</span>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* ============ NOTES MODE - For detailed tracking ============ */}
        {mode === 'notes' && (
          <div className="p-6 print:p-4">
            <div className="flex items-center justify-between border-b-2 border-gray-800 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🐋</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Whale Class Notes</h1>
                  <p className="text-sm text-gray-600">Week {week}, {year}</p>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>{today}</div>
              </div>
            </div>

            <div className="space-y-4">
              {children.map((child) => (
                <div key={child.id} className="child-card border border-gray-300 rounded-lg p-4">
                  <div className="font-bold text-lg border-b border-gray-200 pb-2 mb-3">{child.name}</div>
                  
                  <table className="w-full text-sm">
                    <tbody>
                      {AREA_ORDER.map(area => {
                        const config = AREA_CONFIG[area];
                        const areaWorks = child.assignments.filter(a => 
                          a.area === area || 
                          a.area === (area === 'math' ? 'mathematics' : area) || 
                          a.area === (area === 'culture' ? 'cultural' : area)
                        );
                        
                        return areaWorks.map((work) => (
                          <tr key={work.id} className="border-b border-gray-100">
                            <td className="py-2 w-8 font-bold" style={{ color: config.color }}>{config.prefix}</td>
                            <td className="py-2">{work.work_name}</td>
                            <td className="py-2 w-28 text-center">
                              <span className="inline-flex gap-1 text-xs">
                                {['○', 'P', 'Pr', '✓'].map(s => (
                                  <span key={s} className="w-5 h-5 border border-gray-300 rounded inline-flex items-center justify-center">{s}</span>
                                ))}
                              </span>
                            </td>
                            <td className="py-2 w-40">
                              <div className="border-b border-dotted border-gray-400 h-5"></div>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                  
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-400 mb-1">Notes:</div>
                    <div className="border-b border-dotted border-gray-400 h-5"></div>
                    <div className="border-b border-dotted border-gray-400 h-5"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ GRID MODE ============ */}
        {mode === 'grid' && (
          <div className="p-6 print:p-4">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl p-6 mb-6">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              {children.map((child, idx) => (
                <ChildCard key={child.id} child={child} index={idx} compact />
              ))}
            </div>

            <div className="mt-6 pt-4 border-t-2 border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐋</span>
                <span>Whale Class • Beijing International School</span>
              </div>
              <div>Printed: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {/* ============ CARDS MODE ============ */}
        {mode === 'cards' && (
          <div className="p-6 print:p-4">
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl p-6 mb-6">
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
            </div>

            <div className="space-y-4">
              {children.map((child, idx) => (
                <div key={child.id} className={idx > 0 && idx % 4 === 0 ? 'page-break' : ''}>
                  <ChildCard child={child} index={idx} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ WALL MODE ============ */}
        {mode === 'wall' && (
          <div className="p-6 print:p-4">
            <div className="grid grid-cols-1 gap-6">
              {children.map((child, idx) => (
                <div key={child.id} className={idx > 0 ? 'page-break' : ''}>
                  <ChildCardLarge child={child} index={idx} />
                </div>
              ))}
            </div>
          </div>
        )}

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
      <div className={`bg-gradient-to-r ${gradients[index % gradients.length]} p-3 text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg font-bold">
            {child.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-lg">{child.name}</div>
            {child.name_chinese && <div className="text-white/80 text-sm">{child.name_chinese}</div>}
          </div>
          <div className="ml-auto text-right">
            <div className="text-xl font-bold">{child.assignments.length}</div>
            <div className="text-white/80 text-xs">works</div>
          </div>
        </div>
      </div>
      
      <div className={`p-3 space-y-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {AREA_ORDER.map(area => {
          const areaWorks = child.assignments.filter(a => 
            a.area === area || a.area === (area === 'math' ? 'mathematics' : area)
          );
          if (areaWorks.length === 0) return null;
          const config = AREA_CONFIG[area];
          
          return (
            <div key={area}>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-t font-semibold" style={{ backgroundColor: config.bg, color: config.color }}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="ml-auto text-xs opacity-70">{areaWorks.length}</span>
              </div>
              <div className="border-l-2 border-b border-r rounded-b px-2 py-1 space-y-0.5" style={{ borderColor: config.border }}>
                {areaWorks.map(work => {
                  const status = STATUS_CONFIG[work.progress_status] || STATUS_CONFIG.not_started;
                  return (
                    <div key={work.id} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.symbol}
                      </span>
                      <span className="truncate">{work.work_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {child.assignments.length === 0 && (
          <div className="text-center text-gray-400 py-4">No works assigned</div>
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
      <div className={`bg-gradient-to-r ${gradients[index % gradients.length]} p-6 text-white`}>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold">
            {child.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="font-bold text-3xl">{child.name}</div>
            {child.name_chinese && <div className="text-white/80 text-xl mt-1">{child.name_chinese}</div>}
          </div>
          <div className="text-right flex gap-4">
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
      
      <div className="p-6">
        <div className="grid grid-cols-5 gap-4">
          {AREA_ORDER.map(area => {
            const areaWorks = child.assignments.filter(a => 
              a.area === area || a.area === (area === 'math' ? 'mathematics' : area)
            );
            const config = AREA_CONFIG[area];
            
            return (
              <div key={area}>
                <div className="text-center p-2 rounded-t-lg font-bold" style={{ backgroundColor: config.bg, color: config.color }}>
                  <span className="text-xl">{config.icon}</span>
                  <div className="text-sm">{config.label}</div>
                </div>
                <div className="border-2 border-t-0 rounded-b-lg p-2 min-h-[100px] space-y-1" style={{ borderColor: config.border }}>
                  {areaWorks.length === 0 ? (
                    <div className="text-gray-300 text-center text-sm">—</div>
                  ) : (
                    areaWorks.map(work => {
                      const status = STATUS_CONFIG[work.progress_status] || STATUS_CONFIG.not_started;
                      return (
                        <div key={work.id} className="flex items-center gap-1 text-sm p-1 rounded" style={{ backgroundColor: status.bg }}>
                          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold" style={{ color: status.color }}>
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
