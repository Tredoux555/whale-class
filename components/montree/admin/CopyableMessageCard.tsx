// components/montree/admin/CopyableMessageCard.tsx
//
// When Astra generates a draft message (welcome to teachers, parent reply,
// social media copy, anything copy-paste-ready) it renders as a styled
// card with a copy icon — like Claude's code blocks, but for plain text.
// The principal taps the icon, the message lands on her clipboard ready
// to paste into WhatsApp / Gmail / WeChat / wherever it actually goes.
//
// Astra is instructed (in lib/montree/tracy/system-prompt.ts) to wrap every
// such message in a markdown code fence, with an optional bold recipient
// label on the line just before the fence. The body renderer detects this
// shape and substitutes <CopyableMessageCard /> for the plain code block.
//
// CRITICAL: this card renders PLAIN TEXT, not syntax-highlighted code.
// We intentionally don't use a <pre><code> monospace presentation — the
// content is human prose, just framed in a beautiful container with a
// one-tap copy icon. Inter, line-height 1.6, white at 95% opacity.
'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableMessageCardProps {
  /** The message text to copy. Rendered with whitespace preserved. */
  text: string;
  /** Optional recipient label rendered as a heading above the card. */
  recipient?: string;
}

const GOLD = '#E8C96A';
const EMERALD = '#34d399';
const TEXT_SOFT = 'rgba(255,255,255,0.95)';
const CARD_BG = 'rgba(8,20,12,0.55)';
const CARD_BORDER = 'rgba(52,211,153,0.28)';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';
const SERIF = 'var(--font-lora), Georgia, serif';

export default function CopyableMessageCard({
  text,
  recipient,
}: CopyableMessageCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers / non-secure contexts (rare on phone PWAs).
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('[CopyableMessageCard] copy failed', err);
    }
  }, [text]);

  return (
    <div style={{ marginTop: 12, marginBottom: 12 }}>
      {recipient && (
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 15,
            fontWeight: 600,
            color: GOLD,
            marginBottom: 6,
            letterSpacing: -0.1,
          }}
        >
          {recipient}
        </div>
      )}
      <div
        style={{
          position: 'relative',
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 12,
          padding: '14px 44px 14px 16px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontSize: 14,
            lineHeight: 1.6,
            color: TEXT_SOFT,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied' : 'Copy message'}
          title={copied ? 'Copied' : 'Copy'}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 30,
            height: 30,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: copied ? 'rgba(52,211,153,0.18)' : 'rgba(0,0,0,0.30)',
            border: `1px solid ${
              copied ? 'rgba(52,211,153,0.45)' : 'rgba(232,201,106,0.32)'
            }`,
            borderRadius: 8,
            color: copied ? EMERALD : GOLD,
            cursor: 'pointer',
            transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
          }}
        >
          {copied ? (
            <Check size={15} strokeWidth={2.25} />
          ) : (
            <Copy size={14} strokeWidth={1.85} />
          )}
        </button>
        {copied && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -10,
              right: 8,
              fontFamily: SANS,
              fontSize: 11,
              fontWeight: 600,
              color: EMERALD,
              background: 'rgba(8,20,12,0.94)',
              padding: '2px 8px',
              borderRadius: 6,
              border: '1px solid rgba(52,211,153,0.35)',
              pointerEvents: 'none',
            }}
          >
            Copied
          </span>
        )}
      </div>
    </div>
  );
}
