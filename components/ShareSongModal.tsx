'use client';

// Share / QR modal for a single song or video on the public Whale Class
// listing. Replaces the manual /admin/qr-generator typing flow for the
// per-song use case — the URL is generated from the same slugify() the
// public page uses, so they cannot desync.
//
// The modal shows:
//   - The canonical share URL (montree.xyz/whale-class#song-{slug})
//   - A "Copy link" button
//   - A live-rendered QR code (client-side, no server round-trip)
//   - "Download QR PNG" button
//   - Native share button (navigator.share — falls back gracefully)
//
// ⚠ Default origin used to be teacherpotato.xyz but as of May 5, 2026
// that domain is dead (DNS at parking server, every path 405s). When
// teacherpotato.xyz is re-attached to Railway, change the default back
// to keep Whale Class brand isolation. See middleware.ts comment.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { slugify } from '@/lib/slugify';

interface ShareSongModalProps {
  title: string;
  /** Optional override; defaults to montree.xyz (teacherpotato.xyz currently dead — see header comment). */
  origin?: string;
  onClose: () => void;
}

export default function ShareSongModal({ title, origin, onClose }: ShareSongModalProps) {
  const slug = slugify(title);
  const baseOrigin = origin || 'https://montree.xyz';
  const shareUrl = `${baseOrigin}/whale-class#song-${slug}`;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nativeShareSupported, setNativeShareSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(shareUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ShareSongModal] QR error', err);
          setQrError('Could not generate the QR code.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  useEffect(() => {
    setNativeShareSupported(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  // Close on Escape — tiny but expected on a modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[ShareSongModal] clipboard error', err);
      // Fallback — select + execCommand on browsers that lack permission.
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: `Whale Class — ${title}`,
        text: `Watch "${title}" from Whale Class:`,
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or browser declined — safe to ignore.
      if ((err as { name?: string })?.name !== 'AbortError') {
        console.warn('[ShareSongModal] native share failed', err);
      }
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          maxWidth: 420,
          width: '100%',
          padding: '24px 22px 20px',
          position: 'relative',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'transparent',
            border: 'none',
            fontSize: 22,
            color: '#94a3b8',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
            color: '#6366f1',
            marginBottom: 4,
          }}
        >
          Share song
        </div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#0f172a',
            margin: '0 0 14px',
            lineHeight: 1.3,
          }}
        >
          {title}
        </h2>

        {/* QR code */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 220,
            marginBottom: 14,
          }}
        >
          {qrDataUrl ? (
            // Use a plain <img> — Next.js's <Image> would force optimization
            // on a data URL we just generated, which adds nothing here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={`QR code for ${title}`}
              style={{ width: 200, height: 200, display: 'block' }}
            />
          ) : qrError ? (
            <div style={{ color: '#ef4444', fontSize: 13 }}>{qrError}</div>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Generating QR…</div>
          )}
        </div>

        {/* URL row */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            value={shareUrl}
            readOnly
            onFocus={(e) => e.target.select()}
            style={{
              flex: 1,
              padding: '9px 10px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 12.5,
              color: '#475569',
              background: '#f8fafc',
              fontFamily:
                'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: '9px 14px',
              background: copied ? '#10b981' : '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleDownloadQr}
            disabled={!qrDataUrl}
            style={{
              flex: 1,
              padding: '11px 14px',
              background: '#f1f5f9',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: qrDataUrl ? 'pointer' : 'not-allowed',
              opacity: qrDataUrl ? 1 : 0.5,
            }}
          >
            ⬇ Download QR
          </button>
          {nativeShareSupported && (
            <button
              onClick={handleNativeShare}
              style={{
                flex: 1,
                padding: '11px 14px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📤 Share…
            </button>
          )}
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 11.5,
            color: '#94a3b8',
            lineHeight: 1.5,
          }}
        >
          Anyone with this link or QR can watch the song. The link auto-scrolls
          to it on opening.
        </div>
      </div>
    </div>
  );
}
