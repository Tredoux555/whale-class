// app/montree/parent/reports/page.tsx
// Full parent-facing report history for the selected child. Dark register,
// paginated (20/page) via /api/montree/parent/reports?offset&limit. Reads
// ?childId= from the dashboard link; falls back to the first authorized
// child if the param is missing.
'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

// Dark forest tokens (copied verbatim from the parent report page)
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const PAGE_SIZE = 20;

interface HistoryReport {
  id: string;
  created_at: string;
  week_start: string | null;
  week_end: string | null;
  week_number: number | null;
  report_year: number | null;
  parent_summary: string | null;
  sent_at: string | null;
}

interface Child {
  id: string;
  name: string;
  nickname: string | null;
}

function ReportsHistory() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const childIdParam = searchParams.get('childId');

  const [childId, setChildId] = useState<string | null>(childIdParam);
  const [childName, setChildName] = useState<string>('');
  const [reports, setReports] = useState<HistoryReport[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (cid: string, offset: number): Promise<{ reports: HistoryReport[]; has_more: boolean } | null> => {
      const res = await fetch(
        `/api/montree/parent/reports?childId=${encodeURIComponent(cid)}&offset=${offset}&limit=${PAGE_SIZE}&locale=${locale}`,
        { credentials: 'include' }
      );
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.reports)) return null;
      return { reports: data.reports as HistoryReport[], has_more: !!data.has_more };
    },
    [locale]
  );

  // Resolve child (from ?childId or the first authorized child) + load page 1.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let cid = childIdParam;
        // Fetch the roster to resolve the child's name (and cid when missing).
        const cRes = await fetch('/api/montree/parent/children', { credentials: 'include' });
        if (cRes.ok) {
          const cData = await cRes.json().catch(() => null);
          const list: Child[] = Array.isArray(cData?.children) ? cData.children : [];
          if (!cid && list.length > 0) cid = list[0].id;
          const match = list.find((c) => c.id === cid);
          if (match && alive) setChildName(match.nickname || match.name || '');
        }

        if (!cid) {
          if (alive) { setError(t('parent.dashboard.failedToLoadReports')); setLoading(false); }
          return;
        }
        if (alive) setChildId(cid);
        const first = await fetchPage(cid, 0);
        if (!alive) return;
        if (!first) {
          setError(t('parent.dashboard.failedToLoadReports'));
        } else {
          setReports(first.reports);
          setHasMore(first.has_more);
        }
      } catch {
        if (alive) setError(t('parent.dashboard.failedToLoadReports'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdParam, fetchPage]);

  const loadMore = async () => {
    if (!childId || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(childId, reports.length);
      if (next) {
        setReports((prev) => [...prev, ...next.reports]);
        setHasMore(next.has_more);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const dateLocale = getIntlLocale(locale);

  // Primary label: week range (mirrors the dashboard's formatWeekShort).
  const formatRange = (r: HistoryReport): string => {
    if (r.week_start) {
      const start = new Date(r.week_start);
      const end = r.week_end ? new Date(r.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (r.week_number && r.report_year) {
      return t('parentDashboard.weekLabel', { week: r.week_number, year: r.report_year });
    }
    return new Date(r.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  const weekLabel = (r: HistoryReport): string =>
    r.week_number && r.report_year
      ? t('parentDashboard.weekLabel', { week: r.week_number, year: r.report_year })
      : '';

  const sentLabel = (r: HistoryReport): string =>
    new Date(r.sent_at || r.created_at).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      {/* ═══ Sticky Header ═══ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: T.card,
        backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingTop: 'env(safe-area-inset-top)', // clear the iOS status bar
      }}>
        <div style={{
          maxWidth: 768,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <Link
            href="/montree/parent/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: T.emerald,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            {t('common.back')}
          </Link>
          <h1 style={{
            fontFamily: T.serif,
            fontSize: 17,
            fontWeight: 600,
            color: T.textPrimary,
            margin: 0,
            flex: 1,
            textAlign: 'center',
          }}>
            {t('parentReports.title')}
          </h1>
          <LanguageToggle />
        </div>
      </header>

      {/* ═══ Body ═══ */}
      <main style={{ maxWidth: 768, margin: '0 auto', padding: '20px' }}>
        {childName && (
          <p style={{
            fontSize: 14,
            color: T.textSecondary,
            margin: '0 0 16px 0',
            fontFamily: T.serif,
          }}>
            {childName}
          </p>
        )}

        {loading ? (
          <p style={{ fontSize: 14, color: T.textMuted, textAlign: 'center', padding: '48px 0' }}>
            {t('common.loading')}
          </p>
        ) : error ? (
          <p style={{ fontSize: 14, color: '#f87171', textAlign: 'center', padding: '48px 0' }}>
            {error}
          </p>
        ) : reports.length === 0 ? (
          <div style={{ padding: '64px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🌱</p>
            <p style={{ fontSize: 14, color: T.textMuted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto' }}>
              {t('parentReports.empty')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/montree/parent/report/${report.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '16px 18px',
                  borderRadius: 14,
                  background: T.card,
                  border: T.cardBorder,
                  textDecoration: 'none',
                  transition: 'all 140ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.emeraldSoft;
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.30)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.card;
                  e.currentTarget.style.borderColor = 'rgba(52,211,153,0.15)';
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary }}>
                    {formatRange(report)}
                  </span>
                  {weekLabel(report) && (
                    <p style={{ fontSize: 12, color: T.emerald, margin: '3px 0 0 0' }}>
                      {weekLabel(report)}
                    </p>
                  )}
                  <p style={{ fontSize: 12, color: T.textMuted, margin: '4px 0 0 0' }}>
                    {sentLabel(report)}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.75} style={{ color: T.textMuted, flexShrink: 0 }} />
              </Link>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  marginTop: 6,
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid rgba(52,211,153,0.30)',
                  color: T.emerald,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  cursor: loadingMore ? 'default' : 'pointer',
                  opacity: loadingMore ? 0.6 : 1,
                  transition: 'all 140ms ease',
                }}
              >
                {loadingMore ? t('common.loading') : t('parentReports.loadMore')}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ParentReportsPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: '100dvh',
          background: T.bg,
          backgroundImage: T.glow,
          fontFamily: T.sans,
        }} />
      }
    >
      <ReportsHistory />
    </Suspense>
  );
}
