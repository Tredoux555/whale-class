// /montree/dashboard/[childId]/progress/page.tsx
// Child Progress Portfolio — hero stats, area bars, photos, timeline
// Layout handles auth + header + tabs
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { AREA_CONFIG } from '@/lib/montree/types';
import { ProgressSkeleton } from '@/components/montree/Skeletons';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import PhotoInsightButton from '@/components/montree/guru/PhotoInsightButton';
import TeachGuruWorkModal from '@/components/montree/guru/TeachGuruWorkModal';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

interface ProgressItem {
  id: string;
  work_name: string;
  chineseName?: string;
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
  chineseTitle?: string;
  subtitle?: string;
  area?: string;
  icon: string;
}

export default function ProgressPage() {
  const params = useParams();
  const childId = params.childId as string;
  const session = getSession();
  const { t, locale } = useI18n();
  const areaName = (key: string) => t(`area.${key}` as any) || AREA_CONFIG[key]?.name || key;
  const photosRef = useRef<HTMLDivElement>(null);

  // State
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  const [teachModalData, setTeachModalData] = useState<{ workName: string; area: string | null; mediaId: string } | null>(null);

  // Supabase URL for media
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const getPhotoUrl = (path: string) => path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${path}` : '';

  // Debounced fetchAll to prevent multiple SmartCaptures from triggering simultaneous refreshes
  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all data — extracted as useCallback so PhotoInsightButton can trigger refresh
  const fetchAll = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const [mediaRes, progressRes] = await Promise.all([
        fetch(`/api/montree/media?child_id=${childId}&limit=20`),
        fetch(`/api/montree/progress?child_id=${childId}&include_observations=true`),
      ]);

      if (!mediaRes.ok || !progressRes.ok) {
        console.error('Progress fetch failed:', { media: mediaRes.status, progress: progressRes.status });
        setLoading(false);
        return;
      }

      const [mediaData, progressData] = await Promise.all([
        mediaRes.json(), progressRes.json(),
      ]);

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
            title: p.work_name, chineseTitle: p.chineseName, area: p.area, icon: '⭐',
          });
        } else if (s === 'practicing') {
          events.push({
            id: `pr-${p.id}`, type: 'practicing',
            date: p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, area: p.area, icon: '🔄',
          });
        } else if (s === 'presented') {
          events.push({
            id: `ps-${p.id}`, type: 'presented',
            date: p.presented_at || p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, area: p.area, icon: '📋',
          });
        }

        if (p.notes) {
          events.push({
            id: `n-${p.id}`, type: 'note',
            date: p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, subtitle: p.notes,
            area: p.area, icon: '📝',
          });
        }
      }

      for (const o of observations) {
        events.push({
          id: `o-${o.id}`, type: 'observation',
          date: o.observed_at,
          title: t('progress.observation'),
          subtitle: o.behavior_description,
          icon: '👁',
        });
      }

      // Teacher notes from work_sessions (saved via Week tab)
      const workNotes: { id: string; work_name: string; chineseName?: string; area: string; notes: string; observed_at: string }[] = progressData.workNotes || [];
      for (const wn of workNotes) {
        events.push({
          id: `wn-${wn.id}`, type: 'note',
          date: wn.observed_at,
          title: wn.work_name, chineseTitle: wn.chineseName, subtitle: wn.notes,
          area: wn.area, icon: '📝',
        });
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(events);
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
    setLoading(false);
  }, [childId, t]);

  // Debounced fetchAll to throttle multiple SmartCapture auto-updates
  const debouncedFetchAll = useCallback(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    debouncedFetchRef.current = setTimeout(() => {
      fetchAll();
    }, 500); // Wait 500ms for multiple SmartCaptures to complete before refreshing
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, [fetchAll]);

  // Filtered + grouped timeline (memoized to avoid re-computation on unrelated state changes)
  const grouped = useMemo(() => {
    const filtered = selectedArea
      ? timeline.filter(e => e.area === selectedArea)
      : timeline;

    const result: { label: string; events: TimelineEvent[] }[] = [];
    const monthMap = new Map<string, TimelineEvent[]>();
    for (const event of filtered) {
      const d = new Date(event.date);
      const label = d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' });
      if (!monthMap.has(label)) monthMap.set(label, []);
      monthMap.get(label)!.push(event);
    }
    monthMap.forEach((events, label) => result.push({ label, events }));
    return result;
  }, [timeline, selectedArea, locale]);

  // Format date
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return <ProgressSkeleton />;
  }

  return (
    <div className="space-y-4 pb-8">

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="progress" role="parent" />
      )}

      {/* ── Recent Photos — primary content of Review tab ── */}
      {media.length > 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-3">{t('review.reviewPhotos' as any)}</h2>
          <div ref={photosRef} className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
            {media.map((m) => (
              <div key={m.id} className="flex-shrink-0 snap-start">
                <button
                  onClick={() => setPhotoViewerUrl(getPhotoUrl(m.storage_path))}
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
                <PhotoInsightButton
                  childId={childId}
                  mediaId={m.id}
                  classroomId={session?.classroom?.id}
                  onProgressUpdate={debouncedFetchAll}
                  onTeachWork={(data) => setTeachModalData(data)}
                  onAddToClassroom={() => debouncedFetchAll()}
                  onAddToShelf={() => debouncedFetchAll()}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="text-4xl mb-3">📷</div>
          <h2 className="text-base font-bold text-gray-800 mb-1">{t('review.noPhotos' as any)}</h2>
          <p className="text-sm text-gray-500">{t('review.takePhotos' as any)}</p>
        </div>
      )}

      {/* ── Timeline ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-800 mb-4">
          {t('progress.timeline')}
          {selectedArea && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({areaName(selectedArea)})
            </span>
          )}
        </h2>

        {grouped.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">{t('progress.noActivity')}</p>
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
                          {event.type === 'mastery' && `⭐ ${t('progress.mastered')} `}
                          {event.type === 'practicing' && `${t('progress.practicing')} `}
                          {event.type === 'presented' && `${t('progress.presented')} `}
                          {event.type === 'note' && '📝 '}
                          {event.type === 'observation' && ''}
                          {locale === 'zh' && event.chineseTitle ? event.chineseTitle : event.title}
                        </span>
                      </div>
                      {event.subtitle && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{event.subtitle}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{fmtDate(event.date)}</span>
                        {areaConf && (
                          <span className={`text-[10px] font-medium ${areaConf.text} ${areaConf.bg} px-1.5 py-0.5 rounded-full`}>
                            {event.area ? areaName(event.area) : areaConf.name}
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

      {/* ── Photo Viewer Overlay ── */}
      {/* ── Teach Guru Work Modal ── */}
      {teachModalData && session?.classroom?.id && (
        <TeachGuruWorkModal
          isOpen={true}
          onClose={() => setTeachModalData(null)}
          initialWorkName={teachModalData.workName}
          initialArea={teachModalData.area}
          mediaId={teachModalData.mediaId}
          classroomId={session?.classroom?.id || ''}
          onWorkSaved={() => { setTeachModalData(null); debouncedFetchAll(); }}
        />
      )}

      {/* Photo Lightbox — fullscreen zoom + download + navigation */}
      <PhotoLightbox
        isOpen={!!photoViewerUrl}
        onClose={() => setPhotoViewerUrl(null)}
        src={photoViewerUrl || ''}
        photos={media.map(m => ({
          url: getPhotoUrl(m.storage_path),
          caption: m.caption || m.work_name || undefined,
          date: m.captured_at,
        }))}
        currentIndex={Math.max(0, media.findIndex(m => getPhotoUrl(m.storage_path) === photoViewerUrl))}
        onNavigate={(idx) => setPhotoViewerUrl(getPhotoUrl(media[idx]?.storage_path))}
      />
    </div>
  );
}
