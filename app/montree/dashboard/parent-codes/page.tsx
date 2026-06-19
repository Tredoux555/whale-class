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
import { ArrowLeft, Copy, RefreshCw, Sparkles, Heart, Printer, Check, Zap, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';
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
  serif: 'var(--font-lora), Georgia, serif',
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
  // Bulk-generate state — fires POST per-child for any child without an
  // active code. The POST is idempotent (returns existing if active), so
  // running it over every child is safe + cheap.
  const [bulkGenerating, setBulkGenerating] = useState(false);
  // Client-side QR data URLs keyed by parent_url. We render QR codes via
  // the `qrcode` npm package instead of an external service so the
  // network request never leaves montree.xyz — avoids the strict CSP
  // img-src directive that blocks api.qrserver.com.
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

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

  // Generate QR data URLs client-side whenever the code list changes.
  // Done in parallel via Promise.all — 20 children × ~10ms per QR = trivial.
  // The map is keyed by parent_url so re-renders don't re-generate the
  // ones we already have.
  useEffect(() => {
    let cancelled = false;
    const urls = codes.map((c) => c.parent_url).filter((u): u is string => !!u);
    if (urls.length === 0) return;
    const todo = urls.filter((u) => !qrDataUrls[u]);
    if (todo.length === 0) return;

    Promise.all(
      todo.map((url) =>
        QRCode.toDataURL(url, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#000000', light: '#ffffff' },
        })
          .then((dataUrl) => ({ url, dataUrl }))
          .catch(() => ({ url, dataUrl: '' }))
      )
    ).then((results) => {
      if (cancelled) return;
      setQrDataUrls((prev) => {
        const next = { ...prev };
        for (const { url, dataUrl } of results) {
          if (dataUrl) next[url] = dataUrl;
        }
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [codes, qrDataUrls]);

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

  // Bulk-generate: fire POST per-child for each row that doesn't already
  // have a code. POST is idempotent, so this is safe to re-run. We use
  // small concurrency (4) to avoid hammering the API.
  const handleGenerateAll = useCallback(async () => {
    const missing = codes.filter((c) => !c.code);
    if (missing.length === 0) return;

    if (typeof window !== 'undefined') {
      const ok = window.confirm(
        `Generate codes for ${missing.length} ${missing.length === 1 ? 'child' : 'children'}? You can then share each one with the parent below.`
      );
      if (!ok) return;
    }

    setBulkGenerating(true);
    const CONCURRENCY = 4;
    let successCount = 0;
    let failCount = 0;

    // Walk through children in chunks so we don't blow open 20 parallel
    // requests at once. POST is idempotent so a slow chunk is fine.
    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const chunk = missing.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(async (row) => {
          try {
            const res = await fetch('/api/montree/dashboard/parent-codes', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ child_id: row.child_id }),
            });
            return res.ok;
          } catch {
            return false;
          }
        })
      );
      for (const ok of results) {
        if (ok) successCount++;
        else failCount++;
      }
    }

    await fetchCodes();
    setBulkGenerating(false);

    if (failCount === 0) {
      toast.success(`Generated ${successCount} ${successCount === 1 ? 'code' : 'codes'}`);
    } else {
      toast.error(
        `${successCount} generated, ${failCount} failed. Try the remaining ones individually.`
      );
    }
  }, [codes, fetchCodes]);

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

  // Welcome message — copy-to-clipboard text the teacher pastes into
  // WhatsApp / WeChat / SMS / email. Four beats — welcome, login link,
  // code-as-fallback, home-screen tip so the parent doesnt have to log
  // in every time. The link preloads the code at /montree/parent?code=ABC
  // so the parent only presses Enter on the login screen.
  //
  // 🚨 PWA install line is in lockstep with the teacher welcome message
  // (Tracys draft_teacher_welcome_messages + admin classroom Send button).
  // Update all three if you change the wording.
  const buildWelcomeMessage = (row: CodeRow): string => {
    if (!row.code || !row.parent_url) return '';
    return [
      `Welcome to Montree.`,
      `Visit this link to log in: ${row.parent_url}`,
      `Save this code so you can log in again: ${row.code}`,
      `Tip: once you're in, save the page to your home screen so it works like an app — on iPhone tap the share icon then "Add to Home Screen", on Android tap the menu then "Install app" or "Add to Home Screen". You won't have to log in again.`,
    ].join('\n\n');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Bulk-generate — always visible per user request: "If the
                parents need their codes they need their codes. They lose
                them." When 0 missing, button still shows but disabled with
                a clear "All codes ready" label. When N missing, primary
                emerald CTA with the count. */}
            {codes.length > 0 && (() => {
              const missingCount = codes.filter((c) => !c.code).length;
              const allReady = missingCount === 0;
              return (
                <button
                  onClick={allReady ? undefined : handleGenerateAll}
                  disabled={bulkGenerating || allReady}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: allReady ? T.card : T.emerald,
                    border: allReady ? T.cardBorder : 'none',
                    color: allReady ? T.textSecondary : '#0a1a0f',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: bulkGenerating || allReady ? 'default' : 'pointer',
                    opacity: bulkGenerating ? 0.6 : 1,
                  }}
                >
                  {allReady ? (
                    <Check size={14} strokeWidth={2} />
                  ) : (
                    <Zap size={14} strokeWidth={2} />
                  )}
                  {bulkGenerating
                    ? `Generating ${missingCount}…`
                    : allReady
                    ? `All ${codes.length} codes ready`
                    : `Generate codes (${missingCount})`}
                </button>
              );
            })()}
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
            {/* Session 119: chat icon → WeChat-style parent chats surface.
                One tap takes the teacher to the per-parent chat overview. */}
            <Link
              href="/montree/dashboard/parent-chats"
              aria-label="Open parent chats"
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 10,
                background: T.emeraldSoft,
                border: `1px solid ${T.emeraldStrong}`,
                color: T.emerald,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <MessageCircle size={15} strokeWidth={1.75} />
              Parent Chats
            </Link>
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

                      {row.parent_url && qrDataUrls[row.parent_url] && (
                        <div className="print:block" style={{ display: 'none', justifyContent: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- QR is a client-generated data URL */}
                          <img
                            src={qrDataUrls[row.parent_url]}
                            alt={`QR ${row.child_name}`}
                            style={{ width: 140, height: 140 }}
                          />
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
                        <button
                          onClick={() => {
                            const msg = buildWelcomeMessage(row);
                            if (!msg) return;
                            handleCopy(msg, `welcome-${row.child_id}`);
                            toast.success(
                              `Welcome message copied — paste into WhatsApp, SMS, or email for ${row.child_name}'s parent.`
                            );
                          }}
                          disabled={!row.code}
                          title="Copy a ready-to-send welcome message"
                          style={{
                            flex: 1,
                            minWidth: 92,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: copiedId === `welcome-${row.child_id}` ? T.emerald : T.card,
                            border: copiedId === `welcome-${row.child_id}` ? 'none' : T.cardBorder,
                            color: copiedId === `welcome-${row.child_id}` ? '#0a1a0f' : T.textSecondary,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: row.code ? 'pointer' : 'not-allowed',
                            opacity: row.code ? 1 : 0.4,
                          }}
                        >
                          {copiedId === `welcome-${row.child_id}` ? (
                            <Check size={14} />
                          ) : (
                            <Heart size={14} strokeWidth={1.75} />
                          )}
                          {copiedId === `welcome-${row.child_id}` ? 'Copied' : 'Welcome message'}
                        </button>
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
