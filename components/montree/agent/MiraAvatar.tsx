// components/montree/agent/MiraAvatar.tsx
//
// Mira's avatar. Mirror of TracyAvatar — falls back to a CSS-rendered
// monogram if the PNG isn't on disk yet.
//
// 🚨 Phase 5 polish: by default we render the CSS monogram only, to silence
// the 6+ console 404s per agent page load. When you actually drop a
// 1024×1024 PNG at /public/mira-avatar.png, flip MIRA_PNG_AVAILABLE to true
// (one-line change) and the <img> tag activates. The onError fallback path
// stays so it remains resilient.

import { useState } from 'react';

/**
 * Flip to `true` once `/public/mira-avatar.png` exists. Until then, the
 * component renders the CSS monogram only (no <img> request, no 404 noise).
 */
const MIRA_PNG_AVAILABLE = false;

interface MiraAvatarProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function MiraAvatar({ size = 56, className, style }: MiraAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const radius = Math.round(size * 0.22); // rounded square — same as Astra

  if (!MIRA_PNG_AVAILABLE || imgError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #2a3f2c 0%, #1a2e20 100%)',
          color: '#E8C96A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize: Math.round(size * 0.42),
          fontWeight: 600,
          letterSpacing: -1,
          border: '1px solid rgba(232,201,106,0.30)',
          ...style,
        }}
      >
        M
      </div>
    );
  }

  return (
    // 🚨 Perf Tier 5.1 — explicit width/height attrs prevent CLS when the
    // avatar PNG finishes loading. Parity with TracyAvatar.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mira-avatar.png"
      alt="Mira"
      width={size}
      height={size}
      onError={() => setImgError(true)}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        objectFit: 'cover',
        border: '1px solid rgba(232,201,106,0.30)',
        ...style,
      }}
    />
  );
}
