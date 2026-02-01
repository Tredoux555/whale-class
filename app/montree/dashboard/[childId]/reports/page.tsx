// /montree/dashboard/[childId]/reports/page.tsx
// Simple "Report to Date" - no date filtering, just unreported progress
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface WorkItem {
  name: string;
  area: string;
  status: string;
}

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [childName, setChildName] = useState('');
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [photos, setPhotos] = useState<{id: string; url: string}[]>([]);
  const [stats, setStats] = useState({ total: 0, mastered: 0, practicing: 0, presented: 0 });
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);

  // Fetch unreported progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/montree/reports/unreported?child_id=${childId}`);
        const data = await res.json();

        if (data.success) {
          setChildName(data.child_name || 'Student');
          setWorks(data.works || []);
          setPhotos(data.photos || []);
          setStats({
            total: data.works?.length || 0,
            mastered: data.works?.filter((w: WorkItem) => w.status === 'mastered').length || 0,
            practicing: data.works?.filter((w: WorkItem) => w.status === 'practicing').length || 0,
            presented: data.works?.filter((w: WorkItem) => w.status === 'presented').length || 0,
          });
          setLastReportDate(data.last_report_date);
        }
      } catch (err) {
        console.error('Failed to fetch:', err);
        toast.error('Failed to load');
      }
      setLoading(false);
    };

    if (childId) fetchData();
  }, [childId]);

  // Send report to parents and mark as reported
  const sendReport = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/montree/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.sent > 0) {
          toast.success(`📧 Sent to ${data.sent} parent${data.sent > 1 ? 's' : ''}!`);
        } else {
          toast.info('Report saved. No parents linked yet.');
        }
        // Clear the list - these are now reported
        setWorks([]);
        setPhotos([]);
        setStats({ total: 0, mastered: 0, practicing: 0, presented: 0 });
        setLastReportDate(new Date().toISOString());
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const hasActivity = works.length > 0;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{childName}'s Progress</h2>
            {lastReportDate && (
              <p className="text-xs text-gray-400">
                Last report: {new Date(lastReportDate).toLocaleDateString()}
              </p>
            )}
            {!lastReportDate && (
              <p className="text-xs text-gray-400">No reports sent yet</p>
            )}
          </div>
          <button
            onClick={sendReport}
            disabled={sending || !hasActivity}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              hasActivity
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? '⏳ Sending...' : '📧 Send Report'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {hasActivity && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon="📚" value={stats.total} label="New" color="gray" />
          <StatCard icon="⭐" value={stats.mastered} label="Mastered" color="emerald" />
          <StatCard icon="🔄" value={stats.practicing} label="Practicing" color="blue" />
          <StatCard icon="🌱" value={stats.presented} label="Presented" color="amber" />
        </div>
      )}

      {/* Works */}
      {hasActivity ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Progress to Report</h3>
          <div className="space-y-2">
            {works.map((work, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <StatusBadge status={work.status} />
                <span className="text-sm font-medium text-gray-700">{work.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
          <span className="text-4xl mb-3 block">✅</span>
          <p className="text-gray-600 font-medium">All caught up!</p>
          <p className="text-gray-400 text-sm mt-1">Mark works on the Week tab to report progress</p>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">📸 Photos ({photos.length})</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map(photo => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-400 text-center">
        Reports are cumulative • Photos saved for end-of-term
      </p>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  const bg = { gray: 'bg-gray-50', emerald: 'bg-emerald-50', blue: 'bg-blue-50', amber: 'bg-amber-50' }[color];
  const text = { gray: 'text-gray-700', emerald: 'text-emerald-600', blue: 'text-blue-600', amber: 'text-amber-600' }[color];

  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <span className="text-lg">{icon}</span>
      <p className={`text-xl font-bold ${text}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🌱' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🔄' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐' },
  };

  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: '○' };

  return (
    <span className={`text-sm px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
