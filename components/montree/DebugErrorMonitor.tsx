'use client';

// DebugErrorMonitor — a poppable on-screen error log for testing on a tablet
// (no devtools console on an iPad). Captures failed API calls (via the
// montreeApi hook in lib/montree/api.ts) plus uncaught JS errors and promise
// rejections, into a small overlay with a copy button.
//
// 🔒 Hidden by default. Enable on the device by visiting any /montree page with
//    ?debug=1  (persists in localStorage); disable with ?debug=0 or the
//    "Hide monitor" button. Normal teachers never see it.
//
// Mounted once in app/montree/layout.tsx. Self-gates — renders null unless
// debug mode is on, so SSR output is empty.

import { useEffect, useRef, useState } from 'react';
import {
  subscribeDebugErrors,
  clearDebugErrors,
  recordDebugError,
  isDebugEnabled,
  setDebugEnabled,
  type DebugError,
} from '@/lib/montree/debug/error-log';

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function DebugErrorMonitor() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<DebugError[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount once: honour ?debug=1 / ?debug=0, then resolve enabled state.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get('debug');
      if (d === '1') setDebugEnabled(true);
      else if (d === '0') setDebugEnabled(false);
    } catch {
      /* ignore */
    }
    setEnabled(isDebugEnabled());
  }, []);

  // While enabled: subscribe to the buffer + capture window-level errors.
  useEffect(() => {
    if (!enabled) return;

    const unsub = subscribeDebugErrors(setErrors);

    const onError = (e: ErrorEvent) => {
      recordDebugError({
        kind: 'window',
        origin: e.filename ? `${e.filename}:${e.lineno || 0}` : 'window',
        message: e.message || String(e.error || 'Unknown error'),
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      recordDebugError({
        kind: 'promise',
        origin: 'unhandledrejection',
        message: r instanceof Error ? `${r.name}: ${r.message}` : String(r),
      });
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      unsub();
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [enabled]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  if (!enabled) return null;

  const copyAll = async () => {
    const text = errors.length
      ? errors
          .map((e) => `[${fmtTime(e.ts)}] ${e.kind.toUpperCase()} ${e.status ?? ''} ${e.origin} — ${e.message}`.replace(/\s+/g, ' ').trim())
          .join('\n')
      : '(no errors captured)';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older webviews
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const kindColor = (k: DebugError['kind']) =>
    k === 'api' ? '#fca5a5' : k === 'promise' ? '#fcd34d' : '#fdba74';

  return (
    <div
      style={{
        position: 'fixed',
        left: 'max(12px, env(safe-area-inset-left, 12px))',
        bottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        zIndex: 99998,
      }}
    >
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Error monitor"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 999,
          border: '1px solid rgba(248,113,113,0.4)',
          background: errors.length ? 'rgba(40,12,12,0.92)' : 'rgba(12,20,14,0.9)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 6px 20px -8px rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span>🐞</span>
        <span>{errors.length}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            width: 'min(86vw, 420px)',
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(10,18,13,0.97)',
            boxShadow: '0 20px 50px -16px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, flex: 1 }}>
              Error monitor · {errors.length}
            </span>
            <button onClick={copyAll} style={pillBtn}>{copied ? '✓ Copied' : 'Copy all'}</button>
            <button onClick={() => clearDebugErrors()} style={pillBtn}>Clear</button>
            <button
              onClick={() => { setDebugEnabled(false); setEnabled(false); }}
              style={{ ...pillBtn, color: '#fca5a5' }}
            >
              Hide
            </button>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', padding: '6px 0' }}>
            {errors.length === 0 ? (
              <div style={{ padding: '18px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 12.5 }}>
                No errors captured yet. Failed API calls and JS errors will appear here as you use the app.
              </div>
            ) : (
              errors.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(e.ts)}</span>
                    <span style={{ color: kindColor(e.kind), fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.04em' }}>
                      {e.kind}{e.status ? ` ${e.status}` : ''}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-word', marginTop: 2 }}>
                    <span style={{ color: 'rgba(130,217,174,0.8)' }}>{e.origin}</span>
                    {' — '}
                    {e.message}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  padding: '5px 9px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.85)',
  fontSize: 11.5,
  fontWeight: 600,
  cursor: 'pointer',
};
