// components/montree/onboarding-copilot/AnchorPulse.tsx
// Soft emerald pulsing ring drawn over an existing on-page element that carries
// a `data-copilot="<anchor>"` attribute. Pure overlay — pointer-events: none,
// portalled to <body>, z-index BELOW the dock. If the anchor isn't present on
// the current page (or has zero size, e.g. a display:none sidebar mirror) it
// renders nothing and never errors. Reposition is rAF-throttled on scroll/resize
// with a light interval to catch elements that mount after tab/route changes.
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface AnchorPulseProps {
  /** The `data-copilot` value to locate on the current page. */
  anchor: string;
}

export default function AnchorPulse({ anchor }: AnchorPulseProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!anchor) {
      setRect(null);
      return;
    }
    const sel = `[data-copilot="${anchor}"]`;
    let raf = 0;

    const update = () => {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        // Zero-size = hidden (e.g. desktop sidebar mirror on mobile) → treat as
        // absent so we don't draw a stray ring at 0,0.
        setRect(r.width > 0 && r.height > 0 ? r : null);
      } else {
        setRect(null);
      }
    };

    const onScrollResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    update();
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    // Re-find the element in case it mounts after this effect (tab switch, lazy
    // section). Cheap: a single querySelector + getBoundingClientRect.
    const interval = window.setInterval(update, 500);

    return () => {
      window.removeEventListener('scroll', onScrollResize, true);
      window.removeEventListener('resize', onScrollResize);
      if (raf) cancelAnimationFrame(raf);
      window.clearInterval(interval);
    };
  }, [anchor]);

  if (!mounted || !rect) return null;

  return createPortal(
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: rect.left - 8,
          top: rect.top - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: 14,
          border: '2px solid rgba(52,211,153,0.55)',
          pointerEvents: 'none',
          zIndex: 8999,
          animation: 'copilot-anchor-pulse 1.8s ease-in-out infinite',
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes copilot-anchor-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.32); opacity: 0.9; }
  50% { box-shadow: 0 0 0 10px rgba(52,211,153,0); opacity: 0.5; }
}`,
        }}
      />
    </>,
    document.body
  );
}
