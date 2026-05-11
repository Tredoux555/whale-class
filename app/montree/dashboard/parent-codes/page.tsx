// /montree/dashboard/parent-codes/page.tsx
// Teacher-facing parent invite codes for the children in their classroom.
//
// The teacher is the one closest to the parents — this is where they generate,
// share, and reset parent codes. The principal sees the school-wide version at
// /montree/admin/parent-codes (which uses the admin API).
//
// Dark forest aesthetic, matching dashboard/messages.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, RefreshCw, Sparkles, Mail, Printer, Check } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { toast, Toaster } from 'sonner';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f5d97a',
  amberSoft: 'rgba(245,217,122,0.16)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface CodeRow {
  child_id: string;
  child_name: string;
  classroom_id: string;
  invite_id: string | null;
  code: string | null;
  parent_url: string | null;
  qr_url: string | null;
  expires_at: string | null;
  used: boolean;
}

export default function TeacherParentCodesPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyChildId, setBusyChildId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/dashboard/parent-codes', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/montree/login');
        return;
      }
      if (res.status === 403) {
        // Wrong role — bounce to principal page or dashboard.
        router.replace('/montree/dashboard');
        return;
      }
      if (!res.ok) {
        toast.error(t('parentCodes.couldNotLoad'));
        setLoading(false);
        return;
      }
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error('[parent-codes page] load failed', err);
      toast.error(t('parentCodes.couldNotLoad'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreateCode = useCallback(
    async (childId: string) => {
      setBusyChildId(childId);
      try {
        const res = await fetch('/api/montree/dashboard/parent-codes', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ child_id: childId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || t('parentCodes.couldNotCreate'));
          return;
        }
        toast.success(t('parentCodes.codeCreated'));
        await fetchCodes();
      } catch {
        toast.error(t('parentCodes.couldNotCreate'));
      } finally {
        setBusyChildId(null);
      }
    },
    [fetchCodes, t]
  );

  const handleResetCode = useCallback(
    async (childId: string) => {
      const confirmed = window.confirm(t('parentCodes.resetConfirm'));
      if (!confirmed) return;
      setBusyChildId(childId);
      try {
        const res = await fetch('/api/montree/dashboard/parent-codes', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ child_id: childId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || t('parentCodes.couldNotReset'));
          return;
        }
        toast.success(t('parentCodes.newCodeIssued'));
        await fetchCodes();
      } catch {
        toast.error(t('parentCodes.couldNotReset'));
      } finally {
        setBusyChildId(null);
      }
    },
    [fetchCodes, t]
  );

  const handleCopy = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      // Fallback: select text via execCommand
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiedId(id); window.setTimeout(() => setCopiedId(null), 1400); }
      finally { document.body.removeChild(ta); }
    }
  }, []);

  const mailtoFor = (row: CodeRow) => {
    if (!row.code || !row.parent_url) return '#';
    const subject = encodeURIComponent(t('parentCodes.emailSubject', { name: row.child_name }));
    const body = encodeURIComponent(
      t('parentCodes.emailBody', { name: row.child_name, url: row.parent_url, code: row.code })
    );
    return `mailto:?subject=${subject}&body=${body}`;
  };

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
            animation: 'mpc-pulse 1.6s ease-in-out infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: T.textMuted }}>{t('common.loading')}</p>
        </div>
        <style>{`@keyframes mpc-pulse { 0%,100% { opacity:.55 } 50% { opacity:1 } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        color: T.textPrimary,
        fontFamily: T.sans,
      }}
    >
      <Toaster position="top-center" />

      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: T.card,
          backdropFilter: T.blur,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
        className="print:hidden"
      >
        <div
          style={{
            maxWidth: 920,
            margin: '0 auto',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Link
            href="/montree/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: T.textSecondary,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            {t('common.back')}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 10,
                background: T.card,
                border: T.cardBorder,
                color: T.textSecondary,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Printer size={14} strokeWidth={1.75} />
              {t('parentCodes.print')}
            </button>
            <LanguageToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 20px 80px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              fontFamily: T.serif,
              color: T.textPrimary,
              letterSpacing: -0.4,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Sparkles size={22} color={T.emerald} strokeWidth={1.75} />
            {t('parentCodes.title')}
          </h1>
          <p style={{ fontSize: 14, color: T.textMuted, margin: '8px 0 0', lineHeight: 1.5 }}>
            {t('parentCodes.subtitle')}
          </p>
        </div>

        {codes.length === 0 ? (
          <div
            style={{
              background: T.card,
              border: T.cardBorder,
              borderRadius: T.cardRadius,
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 15, color: T.textSecondary, margin: 0 }}>
              {t('parentCodes.noChildrenYet')}
            </p>
          </div>
        ) : (
          <div className="grid-parent-codes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {codes.map((row) => {
              const busy = busyChildId === row.child_id;
              const copyId = `code-${row.child_id}`;
              return (
                <div
                  key={row.child_id}
                  className="print:break-inside-avoid"
                  style={{
                    background: row.code ? T.emeraldSoft : T.card,
                    border: row.code ? T.cardBorderStrong : T.cardBorder,
                    borderRadius: T.cardRadius,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Name + status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: T.textPrimary }}>
                        {row.child_name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: T.textMuted }}>
                        {t('parentCodes.parentPortalAccess')}
                      </p>
                    </div>
                    {row.code && row.used && (
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: T.amberSoft,
                          color: T.amber,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {t('parentCodes.connected')}
                      </span>
                    )}
                  </div>

                  {/* Code or "Create code" */}
                  {row.code ? (
                    <>
                      <div
                        style={{
                          background: 'rgba(8,20,12,0.65)',
                          border: '1px solid rgba(52,211,153,0.25)',
                          borderRadius: 12,
                          padding: '14px 12px',
                          textAlign: 'center',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 11, color: T.emerald, letterSpacing: 1.4, fontWeight: 600 }}>
                          {t('parentCodes.accessCodeLabel')}
                        </p>
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
                            fontWeight: 700,
                            fontSize: 26,
                            letterSpacing: 4,
                            color: T.textPrimary,
                          }}
                        >
                          {row.code}
                        </p>
                      </div>

                      {row.qr_url && (
                        <div className="print:block" style={{ display: 'none', justifyContent: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- QR served by qrserver.com, native <img> is correct */}
                          <img src={row.qr_url} alt={`QR ${row.child_name}`} style={{ width: 140, height: 140 }} />
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: 11, color: T.textMuted, textAlign: 'center', wordBreak: 'break-all' }}>
                        montree.xyz/montree/parent
                      </p>

                      {/* Action row */}
                      <div className="print:hidden" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <button
                          onClick={() => handleCopy(row.code!, copyId)}
                          style={{
                            flex: 1,
                            minWidth: 92,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: T.emeraldStrong,
                            border: T.cardBorderStrong,
                            color: T.emerald,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedId === copyId ? <Check size={14} /> : <Copy size={14} />}
                          {copiedId === copyId ? t('parentCodes.copied') : t('parentCodes.copyCode')}
                        </button>
                        <a
                          href={mailtoFor(row)}
                          style={{
                            flex: 1,
                            minWidth: 92,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: T.card,
                            border: T.cardBorder,
                            color: T.textSecondary,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <Mail size={14} />
                          {t('parentCodes.email')}
                        </a>
                        <button
                          onClick={() => handleResetCode(row.child_id)}
                          disabled={busy}
                          title={t('parentCodes.resetTooltip')}
                          style={{
                            flex: '0 0 auto',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: T.card,
                            border: T.cardBorder,
                            color: T.textMuted,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: busy ? 'wait' : 'pointer',
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          <RefreshCw size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleCreateCode(row.child_id)}
                      disabled={busy}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                        border: 'none',
                        color: '#0a1a0f',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: busy ? 'wait' : 'pointer',
                        opacity: busy ? 0.65 : 1,
                      }}
                    >
                      {busy ? t('parentCodes.creating') : t('parentCodes.createCode')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; color: #000; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: flex !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
