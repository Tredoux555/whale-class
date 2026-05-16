// components/montree/MontreeMark.tsx
//
// Canonical Montree brand mark — gold M monogram on dark forest gradient,
// rounded square. Mirrors the Mira avatar aesthetic (see MiraAvatar.tsx)
// because the user explicitly asked for "the beautiful M logo we created
// for Mira" to become the brand mark across the product.
//
// Replaces the historic 🌿 / 🌳 emoji marks on the landing nav, login-select
// splash, principal setup/register, and footer chips.
//
// Sizes commonly used:
//   - 14   tiny footer chip
//   - 28   landing nav inline
//   - 44   login-select splash hero
//   - 56+  large standalone hero icon
//
// The M sits in Lora serif (matching the brand wordmark) at ~42% of the
// container, soft gold (#E8C96A), against a brand-emerald → dark-forest
// gradient with a subtle gold border + drop shadow.

import type { CSSProperties } from 'react';

interface MontreeMarkProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /**
   * When true (default), shows the tiny gold star "spark" in the top-right
   * corner — preserves the bit of visual punctuation the leaf-emoji version
   * had via the .m-logo-mark::after pseudo-element. Pass false for footer
   * chips / small contexts where the spark would be visual noise.
   */
  withSpark?: boolean;
}

export default function MontreeMark({
  size = 28,
  className,
  style,
  withSpark = true,
}: MontreeMarkProps) {
  const radius = Math.max(6, Math.round(size * 0.26));
  const fontSize = Math.round(size * 0.5);
  const sparkSize = Math.max(4, Math.round(size * 0.22));
  const sparkOffset = -Math.max(2, Math.round(size * 0.07));

  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg, #1D6B48 0%, #0c2419 100%)',
        border: '1px solid rgba(130,217,174,0.22)',
        boxShadow:
          '0 1px 0 rgba(130,217,174,0.18) inset,' +
          ` 0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.65)}px -${Math.round(size * 0.22)}px rgba(6,20,14,0.8)`,
        flexShrink: 0,
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-lora), Georgia, serif',
          fontSize,
          fontWeight: 600,
          color: '#E8C96A',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          // Subtle inner-glow so the M reads as luminous against the dark
          // forest gradient — same emotional cue as the gold spark.
          textShadow: '0 0 6px rgba(232,201,106,0.32)',
          // Optical-center the M vertically (Lora's lowercase x-height pulls
          // it down a touch; this nudges it back to true center).
          transform: 'translateY(-0.04em)',
        }}
      >
        M
      </span>
      {withSpark && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: sparkOffset,
            right: sparkOffset,
            width: sparkSize,
            height: sparkSize,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, #FFF6D6 0%, #E8C96A 55%, #b88f25 100%)',
            boxShadow:
              `0 0 ${Math.round(sparkSize * 1.4)}px rgba(232,201,106,0.55),` +
              ' 0 0 0 1px rgba(8,26,18,0.6)',
            pointerEvents: 'none',
          }}
        />
      )}
    </span>
  );
}
