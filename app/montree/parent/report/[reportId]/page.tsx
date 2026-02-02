'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface HighlightItem {
  work: string;
  status: string;
}

interface ReportData {
  id: string;
  week_number: number;
  report_year: number;
  parent_summary: string | null;
  highlights: HighlightItem[] | string[] | null;
  areas_of_growth: string[] | null;
  recommendations: string[] | null;
  created_at: string;
  child: {
    name: string;
    nickname: string | null;
  };
  works_completed: {
    work_name: string;
    area: string;
    status: string;
    completed_at: string;
    photo_url: string | null;
    photo_caption: string | null;
    parent_description: string | null;
    why_it_matters: string | null;
  }[];
}

export default function ParentReportPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params.reportId as string;
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check session
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    loadReport();
  }, [reportId, router]);

  const loadReport = async () => {
    if (!reportId) {
      return; // Wait until reportId is available
    }

    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Failed to load report');
        return;
      }
      
      setReport(data.report);
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const areaEmoji: Record<string, string> = {
    practical_life: '🧹',
    sensorial: '👁️',
    mathematics: '🔢',
    language: '📚',
    cultural: '🌍',
    art: '🎨',
    music: '🎵',
    physical: '🏃'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error || 'Report not found'}</p>
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const childName = report.child.nickname || report.child.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/montree/parent/dashboard" className="text-emerald-600 hover:underline text-sm flex items-center gap-1">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Report Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
              {childName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{childName}'s Weekly Report</h1>
              <p className="text-gray-500">Week {report.week_number}, {report.report_year}</p>
            </div>
          </div>
          
          {report.parent_summary && (
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <p className="text-gray-700 leading-relaxed">{report.parent_summary}</p>
            </div>
          )}
        </div>

        {/* Highlights */}
        {report.highlights && report.highlights.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>⭐</span> This Week's Highlights
            </h2>
            <ul className="space-y-2">
              {report.highlights.map((item, i) => {
                const text = typeof item === 'string' ? item : `${item.work} (${item.status})`;
                return (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span className="text-gray-700">{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Areas of Growth */}
        {report.areas_of_growth && report.areas_of_growth.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🌱</span> Areas of Growth
            </h2>
            <ul className="space-y-2">
              {report.areas_of_growth.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Works Completed */}
        {report.works_completed && report.works_completed.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 px-2">
              <span>📋</span> Works This Week ({report.works_completed.length})
            </h2>
            {report.works_completed.map((work, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                {/* Work header */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    work.status === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                    work.status === 'practicing' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {work.status === 'mastered' ? '⭐ Mastered' :
                     work.status === 'practicing' ? '🔄 Practicing' : '🌱 Introduced'}
                  </span>
                  <h4 className="font-bold text-gray-800">{work.work_name}</h4>
                </div>

                {/* Photo */}
                {work.photo_url && (
                  <div className="relative -mx-4 my-3">
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-lg shadow-lg">
                      <img
                        src={work.photo_url}
                        alt={work.work_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {work.photo_caption && (
                      <p className="mt-2 px-4 text-sm text-gray-600 italic text-center">{work.photo_caption}</p>
                    )}
                  </div>
                )}

                {/* Description */}
                {work.parent_description ? (
                  <div className="space-y-2">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {work.parent_description}
                    </p>
                    {work.why_it_matters && (
                      <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">💡 Why it matters</p>
                        <p className="text-sm text-emerald-800">{work.why_it_matters}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm capitalize">
                    {areaEmoji[work.area] || '📌'} {work.area.replace('_', ' ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💡</span> Recommendations for Home
            </h2>
            <ul className="space-y-2">
              {report.recommendations.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          Report generated {new Date(report.created_at).toLocaleDateString()}
        </div>
      </main>
    </div>
  );
}
