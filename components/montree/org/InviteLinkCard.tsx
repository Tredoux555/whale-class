'use client';

/**
 * components/montree/org/InviteLinkCard.tsx
 *
 * One freshly minted invite link, presented the way this product actually delivers links:
 * BY HAND. Resend is unreliable on this deployment (see the note in
 * app/api/montree/invite-principal/route.ts — codes and links get shared over
 * WhatsApp/WeChat/SMS or read out loud), so the link, a copy button and a QR code ARE the
 * delivery mechanism, not a fallback for one.
 *
 * The QR is generated in the browser with the `qrcode` package already in package.json —
 * the same call `app/montree/dashboard/parent-codes/page.tsx` makes. No network request
 * leaves the device: an invite link must never be handed to a third-party QR service.
 *
 * Shared by the organisation dashboard (inviting a school) and the super-admin console
 * (inviting an organisation), because both moments are the same moment: a person is about
 * to send a stranger a link, and needs it in a form they can paste or point a phone at.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '@/lib/montree/i18n';

export interface InviteLinkCardProps {
  link: string;
  /** Optional heading — falls back to a neutral "Share this link". */
  title?: string;
  /** Optional one-line explanation of who this link is for. */
  hint?: string;
  /** ISO timestamp; rendered as a plain "works until" line. */
  expiresAt?: string | null;
  /** Dark surfaces (the funnel / super-admin chrome) vs light app-shell cards. */
  tone?: 'dark' | 'light';
  onDone?: () => void;
}

export default function InviteLinkCard({
  link, title, hint, expiresAt, tone = 'dark', onDone,
}: InviteLinkCardProps) {
  const { t } = useI18n();
  const [qr, setQr] = useState<string>('');
  // 'idle' → 'copied' on a RESOLVED clipboard write, 'failed' otherwise. Never optimistic:
  // the browsers this feature is aimed at (in-app WeChat / WhatsApp webviews, non-secure
  // contexts) are exactly the ones where navigator.clipboard is missing or blocked, and a
  // green "✓ Copied" over an empty clipboard sends a school leader off to paste nothing.
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a1a0f', light: '#ffffff' },
    })
      .then((dataUrl) => { if (!cancelled) setQr(dataUrl); })
      .catch(() => { if (!cancelled) setQr(''); });
    return () => { cancelled = true; };
  }, [link]);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard api');
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2200);
    } catch {
      // Degraded, not broken — the link is on screen and selectable. Say so, and leave the
      // message up longer than a success toast because it asks the reader to do something.
      setCopyState('failed');
      setTimeout(() => setCopyState('idle'), 6000);
    }
  };

  const dark = tone === 'dark';
  const surface = dark ? 'rgba(255,255,255,0.035)' : '#ffffff';
  const border = dark ? '1px solid rgba(52,211,153,0.18)' : '1px solid #d7e3dc';
  const textPrimary = dark ? 'rgba(255,255,255,0.92)' : '#123024';
  const textMuted = dark ? 'rgba(255,255,255,0.52)' : '#5b6f65';

  return (
    <div style={{ background: surface, border, borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: textPrimary }}>
        {title || t('org.invite.shareTitle')}
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.6, color: textMuted }}>
        {hint || t('org.invite.shareHint')}
      </p>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <div
            style={{
              background: dark ? 'rgba(0,0,0,0.28)' : '#f4f8f6',
              border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #dbe6e0',
              borderRadius: 10,
              padding: '11px 13px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12.5,
              color: textPrimary,
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}
          >
            {link}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void copy()}
              style={{
                background:
                  copyState === 'copied' ? 'rgba(52,211,153,0.18)'
                  : copyState === 'failed' ? 'rgba(242,168,131,0.14)'
                  : '#34d399',
                color:
                  copyState === 'copied' ? '#34d399'
                  : copyState === 'failed' ? '#f2a883'
                  : '#062017',
                border:
                  copyState === 'copied' ? '1px solid rgba(52,211,153,0.4)'
                  : copyState === 'failed' ? '1px solid rgba(242,168,131,0.35)'
                  : 'none',
                borderRadius: 10,
                padding: '9px 18px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {copyState === 'copied' ? t('org.invite.copied')
                : copyState === 'failed' ? t('org.invite.copyFailed')
                : t('org.invite.copy')}
            </button>
            {onDone ? (
              <button
                type="button"
                onClick={onDone}
                style={{
                  background: 'transparent',
                  color: textMuted,
                  border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid #d7e3dc',
                  borderRadius: 10,
                  padding: '9px 16px',
                  fontSize: 13.5,
                  cursor: 'pointer',
                }}
              >
                {t('org.invite.done')}
              </button>
            ) : null}
          </div>

          {copyState === 'failed' ? (
            <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#f2a883', lineHeight: 1.6 }}>
              {t('org.invite.copyFallback')}
            </p>
          ) : null}

          {expiresAt ? (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: textMuted }}>
              {t('org.invite.worksUntil', { date: new Date(expiresAt).toLocaleDateString() })}
            </p>
          ) : null}
          <p style={{ margin: '8px 0 0', fontSize: 12, color: textMuted, lineHeight: 1.6 }}>
            {t('org.invite.onceOnly')}
          </p>
        </div>

        <div style={{ textAlign: 'center' }}>
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={t('org.invite.qrAlt')}
                width={160}
                height={160}
                style={{ borderRadius: 10, display: 'block', background: '#fff' }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 11.5, color: textMuted }}>
                {t('org.invite.qrHint')}
              </p>
            </>
          ) : (
            <div
              aria-hidden
              style={{
                width: 160, height: 160, borderRadius: 10,
                background: dark ? 'rgba(255,255,255,0.05)' : '#eef4f1',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
