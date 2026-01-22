'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface AreaProgress {
  area: string;
  total: number;
  presented: number;
  practicing: number;
  mastered: number;
}

interface RecentWork {
  id: string;
  work_name: string;
  work_name_chinese?: string;
  area: string;
  progress_status: string;
  updated_at: string;
}

interface Child {
  id: string;
  name: string;
  name_chinese?: string;
  date_of_birth?: string;
  photo_url?: string;
}

interface ReportData {
  child: Child;
  areaProgress: AreaProgress[];
  recentWorks: RecentWork[];
  totalStats: {
    total: number;
    presented: number;
    practicing: number;
    mastered: number;
    percentComplete: number;
  };
  weekInfo: {
    week: number;
    year: number;
  };
}

const AREA_CONFIG: Record<string, { label: string; labelChinese: string; icon: string; color: string; gradient: string; bg: string }> = {
  practical_life: { 
    label: 'Practical Life', 
    labelChinese: '日常生活',
    icon: '🧹', 
    color: '#DB2777', 
    gradient: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-50'
  },
  sensorial: { 
    label: 'Sensorial', 
    labelChinese: '感官',
    icon: '👁️', 
    color: '#7C3AED', 
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50'
  },
  math: { 
    label: 'Mathematics', 
    labelChinese: '数学',
    icon: '🔢', 
    color: '#2563EB', 
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50'
  },
  mathematics: { 
    label: 'Mathematics', 
    labelChinese: '数学',
    icon: '🔢', 
    color: '#2563EB', 
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50'
  },
  language: { 
    label: 'Language', 
    labelChinese: '语言',
    icon: '📖', 
    color: '#059669', 
    gradient: 'from-emerald-500 to-green-500',
    bg: 'bg-green-50'
  },
  culture: { 
    label: 'Cultural', 
    labelChinese: '文化',
    icon: '🌍', 
    color: '#D97706', 
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-orange-50'
  },
  cultural: { 
    label: 'Cultural', 
    labelChinese: '文化',
    icon: '🌍', 
    color: '#D97706', 
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-orange-50'
  },
};

const STATUS_CONFIG: Record<string, { label: string; labelChinese: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', labelChinese: '未开始', color: '#6B7280', bg: 'bg-gray-100' },
  presented: { label: 'Presented', labelChinese: '已展示', color: '#D97706', bg: 'bg-amber-100' },
  practicing: { label: 'Practicing', labelChinese: '练习中', color: '#2563EB', bg: 'bg-blue-100' },
  mastered: { label: 'Mastered', labelChinese: '已掌握', color: '#059669', bg: 'bg-green-100' },
};

const AVATAR_GRADIENTS = [
  'from-pink-500 to-rose-500',
  'from-purple-500 to-violet-500',
  'from-blue-500 to-indigo-500',
  'from-cyan-500 to-teal-500',
  'from-emerald-500 to-green-500',
  'from-amber-500 to-orange-500',
];

export default function ParentReportPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [childId]);

  async function fetchReportData() {
    try {
      const res = await fetch(`/api/classroom/child/${childId}/report`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const reportData = await res.json();
      setData(reportData);
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Could not load report data');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => window.print();

  const getAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    const totalMonths = years * 12 + months;
    if (totalMonths < 24) return `${totalMonths} months`;
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    return m > 0 ? `${y} years ${m} months` : `${y} years`;
  };

  const getEncouragingMessage = () => {
    if (!data) return '';
    const { totalStats, child } = data;
    const name = child.name.split(' ')[0];
    
    if (totalStats.mastered >= 5) {
      return `${name} is making wonderful progress! They have mastered ${totalStats.mastered} works and are showing great concentration and independence. Keep encouraging their natural curiosity at home!`;
    } else if (totalStats.practicing >= 3) {
      return `${name} is actively engaged in learning! They are currently practicing ${totalStats.practicing} different works. This is the stage where deep learning happens - repetition builds mastery!`;
    } else if (totalStats.presented >= 2) {
      return `${name} has been introduced to ${totalStats.presented} new works recently. Each presentation plants a seed of interest. Watch for signs of readiness to practice at home!`;
    } else {
      return `${name} is settling into the classroom environment beautifully. We are observing their interests and will introduce appropriate works when ready. Every child's journey is unique!`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐋</div>
          <p className="text-gray-600">Loading progress report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-gray-600">{error || 'Report not available'}</p>
          <Link href="/admin/classroom" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  const { child, areaProgress, recentWorks, totalStats, weekInfo } = data;
  const age = getAge(child.date_of_birth);
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  const todayChinese = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      {/* Control Bar - Hidden when printing */}
      <div className="no-print fixed top-0 left-0 right-0 bg-white shadow-lg z-50 border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link 
            href="/admin/classroom"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            ← Back to Classroom
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              🖨️ Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Spacer */}
      <div className="no-print h-16" />

      {/* Report Content */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl my-4 print:shadow-none print:my-0">
        
        {/* Beautiful Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className={`w-24 h-24 bg-gradient-to-br ${AVATAR_GRADIENTS[child.name.charCodeAt(0) % 6]} rounded-full flex items-center justify-center text-4xl font-bold shadow-lg border-4 border-white/30`}>
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                child.name.charAt(0)
              )}
            </div>
            
            {/* Child Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{child.name}</h1>
              {child.name_chinese && (
                <p className="text-xl text-blue-100 mt-1">{child.name_chinese}</p>
              )}
              {age && (
                <p className="text-blue-200 mt-2">Age: {age}</p>
              )}
            </div>

            {/* Progress Circle */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48" cy="48" r="40"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48" cy="48" r="40"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${totalStats.percentComplete * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">{totalStats.percentComplete}%</span>
                </div>
              </div>
              <p className="text-blue-200 text-sm mt-2">Overall Progress</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-8 mt-6 pt-6 border-t border-white/20">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalStats.total}</div>
              <div className="text-blue-200 text-sm">Total Works</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-300">{totalStats.presented}</div>
              <div className="text-blue-200 text-sm">Presented</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-300">{totalStats.practicing}</div>
              <div className="text-blue-200 text-sm">Practicing</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-300">{totalStats.mastered}</div>
              <div className="text-blue-200 text-sm">Mastered</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-sm text-blue-200">Week {weekInfo.week}, {weekInfo.year}</div>
              <div className="text-xs text-blue-300">{today}</div>
            </div>
          </div>
        </div>

        {/* Message to Parents */}
        <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="flex items-start gap-4">
            <div className="text-4xl">💌</div>
            <div>
              <h2 className="font-bold text-amber-800 mb-2">Message for Parents 给家长的话</h2>
              <p className="text-amber-900 leading-relaxed">{getEncouragingMessage()}</p>
            </div>
          </div>
        </div>

        {/* Progress by Area */}
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📊</span> Progress by Area 各领域进度
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {areaProgress.map(area => {
              const config = AREA_CONFIG[area.area] || AREA_CONFIG.practical_life;
              const total = area.total || 1;
              const masteredPercent = Math.round((area.mastered / total) * 100);
              const practicingPercent = Math.round((area.practicing / total) * 100);
              const presentedPercent = Math.round((area.presented / total) * 100);
              
              return (
                <div key={area.area} className={`rounded-xl p-4 ${config.bg} border`} style={{ borderColor: `${config.color}30` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <h3 className="font-bold" style={{ color: config.color }}>{config.label}</h3>
                        <p className="text-sm text-gray-500">{config.labelChinese}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold" style={{ color: config.color }}>
                        {area.mastered}/{area.total}
                      </span>
                      <p className="text-sm text-gray-500">mastered</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-4 bg-white rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${masteredPercent}%` }}
                      title={`Mastered: ${area.mastered}`}
                    />
                    <div 
                      className="h-full bg-blue-400 transition-all"
                      style={{ width: `${practicingPercent}%` }}
                      title={`Practicing: ${area.practicing}`}
                    />
                    <div 
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${presentedPercent}%` }}
                      title={`Presented: ${area.presented}`}
                    />
                  </div>
                  
                  {/* Legend */}
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500 rounded" /> {area.mastered} mastered
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-blue-400 rounded" /> {area.practicing} practicing
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-amber-400 rounded" /> {area.presented} presented
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Works */}
        <div className="p-6 border-t">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📋</span> Recent Works 最近的工作
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {recentWorks.slice(0, 10).map(work => {
              const areaConfig = AREA_CONFIG[work.area] || AREA_CONFIG.practical_life;
              const statusConfig = STATUS_CONFIG[work.progress_status] || STATUS_CONFIG.not_started;
              
              return (
                <div 
                  key={work.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                >
                  <span className="text-xl">{areaConfig.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{work.work_name}</p>
                    {work.work_name_chinese && (
                      <p className="text-sm text-gray-500 truncate">{work.work_name_chinese}</p>
                    )}
                  </div>
                  <span 
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg}`}
                    style={{ color: statusConfig.color }}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐋</span>
              <div>
                <p className="font-semibold text-gray-700">Whale Class</p>
                <p>Beijing International School</p>
              </div>
            </div>
            <div className="text-right">
              <p>Generated: {today}</p>
              <p className="text-xs">{todayChinese}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
