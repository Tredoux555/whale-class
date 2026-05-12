// components/montree/reports/WeeklyWrapCard.tsx
// Dashboard card for the Weekly Wrap flow — uses streaming for progress
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, RotateCw, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  cardRadius: 14,
  blur: 'blur(16px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    week_start: monday.toISOString().split('T')[0],
    week_end: sunday.toISOString().split('T')[0],
  };
}

export default function WeeklyWrapCard({ classroomId, children }: Props) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [childrenDone, setChildrenDone] = useState(0);
  const [childrenTotal, setChildrenTotal] = useState(0);
  const [result, setResult] = useState<{
    generated: number;
    skipped: number;
    failed: number;
    cost_usd: number;
  } | null>(null);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const { week_start, week_end } = getWeekDates();

  const intlLocale = getIntlLocale(locale);
  const startFmt = new Date(week_start).toLocaleDateString(intlLocale, { month: 'short', day: 'numeric' });
  const endFmt = new Date(week_end).toLocaleDateString(intlLocale, { month: 'short', day: 'numeric' });

  const handleGenerate = useCallback(async (forceRegenerate = false) => {
    if (generating) return;
    setGenerating(true);
    setError('');
    setResult(null);
    setChildrenDone(0);
    setChildrenTotal(0);
    setProgress(t('weeklyWrap.preparing'));

    try {
      const res = await fetch('/api/montree/reports/weekly-wrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classroom_id: classroomId,
          week_start,
          week_end,
          locale,
          force_regenerate: forceRegenerate,
          stream: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!mountedRef.current) {
            reader.cancel();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              if (event.type === 'start') {
                setChildrenTotal(event.total);
                setProgress(t('weeklyWrap.generatingReports'));
              } else if (event.type === 'child_start') {
                const firstName = event.child_name?.split(' ')[0] || '';
                const label = t('weeklyWrap.processingChild');
                setProgress(`${label} ${firstName}... (${event.index}/${event.total})`);
              } else if (event.type === 'child_done') {
                setChildrenDone(d => d + 1);
              } else if (event.type === 'complete') {
                if (mountedRef.current) {
                  setResult({
                    generated: event.generated,
                    skipped: event.skipped,
                    failed: event.failed,
                    cost_usd: event.cost_usd,
                  });
                  setProgress('');
                }
              } else if (event.type === 'error') {
                throw new Error(event.error || 'Generation failed');
              }
            } catch (parseErr: any) {
              if (parseErr.message && parseErr.message !== 'Generation failed' && !parseErr.message.includes('JSON')) {
                throw parseErr;
              }
            }
          }
        }
      } else {
        const data = await res.json();
        if (mountedRef.current) {
          setResult({
            generated: data.generated,
            skipped: data.skipped,
            failed: data.failed,
            cost_usd: data.cost_usd,
          });
          setProgress('');
        }
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err?.message || 'Failed to generate reports');
        setProgress('');
      }
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generating, classroomId, week_start, week_end, locale, t]);

  const handleReview = () => {
    if (!result) return;
    router.push(
      `/montree/dashboard/weekly-wrap?week=${week_start}&week_end=${week_end}`
    );
  };

  const progressPct = childrenTotal > 0 ? Math.round((childrenDone / childrenTotal) * 100) : 0;

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.cardBorder}`,
      borderRadius: T.cardRadius,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 10,
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.30)',
          color: T.emerald,
          flexShrink: 0,
        }}>
          <Calendar size={16} strokeWidth={1.75} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 14,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.1,
          }}>
            {t('weeklyWrap.title')}
          </h3>
          <p style={{
            margin: '2px 0 0',
            fontSize: 11,
            color: T.textMuted,
          }}>
            {startFmt} – {endFmt} · {children.length} {t('weeklyWrap.childrenLabel')}
          </p>
        </div>
      </div>

      {/* Description */}
      <p style={{
        margin: 0,
        fontSize: 12,
        lineHeight: 1.55,
        color: T.textSecondary,
      }}>
        {t('weeklyWrap.description')}
      </p>

      {/* Generate */}
      {!result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating || children.length === 0}
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: 10,
              background: 'linear-gradient(180deg, #34d399, #10b981)',
              border: '1px solid rgba(52,211,153,0.55)',
              color: '#06281a',
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 700,
              cursor: (generating || children.length === 0) ? 'not-allowed' : 'pointer',
              opacity: (generating || children.length === 0) ? 0.55 : 1,
              boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
            }}
          >
            {generating ? (
              <>
                <Loader2 size={14} strokeWidth={2} style={{ animation: 'ww-spin 0.9s linear infinite' }} />
                {progress}
                <style>{`@keyframes ww-spin { to { transform: rotate(360deg); } }`}</style>
              </>
            ) : (
              <>{t('weeklyWrap.generateButton')}</>
            )}
          </button>

          {generating && childrenTotal > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                width: '100%',
                height: 5,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #34d399, #10b981)',
                  borderRadius: 999,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p style={{
                margin: 0,
                fontSize: 10,
                color: T.textMuted,
                textAlign: 'center',
              }}>
                {childrenDone}/{childrenTotal} {t('weeklyWrap.done')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 10,
          background: T.redSoft,
          border: `1px solid ${T.redBorder}`,
          color: T.red,
          fontFamily: T.sans,
          fontSize: 11,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={12} strokeWidth={1.75} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => { setError(''); handleGenerate(false); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.red,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 11,
            flexWrap: 'wrap',
          }}>
            {result.generated > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: T.emerald,
                fontWeight: 600,
              }}>
                <Check size={11} strokeWidth={2.5} />
                {result.generated} generated
              </span>
            )}
            {result.skipped > 0 && (
              <span style={{ color: T.textMuted }}>
                · {result.skipped} skipped
              </span>
            )}
            {result.failed > 0 && (
              <span style={{ color: T.red, fontWeight: 600 }}>
                · {result.failed} failed
              </span>
            )}
            {result.cost_usd > 0 && (
              <span style={{ color: T.textMuted, marginLeft: 'auto' }}>
                ${result.cost_usd.toFixed(3)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleReview}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'linear-gradient(180deg, #34d399, #10b981)',
                border: '1px solid rgba(52,211,153,0.55)',
                color: '#06281a',
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {t('weeklyWrap.reviewButton')}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
            <button
              onClick={() => { setResult(null); handleGenerate(true); }}
              title={t('weeklyWrap.regenerateTitle')}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: T.textSecondary,
                fontFamily: T.sans,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCw size={14} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
