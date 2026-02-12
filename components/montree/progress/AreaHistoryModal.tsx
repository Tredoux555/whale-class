// components/montree/progress/AreaHistoryModal.tsx
// Full-screen area history modal — shows work timeline with photos and teacher notes
'use client';

import { useState, useEffect } from 'react';

// Area display config (mirrors progress page)
const AREAS: Record<string, { name: string; emoji: string; gradient: string; bg: string; text: string }> = {
  practical_life: { name: 'Practical Life', emoji: '🧹', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  sensorial: { name: 'Sensorial', emoji: '👁', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
  mathematics: { name: 'Mathematics', emoji: '🔢', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-700' },
  language: { name: 'Language', emoji: '📚', gradient: 'from-rose-500 to-rose-600', bg: 'bg-rose-50', text: 'text-rose-700' },
  cultural: { name: 'Cultural', emoji: '🌍', gradient: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-700' },
};

const STATUS_LABELS: Record<string, { label: string; icon: string; bg: string; text: string }> = {
  mastered: { label: 'Mastered', icon: '⭐', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  completed: { label: 'Mastered', icon: '⭐', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  practicing: { label: 'Practicing', icon: '🔄', bg: 'bg-blue-100', text: 'text-blue-700' },
  presented: { label: 'Presented', icon: '📋', bg: 'bg-amber-100', text: 'text-amber-700' },
};

interface ProgressItem {
  id: string;
  work_name: string;
  area: string;
  status: number | string;
  notes?: string;
  mastered_at?: string;
  presented_at?: string;
  updated_at: string;
}

interface WorkSession {
  id: string;
  work_name: string;
  area: string;
  notes: string;
  observed_at: string;
}

interface MediaItem {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  caption?: string;
  captured_at: string;
  work_name?: string;
  area?: string;
}

interface WorkEntry {
  work_name: string;
  status: string;
  statusLabel: { label: string; icon: string; bg: string; text: string };
  date: string;
  photo?: MediaItem;
  notes: { text: string; date: string }[];
}

interface AreaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  area: string;
  childId: string;
  childName: string;
}

export default function AreaHistoryModal({ isOpen, onClose, area, childId, childName }: AreaHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<{ label: string; works: WorkEntry[] }[]>([]);

  const config = AREAS[area] || AREAS.practical_life;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const getPhotoUrl = (path: string) => path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${path}` : '';

  useEffect(() => {
    if (!isOpen || !childId || !area) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch progress, sessions, and media in parallel
        const [progressRes, sessionsRes, mediaRes] = await Promise.all([
          fetch(`/api/montree/progress?child_id=${childId}&include_observations=true`),
          fetch(`/api/montree/sessions?child_id=${childId}&limit=200`),
          fetch(`/api/montree/media?child_id=${childId}&area=${area}&limit=50`),
        ]);

        const [progressData, sessionsData, mediaData] = await Promise.all([
          progressRes.json(), sessionsRes.json(), mediaRes.json(),
        ]);

        const progress: ProgressItem[] = (progressData.progress || []).filter(
          (p: ProgressItem) => p.area === area
        );
        const sessions: WorkSession[] = (sessionsData.sessions || []).filter(
          (s: WorkSession) => s.area === area && s.notes
        );
        const media: MediaItem[] = mediaData.media || [];

        // Build photo map: work_name → best photo
        const photoMap = new Map<string, MediaItem>();
        for (const m of media) {
          if (m.work_name && !photoMap.has(m.work_name.toLowerCase())) {
            photoMap.set(m.work_name.toLowerCase(), m);
          }
        }

        // Build notes map: work_name → notes[]
        const notesMap = new Map<string, { text: string; date: string }[]>();
        for (const s of sessions) {
          const key = s.work_name?.toLowerCase();
          if (!key) continue;
          if (!notesMap.has(key)) notesMap.set(key, []);
          notesMap.get(key)!.push({ text: s.notes, date: s.observed_at });
        }

        // Build work entries from progress items
        const workEntries: WorkEntry[] = [];
        const seen = new Set<string>();

        for (const p of progress) {
          const key = p.work_name?.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);

          const s = typeof p.status === 'number'
            ? p.status === 3 ? 'mastered' : p.status === 2 ? 'practicing' : p.status === 1 ? 'presented' : 'not_started'
            : String(p.status);

          const statusLabel = STATUS_LABELS[s] || { label: 'Started', icon: '○', bg: 'bg-gray-100', text: 'text-gray-600' };
          const date = p.mastered_at || p.presented_at || p.updated_at;
          const photo = photoMap.get(key);
          const notes = notesMap.get(key) || [];

          // Also include notes from child_progress if they exist
          if (p.notes && !notes.some(n => n.text === p.notes)) {
            notes.push({ text: p.notes, date: p.updated_at });
          }

          // Sort notes newest first
          notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          workEntries.push({ work_name: p.work_name, status: s, statusLabel, date, photo, notes });
        }

        // Sort by most recent date
        workEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Group by month
        const monthMap = new Map<string, WorkEntry[]>();
        for (const entry of workEntries) {
          const d = new Date(entry.date);
          const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          if (!monthMap.has(label)) monthMap.set(label, []);
          monthMap.get(label)!.push(entry);
        }

        const grouped: { label: string; works: WorkEntry[] }[] = [];
        monthMap.forEach((works, label) => grouped.push({ label, works }));

        setEntries(grouped);
      } catch (err) {
        console.error('Area history fetch error:', err);
      }
      setLoading(false);
    };

    fetchData();
  }, [isOpen, childId, area]);

  if (!isOpen) return null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${config.gradient} pt-[max(1rem,env(safe-area-inset-top))] px-4 pb-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-white">
          <button onClick={onClose} className="p-2 -ml-2">
            <span className="text-2xl">✕</span>
          </button>
          <div className="text-center">
            <span className="text-3xl">{config.emoji}</span>
            <h2 className="font-bold text-lg">{config.name}</h2>
            <p className="text-white/70 text-sm">{childName}&apos;s Journey</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6" onClick={e => e.stopPropagation()}>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-white/60 text-center">
              <div className="text-3xl mb-2 animate-pulse">{config.emoji}</div>
              <p>Loading history...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-white/60 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="font-medium">No activity recorded yet</p>
              <p className="text-sm mt-1">in {config.name}</p>
            </div>
          </div>
        ) : (
          entries.map((group) => (
            <div key={group.label}>
              {/* Month header */}
              <h3 className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">
                {group.label}
              </h3>

              <div className="space-y-3">
                {group.works.map((work) => (
                  <div key={work.work_name} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    {/* Status + date header */}
                    <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${work.statusLabel.bg} ${work.statusLabel.text}`}>
                        {work.statusLabel.icon} {work.statusLabel.label}
                      </span>
                      <span className="text-xs text-gray-400">{fmtDate(work.date)}</span>
                    </div>

                    {/* Work name */}
                    <div className="px-4 pb-2">
                      <h4 className="font-bold text-gray-800">{work.work_name}</h4>
                    </div>

                    {/* Photo */}
                    {work.photo && (
                      <div className="px-4 pb-3">
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gray-100">
                          <img
                            src={getPhotoUrl(work.photo.thumbnail_path || work.photo.storage_path)}
                            alt={work.work_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        {work.photo.caption && (
                          <p className="text-xs text-gray-400 italic text-center mt-1">{work.photo.caption}</p>
                        )}
                      </div>
                    )}

                    {/* Teacher notes */}
                    {work.notes.length > 0 && (
                      <div className="px-4 pb-4 space-y-2">
                        {work.notes.map((note, idx) => (
                          <div key={idx} className="bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                            <p className="text-sm text-gray-700 leading-relaxed">{note.text}</p>
                            <p className="text-xs text-gray-400 mt-1">{fmtDate(note.date)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* No photo, no notes — minimal card */}
                    {!work.photo && work.notes.length === 0 && (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-gray-400 italic">No photos or notes yet</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* End marker */}
        {!loading && entries.length > 0 && (
          <p className="text-center text-white/30 text-xs py-4">── End of history ──</p>
        )}
      </div>

      {/* Bottom safe area */}
      <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()} />
    </div>
  );
}
