// app/montree/dashboard/language-semester/page.tsx
// "Language Semester Report" — select children, mark graduating vs returning,
// Sonnet writes the official school PPTX report for each one.
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Check, Copy, Sparkles, FileText, Calendar,
  GraduationCap, RotateCcw, Download, BookOpen,
} from 'lucide-react';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { useI18n } from '@/lib/montree/i18n/context';

interface Child {
  id: string;
  name: string;
  photo_url: string | null;
}

interface WorkRow {
  name: string;
  status: string; // 'P' | 'Pr' | 'MD'
}

interface ChildTextResult {
  name: string;
  works: WorkRow[];
  paragraph?: string;
  opening?: string;
  circle?: string;
  closing?: string;
}

interface TextResponse {
  children: ChildTextResult[];
  errors: Array<{ child_id: string; name: string; error: string }>;
}

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.09)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  blue: '#60a5fa',
  blueSoft: 'rgba(96,165,250,0.15)',
  blueBorder: 'rgba(96,165,250,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  textPlaceholder: 'rgba(255,255,255,0.35)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", Menlo, Consolas, monospace',
};

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 18px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
  transition: 'all 120ms ease',
};

const ctaSecondary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 18px',
  borderRadius: 12,
  background: 'rgba(139,92,246,0.18)',
  border: '1px solid rgba(139,92,246,0.45)',
  color: '#c4b5fd',
  fontFamily: T.sans,
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 120ms ease',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: T.textPrimary,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

// ── CopyBlock ──────────────────────────────────────────────────────────────
function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback noop
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <p style={{
          margin: 0,
          fontFamily: T.sans,
          fontSize: 11,
          fontWeight: 700,
          color: T.textMuted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}>
          {label}
        </p>
        <button
          onClick={copy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 8,
            background: copied ? T.emeraldStrong : 'rgba(255,255,255,0.05)',
            border: `1px solid ${copied ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
            color: copied ? T.emerald : T.textSecondary,
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={1.75} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div style={{
        background: 'rgba(0,0,0,0.30)',
        border: `1px solid rgba(52,211,153,0.18)`,
        borderRadius: 12,
        padding: '14px 16px',
        fontFamily: T.mono,
        fontSize: 13,
        lineHeight: 1.65,
        color: T.textPrimary,
        whiteSpace: 'pre-wrap',
      }}>
        {text}
      </div>
    </div>
  );
}

// Default graduating names — pre-checked on page load, teacher can toggle before generating.
const DEFAULT_GRADUATING = new Set([
  'Amy', 'Austin', 'Eric', 'Gengerlyn', 'Hayden', 'Henry',
  'Joey', 'Kayla', 'Kevin', 'Lucky', 'Rachel', 'Stella',
]);

export default function LanguageSemesterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [graduating, setGraduating] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [gettingText, setGettingText] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [textResult, setTextResult] = useState<TextResponse | null>(null);
  const [months, setMonths] = useState<1 | 6>(6);
  const textResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (!sess) {
        router.push('/montree/login');
        return;
      }
      setSession(sess);
    })();
  }, [router]);

  const loadChildren = useCallback(async () => {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/children?classroom_id=${session.classroom.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load children');
      const data = await res.json();
      const kids: Child[] = data.children || [];
      setChildren(kids);
      const gradIds = new Set<string>();
      for (const c of kids) {
        if (DEFAULT_GRADUATING.has(c.name)) gradIds.add(c.id);
      }
      setGraduating(gradIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) loadChildren();
  }, [session, loadChildren]);

  const toggleAll = () => {
    if (selected.size === children.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(children.map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleGraduating = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(graduating);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGraduating(next);
  };

  const handleGenerate = async () => {
    if (selected.size === 0) return;
    setGenerating(true);
    setError(null);
    setProgress(t('languageSemester.generatingProgress', { count: selected.size }));
    try {
      const res = await fetch('/api/montree/reports/language-semester/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_ids: Array.from(selected),
          graduating_ids: Array.from(graduating),
          months,
        }),
      });
      if (!res.ok) {
        let msg = `Generation failed (${res.status})`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename =
        match?.[1] ||
        (selected.size === 1
          ? 'Language_Semester_Report.pptx'
          : `Language_Semester_Reports_${new Date().toISOString().slice(0, 10)}.zip`);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const errCount = parseInt(res.headers.get('X-Report-Errors') || '0', 10);
      setProgress(
        errCount > 0
          ? t('languageSemester.completeWithErrors', { count: errCount })
          : t('languageSemester.completeSuccess')
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress('');
    } finally {
      setGenerating(false);
    }
  };

  const handleGetText = async () => {
    if (selected.size === 0) return;
    setGettingText(true);
    setError(null);
    setTextResult(null);
    setProgress('Generating text… this takes about 30s per child.');
    try {
      const res = await fetch('/api/montree/reports/language-semester/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_ids: Array.from(selected),
          graduating_ids: Array.from(graduating),
          format: 'text',
          months,
        }),
      });
      if (!res.ok) {
        let msg = `Generation failed (${res.status})`;
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const data: TextResponse = await res.json();
      setTextResult(data);
      setProgress('');
      setTimeout(() => textResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress('');
    } finally {
      setGettingText(false);
    }
  };

  const gradCount = children.filter(c => graduating.has(c.id)).length;
  const retCount = children.length - gradCount;

  if (!session) return null;

  // Status colour map per locked dark forest tokens
  const statusStyle = (status: string): CSSProperties => {
    if (status === 'MD') {
      return {
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.20)',
        color: 'rgba(255,255,255,0.85)',
      };
    }
    if (status === 'Pr') {
      return {
        background: T.emeraldStrong,
        border: '1px solid rgba(52,211,153,0.35)',
        color: T.emerald,
      };
    }
    return {
      background: T.amberSoft,
      border: `1px solid ${T.amberBorder}`,
      color: T.amber,
    };
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <main style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '36px 20px 80px',
      }}>
        {/* Heading */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          marginBottom: 22,
        }}>
          <button
            onClick={() => router.back()}
            aria-label={t('common.back')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: '0 0 4px',
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.4,
              lineHeight: 1.15,
            }}>
              {t('languageSemester.pageTitle')}
            </h1>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
              lineHeight: 1.5,
            }}>
              {t('languageSemester.pageDescription')}
            </p>
          </div>
        </div>

        {/* Time period selector */}
        <div style={{
          display: 'flex',
          gap: 10,
          marginBottom: 18,
        }}>
          {([
            { m: 1 as const, label: '1M', sub: 'Monthly Academic', icon: FileText },
            { m: 6 as const, label: '6M', sub: 'Parent Semester Report', icon: Calendar },
          ]).map(({ m, label, sub, icon: Icon }) => {
            const active = months === m;
            return (
              <button
                key={m}
                onClick={() => setMonths(m)}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: active
                    ? 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(52,211,153,0.10))'
                    : T.card,
                  border: `1px solid ${active ? 'rgba(52,211,153,0.55)' : 'rgba(52,211,153,0.15)'}`,
                  backdropFilter: T.blur,
                  WebkitBackdropFilter: T.blur,
                  color: active ? T.textPrimary : T.textSecondary,
                  fontFamily: T.sans,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 140ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: active ? T.emeraldStrong : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${active ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? T.emerald : T.textMuted,
                  flexShrink: 0,
                }}>
                  <Icon size={16} strokeWidth={1.75} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: T.serif,
                    fontSize: 17,
                    fontWeight: 500,
                    color: active ? T.textPrimary : T.textSecondary,
                    letterSpacing: -0.2,
                  }}>
                    {label}
                  </div>
                  <div style={{
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: active ? T.emeraldDim : T.textMuted,
                    fontWeight: 500,
                    marginTop: 2,
                  }}>
                    {sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
            color: T.textMuted,
            fontSize: 14,
          }}>
            Loading…
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: T.card,
              border: T.cardBorder,
              borderRadius: 12,
              marginBottom: months === 6 ? 4 : 12,
            }}>
              <span style={{
                fontFamily: T.sans,
                fontSize: 13,
                color: T.textSecondary,
              }}>
                {selected.size > 0
                  ? t('languageSemester.selectionCount', { selected: selected.size, total: children.length })
                  : t('languageSemester.selectChildren')}
              </span>
              <button
                onClick={toggleAll}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {selected.size === children.length
                  ? t('languageSemester.deselectAll')
                  : t('languageSemester.selectAll')}
              </button>
            </div>

            {/* Graduating / Returning legend — only shown for 6M */}
            {months === 6 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '8px 16px 14px',
                fontSize: 11,
                color: T.textMuted,
                flexWrap: 'wrap',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: T.amber,
                  }} />
                  {t('languageSemester.graduatingLabel', { count: gradCount })}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: T.blue,
                  }} />
                  {t('languageSemester.returningLabel', { count: retCount })}
                </span>
                <span style={{ marginLeft: 'auto', fontStyle: 'italic', color: T.textMuted }}>
                  {t('languageSemester.toggleHint')}
                </span>
              </div>
            )}

            {/* Children list */}
            <div style={{
              background: T.card,
              border: T.cardBorder,
              borderRadius: 14,
              overflow: 'hidden',
              backdropFilter: T.blur,
              WebkitBackdropFilter: T.blur,
              marginBottom: 14,
            }}>
              {children.map((c, idx) => {
                const checked = selected.has(c.id);
                const isGrad = graduating.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: checked ? T.emeraldSoft : 'transparent',
                      border: 'none',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                      color: T.textPrimary,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 140ms ease',
                    }}
                  >
                    {/* Checkbox */}
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      border: `2px solid ${checked ? T.emerald : 'rgba(255,255,255,0.25)'}`,
                      background: checked ? T.emerald : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 120ms ease',
                    }}>
                      {checked && <Check size={13} strokeWidth={3} color="#06281a" />}
                    </div>

                    {/* Avatar */}
                    {c.photo_url ? (
                      <img
                        src={getProxyUrl(c.photo_url)}
                        alt={c.name}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid rgba(52,211,153,0.20)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #34d399, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#06281a',
                        fontFamily: T.sans,
                        fontSize: 13,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name */}
                    <span style={{
                      flex: 1,
                      fontFamily: T.sans,
                      fontSize: 14,
                      fontWeight: 500,
                      color: T.textPrimary,
                    }}>
                      {c.name}
                    </span>

                    {/* Graduating / Returning badge */}
                    {months === 6 && (
                      <span
                        onClick={(e) => toggleGraduating(c.id, e)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: isGrad ? T.amberSoft : T.blueSoft,
                          border: `1px solid ${isGrad ? T.amberBorder : T.blueBorder}`,
                          color: isGrad ? T.amber : T.blue,
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 0.3,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 120ms ease',
                        }}
                      >
                        {isGrad
                          ? <GraduationCap size={11} strokeWidth={1.75} />
                          : <RotateCcw size={11} strokeWidth={1.75} />}
                        {isGrad
                          ? t('languageSemester.graduatingBadge')
                          : t('languageSemester.returningBadge')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {error && (
              <div style={{
                marginBottom: 12,
                padding: '12px 14px',
                background: T.redSoft,
                border: `1px solid ${T.redBorder}`,
                color: T.red,
                fontFamily: T.sans,
                fontSize: 13,
                borderRadius: 12,
              }}>
                {error}
              </div>
            )}

            {progress && !error && (
              <div style={{
                marginBottom: 12,
                padding: '12px 14px',
                background: T.blueSoft,
                border: `1px solid ${T.blueBorder}`,
                color: T.blue,
                fontFamily: T.sans,
                fontSize: 13,
                borderRadius: 12,
              }}>
                {progress}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleGetText}
                disabled={selected.size === 0 || generating || gettingText}
                style={{
                  ...ctaSecondary,
                  flex: 1,
                  minWidth: 220,
                  opacity: (selected.size === 0 || generating || gettingText) ? 0.45 : 1,
                  cursor: (selected.size === 0 || generating || gettingText) ? 'not-allowed' : 'pointer',
                }}
              >
                <Sparkles size={15} strokeWidth={1.75} />
                {gettingText ? 'Getting text…' : `Get Text (${selected.size})`}
              </button>
              {months === 6 && (
                <button
                  onClick={handleGenerate}
                  disabled={selected.size === 0 || generating || gettingText}
                  style={{
                    ...ctaPrimary,
                    flex: 1,
                    minWidth: 220,
                    opacity: (selected.size === 0 || generating || gettingText) ? 0.45 : 1,
                    cursor: (selected.size === 0 || generating || gettingText) ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Download size={15} strokeWidth={2} />
                  {generating
                    ? t('languageSemester.generatingWait')
                    : t('languageSemester.generateDownload', { count: selected.size })}
                </button>
              )}
            </div>

            <p style={{
              textAlign: 'center',
              marginTop: 16,
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
            }}>
              {t('languageSemester.timeEstimate')}
            </p>

            {/* Text results panel */}
            {textResult && (
              <div ref={textResultRef} style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {textResult.errors.length > 0 && (
                  <div style={{
                    padding: '12px 14px',
                    background: T.amberSoft,
                    border: `1px solid ${T.amberBorder}`,
                    color: T.amber,
                    fontFamily: T.sans,
                    fontSize: 13,
                    borderRadius: 12,
                  }}>
                    {textResult.errors.length} child{textResult.errors.length > 1 ? 'ren' : ''} failed:{' '}
                    {textResult.errors.map(e => e.name).join(', ')}
                  </div>
                )}
                {textResult.children.map((child) => (
                  <div
                    key={child.name}
                    style={{
                      background: T.card,
                      border: T.cardBorder,
                      borderRadius: T.cardRadius,
                      backdropFilter: T.blur,
                      WebkitBackdropFilter: T.blur,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Child header */}
                    <div style={{
                      padding: '14px 18px',
                      borderBottom: T.cardBorder,
                      background: 'linear-gradient(180deg, rgba(139,92,246,0.10), rgba(139,92,246,0.04))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                      <BookOpen size={17} strokeWidth={1.75} color="#c4b5fd" />
                      <h2 style={{
                        margin: 0,
                        fontFamily: T.serif,
                        fontSize: 18,
                        fontWeight: 500,
                        color: T.textPrimary,
                        letterSpacing: -0.2,
                      }}>
                        {child.name}
                      </h2>
                    </div>

                    <div style={{
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16,
                    }}>
                      {/* Works table */}
                      <div>
                        <p style={{
                          margin: '0 0 8px',
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.textMuted,
                          letterSpacing: 0.6,
                          textTransform: 'uppercase',
                        }}>
                          Language Works
                        </p>
                        <div style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}>
                          {child.works.length === 0 ? (
                            <p style={{
                              margin: 0,
                              padding: '12px 14px',
                              fontFamily: T.sans,
                              fontSize: 13,
                              color: T.textMuted,
                              fontStyle: 'italic',
                            }}>
                              No language works recorded
                            </p>
                          ) : (
                            child.works.map((w, i) => (
                              <div
                                key={i}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                                }}
                              >
                                <span style={{
                                  fontFamily: T.sans,
                                  fontSize: 13,
                                  color: T.textPrimary,
                                }}>
                                  {w.name}
                                </span>
                                <span style={{
                                  ...statusStyle(w.status),
                                  padding: '3px 10px',
                                  borderRadius: 999,
                                  fontFamily: T.sans,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: 0.3,
                                }}>
                                  {w.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Report text */}
                      {months === 1 ? (
                        <CopyBlock label="Monthly Academic Report" text={child.paragraph ?? ''} />
                      ) : (
                        <CopyBlock
                          label="Parent Letter"
                          text={[child.opening, child.circle, child.closing].filter(Boolean).join('\n\n')}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
