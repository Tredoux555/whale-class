// /montree/parent/weekly-review/page.tsx
// Parent-friendly weekly report view
// Shows warm, supportive AI-generated summary for parents
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, Camera, Sparkles } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

// Dark forest tokens
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


interface Child {
  id: string;
  name: string;
  photo_url?: string;
  classroom_name?: string;
}

interface WeeklyAnalysis {
  id: string;
  week_start: string;
  week_end: string;
  parent_summary: string;
  area_distribution: Record<string, number>;
  concentration_score: number;
  recommended_works: Array<{
    work_name: string;
    chineseName?: string | null;
    area: string;
    reason: string;
    home_activity?: string;
  }>;
  active_sensitive_periods: string[];
  created_at: string;
}

interface HomeActivity {
  title: string;
  description: string;
  materials?: string;
  area: string;
  icon: string;
}

export default function ParentWeeklyReviewPage() {
  return (
    <Suspense fallback={<LoadingScreenWrapper />}>
      <ParentWeeklyReviewContent />
    </Suspense>
  );
}

function LoadingScreenWrapper() {
  const { t } = useI18n();
  return <LoadingScreen t={t} />;
}

function LoadingScreen({ t }: { t: (key: string) => string }) {
  return (
    <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "4rem", height: "4rem", background: `linear-gradient(to bottom right, #34d399, #10b981)`, borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(52,211,153,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "auto", marginRight: "auto", marginBottom: "1rem", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>
          <span style={{ fontSize: "1.875rem" }}>📊</span>
        </div>
        <p style={{ color: T.textSecondary }}>{t('parentWeeklyReview.loadingReport')}</p>
      </div>
    </div>
  );
}

function ParentWeeklyReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const [child, setChild] = useState<Child | null>(null);
  const [analysis, setAnalysis] = useState<WeeklyAnalysis | null>(null);
  const [homeActivities, setHomeActivities] = useState<HomeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Week navigation
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const weekParam = searchParams.get('week');
      const testChild = searchParams.get('test');

      // Build URL
      let url = '/api/montree/parent/weekly-review';
      const params = new URLSearchParams();
      if (weekParam) params.set('week', weekParam);
      if (testChild) params.set('test', testChild);
      params.set('locale', locale);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        setError('Failed to load report');
        return;
      }
      const data = await res.json();

      if (!data.success) {
        if (data.error === 'Not authenticated') {
          router.push('/montree/parent');
          return;
        }
        setError(data.error || 'Failed to load report');
        return;
      }

      setChild(data.child);
      setAnalysis(data.analysis);
      setHomeActivities(data.homeActivities || []);
      setAvailableWeeks(data.availableWeeks || []);
      setSelectedWeek(data.analysis?.week_start || '');
    } catch (err) {
      console.error('Failed to fetch report:', err);
      setError(t('parentWeeklyReview.errorNetwork'));
    } finally {
      setLoading(false);
    }
  };

  const navigateToWeek = (week: string) => {
    const testChild = searchParams.get('test');
    const params = new URLSearchParams();
    params.set('week', week);
    if (testChild) params.set('test', testChild);
    router.push(`/montree/parent/weekly-review?${params.toString()}`);
  };

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateLocale = getIntlLocale(locale);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString(dateLocale, options)} - ${endDate.toLocaleDateString(dateLocale, options)}`;
  };

  const getAreaIcon = (area: string): string => {
    const icons: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      math: '🔢',
      language: '📚',
      cultural: '🌍',
    };
    return icons[area?.toLowerCase()] || '📋';
  };

  const getAreaName = (area: string): string => {
    const key = area?.toLowerCase();
    const normalized = key === 'math' ? 'mathematics' : key;
    return t(`area.${normalized}` as any) || area || 'Other';
  };

  const getSensitivePeriodInfo = (period: string): { name: string; icon: string; description: string } => {
    const icons: Record<string, string> = {
      order: '📦', language: '💬', movement: '🏃', sensory: '🎨',
      small_objects: '🔍', social: '👫', writing: '✏️', reading: '📖', math: '🔢',
    };
    const nameKey = `sensitivePeriod.${period}.name` as any;
    const descKey = `sensitivePeriod.${period}.description` as any;
    const name = t(nameKey);
    // If translation returns the key itself, it's not found — use default
    const isFound = name !== nameKey;
    return {
      name: isFound ? name : t('sensitivePeriod.default.name' as any),
      icon: icons[period] || '⭐',
      description: isFound ? t(descKey) : t('sensitivePeriod.default.description' as any),
    };
  };

  if (loading) return <LoadingScreen t={t} />;

  if (error) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <div style={{ fontSize: "3.75rem", marginBottom: "1rem" }}>😕</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: T.textPrimary, marginBottom: "0.5rem" }}>{t('parentWeeklyReview.errorTitle')}</h2>
          <p style={{ color: T.textSecondary, marginBottom: "1rem" }}>{error}</p>
          <Link href="/montree/parent/dashboard" style={{ color: T.emerald, textDecoration: "underline" }}>
            ← {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  if (!child || !analysis) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <div style={{ fontSize: "3.75rem", marginBottom: "1rem" }}>📊</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: T.textPrimary, marginBottom: "0.5rem" }}>{t('parentWeeklyReview.noReportTitle')}</h2>
          <p style={{ color: T.textSecondary, marginBottom: "1rem" }}>
            {t('parentWeeklyReview.noReportDescription')}
          </p>
          <Link href="/montree/parent/dashboard" style={{ color: T.emerald, textDecoration: "underline" }}>
            ← {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed" }}>
      {/* Header */}
      <header style={{ background: T.card, backdropFilter: T.blur, position: "sticky", top: 0, zIndex: 10, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ maxWidth: "56rem", marginLeft: "auto", marginRight: "auto", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1rem", paddingBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link
              href="/montree/parent/dashboard"
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: T.textPrimary, textDecoration: "none", cursor: "pointer" }}
              aria-label="Montree home"
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "0.8"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.opacity = "1"; }}
            >
              <MontreeLogo size={26} />
              <span style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Montree</span>
            </Link>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: "1.125rem", fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.weeklyReport')}</h1>
              <p style={{ fontSize: "0.75rem", color: T.textMuted }}>{child.name}</p>
            </div>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "56rem", marginLeft: "auto", marginRight: "auto", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "1.5rem", paddingBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Week Selector */}
        {availableWeeks.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <button
              onClick={() => {
                const currentIndex = availableWeeks.indexOf(selectedWeek);
                if (currentIndex < availableWeeks.length - 1) {
                  navigateToWeek(availableWeeks[currentIndex + 1]);
                }
              }}
              disabled={availableWeeks.indexOf(selectedWeek) >= availableWeeks.length - 1}
              style={{ background: T.card, backdropFilter: T.blur, padding: "0.75rem 1rem", borderRadius: "12px", border: T.cardBorder, color: T.textSecondary, cursor: "pointer" }}
            >
              ◀
            </button>
            <div style={{ background: T.card, backdropFilter: T.blur, padding: "0.75rem 1.5rem", borderRadius: "12px", border: T.cardBorder }}>
              <span style={{ fontWeight: "500", color: T.textPrimary }}>
                {formatWeekRange(analysis.week_start, analysis.week_end)}
              </span>
            </div>
            <button
              onClick={() => {
                const currentIndex = availableWeeks.indexOf(selectedWeek);
                if (currentIndex > 0) {
                  navigateToWeek(availableWeeks[currentIndex - 1]);
                }
              }}
              disabled={availableWeeks.indexOf(selectedWeek) <= 0}
              style={{ background: T.card, backdropFilter: T.blur, padding: "0.75rem 1rem", borderRadius: "12px", border: T.cardBorder, color: T.textSecondary, cursor: "pointer" }}
            >
              ▶
            </button>
          </div>
        )}

        {/* Hero Card - Child Photo + Greeting */}
        <div style={{ background: `linear-gradient(to bottom right, ${T.emerald}, #10b981)`, borderRadius: "24px", padding: "1.5rem", color: T.textPrimary, boxShadow: "0 20px 25px -5px rgba(52,211,153,0.20)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ background: T.card, backdropFilter: T.blur, width: "80px", height: "80px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {child.photo_url ? (
                <img src={child.photo_url} alt={child.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
              ) : (
                <span style={{ fontSize: "2.25rem" }}>👧</span>
              )}
            </div>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700" }}>{t('parentWeeklyReview.childWeek' as any).replace('{childName}', child.name)}</h2>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>{child.classroom_name || t('parentWeeklyReview.myClassroom' as any)}</p>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: T.blur, padding: "1.25rem", borderRadius: "14px" }}>
            <p style={{ fontSize: "1.125rem", lineHeight: "1.5" }}>
              {analysis.parent_summary || t('parentWeeklyReview.defaultSummary' as any).replace('{childName}', child.name)}
            </p>
          </div>
        </div>

        {/* Concentration Score */}
        {analysis.concentration_score && (
          <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🎯</span>
              <h3 style={{ fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.focusTitle')}</h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ background: 'rgba(0,0,0,0.2)', height: "0.5rem", borderRadius: "9999px", flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: "9999px",
                    transitionDuration: "200ms",
                    background: analysis.concentration_score >= 80 ? T.emerald : analysis.concentration_score >= 60 ? '#eab308' : '#f97316',
                    width: `${analysis.concentration_score}%`,
                  }}
                />
              </div>
              <span style={{ fontWeight: "700", color: T.textPrimary, minWidth: "3rem", textAlign: "right" }}>
                {analysis.concentration_score}%
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: T.textSecondary, marginTop: "0.5rem" }}>
              {analysis.concentration_score >= 80
                ? t('parentWeeklyReview.focusExcellent')
                : analysis.concentration_score >= 60
                ? t('parentWeeklyReview.focusGood')
                : t('parentWeeklyReview.focusBuilding')}
            </p>
          </div>
        )}

        {/* Active Sensitive Periods */}
        {analysis.active_sensitive_periods && analysis.active_sensitive_periods.length > 0 && (
          <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>✨</span>
              <div>
                <h3 style={{ fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.sensitivePeriodTitle')}</h3>
                <p style={{ fontSize: "0.875rem", color: T.textSecondary }}>{t('parentWeeklyReview.sensitivePeriodSubtitle')}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {analysis.active_sensitive_periods.map((period) => {
                const info = getSensitivePeriodInfo(period);
                return (
                  <div key={period} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem", background: 'rgba(245,158,11,0.10)', borderRadius: "14px", border: `1px solid rgba(245,158,11,0.15)` }}>
                    <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{info.icon}</span>
                    <div>
                      <p style={{ fontWeight: "500", color: T.textPrimary }}>{info.name}</p>
                      <p style={{ fontSize: "0.875rem", color: T.textSecondary }}>{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Area Balance */}
        {analysis.area_distribution && Object.keys(analysis.area_distribution).length > 0 && (
          <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>📊</span>
              <h3 style={{ fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.learningAreasTitle')}</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {Object.entries(analysis.area_distribution)
                .sort(([,a], [,b]) => b - a)
                .map(([area, count]) => (
                <div key={area} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.25rem", width: "2rem" }}>{getAreaIcon(area)}</span>
                  <span style={{ flex: 1, color: T.textSecondary }}>{getAreaName(area)}</span>
                  <span style={{ fontSize: "0.875rem", fontWeight: "500", color: T.textMuted }}>
                    {count} {count === 1 ? t('parentWeeklyReview.work') : t('parentWeeklyReview.works')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Home Activities */}
        {homeActivities.length > 0 && (
          <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🏠</span>
              <div>
                <h3 style={{ fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.homeActivitiesTitle')}</h3>
                <p style={{ fontSize: "0.875rem", color: T.textSecondary }}>{t('parentWeeklyReview.homeActivitiesSubtitle')}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {homeActivities.map((activity, idx) => (
                <div key={idx} style={{ padding: "1rem", background: 'rgba(59,130,246,0.10)', borderRadius: "14px", border: `1px solid rgba(59,130,246,0.15)` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{activity.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontWeight: "600", color: T.textPrimary }}>{activity.title}</h4>
                      <p style={{ fontSize: "0.875rem", color: T.textSecondary, marginTop: "0.25rem" }}>{activity.description}</p>
                      {activity.materials && (
                        <p style={{ fontSize: "0.75rem", color: '#3b82f6', marginTop: "0.5rem" }}>
                          <strong>{t('parentWeeklyReview.youllNeed')}:</strong> {activity.materials}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Works */}
        {analysis.recommended_works && analysis.recommended_works.length > 0 && (
          <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "14px", padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🎯</span>
              <div>
                <h3 style={{ fontWeight: "700", color: T.textPrimary }}>{t('parentWeeklyReview.comingUpNextTitle')}</h3>
                <p style={{ fontSize: "0.875rem", color: T.textSecondary }}>{t('parentWeeklyReview.comingUpNextSubtitle').replace('{childName}', child.name)}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {analysis.recommended_works.slice(0, 3).map((rec, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem", background: 'rgba(147,51,234,0.10)', borderRadius: "14px", border: `1px solid rgba(147,51,234,0.15)` }}>
                  <span style={{ fontSize: "1.25rem" }}>{getAreaIcon(rec.area)}</span>
                  <div>
                    <p style={{ fontWeight: "500", color: T.textPrimary }}>{locale === 'zh' && rec.chineseName ? rec.chineseName : rec.work_name}</p>
                    <p style={{ fontSize: "0.875rem", color: T.textSecondary }}>{rec.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "1rem", paddingBottom: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: T.textMuted }}>
            {t('parentWeeklyReview.reportGenerated')} {new Date(analysis.created_at).toLocaleDateString(getIntlLocale(locale), {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
          <Link
            href="/montree/parent/dashboard"
            style={{ display: "inline-block", marginTop: "0.75rem", color: T.emerald, textDecoration: "underline", cursor: "pointer" }}
          >
            ← {t('common.backToDashboard')}
          </Link>
        </div>

      </main>
    </div>
  );
}
