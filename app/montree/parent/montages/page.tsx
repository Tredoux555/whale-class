// /montree/parent/montages/page.tsx
// Parent montage feed — every little film a teacher has released to this
// child (GET /api/montree/parent/montages). Newest first, each one playable
// inline and downloadable.
//
// Deliberately a near-clone of /montree/parent/photos: same dark-forest
// tokens, same cookie-auth gate, same child resolution order, same splash.
// A parent should not be able to tell these two screens were built apart.
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Film, Download } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ParentMontage {
  id: string;
  scope_type: string;
  label: string;
  created_at: string | null;
  sent_at: string | null;
  /** Media-proxy URL for the MP4 — same mechanism as the report page's film. */
  video_url: string;
}

/**
 * The proxy's forced-download branch. video_url normally has no query string,
 * but getVideoProxyUrl() appends ?bucket= for non-default buckets, so pick the
 * separator rather than assuming.
 */
function withDownloadFlag(url: string): string {
  if (!url) return url;
  return `${url}${url.includes('?') ? '&' : '?'}download=1`;
}

function ParentMontagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const childIdParam = searchParams.get('child');

  const [loading, setLoading] = useState(true);
  const [montages, setMontages] = useState<ParentMontage[]>([]);
  const [childName, setChildName] = useState('');

  // 🚨 Cookie-based auth gate (parent audit F-1.3). The httpOnly cookie is the
  // only authority on parent identity; localStorage is a UX hint at most.
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

        // Same child resolution order as the photos page:
        //   1. ?child= URL param   2. localStorage hint   3. the JWT's child
        let resolvedChildId: string | null = null;
        let resolvedName: string | null = null;
        if (childIdParam) {
          resolvedChildId = childIdParam;
        } else {
          try {
            const hint = localStorage.getItem('montree_selected_child');
            if (hint) {
              const parsed = JSON.parse(hint);
              if (parsed?.id) {
                resolvedChildId = parsed.id;
                resolvedName = parsed.name || null;
              }
            }
          } catch {}
          if (!resolvedChildId && sessionData.child_id) {
            resolvedChildId = sessionData.child_id;
            resolvedName = sessionData.child_name || null;
          }
        }

        if (!resolvedChildId) {
          toast.error(t('common.noChildSelected'));
          router.push('/montree/parent/dashboard');
          return;
        }

        if (resolvedName) setChildName(resolvedName);
        loadMontages(resolvedChildId);
      } catch (err) {
        if (cancelled) return;
        console.error('Parent montages auth check failed:', err);
        router.push('/montree/parent/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, childIdParam, t]);

  const loadMontages = async (childId: string) => {
    try {
      const res = await fetch(
        `/api/montree/parent/montages?child_id=${encodeURIComponent(childId)}&limit=30`,
        { credentials: 'same-origin' }
      );
      if (!res.ok) {
        throw new Error('Failed to fetch montages');
      }
      const data = await res.json();
      if (data.success) {
        setMontages(Array.isArray(data.montages) ? data.montages : []);
      }
    } catch (err) {
      console.error('Failed to load montages:', err);
      toast.error(t('parentMontages.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(getIntlLocale(locale), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return <MontagesSplash />;
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <Toaster position="top-center" />

      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
        borderBottom: T.cardBorder,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        paddingTop: 'env(safe-area-inset-top)', // clear the iOS status bar
      }}>
        <div style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Link
            href="/montree/parent/dashboard"
            aria-label="Montree home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: T.textPrimary,
            }}
          >
            <MontreeLogo size={26} />
            <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Montree</span>
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('parentMontages.title')}
            </h1>
            <p style={{
              margin: '2px 0 0',
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
            }}>
              {childName || t('parentPhotos.sharedByTeachers')}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: 16 }}>
        {montages.length === 0 ? (
          <div style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: 18,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              color: T.emerald,
              marginBottom: 14,
            }}>
              <Film size={26} strokeWidth={1.75} />
            </div>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
              lineHeight: 1.55,
            }}>
              {t('parentMontages.empty')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {montages.map(m => (
              <section
                key={m.id}
                style={{
                  background: T.card,
                  border: T.cardBorder,
                  borderRadius: 18,
                  backdropFilter: T.blur,
                  WebkitBackdropFilter: T.blur,
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px 10px',
                }}>
                  <Film size={15} strokeWidth={2} style={{ color: T.emerald, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: T.serif,
                      fontSize: 15,
                      fontWeight: 500,
                      color: T.textPrimary,
                      letterSpacing: -0.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>
                      {formatDate(m.sent_at || m.created_at)}
                    </div>
                  </div>
                </div>

                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={m.video_url}
                  style={{ width: '100%', height: 'auto', display: 'block', background: '#000' }}
                />

                <div style={{ padding: '10px 14px 12px', display: 'flex', justifyContent: 'flex-end' }}>
                  <a
                    href={withDownloadFlag(m.video_url)}
                    download
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: 12,
                      background: T.emeraldSoft,
                      border: '1px solid rgba(52,211,153,0.35)',
                      color: T.emerald,
                      fontFamily: T.sans,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={14} strokeWidth={2} />
                    {t('parentMontages.download')}
                  </a>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MontagesSplash() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.sans,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.40)',
          color: T.emerald,
          marginBottom: 12,
          animation: 'pm-pulse 1.6s ease-in-out infinite',
        }}>
          <Film size={24} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>
          {t('common.loading')}
        </p>
        <style>{`@keyframes pm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    </div>
  );
}

export default function ParentMontagesPage() {
  return (
    <Suspense fallback={<MontagesSplash />}>
      <ParentMontagesContent />
    </Suspense>
  );
}
