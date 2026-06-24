'use client';

// Subtle one-click copy control for a coach reply.
//  • Always visible but faint; brightens on hover (desktop) and stays tappable on
//    touch (no hover dependency — important for mobile).
//  • Copies the RAW message text (the markdown source we were handed), never the
//    rendered DOM, so what lands on the clipboard is exactly the coach's words.
//  • On success the icon swaps to a check for ~2s, then reverts. No toast/popup.
//  • Primary path is the async Clipboard API (gesture-safe on iOS because it runs
//    inside the click handler); falls back to a hidden-textarea execCommand for
//    older / non-secure contexts.

import { useEffect, useRef, useState } from 'react';
import { T } from '@/lib/story/personal-theme';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the revert timer if the message unmounts mid-countdown.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    const value = text;
    let ok = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch { /* fall through to the legacy path */ }
    if (!ok && typeof document !== 'undefined') {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { ok = false; }
    }
    if (ok) {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={copied ? 'Copied' : 'Copy message'}
      title={copied ? 'Copied' : 'Copy'}
      style={{
        appearance: 'none', border: 'none', background: 'transparent',
        padding: 4, marginTop: 6, cursor: 'pointer', lineHeight: 0,
        color: copied ? T.emerald : T.textDim,
        opacity: copied ? 1 : hover ? 0.95 : 0.4,
        transition: 'opacity 120ms ease, color 120ms ease',
      }}
    >
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
    </button>
  );
}
