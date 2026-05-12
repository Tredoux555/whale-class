'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, ChevronDown, Check, Camera, Hand, PartyPopper,
} from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

interface AttendanceChild {
  id: string;
  name: string;
  photo_url: string | null;
  present: boolean;
  has_photos: boolean;
  manually_marked: boolean;
}

interface AttendanceData {
  date: string;
  children: AttendanceChild[];
  present_count: number;
  total_count: number;
}

// Dark forest tokens
const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 16,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redStrong: 'rgba(239,68,68,0.18)',
  redSoft: 'rgba(239,68,68,0.08)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function AttendanceWidget() {
  const { t } = useI18n();
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const markingRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAttendance = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await montreeApi('/api/montree/attendance');
      if (controller.signal.aborted || !mountedRef.current) return;
      if (!res.ok) {
        if (mountedRef.current) setLoading(false);
        return;
      }
      const json = await res.json();
      if (controller.signal.aborted || !mountedRef.current) return;
      setData(json);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[AttendanceWidget] Fetch error:', err);
    } finally {
      if (!controller.signal.aborted && mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    return () => { abortRef.current?.abort(); };
  }, [fetchAttendance]);

  const handleMarkPresent = useCallback(async (childId: string) => {
    if (markingRef.current) return;
    markingRef.current = childId;
    setMarking(childId);
    try {
      const res = await montreeApi('/api/montree/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      });
      if (!mountedRef.current) return;
      if (res.ok) {
        setData(prev => {
          if (!prev) return prev;
          const updated = prev.children.map(c =>
            c.id === childId ? { ...c, present: true, manually_marked: true } : c
          );
          updated.sort((a, b) => {
            if (a.present === b.present) return a.name.localeCompare(b.name);
            return a.present ? 1 : -1;
          });
          return {
            ...prev,
            children: updated,
            present_count: updated.filter(c => c.present).length,
          };
        });
        toast.success(t('attendance.markedPresent'));
      } else {
        toast.error(t('attendance.markFailed'));
      }
    } catch (err) {
      console.error('[AttendanceWidget] Mark present error:', err);
      if (mountedRef.current) toast.error(t('attendance.markFailed'));
    } finally {
      markingRef.current = null;
      if (mountedRef.current) setMarking(null);
    }
  }, [t]);

  if (loading) {
    return (
      <div style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        padding: 14,
        animation: 'aw-pulse 1.6s ease-in-out infinite',
      }}>
        <div style={{ height: 16, width: 130, borderRadius: 6, background: 'rgba(52,211,153,0.10)', marginBottom: 8 }} />
        <div style={{ height: 28, width: '100%', borderRadius: 8, background: 'rgba(52,211,153,0.08)' }} />
        <style>{`@keyframes aw-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    );
  }

  if (!data || data.total_count === 0) return null;

  const absentChildren = data.children.filter(c => !c.present);
  const presentChildren = data.children.filter(c => c.present);
  const allPresent = absentChildren.length === 0;

  const fractionPillStyle = allPresent
    ? { bg: T.emeraldStrong, border: '1px solid rgba(52,211,153,0.40)', color: T.emerald }
    : data.present_count >= data.total_count * 0.8
      ? { bg: T.amberStrong, border: `1px solid ${T.amberBorder}`, color: T.amber }
      : { bg: T.redStrong, border: `1px solid ${T.redBorder}`, color: T.red };

  return (
    <div
      id="panel-attendance"
      style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: T.cardRadius,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        overflow: 'hidden',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label={t('attendance.title')}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: T.textPrimary,
          transition: 'background 140ms ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.06)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.30)',
            color: T.emerald,
          }}>
            <ClipboardList size={16} strokeWidth={1.75} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: T.serif,
              fontSize: 15,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('attendance.title')}
            </div>
            <div style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
              marginTop: 1,
            }}>
              {allPresent
                ? t('attendance.allPresent')
                : t('attendance.summary').replace('{present}', String(data.present_count)).replace('{total}', String(data.total_count))
              }
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 999,
            background: fractionPillStyle.bg,
            border: fractionPillStyle.border,
            color: fractionPillStyle.color,
            letterSpacing: 0.3,
          }}>
            {data.present_count}/{data.total_count}
          </span>
          <ChevronDown
            size={13}
            strokeWidth={1.75}
            color={T.textMuted}
            style={{
              transition: 'transform 200ms ease',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '12px 16px 16px',
          borderTop: T.cardBorder,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {/* Absent — actionable */}
          {absentChildren.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.red,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: T.red,
                  boxShadow: '0 0 0 2px rgba(239,68,68,0.18)',
                }} />
                {t('attendance.notYetSeen')} ({absentChildren.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {absentChildren.map(child => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: T.redSoft,
                      border: `1px solid ${T.redBorder}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {child.photo_url ? (
                        // 🚨 Tier 5.1 — explicit width/height attrs.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={child.photo_url}
                          alt={child.name}
                          width={28}
                          height={28}
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            border: '1px solid rgba(255,255,255,0.10)',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: T.textMuted,
                          fontSize: 11,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {child.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{
                        fontFamily: T.sans,
                        fontSize: 13,
                        color: T.textPrimary,
                      }}>
                        {child.name}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkPresent(child.id); }}
                      disabled={marking === child.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 12px',
                        borderRadius: 999,
                        background: 'linear-gradient(180deg, #34d399, #10b981)',
                        border: '1px solid rgba(52,211,153,0.55)',
                        color: '#06281a',
                        fontFamily: T.sans,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: marking === child.id ? 'wait' : 'pointer',
                        opacity: marking === child.id ? 0.55 : 1,
                      }}
                    >
                      <Check size={11} strokeWidth={2.5} />
                      {marking === child.id ? '...' : t('attendance.markPresent')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Present — compact */}
          {presentChildren.length > 0 && (
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 8,
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.emerald,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: T.emerald,
                  boxShadow: '0 0 0 2px rgba(52,211,153,0.18)',
                }} />
                {t('attendance.present')} ({presentChildren.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {presentChildren.map(child => (
                  <div
                    key={child.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px 4px 4px',
                      borderRadius: 999,
                      background: T.emeraldSoft,
                      border: '1px solid rgba(52,211,153,0.20)',
                    }}
                  >
                    {child.photo_url ? (
                      // 🚨 Tier 5.1 — explicit width/height attrs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.photo_url}
                        alt={child.name}
                        width={22}
                        height={22}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: T.emeraldStrong,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: T.emerald,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span style={{
                      fontFamily: T.sans,
                      fontSize: 11,
                      fontWeight: 600,
                      color: T.emerald,
                    }}>
                      {child.name}
                    </span>
                    {child.has_photos && (
                      <Camera size={10} strokeWidth={1.75} color={T.emerald} />
                    )}
                    {child.manually_marked && !child.has_photos && (
                      <Hand size={10} strokeWidth={1.75} color={T.emerald} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {allPresent && (
            <div style={{
              textAlign: 'center',
              padding: '8px 0 4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.40)',
                color: T.emerald,
              }}>
                <PartyPopper size={16} strokeWidth={1.75} />
              </div>
              <p style={{
                margin: 0,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                color: T.emerald,
              }}>
                {t('attendance.everyoneHere')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
