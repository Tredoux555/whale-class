// /montree/dashboard/reports/[id]/page.tsx
// Session 111: Report view with parent-friendly descriptions
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface ReportWork {
  id: string;
  name: string;
  name_chinese?: string;
  area: string;
  area_icon: string;
  area_color: string;
  status_label: string;
  parent_explanation: string;
  why_it_matters: string;
  notes?: string;
}

interface ReportContent {
  child: { name: string; photo_url?: string };
  week: { start: string; end: string };
  summary: {
    works_this_week: number;
    photos_this_week: number;
    overall_progress: { presented: number; practicing: number; mastered: number; total: number };
  };
  works_by_area: Record<string, ReportWork[]>;
  works: ReportWork[];
  photos: { id: string; url: string; caption?: string }[];
}

interface Report {
  id: string;
  child_id: string;
  week_start: string;
  week_end: string;
  status: string;
  content: ReportContent;
  generated_at: string;
}

const AREA_CONFIG: Record<string, { icon: string; color: string; gradient: string }> = {
  'Practical Life': { icon: '🧹', color: '#EC4899', gradient: 'from-pink-500 to-rose-500' },
  'Sensorial': { icon: '👁️', color: '#F59E0B', gradient: 'from-amber-500 to-orange-500' },
  'Mathematics': { icon: '🔢', color: '#3B82F6', gradient: 'from-blue-500 to-indigo-500' },
  'Language': { icon: '📚', color: '#10B981', gradient: 'from-emerald-500 to-teal-500' },
  'Cultural': { icon: '🌍', color: '#8B5CF6', gradient: 'from-purple-500 to-violet-500' },
};

export default function ReportViewPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.id as string;
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reportId) return;
    
    fetch(`/api/montree/reports/${reportId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setReport(data.report);
        } else {
          setError(data.error || 'Failed to load report');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load report');
        setLoading(false);
      });
  }, [reportId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <span className="text-4xl animate-pulse">📊</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block">❌</span>
          <p className="text-gray-600">{error || 'Report not found'}</p>
          <Link href="/montree/dashboard/reports" className="text-emerald-600 mt-4 inline-block">
            ← Back to Reports
          </Link>
        </div>
      </div>
    );
  }

  const content = report.content;
  const { overall_progress } = content.summary;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link 
              href="/montree/dashboard/reports"
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
            >
              ←
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{content.child.name}'s Weekly Report</h1>
              <p className="text-white/70 text-sm">
                {formatDate(content.week.start)} - {formatDate(content.week.end)}
              </p>
            </div>
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30"
            >
              🖨️ Print
            </button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{content.summary.works_this_week}</div>
              <div className="text-xs text-white/70">This Week</div>
            </div>
            <div className="bg-yellow-400/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{overall_progress.presented}</div>
              <div className="text-xs text-white/70">Introduced</div>
            </div>
            <div className="bg-blue-400/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{overall_progress.practicing}</div>
              <div className="text-xs text-white/70">Practicing</div>
            </div>
            <div className="bg-green-400/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold">{overall_progress.mastered}</div>
              <div className="text-xs text-white/70">Mastered</div>
            </div>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 space-y-6">
        
        {/* Works by Area */}
        {Object.entries(content.works_by_area).map(([areaName, works]) => {
          const areaConfig = AREA_CONFIG[areaName] || { icon: '📚', gradient: 'from-gray-500 to-slate-500' };
          
          return (
            <div key={areaName} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Area Header */}
              <div className={`bg-gradient-to-r ${areaConfig.gradient} text-white px-4 py-3`}>
                <h2 className="font-bold flex items-center gap-2">
                  <span className="text-xl">{areaConfig.icon}</span>
                  {areaName}
                  <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {works.length} work{works.length !== 1 ? 's' : ''}
                  </span>
                </h2>
              </div>
              
              {/* Works List */}
              <div className="divide-y divide-gray-100">
                {works.map((work, idx) => (
                  <div key={work.id || idx} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-800">{work.name}</h3>
                        {work.name_chinese && (
                          <p className="text-sm text-gray-500">{work.name_chinese}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        work.status_label === 'Mastered' ? 'bg-green-100 text-green-700' :
                        work.status_label === 'Practicing' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {work.status_label}
                      </span>
                    </div>
                    
                    {/* Parent-Friendly Description */}
                    {work.parent_explanation && (
                      <p className="text-gray-600 text-sm mb-2">
                        {work.parent_explanation}
                      </p>
                    )}
                    
                    {/* Why It Matters */}
                    {work.why_it_matters && (
                      <div className="bg-emerald-50 rounded-lg p-3 mt-2">
                        <p className="text-emerald-700 text-sm">
                          <span className="font-medium">💡 Why it matters: </span>
                          {work.why_it_matters}
                        </p>
                      </div>
                    )}
                    
                    {/* Teacher Notes */}
                    {work.notes && (
                      <div className="bg-blue-50 rounded-lg p-3 mt-2">
                        <p className="text-blue-700 text-sm">
                          <span className="font-medium">📝 Teacher note: </span>
                          {work.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* No Works Message */}
        {Object.keys(content.works_by_area).length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="text-gray-500">No works recorded this week</p>
          </div>
        )}

        {/* Photos Section */}
        {content.photos && content.photos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
              <h2 className="font-bold flex items-center gap-2">
                <span className="text-xl">📸</span>
                Photos This Week
                <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-sm">
                  {content.photos.length}
                </span>
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {content.photos.map((photo, idx) => (
                <div key={photo.id || idx} className="relative">
                  <img 
                    src={photo.url} 
                    alt={photo.caption || 'Activity photo'}
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                  {photo.caption && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-gray-400 text-sm">
          <p>Generated {formatDate(report.generated_at)}</p>
          <p className="mt-1">🌱 Montree • Montessori Progress Tracking</p>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gradient-to-r { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
