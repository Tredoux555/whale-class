// /montree/dashboard/[childId]/reports/page.tsx
// Weekly Reports - Show works from this week + send to parents
// Phase 1: Simple weekly report with one-click send

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

// ============================================
// TYPES
// ============================================

interface WorkItem {
  name: string;
  name_chinese?: string;
  area: string;
  area_icon: string;
  status: number | string;
  status_label: string;
  parent_explanation?: string;
  why_it_matters?: string;
  notes?: string;
}

interface Photo {
  id: string;
  url: string;
  caption?: string;
  created_at: string;
}

interface ReportData {
  child: { name: string; photo_url?: string };
  week: { start: string; end: string };
  summary: {
    works_this_week: number;
    photos_this_week: number;
    overall_progress: { presented: number; practicing: number; mastered: number; total: number };
  };
  works_by_area: Record<string, WorkItem[]>;
  photos: Photo[];
}

// ============================================
// HELPERS
// ============================================

function getWeekBoundaries(date: Date = new Date()): { start: string; end: string; weekNum: number } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);

  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  // Calculate week number
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((monday.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  return {
    start: monday.toISOString().split('T')[0],
    end: friday.toISOString().split('T')[0],
    weekNum,
  };
}

function getStatusStyle(status: number | string) {
  const s = typeof status === 'string' ? status :
    status === 1 ? 'presented' : status === 2 ? 'practicing' : status === 3 ? 'mastered' : 'other';

  switch (s) {
    case 'presented':
      return { bg: 'bg-amber-100', text: 'text-amber-700', label: '🌱 Introduced' };
    case 'practicing':
      return { bg: 'bg-blue-100', text: 'text-blue-700', label: '🔄 Practicing' };
    case 'mastered':
    case 'completed':
      return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐ Mastered' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Started' };
  }
}

const AREA_ORDER = ['Practical Life', 'Sensorial', 'Mathematics', 'Language', 'Cultural'];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [weekRange, setWeekRange] = useState(getWeekBoundaries());
  const [parentCount, setParentCount] = useState<number | null>(null);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/montree/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          week_start: weekRange.start,
          week_end: weekRange.end,
        }),
      });
      const data = await res.json();

      if (data.success && data.report?.content) {
        setReport(data.report.content);
      } else {
        // No data for this week - create empty report
        setReport({
          child: { name: 'Child' },
          week: { start: weekRange.start, end: weekRange.end },
          summary: { works_this_week: 0, photos_this_week: 0, overall_progress: { presented: 0, practicing: 0, mastered: 0, total: 0 } },
          works_by_area: {},
          photos: [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
      toast.error('Failed to load report');
    }
    setLoading(false);
  };

  // Check for linked parents
  const checkParents = async () => {
    try {
      const res = await fetch(`/api/montree/children/${childId}`);
      if (res.ok) {
        // Count linked parents from a separate query would be better
        // For now, we'll just show the button and let the API tell us
      }
    } catch {}
  };

  useEffect(() => {
    if (childId) {
      fetchReport();
      checkParents();
    }
  }, [childId, weekRange]);

  // Week navigation
  const goToPrevWeek = () => {
    const prevMonday = new Date(weekRange.start);
    prevMonday.setDate(prevMonday.getDate() - 7);
    setWeekRange(getWeekBoundaries(prevMonday));
  };

  const goToNextWeek = () => {
    const nextMonday = new Date(weekRange.start);
    nextMonday.setDate(nextMonday.getDate() + 7);
    setWeekRange(getWeekBoundaries(nextMonday));
  };

  // Send to parents
  const sendToParents = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/montree/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          weekNumber: weekRange.weekNum,
          year: new Date(weekRange.start).getFullYear(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.sent > 0) {
          toast.success(`📧 Sent to ${data.sent} parent${data.sent > 1 ? 's' : ''}!`);
        } else {
          toast.info('No parents linked yet. Invite parents from the child\'s page.');
        }
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch (err) {
      toast.error('Failed to send to parents');
    }
    setSending(false);
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent mx-auto mb-3" />
          <p className="text-gray-500">Loading report...</p>
        </div>
      </div>
    );
  }

  const hasWorks = report && report.summary.works_this_week > 0;
  const hasPhotos = report && report.photos.length > 0;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />

      {/* Week Navigation + Send Button */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Week Selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevWeek}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              ◀
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-800">
                Week {weekRange.weekNum}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(weekRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(weekRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={goToNextWeek}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              ▶
            </button>
          </div>

          {/* Send to Parents Button */}
          <button
            onClick={sendToParents}
            disabled={sending || !hasWorks}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              hasWorks
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <span className="animate-spin">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <span>📧</span>
                Send to Parents
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {report && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard
            icon="📚"
            label="This Week"
            value={report.summary.works_this_week}
            color="gray"
          />
          <StatCard
            icon="⭐"
            label="Mastered"
            value={report.summary.overall_progress.mastered}
            color="emerald"
          />
          <StatCard
            icon="🔄"
            label="Practicing"
            value={report.summary.overall_progress.practicing}
            color="blue"
          />
          <StatCard
            icon="🌱"
            label="Presented"
            value={report.summary.overall_progress.presented}
            color="amber"
          />
        </div>
      )}

      {/* Works by Area */}
      {hasWorks ? (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-800 px-1">This Week's Activities</h2>

          {/* Sort areas by standard order */}
          {AREA_ORDER.map(areaName => {
            const works = report?.works_by_area[areaName];
            if (!works || works.length === 0) return null;

            return (
              <AreaSection key={areaName} areaName={areaName} works={works} />
            );
          })}

          {/* Show any other areas not in standard order */}
          {Object.entries(report?.works_by_area || {})
            .filter(([area]) => !AREA_ORDER.includes(area))
            .map(([areaName, works]) => (
              <AreaSection key={areaName} areaName={areaName} works={works} />
            ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">📝</span>
          <p className="text-gray-600 font-medium">No activities recorded this week</p>
          <p className="text-gray-400 text-sm mt-1">
            Record work from the Week view to see it here
          </p>
        </div>
      )}

      {/* Photos Section */}
      {hasPhotos && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">📸 Photos This Week</h3>
          <div className="grid grid-cols-3 gap-2">
            {report!.photos.map(photo => (
              <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={photo.url}
                  alt={photo.caption || 'Activity photo'}
                  className="w-full h-full object-cover"
                />
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info about sending */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-800">
            <p className="font-medium">About Weekly Reports</p>
            <p className="text-blue-600 mt-1">
              Click "Send to Parents" to email this week's progress to linked parents.
              They'll receive a beautiful summary with activities and photos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTS
// ============================================

function StatCard({ icon, label, value, color }: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-50',
    emerald: 'bg-emerald-50',
    blue: 'bg-blue-50',
    amber: 'bg-amber-50',
  };
  const textColors: Record<string, string> = {
    gray: 'text-gray-800',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  };

  return (
    <div className={`${colors[color]} rounded-xl p-3 text-center`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-xl font-bold ${textColors[color]}`}>{value}</p>
      <p className={`text-xs ${textColors[color]} opacity-75`}>{label}</p>
    </div>
  );
}

function AreaSection({ areaName, works }: { areaName: string; works: WorkItem[] }) {
  const areaIcons: Record<string, string> = {
    'Practical Life': '🧹',
    'Sensorial': '👁️',
    'Mathematics': '🔢',
    'Language': '📚',
    'Cultural': '🌍',
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{areaIcons[areaName] || '📋'}</span>
        <h3 className="font-semibold text-gray-800">{areaName}</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-auto">
          {works.length} {works.length === 1 ? 'work' : 'works'}
        </span>
      </div>

      <div className="space-y-2">
        {works.map((work, i) => {
          const style = getStatusStyle(work.status);
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{work.name}</p>
                {work.name_chinese && (
                  <p className="text-xs text-gray-400">{work.name_chinese}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
