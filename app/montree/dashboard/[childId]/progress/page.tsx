// /montree/dashboard/[childId]/progress/page.tsx
// Child Progress Portfolio — hero stats, area bars, photos, timeline
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { getSession } from '@/lib/montree/auth';
import AreaHistoryModal from '@/components/montree/progress/AreaHistoryModal';
import { AREA_CONFIG } from '@/lib/montree/types';
import AreaBadge from '@/components/montree/shared/AreaBadge';

interface AreaSummary {
  area: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  progressPercent: number;
  currentWork: { id: string; name: string; index: number } | null;
}

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

interface Observation {
  id: string;
  behavior_description: string;
  observed_at: string;
  time_of_day?: string;
  activity_during?: string;
}

interface MediaItem {
  id: string;
  storage_path: string;
  thumbnail_path?: string;
  caption?: string;
  captured_at: string;
  media_type?: string;
  work_name?: string;
  area?: string;
}

interface TimelineEvent {
  id: string;
  type: 'mastery' | 'practicing' | 'presented' | 'observation' | 'note';
  date: string;
  title: string;
  subtitle?: string;
  area?: string;
  icon: string;
}

export default function ProgressPage() {
  const params = useParams();
  const childId = params.childId as string;
  const session = getSession();
  const photosRef = useRef<HTMLDivElement>(null);

  // State
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [stats, setStats] = useState({ presented: 0, practicing: 0, mastered: 0 });
  const [overallPercent, setOverallPercent] = useState(0);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [historyArea, setHistoryArea] = useState<string | null>(null);
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);

  // Supabase URL for media
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const getPhotoUrl = (path: string) => path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${path}` : '';

  // Child name
  const childName = (session?.classroom as Record<string, unknown[]> | null)?.children
    ? ((session?.classroom as unknown as { children: Array<{ id: string; name: string }> })?.children?.find(c => c.id === childId)?.name || 'Child')
    : 'Child';

  // Fetch all data
  useEffect(() => {
    if (!childId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [summaryRes, mediaRes, progressRes] = await Promise.all([
          fetch(`/api/montree/progress/summary?child_id=${childId}`),
          fetch(`/api/montree/media?child_id=${childId}&limit=20`),
          fetch(`/api/montree/progress?child_id=${childId}&include_observations=true`),
        ]);

        const [summaryData, mediaData, progressData] = await Promise.all([
          summaryRes.json(), mediaRes.json(), progressRes.json(),
        ]);

        // Summary → area bars
        if (summaryData.success) {
          setAreas(summaryData.areas || []);
          setOverallPercent(summaryData.overall?.percent || 0);
        }

        // Stats from progress API
        if (progressData.stats) {
          setStats(progressData.stats);
        }

        // Media
        setMedia((mediaData.media || []).filter((m: MediaItem) =>
          m.media_type === 'photo' || m.media_type === 'image' || !m.media_type
        ));

        // Build timeline
        const events: TimelineEvent[] = [];
        const progress: ProgressItem[] = progressData.progress || [];
        const observations: Observation[] = progressData.observations || [];

        for (const p of progress) {
          const s = typeof p.status === 'number'
            ? p.status === 3 ? 'mastered' : p.status === 2 ? 'practicing' : p.status === 1 ? 'presented' : ''
            : String(p.status);

          if (s === 'mastered' || s === 'completed') {
            events.push({
              id: `m-${p.id}`, type: 'mastery',
              date: p.mastered_at || p.updated_at,
              title: p.work_name, area: p.area, icon: '⭐',
            });
          } else if (s === 'practicing') {
            events.push({
              id: `pr-${p.id}`, type: 'practicing',
              date: p.updated_at,
              title: p.work_name, area: p.area, icon: '🔄',
            });
          } else if (s === 'presented') {
            events.push({
              id: `ps-${p.id}`, type: 'presented',
              date: p.presented_at || p.updated_at,
              title: p.work_name, area: p.area, icon: '📋',
            });
          }

          if (p.notes) {
            events.push({
              id: `n-${p.id}`, type: 'note',
              date: p.updated_at,
              title: p.work_name, subtitle: p.notes,
              area: p.area, icon: '📝',
            });
          }
        }

        for (const o of observations) {
          events.push({
            id: `o-${o.id}`, type: 'observation',
            date: o.observed_at,
            title: 'Observation',
            subtitle: o.behavior_description,
            icon: '👁',
          });
        }

        // Teacher notes from work_sessions (saved via Week tab)
        const workNotes: { id: string; work_name: string; area: string; notes: string; observed_at: string }[] = progressData.workNotes || [];
        for (const wn of workNotes) {
          events.push({
            id: `wn-${wn.id}`, type: 'note',
            date: wn.observed_at,
            title: wn.work_name, subtitle: wn.notes,
            area: wn.area, icon: '📝',
          });
        }

        events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTimeline(events);
      } catch (err) {
        console.error('Progress fetch error:', err);
      }
      setLoading(false);
    };

    fetchAll();
  }, [childId]);

  // Filtered + grouped timeline
  const filtered = selectedArea
    ? timeline.filter(e => e.area === selectedArea)
    : timeline;

  const grouped: { label: string; events: TimelineEvent[] }[] = [];
  const monthMap = new Map<string, TimelineEvent[]>();
  for (const event of filtered) {
    const d = new Date(event.date);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!monthMap.has(label)) monthMap.set(label, []);
    monthMap.get(label)!.push(event);
  }
  monthMap.forEach((events, label) => grouped.push({ label, events }));

  // Format date
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📊</div>
        <p className="text-gray-500">Loading progress...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">

      {/* ── Hero Stats ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-yellow-50 rounded-xl p-3">
            <div className="text-3xl font-bold text-yellow-600">{stats.mastered}</div>
            <div className="text-xs font-medium text-yellow-700 mt-1">Mastered</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="text-3xl font-bold text-blue-600">{stats.practicing}</div>
            <div className="text-xs font-medium text-blue-700 mt-1">Practicing</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="text-3xl font-bold text-purple-600">{stats.presented}</div>
            <div className="text-xs font-medium text-purple-700 mt-1">Presented</div>
          </div>
        </div>
      </div>

      {/* ── Area Progress Bars ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-800">Progress by Area</h2>
          <div className="text-lg font-bold text-emerald-600">{overallPercent}%</div>
        </div>

        <div className="space-y-4">
          {areas.map((area) => {
            const config = AREA_CONFIG[area.area];
            if (!config) return null;
            const isActive = selectedArea === area.area;

            return (
              <button
                key={area.area}
                onClick={() => setSelectedArea(isActive ? null : area.area)}
                onDoubleClick={() => setHistoryArea(area.area)}
                onTouchStart={(e) => {
                  const timer = setTimeout(() => {
                    setHistoryArea(area.area);
                  }, 500);
                  const clear = () => clearTimeout(timer);
                  e.currentTarget.addEventListener('touchend', clear, { once: true });
                  e.currentTarget.addEventListener('touchmove', clear, { once: true });
                }}
                className={`w-full text-left transition-all rounded-xl p-3 -mx-1 ${
                  isActive ? config.bg : 'hover:bg-gray-50'
                }`}
                style={isActive ? { boxShadow: `0 0 0 2px ${AREA_CONFIG[area.area]?.color}` } : undefined}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <AreaBadge area={area.area} size="sm" />
                    <span className="font-semibold text-gray-800 text-sm">{config.name}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: AREA_CONFIG[area.area]?.color }}>
                    {area.completed}/{area.totalWorks}
                  </span>
                </div>

                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-700`}
                    style={{ width: `${area.progressPercent}%` }}
                  />
                </div>

                {area.currentWork && area.completed < area.totalWorks && (
                  <p className="text-xs text-gray-500 mt-1">
                    📍 {area.currentWork.name}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {selectedArea && (
          <button
            onClick={() => setSelectedArea(null)}
            className="w-full text-center text-xs text-gray-400 mt-3 py-1"
          >
            Tap area again to show all · Showing {AREA_CONFIG[selectedArea]?.name}
          </button>
        )}
      </div>

      {/* ── Recent Photos ── */}
      {media.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-3">Recent Photos</h2>
          <div ref={photosRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {media.map((m) => (
              <button
                key={m.id}
                onClick={() => setPhotoViewerUrl(getPhotoUrl(m.storage_path))}
                className="flex-shrink-0 snap-start"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={getPhotoUrl(m.thumbnail_path || m.storage_path)}
                    alt={m.caption || 'Photo'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {m.work_name && (
                  <p className="text-[10px] text-gray-500 mt-1 w-24 truncate text-center">{m.work_name}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          Timeline
          {selectedArea && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({AREA_CONFIG[selectedArea]?.name})
            </span>
          )}
        </h2>

        {grouped.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">No activity recorded yet</p>
        )}

        {grouped.map(({ label, events }) => (
          <div key={label} className="mb-5 last:mb-0">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{label}</div>
            <div className="space-y-3">
              {events.map((event) => {
                const areaConf = event.area ? AREA_CONFIG[event.area] : null;
                return (
                  <div key={event.id} className="flex gap-3 items-start">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm">
                      {event.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm truncate">
                          {event.type === 'mastery' && '⭐ Mastered '}
                          {event.type === 'practicing' && 'Practicing '}
                          {event.type === 'presented' && 'Presented '}
                          {event.type === 'note' && '📝 '}
                          {event.type === 'observation' && ''}
                          {event.title}
                        </span>
                      </div>
                      {event.subtitle && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{fmtDate(event.date)}</span>
                        {areaConf && (
                          <span className={`text-[10px] font-medium ${areaConf.text} ${areaConf.bg} px-1.5 py-0.5 rounded-full`}>
                            {areaConf.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Area History Modal ── */}
      <AreaHistoryModal
        isOpen={historyArea !== null}
        onClose={() => setHistoryArea(null)}
        area={historyArea || ''}
        childId={childId}
        childName={childName}
      />

      {/* ── Photo Viewer Overlay ── */}
      {photoViewerUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPhotoViewerUrl(null)}
        >
          <button
            onClick={() => setPhotoViewerUrl(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold z-10 w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
          <img
            src={photoViewerUrl}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
