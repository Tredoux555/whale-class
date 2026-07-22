// /montree/parent/report/[reportId]/page.tsx
// Parent Report — Mobile-first linear scroll with big photos
// Sonnet narrative intro → scrollable photo cards with descriptions
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Camera, Sparkles } from 'lucide-react';
import MontreeLogo from '@/components/montree/MonteeLogo';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';
import HomePracticeCard from '@/components/montree/parent/HomePracticeCard';
import { getVideoProxyUrl } from '@/lib/montree/media/proxy-url';

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


// Sanitize an AI narrative for parent display (handoff bug #5).
// The narrative is meant to be plain warm prose — the generator forbids
// markdown, but LLMs slip. This strips any stray markdown tokens and
// collapses consecutive duplicate paragraphs (a doubled-merge artifact).
function cleanNarrative(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold**
    .replace(/__(.+?)__/g, '$1')        // __bold__
    .replace(/(^|\s)[*_](\S.*?\S|\S)[*_](\s|$)/g, '$1$2$3') // *italic* / _italic_
    .replace(/`([^`]+)`/g, '$1')        // `code`
    .replace(/^#{1,6}\s+/gm, '')        // # headings
    .replace(/^\s*[-*+]\s+/gm, '')           // - bullet markers
    .replace(/^\s*(?:&gt;|>)\s?/gm, '');      // > blockquote
  // Collapse consecutive duplicate paragraphs (de-dup a doubled merge).
  const paras = s.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const deduped: string[] = [];
  for (const p of paras) {
    if (deduped[deduped.length - 1] !== p) deduped.push(p);
  }
  s = deduped.join('\n\n');
  return s.trim();
}

// --- Types ---

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

interface ReportData {
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
  narrative: {
    summary?: string;
    generated_at?: string;
    model?: string;
  } | null;
  english_progress: {
    current_lesson: number;
    current_phase: string;
    lesson_label: string;
    total_lessons: number;
    mastered_count: number;
  } | null;
  created_at: string;
  child: {
    name: string;
    nickname: string | null;
  };
  works_completed: WorkItem[];
  // Bucket-relative path to the rendered weekly montage MP4 (montree-media),
  // or null when no montage has been rendered for this report.
  montage_path?: string | null;
  all_photos?: {
    id: string;
    url: string;
    caption: string | null;
    work_name: string | null;
    captured_at: string;
  }[];
}

// --- Area Config ---

const AREA_CONFIG: Record<string, { emoji: string; label: string; labelZh: string; color: string; gradient: string }> = {
  practical_life: { emoji: '🧹', label: 'Daily Living', labelZh: '日常生活', color: '#ec4899', gradient: 'from-pink-500 to-rose-500' },
  sensorial: { emoji: '👁️', label: 'Senses & Discovery', labelZh: '感官探索', color: '#8b5cf6', gradient: 'from-purple-500 to-violet-500' },
  mathematics: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
  math: { emoji: '🔢', label: 'Numbers & Patterns', labelZh: '数学', color: '#3b82f6', gradient: 'from-blue-500 to-indigo-500' },
  language: { emoji: '📚', label: 'Language & Reading', labelZh: '语言', color: '#f59e0b', gradient: 'from-amber-500 to-orange-500' },
  cultural: { emoji: '🌍', label: 'World & Nature', labelZh: '文化', color: '#22c55e', gradient: 'from-green-500 to-emerald-500' },
};

const AREA_ORDER = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  return area;
}

// --- Component ---

export default function ParentReportPage() {
  const router = useRouter();
  const params = useParams();
  const { t, locale } = useI18n();
  const reportId = params.reportId as string;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState('');

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadReport = useCallback(async () => {
    if (!reportId) return;
    try {
      const res = await fetch(`/api/montree/parent/report/${reportId}?locale=${locale}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load report');
        return;
      }
      if (data.report && !data.report.child) {
        data.report.child = { name: 'Child', nickname: null };
      }
      setReport(data.report);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(t('common.connectionError') || 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [reportId, locale, t]);

  // 🚨 Session 113 V2 Parent audit F-1.3 — cookie-based auth gate.
  // localStorage was forgeable. The httpOnly cookie is the only authority.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch('/api/montree/parent/auth/access-code', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!sessionRes.ok) {
          router.push('/montree/parent/login');
          return;
        }
        const sessionData = await sessionRes.json();
        if (!sessionData?.authenticated) {
          router.push('/montree/parent/login');
          return;
        }
        loadReport();
      } catch (err) {
        if (cancelled) return;
        console.error('Parent report auth check failed:', err);
        router.push('/montree/parent/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, router, loadReport]);

  // Build linear work list (all works with photos first, then without)
  const allWorks: WorkItem[] = useMemo(() => {
    if (!report) return [];
    if (report.areas_explored && report.areas_explored.length > 0) {
      return report.areas_explored.flatMap(ag => ag.works);
    }
    return report.works_completed || [];
  }, [report]);

  // Works with photos (these are the "cards" parents scroll through)
  const photoWorks = useMemo(() => allWorks.filter(w => w.photo_url), [allWorks]);

  // Stats
  const masteredCount = allWorks.filter(w => w.status === 'mastered' || w.status === 'completed').length;
  const practicingCount = allWorks.filter(w => w.status === 'practicing').length;
  const presentedCount = allWorks.filter(w => w.status === 'presented').length;

  // Photos for lightbox
  const lightboxPhotos = useMemo(() => {
    return photoWorks.map(w => ({
      url: w.photo_url!,
      caption: w.photo_caption || undefined,
      date: w.completed_at,
    }));
  }, [photoWorks]);

  // Helpers
  const childName = report?.child?.nickname || report?.child?.name || '';
  const firstName = childName.split(' ')[0];

  const formatWeekDisplay = () => {
    if (!report) return '';
    const dateLocale = getIntlLocale(locale);
    if (report.week_start) {
      const start = new Date(report.week_start);
      const end = report.week_end ? new Date(report.week_end) : start;
      const fmt = (d: Date) => d.toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (report.week_number && report.report_year) {
      return t('parentReport.weekDisplay', { year: report.report_year, week: report.week_number });
    }
    return '';
  };

  const getAreaConfig = (area: string) =>
    AREA_CONFIG[normalizeArea(area)] || AREA_CONFIG['cultural'];

  const getAreaLabel = (area: string) => {
    const conf = getAreaConfig(area);
    const labels: Record<string, string> = { en: conf.label, zh: conf.labelZh };
    return labels[locale || 'en'] || conf.label;
  };

  // Status display
  const STATUS_LABELS: Record<string, Record<string, string>> = {
    mastered: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    completed: { en: 'Mastered', zh: '已掌握', es: 'Dominado' },
    practicing: { en: 'Practicing', zh: '练习中', es: 'Practicando' },
    presented: { en: 'Introduced', zh: '已展示', es: 'Presentado' },
    default: { en: 'Documented', zh: '已记录', es: 'Documentado' },
  };
  // Dark-forest-correct status colors. Used as inline CSS values
  // (statusInfo.color appears directly in `style={{ color: ... }}` below),
  // so these MUST be real CSS colors — Tailwind class strings ("text-emerald-700")
  // silently fail when used in inline styles. The bg values match each color's
  // soft tinted background for dark contexts.
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

  // --- Loading ---
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed" }}>
        <div style={{ maxWidth: "32rem", marginLeft: "auto", marginRight: "auto", padding: "1.5rem" }}>
          <div style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "3rem" }}>
            <div style={{ background: T.card, borderRadius: "14px", height: "2rem" }} />
            <div style={{ background: T.card, borderRadius: "14px", height: "2rem" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ background: T.card, borderRadius: "14px", height: "1.5rem" }} />
              <div style={{ background: T.card, borderRadius: "14px", height: "1.5rem" }} />
              <div style={{ background: T.card, borderRadius: "14px", height: "1.5rem" }} />
            </div>
            <div style={{ background: T.card, borderRadius: "14px", height: "2rem" }} />
            <div style={{ background: T.card, borderRadius: "14px", height: "2rem" }} />
          </div>
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !report) {
    return (
      <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          {/* Always the localized string — never the raw English server
              `error` text, which produced a mixed-locale error screen. */}
          <p style={{ color: '#f87171', marginBottom: "1rem" }}>{t('parentReport.notFound')}</p>
          <Link href="/montree/parent/dashboard" style={{ color: T.emerald, textDecoration: "underline", cursor: "pointer" }}>
            ← {t('common.backToDashboard')}
          </Link>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div style={{ minHeight: "100dvh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed" }}>

      {/* ═══ Sticky Header — Montree home anchor + Back + LanguageToggle ═══ */}
      <header style={{ background: T.card, backdropFilter: T.blur, position: "sticky", top: 0, zIndex: 10, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ maxWidth: "32rem", marginLeft: "auto", marginRight: "auto", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.625rem", paddingBottom: "0.625rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Montree home anchor — universal across the parent surface. */}
          <Link
            href="/montree/parent/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: T.textPrimary }}
            aria-label="Montree home"
          >
            <MontreeLogo size={26} />
            <span style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Montree</span>
          </Link>
          <Link href="/montree/parent/dashboard" style={{ color: T.textSecondary, fontSize: 12, fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={13} strokeWidth={2} /> {t('parentReport.back')}
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main style={{ maxWidth: "32rem", marginLeft: "auto", marginRight: "auto" }}>

        {/* ═══ Week in Film — beat-synced montage (top of report) ═══ */}
        {report.montage_path && (
          <div style={{ margin: "1.25rem 1.25rem 0.25rem", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.75rem 1rem 0.5rem" }}>
              <Sparkles size={15} strokeWidth={2} style={{ color: T.emerald }} />
              <span style={{ color: T.textSecondary, fontSize: "0.8rem", fontWeight: 600, letterSpacing: 0.2 }}>
                {t('parentReport.weekInFilm')}
              </span>
            </div>
            <video
              controls
              playsInline
              preload="metadata"
              poster={photoWorks[0]?.photo_url || report.all_photos?.[0]?.url || undefined}
              src={`${getVideoProxyUrl(report.montage_path)}?v=1`}
              style={{ width: "100%", height: "auto", display: "block", background: "#000" }}
            />
          </div>
        )}

        {/* ═══ Hero Section ═══ */}
        <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "2rem", paddingBottom: "1.5rem" }}>
          {/* Child initial + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{ width: "4rem", height: "4rem", borderRadius: "9999px", background: `linear-gradient(to bottom right, ${T.emerald}, #10b981)`, display: "flex", alignItems: "center", justifyContent: "center", color: T.textPrimary, fontSize: "1.5rem", fontWeight: "700", boxShadow: "0 10px 15px -3px rgba(52,211,153,0.20)" }}>
              {firstName.charAt(0)}
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: T.textPrimary }}>
                {t('parentReport.childWeekTitle', { name: firstName })}
              </h1>
              <p style={{ color: T.textSecondary }}>{formatWeekDisplay()}</p>
            </div>
          </div>

          {/* Quick stats row */}
          {allWorks.length > 0 && (
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {masteredCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: 'rgba(52,211,153,0.15)', color: T.emerald, paddingLeft: "0.75rem", paddingRight: "0.75rem", paddingTop: "0.375rem", paddingBottom: "0.375rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "500" }}>
                  <span>⭐</span> {masteredCount} {t('parentReport.statsMastered')}
                </div>
              )}
              {practicingCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: 'rgba(59,130,246,0.15)', color: '#3b82f6', paddingLeft: "0.75rem", paddingRight: "0.75rem", paddingTop: "0.375rem", paddingBottom: "0.375rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "500" }}>
                  <span>🔄</span> {practicingCount} {t('parentReport.statsPracticing')}
                </div>
              )}
              {presentedCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: 'rgba(245,158,11,0.15)', color: '#f59e0b', paddingLeft: "0.75rem", paddingRight: "0.75rem", paddingTop: "0.375rem", paddingBottom: "0.375rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: "500" }}>
                  <span>🌱</span> {presentedCount} {t('parentReport.statsNew')}
                </div>
              )}
            </div>
          )}

          {/* ═══ AI Narrative Summary ═══ */}
          {report.narrative?.summary ? (
            <div style={{ borderLeft: `4px solid ${T.emerald}`, background: 'rgba(52,211,153,0.10)', borderRadius: "0 14px 14px 0", paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
              <p style={{ color: T.textSecondary, whiteSpace: 'pre-line' }}>
                {cleanNarrative(report.narrative.summary)}
              </p>
            </div>
          ) : report.parent_summary ? (
            <div style={{ borderLeft: `4px solid ${T.emerald}`, background: 'rgba(52,211,153,0.10)', borderRadius: "0 14px 14px 0", paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
              <p style={{ color: T.textSecondary, whiteSpace: 'pre-line' }}>
                {cleanNarrative(report.parent_summary)}
              </p>
            </div>
          ) : null}
        </div>

        {/* ═══ Reading journey — English-progression position ═══ */}
        {report.english_progress && (() => {
          const ep = report.english_progress;
          const PHASE_COLOR: Record<string, string> = { pink: '#f9a8d4', blue: '#7dd3fc', green: '#86efac' };
          const PHASE_NAME: Record<string, Record<string, string>> = {
            en: { pink: 'Pink', blue: 'Blue', green: 'Green' },
            zh: { pink: '粉色', blue: '蓝色', green: '绿色' },
          };
          const isZh = locale === 'zh';
          const color = PHASE_COLOR[ep.current_phase] || T.emerald;
          const phaseName =
            (PHASE_NAME[isZh ? 'zh' : 'en'] || PHASE_NAME.en)[ep.current_phase] || ep.current_phase;
          const first =
            (report.child?.nickname || report.child?.name || '').trim().split(/\s+/)[0] ||
            (isZh ? '孩子' : 'Your child');
          const pct = Math.max(
            0,
            Math.min(100, Math.round(((ep.current_lesson - 1) / ep.total_lessons) * 100)),
          );
          return (
            <div style={{ marginLeft: '1.25rem', marginRight: '1.25rem', marginBottom: '1rem', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: '14px', padding: '1rem 1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.05rem' }} aria-hidden>📖</span>
                <span style={{ color: T.textPrimary, fontWeight: 600, fontSize: '0.95rem' }}>
                  {isZh ? '阅读进度' : 'Reading journey'}
                </span>
              </div>
              <p style={{ color: T.textSecondary, fontSize: '0.875rem', lineHeight: 1.55, margin: '0 0 0.7rem' }}>
                {isZh ? (
                  <>{first} 目前处于<strong style={{ color }}>{phaseName}阶段</strong>，正在学习<strong style={{ color: T.textPrimary }}>第 {ep.current_lesson} 课 — {ep.lesson_label}</strong>。</>
                ) : (
                  <>{first} is in the <strong style={{ color }}>{phaseName} phase</strong> of reading, working on <strong style={{ color: T.textPrimary }}>Lesson {ep.current_lesson} — {ep.lesson_label}</strong>.</>
                )}
              </p>
              <div style={{ height: '0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                <span>
                  {isZh
                    ? `第 ${ep.current_lesson} 课 / 共 ${ep.total_lessons} 课`
                    : `Lesson ${ep.current_lesson} of ${ep.total_lessons}`}
                </span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })()}

        {/* ═══ Divider ═══ */}
        {photoWorks.length > 0 && (
          <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingBottom: "0.75rem" }}>
            <p style={{ color: T.textSecondary, fontSize: "0.875rem" }}>
              {t('parentReport.photoSectionHeader', { count: photoWorks.length })}
            </p>
          </div>
        )}

        {/* ═══ Photo Cards — Linear Scroll ═══ */}
        <div>
          {photoWorks.map((work, index) => {
            const displayName = locale === 'zh' && work.chineseName ? work.chineseName : work.work_name;
            const areaConf = getAreaConfig(work.area);
            const statusInfo = getStatusInfo(work.status);

            return (
              <div key={`${work.work_name}-${index}`} style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                {/* Big photo — full width */}
                <button
                  onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
                  style={{ width: "100%", display: "block", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <img
                    src={work.photo_url!}
                    alt={displayName}
                    style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }}
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                </button>

                {/* Work info — below photo */}
                <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1rem", paddingBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Area badge + Work name + Status */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: T.textPrimary,
                        fontSize: "0.875rem",
                        fontWeight: "700",
                        flexShrink: 0,
                        marginTop: "0.125rem",
                        backgroundColor: areaConf.color,
                      }}
                    >
                      {areaConf.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: "700", color: T.textPrimary, fontSize: "1.125rem", lineHeight: "1.25" }}>
                        {displayName}
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", color: T.textMuted }}>{getAreaLabel(work.area)}</span>
                        <span style={{ color: T.textMuted }}>·</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: "500", color: statusInfo.color }}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parent description — what the work is and why it matters */}
                  {work.parent_description && (
                    <p style={{ color: T.textSecondary, fontSize: "0.875rem" }}>
                      {work.parent_description}
                    </p>
                  )}

                  {/* Why it matters — developmental insight */}
                  {work.why_it_matters && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: "14px", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: "600", color: T.textMuted, marginBottom: "0.25rem" }}>
                        {t('parentReport.whyItMatters')}
                      </p>
                      <p style={{ color: T.textSecondary, fontSize: "0.875rem" }}>
                        {work.why_it_matters}
                      </p>
                    </div>
                  )}

                  {/* Teacher's note */}
                  {work.photo_caption && (
                    <div style={{ background: 'rgba(59,130,246,0.10)', borderRadius: "14px", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>
                      <p style={{ fontSize: "0.75rem", fontWeight: "600", color: '#3b82f6', marginBottom: "0.25rem" }}>
                        {t('parentReport.teachersNote')}
                      </p>
                      <p style={{ color: '#93c5fd', fontSize: "0.875rem", lineHeight: "1.5" }}>
                        {work.photo_caption}
                      </p>
                    </div>
                  )}

                  {/* Fallback if no descriptions at all */}
                  {!work.parent_description && !work.why_it_matters && !work.photo_caption && (
                    <p style={{ color: T.textSecondary, fontSize: "0.875rem" }}>
                      {t('parentReport.fallbackDescription', { name: firstName, area: getAreaLabel(work.area).toLowerCase() })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Extra Photos (not matched to works) ═══ */}
        {report.all_photos && report.all_photos.length > 0 && (() => {
          const usedUrls = new Set(photoWorks.map(w => w.photo_url));
          const extraPhotos = report.all_photos.filter(p => !usedUrls.has(p.url));
          if (extraPhotos.length === 0) return null;
          return (
            <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1.5rem", paddingBottom: "1.5rem", borderTop: `1px solid ${T.cardBorder}` }}>
              <p style={{ color: T.textSecondary, fontSize: "0.875rem", marginBottom: "1rem" }}>
                {t('parentReport.moreMoments')}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                {extraPhotos.map((photo, i) => (
                  <button
                    key={photo.id || i}
                    onClick={() => {
                      // Find index in lightbox photos — add these at the end
                      setLightboxIndex(photoWorks.length + i);
                      setLightboxOpen(true);
                    }}
                    style={{ aspectRatio: "1/1", borderRadius: "14px", overflow: "hidden", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.work_name || 'Activity'}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ Try This at Home ═══ */}
        {report.recommendations && report.recommendations.length > 0 && (
          <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1.5rem", paddingBottom: "1.5rem", borderTop: `1px solid ${T.cardBorder}` }}>
            <h2 style={{ fontWeight: "700", color: T.textPrimary, fontSize: "0.875rem", marginBottom: "0.75rem" }}>
              {t('parentReport.tryThisAtHome')}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {report.recommendations.map((item, i) => (
                <p key={i} style={{ color: T.textSecondary, fontSize: "0.875rem", position: "relative", paddingLeft: "1rem" }}>
                  <span style={{ position: "absolute", left: 0, color: T.emerald }}>•</span>
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Home Practice Card (AI, matched to current work) ═══
            Self-fetching + hide-when-empty: renders nothing on free tier,
            flag off, or no current work to ground on. */}
        {/* v1: heading English-only (component default); the AI activity body
            is already generated in the parent's locale. i18n heading flagged
            for the next Haiku key sweep. */}
        <HomePracticeCard childId={(report as { child_id?: string }).child_id} />

        {/* ═══ Closing ═══ */}
        {report.closing && (
          <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "1.5rem", paddingBottom: "1.5rem", borderTop: `1px solid ${T.cardBorder}`, textAlign: "center" }}>
            <p style={{ color: T.textSecondary, fontSize: "0.875rem" }}>{report.closing}</p>
          </div>
        )}

        {/* ═══ No Activities ═══ */}
        {allWorks.length === 0 && (
          <div style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem", paddingTop: "4rem", paddingBottom: "4rem", textAlign: "center" }}>
            <p style={{ fontSize: "2.25rem", marginBottom: "0.75rem" }}>📋</p>
            <p style={{ color: T.textMuted, fontSize: "0.875rem" }}>
              {t('parentReport.noActivities')}
            </p>
          </div>
        )}

        {/* ═══ Footer ═══ */}
        <div style={{ textAlign: "center", fontSize: "0.75rem", color: T.textMuted, paddingTop: "2rem", paddingBottom: "2rem", borderTop: `1px solid ${T.cardBorder}` }}>
          {new Date(report.created_at).toLocaleDateString(getIntlLocale(locale), {
            month: 'long', day: 'numeric', year: 'numeric',
          })}
          {' · Montree'}
        </div>
      </main>

      {/* ═══ Photo Lightbox ═══ */}
      {(() => {
        // Combine work photos + extra photos for full lightbox navigation
        const extraPhotos = (report.all_photos || [])
          .filter(p => !new Set(photoWorks.map(w => w.photo_url)).has(p.url));
        const allLightboxPhotos = [
          ...lightboxPhotos,
          ...extraPhotos.map(p => ({
            url: p.url,
            caption: p.caption || undefined,
            date: p.captured_at,
          })),
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
    </div>
  );
}
