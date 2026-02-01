// /montree/dashboard/[childId]/reports/page.tsx
// Report preview + send - shows exactly what parents will see
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';

interface ReportItem {
  work_name: string;
  area: string;
  status: string;
  photo_url: string | null;
  photo_caption: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
  has_description: boolean;
}

interface ReportStats {
  total: number;
  with_photos: number;
  with_descriptions: number;
  mastered: number;
  practicing: number;
  presented: number;
  unassigned_photos?: number;
}

interface UnassignedPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

export default function ReportsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [childName, setChildName] = useState('');
  const [items, setItems] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [unassignedPhotos, setUnassignedPhotos] = useState<UnassignedPhoto[]>([]);

  // Fetch report preview
  const fetchPreview = async () => {
    try {
      const res = await fetch(`/api/montree/reports/preview?child_id=${childId}`);
      const data = await res.json();

      if (data.success) {
        setChildName(data.child_name || 'Student');
        setItems(data.items || []);
        setStats(data.stats || null);
        setLastReportDate(data.last_report_date);
        setUnassignedPhotos(data.unassigned_photos || []);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (childId) fetchPreview();
  }, [childId]);

  // Send report to parents
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
        toast.success('Report published! Parents can now view it.');
        setItems([]);
        setStats(null);
        setLastReportDate(new Date().toISOString());
        setShowPreview(false);
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

  const hasItems = items.length > 0;

  return (
    <div className="space-y-4">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{childName}'s Report</h2>
            {lastReportDate && (
              <p className="text-xs text-gray-400">
                Last sent: {new Date(lastReportDate).toLocaleDateString()}
              </p>
            )}
            {!lastReportDate && (
              <p className="text-xs text-gray-400">No reports sent yet</p>
            )}
          </div>
          {hasItems && (
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
            >
              👁️ Preview Report
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && hasItems && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon="📚" value={stats.total} label="Works" color="gray" />
          <StatCard icon="📸" value={stats.with_photos + (stats.unassigned_photos || 0)} label="Photos" color="blue" />
          <StatCard icon="📝" value={stats.with_descriptions} label="Descriptions" color="emerald" />
        </div>
      )}

      {/* Work list (summary) */}
      {hasItems ? (
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">Progress to Report ({items.length})</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <StatusBadge status={item.status} />
                <span className="flex-1 text-sm font-medium text-gray-700">{item.work_name}</span>
                {item.photo_url && <span className="text-blue-500">📸</span>}
                {item.has_description && <span className="text-emerald-500">📝</span>}
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">📋 Report Preview</h3>
                  <p className="text-emerald-100 text-sm">This is what parents will see</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Child header */}
              <div className="text-center pb-4 border-b">
                <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-2 flex items-center justify-center text-2xl">
                  {childName.charAt(0)}
                </div>
                <h2 className="text-xl font-bold text-gray-800">{childName}'s Progress</h2>
                <p className="text-gray-500 text-sm">{items.length} activities to share</p>
              </div>

              {/* Works */}
              {items.map((item, i) => (
                <div key={`work-${item.work_name}-${i}`} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {/* Work header */}
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    <h4 className="font-bold text-gray-800">{item.work_name}</h4>
                  </div>

                  {/* Photo */}
                  {item.photo_url && (
                    <div className="rounded-xl overflow-hidden bg-gray-200">
                      <img
                        src={item.photo_url}
                        alt={item.work_name}
                        className="w-full h-48 object-cover"
                      />
                      {item.photo_caption && (
                        <p className="p-2 text-sm text-gray-600 italic">{item.photo_caption}</p>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {item.parent_description ? (
                    <div className="space-y-2">
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {item.parent_description}
                      </p>
                      {item.why_it_matters && (
                        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">💡 Why it matters</p>
                          <p className="text-sm text-emerald-800">{item.why_it_matters}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">
                      No description available for this work
                    </p>
                  )}
                </div>
              ))}

              {/* Unassigned Photos Gallery */}
              {unassignedPhotos.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    📸 Recent Photos
                    <span className="text-xs font-normal text-gray-500">({unassignedPhotos.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {unassignedPhotos.map((photo) => (
                      <div key={photo.id} className="rounded-lg overflow-hidden bg-gray-200">
                        <img
                          src={photo.url}
                          alt={photo.caption || 'Learning moment'}
                          className="w-full h-32 object-cover"
                        />
                        {photo.caption && (
                          <p className="p-2 text-xs text-gray-600 italic bg-white">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={sendReport}
                disabled={sending}
                className="flex-1 py-3 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {sending ? '⏳ Publishing...' : '✅ Publish Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-400 text-center">
        Photos saved for end-of-term compilation
      </p>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: number; label: string; color: string }) {
  const bg = { gray: 'bg-gray-50', emerald: 'bg-emerald-50', blue: 'bg-blue-50' }[color] || 'bg-gray-50';
  const text = { gray: 'text-gray-700', emerald: 'text-emerald-600', blue: 'text-blue-600' }[color] || 'text-gray-700';

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
    presented: { bg: 'bg-amber-100', text: 'text-amber-700', label: '🌱 Introduced' },
    practicing: { bg: 'bg-blue-100', text: 'text-blue-700', label: '🔄 Practicing' },
    mastered: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐ Mastered' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '⭐ Mastered' },
  };

  const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: '○ Started' };

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}
