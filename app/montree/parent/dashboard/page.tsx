'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { LogOut, ChevronDown, Sparkles } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  violetSoft: 'rgba(139,92,246,0.18)',
  violetBorder: 'rgba(139,92,246,0.40)',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

// --- Types ---

interface Child {
  id: string;
  name: string;
  nickname: string | null;
  date_of_birth?: string | null;
  photo_url?: string | null;
}

interface WeeklyReport {
  id: string;
  week_number: number | null;
  report_year: number | null;
  week_start: string | null;
  week_end: string | null;
  parent_summary: string | null;
  created_at: string;
}

interface WorkItem {
  work_name: string;
  chineseName?: string | null;
  area: string;
  status: string;
  completed_at: string;
  photo_url: string | null;
  photo_caption: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
}

interface AreaGroup {
  area_key: string;
  area_name: string;
  works: WorkItem[];
}

interface FullReport {
  id: string;
  week_number: number | null;
  report_year: number | null;
  week_start: string | null;
  week_end: string | null;
  parent_summary: string | null;
  highlights: string[] | null;
  areas_of_growth: string[] | null;
  recommendations: string[] | null;
  closing: string | null;
  areas_explored: AreaGroup[] | null;
  narrative: { summary?: string; generated_at?: string; model?: string } | null;
  created_at: string;
  child: { name: string; nickname: string | null };
  works_completed: WorkItem[];
  all_photos?: { id: string; url: string; caption: string | null; work_name: string | null; captured_at: string }[];
}

// --- Area Config ---

const AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string }> = {
  practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899' },
  sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6' },
  mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
  math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6' },
  language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b' },
  cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e' },
};

function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [latestReport, setLatestReport] = useState<FullReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [pastReportsOpen, setPastReportsOpen] = useState(false);

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // --- Auth & Init ---
  // 🚨 Session 113 V2 Parent audit F-1.3 — auth check is now cookie-based,
  // not localStorage-based. The httpOnly cookie is the only authority on
  // whether the parent is logged in. localStorage was forgeable (a user
  // could write arbitrary JSON via DevTools) AND went out of sync with
  // the cookie (server can revoke independently).
  //
  // Flow: call /parent/auth/access-code GET → if not authenticated, bounce
  // to /montree/parent. Otherwise, call /parent/children to get the
  // authorized child list (server uses resolveAuthorizedParent which
  // re-checks parent_children linkage on every request).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch('/api/montree/parent/auth/access-code', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!sessionRes.ok) {
          router.push('/montree/parent');
          return;
        }
        const sessionData = await sessionRes.json();
        if (!sessionData?.authenticated) {
          // Stale localStorage cleanup (non-load-bearing — pure hygiene).
          try {
            localStorage.removeItem('montree_parent_session');
            localStorage.removeItem('montree_selected_child');
          } catch {}
          router.push('/montree/parent');
          return;
        }

        // Get the full authorized child list from server. Single-child
        // invite sessions return one element; multi-child full-account
        // parents return all linked children.
        const childrenRes = await fetch('/api/montree/parent/children', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!childrenRes.ok) {
          if (childrenRes.status === 401) {
            router.push('/montree/parent');
            return;
          }
          toast.error(t('parent.dashboard.failedToLoadChildren'));
          setLoading(false);
          return;
        }
        const childrenData = await childrenRes.json();
        const list = (childrenData.children as Child[]) || [];

        if (cancelled) return;
        if (list.length === 0) {
          router.push('/montree/parent');
          return;
        }

        setChildren(list);
        // Default-select the JWT's childId if present in the list,
        // otherwise the first child.
        const sessionChildId: string | undefined = sessionData.child_id;
        const initial =
          (sessionChildId && list.find((c) => c.id === sessionChildId)) ||
          list[0];
        setSelectedChild(initial);
        // Local hint for cross-page selection persistence (non-auth).
        try {
          localStorage.setItem(
            'montree_selected_child',
            JSON.stringify({ id: initial.id, name: initial.nickname || initial.name })
          );
        } catch {}
        loadReports(initial.id);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Parent dashboard auth check failed:', err);
        router.push('/montree/parent');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, t]);

  // --- Data Loading ---
  // (Session 113 V2 F-1.3: legacy loadChildren() removed — the auth-and-init
  // effect above now calls /parent/children directly via the cookie-based
  // resolver. Its only consumer was the JWT.parentId branch, which no
  // longer exists.)

  const loadReports = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/reports?childId=${childId}&locale=${locale}`);
      if (!res.ok) { toast.error(t('parent.dashboard.failedToLoadReports')); return; }
      const data = await res.json();
      if (data.reports && data.reports.length > 0) {
        setReports(data.reports);
        // Auto-load the latest report
        loadFullReport(data.reports[0].id);
      } else {
        setReports([]);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error(t('parent.dashboard.failedToLoadReports'));
    }
  };

  const loadFullReport = useCallback(async (reportId: string) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}?locale=${locale}`);
      const data = await res.json();
      if (res.ok && data.report) {
        if (!data.report.child) data.report.child = { name: 'Child', nickname: null };
        setLatestReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load full report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [locale]);

  const handleSelectChild = (child: Child) => {
    setSelectedChild(child);
    setLatestReport(null);
    setPastReportsOpen(false);
    localStorage.setItem('montree_selected_child', JSON.stringify({ id: child.id, name: child.nickname || child.name }));
    loadReports(child.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_parent_session');
    localStorage.removeItem('montree_selected_child');
    router.push('/montree/parent');
  };

  // --- Report Data ---
  const allWorks: WorkItem[] = useMemo(() => {
    if (!latestReport) return [];
    if (latestReport.areas_explored && latestReport.areas_explored.length > 0) {
      return latestReport.areas_explored.flatMap(ag => ag.works);
    }
    return latestReport.works_completed || [];
  }, [latestReport]);

  const photoWorks = useMemo(() => allWorks.filter(w => w.photo_url), [allWorks]);

  const masteredCount = allWorks.filter(w => w.status === 'mastered' || w.status === 'completed').length;
  const practicingCount = allWorks.filter(w => w.status === 'practicing').length;
  const presentedCount = allWorks.filter(w => w.status === 'presented').length;

  const lightboxPhotos = useMemo(() => {
    return photoWorks.map(w => ({ url: w.photo_url!, caption: w.photo_caption || undefined, date: w.completed_at }));
  }, [photoWorks]);

  // Past reports = all except the first (latest)
  const pastReports = reports.slice(1);

  // --- Helpers ---
  const childName = selectedChild?.nickname || selectedChild?.name || '';
  const firstName = childName.split(' ')[0];

  const getAreaConfig = (area: string) => AREA_CONFIG[normalizeArea(area)] || AREA_CONFIG['cultural'];
  const getAreaLabel = (area: string) => {
    const conf = getAreaConfig(area);
    const labels: Record<string, string> = { en: conf.label, zh: conf.labelZh };
    return labels[locale || 'en'] || conf.label;
  };

  const STATUS_LABELS: Record<string, Record<string, string>> = {
    mastered: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    completed: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    practicing: { en: 'Practicing', zh: '练习中', es: 'Practicando' },
    presented: { en: 'Introduced', zh: '已展示', es: 'Presentado' },
    default: { en: 'Documented', zh: '已记录', es: 'Documentado' },
  };
  // Dark-forest-correct status colors. Real CSS values (not Tailwind classes)
  // so they work inside inline `style={{ color: ... }}` props.
  const STATUS_META: Record<string, { icon: string; color: string; bg: string }> = {
    mastered: { icon: '⭐', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    completed: { icon: '⭐', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
    practicing: { icon: '🔄', color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' },
    presented: { icon: '🌱', color: '#fcd34d', bg: 'rgba(245,158,11,0.12)' },
    default: { icon: '📸', color: '#c4b5fd', bg: 'rgba(139,92,246,0.12)' },
  };
  const getStatusInfo = (status: string) => {
    const key = STATUS_LABELS[status] ? status : 'default';
    const label = STATUS_LABELS[key][locale || 'en'] || STATUS_LABELS[key]['en'];
    const meta = STATUS_META[key] || STATUS_META['default'];
    return { label, ...meta };
  };

  const formatWeekRange = (report: WeeklyReport | FullReport) => {
    const dateLocale = getIntlLocale(locale);
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return t('parentDashboard.weekLabel', { week: report.week_number, year: report.report_year });
    }
    const created = new Date(report.created_at);
    return created.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
  };

  const formatWeekShort = (report: WeeklyReport) => {
    const dateLocale = getIntlLocale(locale);
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return t('parentDashboard.weekOnly', { week: report.week_number });
    }
    return new Date(report.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
        color: T.textSecondary,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: T.emeraldSoft,
            animation: 'cg-pulse 1.6s ease-in-out infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: T.textMuted }}>{t('common.loading')}</p>
        </div>
        <style>{`
          @keyframes cg-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <Toaster position="top-center" />

      {/* ═══ Sticky Header ═══ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: T.card,
        backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 512,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color={T.emerald} strokeWidth={1.75} />
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.textPrimary }}>
              Montree
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LanguageToggle />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                // Padding gives a 40+px touch target on mobile without adding
                // visual weight. fontSize stays at 13 because the visible
                // affordance is small by design (parent isn't here to log out).
                padding: '10px 8px',
                fontSize: 13,
                fontWeight: 500,
                color: T.textMuted,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 140ms ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = T.textSecondary}
              onMouseLeave={(e) => e.currentTarget.style.color = T.textMuted}
            >
              {t('parent.dashboard.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 512, margin: '0 auto' }}>

        {/* ═══ Multi-child Selector ═══ */}
        {children.length > 1 && (
          <div style={{ padding: '20px 20px 8px' }}>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => handleSelectChild(child)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    borderRadius: 24,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 140ms ease',
                    background: selectedChild?.id === child.id ? T.emerald : T.card,
                    color: selectedChild?.id === child.id ? '#0a1a0f' : T.textPrimary,
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 8,
                    background: selectedChild?.id === child.id ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.10)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'inherit',
                  }}>
                    {child.name.charAt(0)}
                  </div>
                  {child.nickname || child.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedChild ? (
          <>
            {/* ═══ Child Hero ═══ */}
            <div style={{ padding: '32px 20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: T.textPrimary,
                  fontSize: 32,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: `0 20px 48px rgba(52,211,153,0.25)`,
                }}>
                  {selectedChild.photo_url ? (
                    // 🚨 Perf Tier 5.1 — child portrait. Parent dashboard
                    // hero photo, the single biggest visible image on the
                    // parent's home. Loading="eager" because it's above the
                    // fold; explicit aspectRatio prevents CLS while it loads.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedChild.photo_url}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', aspectRatio: '1 / 1' }}
                      loading="eager"
                      decoding="async"
                      alt=""
                    />
                  ) : (
                    firstName.charAt(0)
                  )}
                </div>
                <div>
                  <h1 style={{
                    margin: 0,
                    fontSize: 32,
                    fontWeight: 700,
                    fontFamily: T.serif,
                    color: T.textPrimary,
                    letterSpacing: -0.4,
                    lineHeight: 1.1,
                  }}>
                    {firstName}
                  </h1>
                  {latestReport && (
                    <p style={{ fontSize: 13, color: T.textMuted, marginTop: 8 }}>
                      {formatWeekRange(latestReport)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Latest Report Inline ═══ */}
            {loadingReport ? (
              <div style={{ padding: '48px 20px' }}>
                <div style={{ animation: 'cg-pulse 1.6s ease-in-out infinite', space: '16px' }}>
                  <div style={{ height: 16, background: T.card, borderRadius: 8, marginBottom: 12, width: '75%' }} />
                  <div style={{ height: 16, background: T.card, borderRadius: 8, marginBottom: 12, width: '85%' }} />
                  <div style={{ height: 16, background: T.card, borderRadius: 8, marginBottom: 24, width: '65%' }} />
                  <div style={{ height: 192, background: T.card, borderRadius: 12 }} />
                </div>
              </div>
            ) : latestReport ? (
              <>
                {/* Quick stats pills */}
                {allWorks.length > 0 && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {masteredCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: T.emeraldSoft,
                          color: T.emerald,
                          padding: '8px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid rgba(52,211,153,0.20)',
                        }}>
                          ⭐ {masteredCount} {t('parentDashboard.mastered')}
                        </span>
                      )}
                      {practicingCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(96,165,250,0.12)',
                          color: '#60a5fa',
                          padding: '8px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid rgba(96,165,250,0.20)',
                        }}>
                          🔄 {practicingCount} {t('parentDashboard.practicing')}
                        </span>
                      )}
                      {presentedCount > 0 && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          background: T.amberSoft,
                          color: T.amber,
                          padding: '8px 12px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid rgba(245,158,11,0.20)',
                        }}>
                          🌱 {presentedCount} {t('parentDashboard.new')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Narrative */}
                {(latestReport.narrative?.summary || latestReport.parent_summary) && (
                  <div style={{ padding: '0 20px 24px' }}>
                    <div style={{
                      borderLeft: `4px solid ${T.emerald}`,
                      background: T.emeraldSoft,
                      borderRadius: `0 ${T.cardRadius}px ${T.cardRadius}px 0`,
                      padding: '20px 20px',
                    }}>
                      <p style={{
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: T.textPrimary,
                        margin: 0,
                      }}>
                        {latestReport.narrative?.summary || latestReport.parent_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Photo divider */}
                {photoWorks.length > 0 && (
                  <div style={{ padding: '0 20px 12px' }}>
                    <p style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      color: T.textMuted,
                      margin: 0,
                    }}>
                      {t('parentDashboard.thisWeekMoments', { count: photoWorks.length })}
                    </p>
                  </div>
                )}

                {/* Photo cards */}
                <div>
                  {photoWorks.map((work, index) => {
                    const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
                    const areaConf = getAreaConfig(work.area);

                    return (
                      <div key={`${work.work_name}-${index}`} style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <button
                          onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                          style={{
                            width: '100%',
                            display: 'block',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <img
                            src={work.photo_url!}
                            alt={displayName}
                            style={{
                              width: '100%',
                              aspectRatio: '4/3',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                            loading={index < 3 ? 'eager' : 'lazy'}
                          />
                        </button>
                        <div style={{ padding: '16px 20px', space: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: T.textPrimary,
                              fontSize: 13,
                              fontWeight: 700,
                              flexShrink: 0,
                              marginTop: 4,
                              backgroundColor: areaConf.color,
                            }}>
                              {areaConf.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <h3 style={{
                                fontSize: 18,
                                fontWeight: 700,
                                fontFamily: T.serif,
                                color: T.textPrimary,
                                margin: 0,
                                lineHeight: 1.2,
                              }}>
                                {displayName}
                              </h3>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                <span style={{ fontSize: 12, color: T.textMuted }}>{getAreaLabel(work.area)}</span>
                                <span style={{ color: T.textMuted, fontSize: 11 }}>·</span>
                                {/* Status color now varies per state (emerald for mastered,
                                    blue for practicing, gold for presented) instead of
                                    always amber — gives the parent a quicker scan signal. */}
                                <span style={{ fontSize: 12, fontWeight: 600, color: getStatusInfo(work.status).color }}>
                                  {getStatusInfo(work.status).icon} {getStatusInfo(work.status).label}
                                </span>
                              </div>
                            </div>
                          </div>
                          {work.parent_description && (
                            <p style={{
                              fontSize: 15,
                              lineHeight: 1.6,
                              color: T.textPrimary,
                              margin: 0,
                            }}>
                              {work.parent_description}
                            </p>
                          )}
                          {work.why_it_matters && (
                            <div style={{
                              background: T.card,
                              borderRadius: 12,
                              padding: '12px 16px',
                              borderLeft: `3px solid ${T.emerald}`,
                            }}>
                              <p style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: T.textMuted,
                                margin: '0 0 6px 0',
                                textTransform: 'uppercase',
                                letterSpacing: 0.3,
                              }}>
                                {t('parentDashboard.whyItMatters')}
                              </p>
                              <p style={{
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: T.textSecondary,
                                margin: 0,
                              }}>
                                {work.why_it_matters}
                              </p>
                            </div>
                          )}
                          {work.photo_caption && (
                            <div style={{
                              background: 'rgba(96,165,250,0.10)',
                              borderRadius: 12,
                              padding: '12px 16px',
                              borderLeft: '3px solid rgba(96,165,250,0.50)',
                            }}>
                              <p style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#60a5fa',
                                margin: '0 0 6px 0',
                                textTransform: 'uppercase',
                                letterSpacing: 0.3,
                              }}>
                                {t('parentDashboard.teachersNote')}
                              </p>
                              <p style={{
                                fontSize: 13,
                                lineHeight: 1.5,
                                color: 'rgba(96,165,250,0.85)',
                                margin: 0,
                              }}>
                                {work.photo_caption}
                              </p>
                            </div>
                          )}
                          {!work.parent_description && !work.why_it_matters && !work.photo_caption && (
                            <p style={{
                              fontSize: 13,
                              color: T.textMuted,
                              margin: 0,
                            }}>
                              {t('parentDashboard.exploredActivity', { name: firstName, area: getAreaLabel(work.area).toLowerCase() })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Extra photos */}
                {latestReport.all_photos && latestReport.all_photos.length > 0 && (() => {
                  const usedUrls = new Set(photoWorks.map(w => w.photo_url));
                  const extraPhotos = latestReport.all_photos!.filter(p => !usedUrls.has(p.url));
                  if (extraPhotos.length === 0) return null;
                  return (
                    <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: T.textMuted,
                        margin: '0 0 12px 0',
                      }}>
                        {t('parentDashboard.moreMoments')}
                      </p>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 8,
                      }}>
                        {extraPhotos.map((photo, i) => (
                          <button
                            key={photo.id || i}
                            onClick={() => { setLightboxIndex(photoWorks.length + i); setLightboxOpen(true); }}
                            style={{
                              aspectRatio: '1',
                              borderRadius: 12,
                              overflow: 'hidden',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption || 'Activity'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Try this at home */}
                {latestReport.recommendations && latestReport.recommendations.length > 0 && (
                  <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: T.textPrimary,
                      margin: '0 0 12px 0',
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}>
                      {t('parentDashboard.tryThisAtHome')}
                    </h2>
                    <div>
                      {latestReport.recommendations.map((item, i) => (
                        <p
                          key={i}
                          style={{
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: T.textSecondary,
                            paddingLeft: 16,
                            position: 'relative',
                            marginBottom: i < latestReport.recommendations!.length - 1 ? 8 : 0,
                          }}
                        >
                          <span style={{ position: 'absolute', left: 0, color: T.emerald }}>•</span>
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Closing */}
                {latestReport.closing && (
                  <div style={{
                    padding: '24px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    textAlign: 'center',
                  }}>
                    <p style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: T.textSecondary,
                      margin: 0,
                    }}>
                      {latestReport.closing}
                    </p>
                  </div>
                )}

                {/* No activities */}
                {allWorks.length === 0 && !latestReport.narrative?.summary && !latestReport.parent_summary && (
                  <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 32, marginBottom: 12 }}>📋</p>
                    <p style={{ color: T.textMuted, fontSize: 14 }}>
                      {t('parentDashboard.noActivitiesThisWeek')}
                    </p>
                  </div>
                )}
              </>
            ) : reports.length === 0 ? (
              /* No reports at all */
              <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: T.emeraldSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <span style={{ fontSize: 24 }}>🌱</span>
                </div>
                <p style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.textSecondary,
                  margin: '0 0 8px 0',
                }}>
                  {t('parentDashboard.firstReportOnWay')}
                </p>
                <p style={{
                  fontSize: 13,
                  color: T.textMuted,
                  margin: 0,
                }}>
                  {t('parentDashboard.checkBackSoon')}
                </p>
              </div>
            ) : null}

            {/* ═══ Past Reports — Collapsed ═══ */}
            {pastReports.length > 0 && (
              <div style={{ padding: '24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={() => setPastReportsOpen(!pastReportsOpen)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.textMuted,
                    transition: 'color 140ms ease',
                  }}>
                    {t('parentDashboard.pastReports', { count: pastReports.length })}
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.75}
                    style={{
                      color: T.textMuted,
                      transition: 'transform 140ms ease',
                      transform: pastReportsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>
                {pastReportsOpen && (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastReports.map(report => (
                      <Link
                        key={report.id}
                        href={`/montree/parent/report/${report.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 12,
                          background: T.card,
                          border: T.cardBorder,
                          textDecoration: 'none',
                          transition: 'all 140ms ease',
                          cursor: 'pointer',
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
                        <div>
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: T.textPrimary,
                            transition: 'color 140ms ease',
                          }}>
                            {formatWeekShort(report)}
                          </span>
                          {report.parent_summary && (
                            <p style={{
                              fontSize: 11,
                              color: T.textMuted,
                              marginTop: 4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {report.parent_summary}
                            </p>
                          )}
                        </div>
                        <span style={{
                          color: T.textMuted,
                          transition: 'color 140ms ease',
                        }}>
                          →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ Footer ═══ */}
            <div style={{
              textAlign: 'center',
              fontSize: 12,
              color: T.textMuted,
              padding: '32px 20px',
            }}>
              Montree
            </div>
          </>
        ) : (
          /* No Child Selected (multi-child only) */
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: T.card,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              border: T.cardBorder,
            }}>
              <span style={{ fontSize: 24 }}>👆</span>
            </div>
            <p style={{ color: T.textSecondary, fontSize: 14, margin: 0 }}>
              {t('parent.dashboard.selectChild')}
            </p>
          </div>
        )}
      </main>

      {/* ═══ Photo Lightbox ═══ */}
      {latestReport && (() => {
        const extraPhotos = (latestReport.all_photos || [])
          .filter(p => !new Set(photoWorks.map(w => w.photo_url)).has(p.url));
        const allLightboxPhotos = [
          ...lightboxPhotos,
          ...extraPhotos.map(p => ({ url: p.url, caption: p.caption || undefined, date: p.captured_at })),
        ];
        const safeIndex = Math.min(lightboxIndex, Math.max(allLightboxPhotos.length - 1, 0));
        const currentPhoto = allLightboxPhotos[safeIndex];
        return (
          <PhotoLightbox
            isOpen={lightboxOpen && allLightboxPhotos.length > 0}
            onClose={() => setLightboxOpen(false)}
            src={currentPhoto?.url || ''}
            alt={currentPhoto?.caption || 'Activity photo'}
            photos={allLightboxPhotos}
            currentIndex={safeIndex}
            onNavigate={(idx) => setLightboxIndex(idx)}
          />
        );
      })()}

      <style>{`
        @keyframes cg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
