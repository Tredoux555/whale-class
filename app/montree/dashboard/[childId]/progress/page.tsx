// /montree/dashboard/[childId]/progress/page.tsx
// Child Progress Portfolio — hero stats, area bars, photos, timeline
// Layout handles auth + header + tabs
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, CSSProperties } from 'react';
import { useParams } from 'next/navigation';
import {
  Camera, Star, RotateCw, ClipboardList, NotebookPen, Eye,
} from 'lucide-react';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { AREA_CONFIG } from '@/lib/montree/types';
import { ProgressSkeleton } from '@/components/montree/Skeletons';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import PhotoInsightButton from '@/components/montree/guru/PhotoInsightButton';
import TeachGuruWorkModal from '@/components/montree/guru/TeachGuruWorkModal';
import { updateEntryAfterCorrection } from '@/lib/montree/photo-insight-store';
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

type TimelineEventType = 'mastery' | 'practicing' | 'presented' | 'observation' | 'note';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  chineseTitle?: string;
  subtitle?: string;
  area?: string;
}

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Area dot palette (matches dark forest tokens)
const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',   // pink
  sensorial: '20, 184, 166',        // teal
  mathematics: '168, 85, 247',      // purple
  language: '74, 222, 128',         // green
  cultural: '249, 115, 22',         // orange
};

// Map timeline event type → icon component + tint
const TIMELINE_ICON: Record<TimelineEventType, { Icon: typeof Star; tint: string }> = {
  mastery:     { Icon: Star, tint: '#fbbf24' },
  practicing:  { Icon: RotateCw, tint: '#34d399' },
  presented:   { Icon: ClipboardList, tint: '#f59e0b' },
  note:        { Icon: NotebookPen, tint: '#c4b5fd' },
  observation: { Icon: Eye, tint: '#60a5fa' },
};

const cardStyle: CSSProperties = {
  background: T.card,
  border: T.cardBorder,
  borderRadius: T.cardRadius,
  backdropFilter: T.blur,
  WebkitBackdropFilter: T.blur,
  padding: 18,
};

const sectionTitle: CSSProperties = {
  margin: '0 0 14px',
  fontFamily: T.serif,
  fontSize: 17,
  fontWeight: 500,
  color: T.textPrimary,
  letterSpacing: -0.2,
};

const monthLabel: CSSProperties = {
  fontFamily: T.sans,
  fontSize: 11,
  fontWeight: 700,
  color: T.textMuted,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  marginBottom: 12,
};

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

  // selectedArea isn't currently filtered via UI on this page but kept for parity
  void setSelectedArea;

  // Supabase URL for media
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const getPhotoUrl = (path: string) => path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${path}` : '';

  const debouncedFetchRef = useRef<NodeJS.Timeout | null>(null);
  const fetchAllRef = useRef<() => Promise<void>>();

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

      setMedia((mediaData.media || []).filter((m: MediaItem) =>
        m.media_type === 'photo' || m.media_type === 'image' || !m.media_type
      ));

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
            title: p.work_name, chineseTitle: p.chineseName, area: p.area,
          });
        } else if (s === 'practicing') {
          events.push({
            id: `pr-${p.id}`, type: 'practicing',
            date: p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, area: p.area,
          });
        } else if (s === 'presented') {
          events.push({
            id: `ps-${p.id}`, type: 'presented',
            date: p.presented_at || p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, area: p.area,
          });
        }

        if (p.notes) {
          events.push({
            id: `n-${p.id}`, type: 'note',
            date: p.updated_at,
            title: p.work_name, chineseTitle: p.chineseName, subtitle: p.notes,
            area: p.area,
          });
        }
      }

      for (const o of observations) {
        events.push({
          id: `o-${o.id}`, type: 'observation',
          date: o.observed_at,
          title: t('progress.observation'),
          subtitle: o.behavior_description,
        });
      }

      const workNotes: { id: string; work_name: string; chineseName?: string; area: string; notes: string; observed_at: string }[] = progressData.workNotes || [];
      for (const wn of workNotes) {
        events.push({
          id: `wn-${wn.id}`, type: 'note',
          date: wn.observed_at,
          title: wn.work_name, chineseTitle: wn.chineseName, subtitle: wn.notes,
          area: wn.area,
        });
      }

      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(events);
    } catch (err) {
      console.error('Progress fetch error:', err);
    }
    setLoading(false);
  }, [childId, t]);

  fetchAllRef.current = fetchAll;

  const debouncedFetchAll = useCallback(() => {
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }
    debouncedFetchRef.current = setTimeout(() => {
      fetchAllRef.current?.();
    }, 500);
  }, []);

  useEffect(() => {
    fetchAll();
    return () => {
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
      }
    };
  }, [fetchAll]);

  const grouped = useMemo(() => {
    const filtered = selectedArea
      ? timeline.filter(e => e.area === selectedArea)
      : timeline;

    const result: { label: string; events: TimelineEvent[] }[] = [];
    const monthMap = new Map<string, TimelineEvent[]>();
    for (const event of filtered) {
      const d = new Date(event.date);
      const label = d.toLocaleDateString(getIntlLocale(locale), { month: 'long', year: 'numeric' });
      if (!monthMap.has(label)) monthMap.set(label, []);
      monthMap.get(label)!.push(event);
    }
    monthMap.forEach((events, label) => result.push({ label, events }));
    return result;
  }, [timeline, selectedArea, locale]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <ProgressSkeleton />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      paddingBottom: 32,
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="progress" role="parent" />
      )}

      {/* ── Recent Photos ── */}
      {media.length > 0 ? (
        <div style={cardStyle}>
          <h2 style={sectionTitle}>{t('review.reviewPhotos' as any)}</h2>
          <div
            ref={photosRef}
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              paddingBottom: 6,
              margin: '0 -4px',
              padding: '0 4px',
              scrollSnapType: 'x mandatory',
            }}
          >
            {media.map((m) => (
              <div
                key={m.id}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <button
                  onClick={() => setPhotoViewerUrl(getPhotoUrl(m.storage_path))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: 96,
                    height: 96,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <img
                      src={getPhotoUrl(m.thumbnail_path || m.storage_path)}
                      alt={m.caption || 'Photo'}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                  {m.work_name && (
                    <p style={{
                      margin: '4px 0 0',
                      width: 96,
                      fontFamily: T.sans,
                      fontSize: 10,
                      color: T.textMuted,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.work_name}
                    </p>
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
        <div style={{
          ...cardStyle,
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 56,
            height: 56,
            margin: '0 auto 12px',
            borderRadius: '50%',
            background: T.card,
            border: T.cardBorder,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Camera size={22} strokeWidth={1.75} color={T.textMuted} />
          </div>
          <h2 style={{
            ...sectionTitle,
            margin: '0 0 6px',
            textAlign: 'center',
          }}>
            {t('review.noPhotos' as any)}
          </h2>
          <p style={{
            margin: 0,
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textMuted,
          }}>
            {t('review.takePhotos' as any)}
          </p>
        </div>
      )}

      {/* ── Timeline ── */}
      <div style={cardStyle}>
        <h2 style={sectionTitle}>
          {t('progress.timeline')}
          {selectedArea && (
            <span style={{
              marginLeft: 8,
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 400,
              color: T.textMuted,
            }}>
              ({areaName(selectedArea)})
            </span>
          )}
        </h2>

        {grouped.length === 0 && (
          <p style={{
            textAlign: 'center',
            padding: '24px 0',
            color: T.textMuted,
            fontFamily: T.sans,
            fontSize: 13,
          }}>
            {t('progress.noActivity')}
          </p>
        )}

        {grouped.map(({ label, events }, gi) => (
          <div
            key={label}
            style={{ marginBottom: gi === grouped.length - 1 ? 0 : 22 }}
          >
            <div style={monthLabel}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.map((event) => {
                const cfg = TIMELINE_ICON[event.type];
                const Icon = cfg.Icon;
                const rgb = event.area ? AREA_DOT_RGB[event.area] : null;
                const titlePrefix =
                  event.type === 'mastery' ? `${t('progress.mastered')} ` :
                  event.type === 'practicing' ? `${t('progress.practicing')} ` :
                  event.type === 'presented' ? `${t('progress.presented')} ` : '';
                return (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      flexShrink: 0,
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cfg.tint,
                    }}>
                      <Icon size={15} strokeWidth={1.75} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}>
                        <span style={{
                          fontFamily: T.sans,
                          fontSize: 13,
                          fontWeight: 500,
                          color: T.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {titlePrefix}
                          {locale === 'zh' && event.chineseTitle ? event.chineseTitle : event.title}
                        </span>
                      </div>
                      {event.subtitle && (
                        <p style={{
                          margin: '2px 0 0',
                          fontFamily: T.sans,
                          fontSize: 12,
                          color: T.textSecondary,
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {event.subtitle}
                        </p>
                      )}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 4,
                      }}>
                        <span style={{
                          fontFamily: T.sans,
                          fontSize: 10,
                          color: T.textMuted,
                          letterSpacing: 0.3,
                        }}>
                          {fmtDate(event.date)}
                        </span>
                        {rgb && event.area && (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: `rgba(${rgb}, 0.15)`,
                            border: `1px solid rgba(${rgb}, 0.30)`,
                            color: `rgb(${rgb})`,
                            fontFamily: T.sans,
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}>
                            {areaName(event.area)}
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

      {/* ── Teach Guru Work Modal ── */}
      {teachModalData && session?.classroom?.id && (
        <TeachGuruWorkModal
          isOpen={true}
          onClose={() => setTeachModalData(null)}
          initialWorkName={teachModalData.workName}
          initialArea={teachModalData.area}
          mediaId={teachModalData.mediaId}
          classroomId={session?.classroom?.id || ''}
          childId={childId}
          onWorkSaved={(work) => {
            if (teachModalData) {
              updateEntryAfterCorrection(teachModalData.mediaId, childId, work.name, work.area);
            }
            setTeachModalData(null);
            debouncedFetchAll();
          }}
        />
      )}

      {/* Photo Lightbox */}
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
