'use client';

// /home/dashboard/[childId]/reports/page.tsx
// Weekly reports page - generated summaries of child progress
// Includes works completed, areas covered, photos used

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface ReportContent {
  child: { name: string };
  week: { start: string; end: string };
  summary: {
    works_this_week: number;
    photos_this_week: number;
    overall_progress: {
      presented: number;
      practicing: number;
      mastered: number;
      total: number;
    };
  };
  works_by_area?: Record<string, Array<{ name: string; area: string; status: string }>>;
  works: Array<{ name: string; area: string; status_label: string }>;
  photos: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    caption?: string;
    work_name?: string;
  }>;
  generated_at: string;
}

interface Report {
  id: string;
  child_id: string;
  family_id: string;
  week_start: string;
  week_end: string;
  content: ReportContent;
  is_published?: boolean;
  created_at: string;
}

interface ChildInfo {
  id: string;
  name: string;
  age: number;
}

const AREA_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  practical_life: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
  sensorial: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  mathematics: { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  language: { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700' },
  cultural: { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
};

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<HomeSession | null>(null);
  const [child, setChild] = useState<ChildInfo | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  // Load session, child, and reports
  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) return;
    setSession(sess);

    loadChild();
    loadReports();
  }, [childId]);

  const loadChild = async () => {
    try {
      const sess = getHomeSession();
      if (!sess) return;
      const res = await fetch(`/api/home/children/${childId}?family_id=${sess.family.id}`);
      const data = await res.json();
      if (data?.child) setChild(data.child);
    } catch (err) {
      console.error('Failed to load child:', err);
    }
  };

  const loadReports = async () => {
    try {
      const sess = getHomeSession();
      if (!sess) return;

      const res = await fetch(
        `/api/home/reports?child_id=${childId}&family_id=${sess.family.id}&limit=50`
      );
      const data = await res.json();

      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!session) return;

    setGenerating(true);
    try {
      // Calculate this week's date range
      const today = new Date();
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      const res = await fetch('/api/home/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          family_id: session.family.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          report_type: 'weekly',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("This week's report has been generated!");
        loadReports();
      } else {
        toast.error(data.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Generate error:', err);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (start === end) {
      return formatDate(start);
    }

    if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })}`;
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getAreaColor = (area: string) => {
    return AREA_COLORS[area] || { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Weekly Reports</h2>
        <button
          onClick={handleGenerateReport}
          disabled={generating}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all active:scale-95"
        >
          {generating ? 'Generating...' : '+ Generate Report'}
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-emerald-900 font-medium">No reports yet</p>
          <p className="text-emerald-700 text-sm mt-1">
            Generate a weekly report to see a summary of {child?.name}'s progress, works completed, and photos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Report Header */}
              <button
                onClick={() =>
                  setExpandedReport(expandedReport === report.id ? null : report.id)
                }
                className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    Week of {formatDateRange(report.week_start, report.week_end)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {report.content.summary.works_this_week} works •{' '}
                    {report.content.summary.photos_this_week} photos •{' '}
                    {formatDate(report.created_at)}
                  </p>
                </div>
                <span className="text-gray-400 ml-2">{expandedReport === report.id ? '▼' : '▶'}</span>
              </button>

              {/* Expanded Report Content */}
              {expandedReport === report.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                  {/* Overall Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600 font-medium">This Week</p>
                      <p className="text-lg font-bold text-blue-700">
                        {report.content.summary.works_this_week}
                      </p>
                      <p className="text-xs text-blue-600">works</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 font-medium">Mastered</p>
                      <p className="text-lg font-bold text-emerald-700">
                        {report.content.summary.overall_progress.mastered}
                      </p>
                      <p className="text-xs text-emerald-600">total</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-600 font-medium">Practicing</p>
                      <p className="text-lg font-bold text-amber-700">
                        {report.content.summary.overall_progress.practicing}
                      </p>
                      <p className="text-xs text-amber-600">total</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <p className="text-xs text-orange-600 font-medium">Introduced</p>
                      <p className="text-lg font-bold text-orange-700">
                        {report.content.summary.overall_progress.presented}
                      </p>
                      <p className="text-xs text-orange-600">total</p>
                    </div>
                  </div>

                  {/* Works by Area */}
                  {report.content.works_by_area && Object.keys(report.content.works_by_area).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Works This Week</h4>
                      {Object.entries(report.content.works_by_area).map(([area, works]) => {
                        const colors = getAreaColor(area);
                        return (
                          <div key={area} className={`${colors.bg} rounded-lg p-3`}>
                            <p className={`text-sm font-semibold ${colors.text} mb-2 capitalize`}>
                              {area.replace('_', ' ')}
                            </p>
                            <div className="space-y-1">
                              {(works as Array<Record<string, string>>).map((work, idx) => (
                                <p key={idx} className={`text-xs ${colors.text}`}>
                                  • {work.name}{' '}
                                  <span className="opacity-75">({work.status_label})</span>
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Photos */}
                  {report.content.photos && report.content.photos.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-800">Photos</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {report.content.photos.map((photo) => (
                          <div key={photo.id} className="bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={photo.thumbnail_url || photo.url}
                              alt={photo.caption || 'Report photo'}
                              className="w-full h-32 object-cover"
                            />
                            {photo.caption && (
                              <p className="text-xs text-gray-600 p-2 truncate">{photo.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Info */}
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                    Generated {formatDate(report.created_at)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
