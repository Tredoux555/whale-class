// app/montree/dashboard/reports/page.tsx
// Session 90: Weekly Reports with Montree auth
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReportCard from '@/components/montree/reports/ReportCard';
import WeekSelector from '@/components/montree/reports/WeekSelector';
import { getWeekBounds, formatDateISO } from '@/lib/montree/reports/types';
import type { MontreeWeeklyReport, ReportStatus } from '@/lib/montree/reports/types';

interface Child {
  id: string;
  name: string;
}

interface TeacherSession {
  id: string;
  name: string;
  classroom_id: string;
  classroom_name: string;
  classroom_icon: string;
}

export default function ReportsPage() {
  const router = useRouter();
  
  // Auth
  const [teacher, setTeacher] = useState<TeacherSession | null>(null);
  
  // State
  const [reports, setReports] = useState<MontreeWeeklyReport[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  
  // Filters
  const [selectedWeek, setSelectedWeek] = useState<{ start: string; end: string } | null>(() => {
    const { start, end } = getWeekBounds(new Date());
    return { start: formatDateISO(start), end: formatDateISO(end) };
  });
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');

  // Check auth on mount
  useEffect(() => {
    const stored = localStorage.getItem('montree_teacher');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      setTeacher(JSON.parse(stored));
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  // Fetch children for this classroom
  const fetchChildren = useCallback(async () => {
    if (!teacher?.classroom_id) return;
    try {
      const response = await fetch(`/api/montree/children?classroom_id=${teacher.classroom_id}`);
      const data = await response.json();
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    }
  }, [teacher?.classroom_id]);

  const fetchReports = useCallback(async () => {
    if (!teacher?.classroom_id) return;
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.set('classroom_id', teacher.classroom_id);
      if (selectedWeek) {
        params.set('week_start', selectedWeek.start);
      }
      if (selectedChildId) {
        params.set('child_id', selectedChildId);
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      params.set('limit', '50');

      const response = await fetch(`/api/montree/reports?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [teacher?.classroom_id, selectedWeek, selectedChildId, statusFilter]);

  useEffect(() => {
    if (teacher) fetchChildren();
  }, [teacher, fetchChildren]);

  useEffect(() => {
    if (teacher) fetchReports();
  }, [teacher, fetchReports]);

  const handleGenerateReport = async (childId: string) => {
    if (!selectedWeek || generating) return;

    setGenerating(childId);

    try {
      const response = await fetch('/api/montree/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          week_start: selectedWeek.start,
          week_end: selectedWeek.end,
          report_type: 'parent',
        }),
      });

      const data = await response.json();

      if (data.success && data.report) {
        router.push(`/montree/dashboard/reports/${data.report.id}`);
      } else {
        alert(data.error || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Generate error:', err);
      alert('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const getChildName = (childId: string) => {
    return children.find(c => c.id === childId)?.name || 'Unknown';
  };

  const childrenWithoutReports = children.filter(child => 
    !reports.some(r => r.child_id === child.id)
  );

  if (!teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <span className="text-4xl animate-pulse">📊</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/montree/dashboard"
            className="w-10 h-10 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
          >
            <span className="text-lg">←</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Weekly Reports</h1>
              <p className="text-xs text-gray-500">
                {teacher.classroom_name} • {reports.length} report{reports.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Week selector */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <WeekSelector
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
        />
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2 overflow-x-auto">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | 'all')}
          className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
        </select>

        <select
          value={selectedChildId || ''}
          onChange={(e) => setSelectedChildId(e.target.value || null)}
          className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Students</option>
          {children.map(child => (
            <option key={child.id} value={child.id}>{child.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <main className="flex-1 p-4">
        {loading ? (
          <div className="space-y-6">
            <div>
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-3"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="h-5 bg-slate-200 rounded animate-pulse mb-2" style={{ width: `${60 + (i % 3) * 12}%` }} />
                        <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Existing reports */}
            {reports.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  Generated Reports
                </h2>
                <div className="space-y-3">
                  {reports.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      childName={getChildName(report.child_id)}
                      onClick={() => router.push(`/montree/dashboard/reports/${report.id}`)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Children without reports */}
            {childrenWithoutReports.length > 0 && selectedWeek && !selectedChildId && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  Generate New Reports
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {childrenWithoutReports.map(child => (
                    <button
                      key={child.id}
                      onClick={() => handleGenerateReport(child.id)}
                      disabled={generating === child.id}
                      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center group disabled:opacity-50"
                    >
                      <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                        {generating === child.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          child.name.charAt(0)
                        )}
                      </div>
                      <p className="font-medium text-gray-700 text-sm">{child.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {generating === child.id ? 'Generating...' : 'Tap to generate'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {reports.length === 0 && childrenWithoutReports.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📊</div>
                <p className="text-gray-500">No reports found for this week</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
