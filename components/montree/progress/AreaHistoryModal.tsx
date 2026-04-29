// components/montree/progress/AreaHistoryModal.tsx
// Full-screen area history modal — shows work timeline with photos and teacher notes
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect } from 'react';
import {
  X, Sparkles, Star, RotateCw, ClipboardList, Inbox,
} from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { getAreaLabel } from '@/lib/montree/i18n/area-labels';

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

type StatusType = 'mastered' | 'practicing' | 'presented' | 'not_started';

interface WorkEntry {
  work_name: string;
  chineseName?: string;
  status: string;
  statusType: StatusType;
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

const T = {
  scrim: 'rgba(2,8,5,0.92)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  cardRadius: 16,
  blur: 'blur(14px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  textFaint: 'rgba(255,255,255,0.30)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Area dot palette + tinted gradient header bg
const AREA_TINT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',
  sensorial: '20, 184, 166',
  mathematics: '168, 85, 247',
  language: '74, 222, 128',
  cultural: '249, 115, 22',
};

// Status pill styles per locked tokens
const STATUS_PILLS: Record<StatusType, { bg: string; border: string; color: string; Icon: typeof Star }> = {
  mastered: {
    bg: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.20)',
    color: 'rgba(255,255,255,0.85)',
    Icon: Star,
  },
  practicing: {
    bg: T.emeraldStrong,
    border: 'rgba(52,211,153,0.35)',
    color: T.emerald,
    Icon: RotateCw,
  },
  presented: {
    bg: 'rgba(245,158,11,0.18)',
    border: 'rgba(245,158,11,0.35)',
    color: T.amber,
    Icon: ClipboardList,
  },
  not_started: {
    bg: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.12)',
    color: T.textMuted,
    Icon: ClipboardList,
  },
};

export default function AreaHistoryModal({ isOpen, onClose, area, childId, childName }: AreaHistoryModalProps) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<{ label: string; works: WorkEntry[] }[]>([]);
  const { t, locale } = useI18n();

  const areaDisplayName = getAreaLabel(area, locale);
  const tintRgb = AREA_TINT_RGB[area] || '74, 222, 128';

  const statusLabel = (s: string) => {
    if (s === 'mastered' || s === 'completed') return t('progress.mastered' as any);
    if (s === 'practicing') return t('progress.practicing' as any);
    if (s === 'presented') return t('progress.presented' as any);
    return t('common.started' as any) || 'Started';
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const getPhotoUrl = (path: string) => path ? `${supabaseUrl}/storage/v1/object/public/montree-media/${path}` : '';

  useEffect(() => {
    if (!isOpen || !childId || !area) return;

    const fetchData = async () => {
      setLoading(true);
      try {
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

        const photoMap = new Map<string, MediaItem>();
        for (const m of media) {
          if (m.work_name && !photoMap.has(m.work_name.toLowerCase())) {
            photoMap.set(m.work_name.toLowerCase(), m);
          }
        }

        const notesMap = new Map<string, { text: string; date: string }[]>();
        for (const s of sessions) {
          const key = s.work_name?.toLowerCase();
          if (!key) continue;
          if (!notesMap.has(key)) notesMap.set(key, []);
          notesMap.get(key)!.push({ text: s.notes, date: s.observed_at });
        }

        const workEntries: WorkEntry[] = [];
        const seen = new Set<string>();

        for (const p of progress) {
          const key = p.work_name?.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);

          const s = typeof p.status === 'number'
            ? p.status === 3 ? 'mastered' : p.status === 2 ? 'practicing' : p.status === 1 ? 'presented' : 'not_started'
            : String(p.status);

          const statusType: StatusType =
            s === 'mastered' || s === 'completed' ? 'mastered'
              : s === 'practicing' ? 'practicing'
                : s === 'presented' ? 'presented'
                  : 'not_started';

          const date = p.mastered_at || p.presented_at || p.updated_at;
          const photo = photoMap.get(key);
          const notes = notesMap.get(key) || [];

          if (p.notes && !notes.some(n => n.text === p.notes)) {
            notes.push({ text: p.notes, date: p.updated_at });
          }

          notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          workEntries.push({
            work_name: p.work_name,
            chineseName: (p as any).chineseName,
            status: s,
            statusType,
            date,
            photo,
            notes,
          });
        }

        workEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const monthMap = new Map<string, WorkEntry[]>();
        for (const entry of workEntries) {
          const d = new Date(entry.date);
          const label = d.toLocaleDateString(getIntlLocale(locale), { month: 'long', year: 'numeric' });
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
  }, [isOpen, childId, area, locale]);

  if (!isOpen) return null;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric' });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: T.scrim,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      {/* Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: `linear-gradient(180deg, rgba(${tintRgb}, 0.32), rgba(${tintRgb}, 0.12))`,
          borderBottom: `1px solid rgba(${tintRgb}, 0.30)`,
          paddingTop: 'max(20px, env(safe-area-inset-top))',
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 18,
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(0,0,0,0.32)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.95)',
              cursor: 'pointer',
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
          <div style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `rgba(${tintRgb}, 0.30)`,
              border: `1px solid rgba(${tintRgb}, 0.55)`,
              marginBottom: 6,
            }}>
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: `rgb(${tintRgb})`,
                opacity: 0.85,
                boxShadow: `0 0 12px rgba(${tintRgb}, 0.55)`,
              }} />
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {areaDisplayName}
            </h2>
            <p style={{
              margin: '2px 0 0',
              fontFamily: T.sans,
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
            }}>
              {t('areaHistory.journey', { name: childName })}
            </p>
          </div>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {loading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 160,
          }}>
            <div style={{ textAlign: 'center', color: T.textSecondary }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.35)',
                color: T.emerald,
                marginBottom: 10,
                animation: 'ahm-pulse 1.6s ease-in-out infinite',
              }}>
                <Sparkles size={18} strokeWidth={1.75} />
              </div>
              <p style={{ margin: 0, fontSize: 13 }}>{t('common.loading' as any)}</p>
              <style>{`@keyframes ahm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
          }}>
            <div style={{ textAlign: 'center', color: T.textSecondary }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: T.card,
                border: `1px solid ${T.cardBorder}`,
                color: T.textMuted,
                marginBottom: 12,
              }}>
                <Inbox size={22} strokeWidth={1.75} />
              </div>
              <p style={{
                margin: 0,
                fontFamily: T.serif,
                fontSize: 16,
                fontWeight: 500,
                color: T.textSecondary,
              }}>
                {t('progress.noActivity' as any) || 'No activity recorded yet'}
              </p>
              <p style={{
                margin: '4px 0 0',
                fontFamily: T.sans,
                fontSize: 12,
                color: T.textMuted,
              }}>
                {areaDisplayName}
              </p>
            </div>
          </div>
        ) : (
          entries.map((group) => (
            <div key={group.label}>
              <h3 style={{
                margin: '0 0 12px',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.textFaint,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
              }}>
                {group.label}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {group.works.map((work) => {
                  const cfg = STATUS_PILLS[work.statusType];
                  const StatusIcon = cfg.Icon;
                  return (
                    <div
                      key={work.work_name}
                      style={{
                        background: T.card,
                        border: `1px solid ${T.cardBorder}`,
                        borderRadius: T.cardRadius,
                        backdropFilter: T.blur,
                        WebkitBackdropFilter: T.blur,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{
                        padding: '12px 16px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          color: cfg.color,
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: 0.3,
                        }}>
                          <StatusIcon size={11} strokeWidth={1.75} />
                          {statusLabel(work.status)}
                        </span>
                        <span style={{
                          fontFamily: T.sans,
                          fontSize: 11,
                          color: T.textMuted,
                        }}>
                          {fmtDate(work.date)}
                        </span>
                      </div>

                      <div style={{ padding: '0 16px 8px' }}>
                        <h4 style={{
                          margin: 0,
                          fontFamily: T.serif,
                          fontSize: 15,
                          fontWeight: 500,
                          color: T.textPrimary,
                          letterSpacing: -0.1,
                        }}>
                          {locale === 'zh' && work.chineseName ? work.chineseName : work.work_name}
                        </h4>
                      </div>

                      {work.photo && (
                        <div style={{ padding: '0 16px 12px' }}>
                          <div style={{
                            aspectRatio: '4 / 3',
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            <img
                              src={getPhotoUrl(work.photo.thumbnail_path || work.photo.storage_path)}
                              alt={work.work_name}
                              loading="lazy"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                            />
                          </div>
                          {work.photo.caption && (
                            <p style={{
                              margin: '6px 0 0',
                              textAlign: 'center',
                              fontFamily: T.sans,
                              fontSize: 11,
                              color: T.textMuted,
                              fontStyle: 'italic',
                            }}>
                              {work.photo.caption}
                            </p>
                          )}
                        </div>
                      )}

                      {work.notes.length > 0 && (
                        <div style={{
                          padding: '0 16px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}>
                          {work.notes.map((note, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 10,
                                background: T.amberSoft,
                                border: `1px solid ${T.amberBorder}`,
                              }}
                            >
                              <p style={{
                                margin: 0,
                                fontFamily: T.sans,
                                fontSize: 13,
                                lineHeight: 1.55,
                                color: T.textPrimary,
                              }}>
                                {note.text}
                              </p>
                              <p style={{
                                margin: '4px 0 0',
                                fontFamily: T.sans,
                                fontSize: 10,
                                color: T.textMuted,
                              }}>
                                {fmtDate(note.date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {!work.photo && work.notes.length === 0 && (
                        <div style={{ padding: '0 16px 12px' }}>
                          <p style={{
                            margin: 0,
                            fontFamily: T.sans,
                            fontSize: 11,
                            color: T.textMuted,
                            fontStyle: 'italic',
                          }}>
                            No photos or notes yet
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {!loading && entries.length > 0 && (
          <p style={{
            textAlign: 'center',
            fontFamily: T.sans,
            fontSize: 11,
            color: T.textFaint,
            padding: '16px 0',
            margin: 0,
          }}>
            ── End of history ──
          </p>
        )}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      />
    </div>
  );
}
