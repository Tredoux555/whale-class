// components/potato/PotatoBits.tsx
// The small shared pieces of the Potato Snaps interface: the mascot, the icon
// set, and the avatar. All inline SVG — ported from the approved design spec, so
// there is nothing to download and nothing to go missing behind the GFW.

'use client';

import React from 'react';

// ---------------------------------------------------------------- mascot ----

interface MascotProps {
  size: number;
  /** the little camera the potato holds — drop it below ~32px, it turns to mud */
  camera?: boolean;
  shadow?: boolean;
}

export function Mascot({ size, camera = true, shadow = true }: MascotProps) {
  const body = '#F3C56B';
  const edge = '#C9860B';
  const ink = '#23395B';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block', flex: 'none' }}
    >
      <ellipse cx="102" cy="186" rx="58" ry="8" fill={ink} opacity={shadow ? 0.07 : 0} />
      <path
        d="M100 22 C133 17 167 34 177 65 C187 96 180 133 152 155 C125 176 83 181 55 165 C25 148 11 112 19 79 C27 47 62 26 100 22 Z"
        fill={body}
        stroke={edge}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M45 66 C55 47 72 37 90 33" stroke="#FFFFFF" strokeOpacity=".34" strokeWidth="6" strokeLinecap="round" />
      <circle cx="152" cy="58" r="4" fill={edge} opacity=".38" />
      <circle cx="40" cy="122" r="3.4" fill={edge} opacity=".3" />
      <circle cx="124" cy="38" r="2.8" fill={edge} opacity=".26" />
      <ellipse cx="60" cy="106" rx="13" ry="9" fill="#FF7B6B" opacity=".38" />
      <ellipse cx="142" cy="106" rx="13" ry="9" fill="#FF7B6B" opacity=".38" />
      <circle cx="78" cy="84" r="7.5" fill={ink} />
      <circle cx="124" cy="84" r="7.5" fill={ink} />
      <circle cx="80.5" cy="81" r="2.4" fill="#FFFFFF" />
      <circle cx="126.5" cy="81" r="2.4" fill="#FFFFFF" />
      <path d="M87 104 Q101 118 115 104" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />
      {camera ? (
        <>
          <rect x="60" y="120" width="82" height="52" rx="16" fill="#9ED2F0" stroke={ink} strokeWidth="4.5" />
          <rect x="70" y="112" width="24" height="11" rx="5" fill="#FFD466" stroke={ink} strokeWidth="4" />
          <circle cx="101" cy="146" r="17" fill="#EAF6FD" stroke={ink} strokeWidth="4.5" />
          <circle cx="101" cy="146" r="8" fill={ink} opacity=".85" />
          <circle cx="96" cy="141" r="3" fill="#FFFFFF" />
          <circle cx="130" cy="130" r="3.4" fill="#FFD466" />
          <circle cx="60" cy="156" r="10" fill={body} stroke={edge} strokeWidth="4" />
          <circle cx="142" cy="156" r="10" fill={body} stroke={edge} strokeWidth="4" />
        </>
      ) : null}
    </svg>
  );
}

// ----------------------------------------------------------------- icons ----

interface IconProps {
  size?: number;
  color?: string;
}

export function IconCamera({ size = 26, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5h2.6l1.3-2.2h8.2l1.3 2.2H20a1.6 1.6 0 0 1 1.6 1.6v7.6A1.6 1.6 0 0 1 20 19.3H4a1.6 1.6 0 0 1-1.6-1.6v-7.6A1.6 1.6 0 0 1 4 8.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.6" r="3.5" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function IconMenu({ size = 20, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h15" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBack({ size = 20, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14.5 5.5 8 12l6.5 6.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheck({ size = 14, color = '#FFFDF6', weight = 3.4 }: IconProps & { weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.6 10 17.5 19 7" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFilm({ size = 18, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.6" y="5.4" width="18.8" height="13.2" rx="3" stroke={color} strokeWidth="2" />
      <path d="M2.6 9.6h18.8M8 5.6v3.8M16 5.6v3.8" stroke={color} strokeWidth="2" />
      <path d="M10.6 12.4v4l3.6-2-3.6-2Z" fill={color} />
    </svg>
  );
}

export function IconPlay({ size = 22, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.4 5.6 18 12l-9.6 6.4V5.6Z" fill={color} />
    </svg>
  );
}

export function IconPencil({ size = 16, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 19 .9-3.6L15.6 5.7a2 2 0 0 1 2.8 0l.9.9a2 2 0 0 1 0 2.8L9.6 19.1 5 19Z"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPrint({ size = 17, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.4 8.6V4.4h9.2v4.2" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path
        d="M7.4 17.6H5a1.6 1.6 0 0 1-1.6-1.6v-5.8A1.6 1.6 0 0 1 5 8.6h14a1.6 1.6 0 0 1 1.6 1.6V16a1.6 1.6 0 0 1-1.6 1.6h-2.4"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="7.4" y="14.2" width="9.2" height="5.4" rx="1.4" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus({ size = 18, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5.6v12.8M5.6 12h12.8" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ size = 15, color = '#D6503F' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.6 6.8h14.8M9.6 6.6V4.9h4.8v1.7M6.6 6.8l.9 12.3h9l.9-12.3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ------------------------------------------------------------ v1.1 icons ----

export function IconStar({ size = 15, color = '#23395B', filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.6l2.55 5.3 5.85.78-4.28 4.03 1.09 5.79L12 16.72 6.79 19.5l1.09-5.79L3.6 9.68l5.85-.78L12 3.6Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSpark({ size = 16, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.6c.9 5 3.5 7.6 8.5 8.4-5 .9-7.6 3.5-8.5 8.5-.9-5-3.5-7.6-8.5-8.5 5-.8 7.6-3.4 8.5-8.4Z" fill={color} />
    </svg>
  );
}

export function IconX({ size = 14, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevron({ size = 16, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.5 5.5 16 12l-6.5 6.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUpload({ size = 16, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16.4V4.9m0 0L7.6 9.3M12 4.9l4.4 4.4M4.6 15.6v2.4a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-2.4"
        stroke={color}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLock({ size = 13, color = '#23395B' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.8" y="10.4" width="14.4" height="9.2" rx="2.6" stroke={color} strokeWidth="2.1" />
      <path d="M8.4 10.2V8a3.6 3.6 0 0 1 7.2 0v2.2" stroke={color} strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconPeople({ size = 18, color = '#3E93C4' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8.4" r="3.4" stroke={color} strokeWidth="2" />
      <path d="M3.4 19.2c.5-3.2 2.8-5 5.6-5s5.1 1.8 5.6 5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M16.2 5.4a3.2 3.2 0 0 1 0 6.1M17.4 14.6c2 .5 3.4 2.2 3.8 4.6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ----------------------------------------------------------- brand marks ----

/**
 * v1.1 white-label lockup. The app advertises the school, not itself.
 *
 * Order is always SCHOOL first, CLASS second, Potato Snaps last. The school
 * mark is a rounded square (an uploaded asset of any shape, safely cropped);
 * the class emblem is a circle, matching the children's faces.
 *
 * With no upload yet, the fallback is INITIALS IN A CIRCLE at the same size and
 * weight, so the layout never shifts when HQ uploads. Never a potato — the
 * potato is our brand, not theirs.
 */
export function SchoolMark({
  url,
  initials,
  size = 44,
  radius,
}: {
  url?: string | null;
  initials: string;
  size?: number;
  radius?: number;
}) {
  const [broken, setBroken] = React.useState(false);
  const r = radius ?? Math.round(size * 0.28);
  if (url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="pt-brandmark"
        src={url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: r }}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <div
      className="pt-logoph"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34), borderRadius: r }}
    >
      {initials}
    </div>
  );
}

/** The class emblem: always a circle. Falls back to the class's own initials. */
export function EmblemMark({
  url,
  initials,
  size = 38,
}: {
  url?: string | null;
  initials: string;
  size?: number;
}) {
  return <SchoolMark url={url} initials={initials} size={size} radius={999} />;
}

// ---------------------------------------------------------------- avatar ----

const TINTS = ['#FFD466', '#9ED2F0', '#FFC6A8', '#CDE3F5', '#F4D68C', '#B9DFF3', '#FFDDCB', '#D9EAF7'];

/** Stable per-child tint — the same face keeps the same colour across screens. */
export function tintFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[hash % TINTS.length];
}

interface AvatarProps {
  name: string;
  seed?: string;
  url?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** dashed empty state — a child with no face photo yet */
  empty?: boolean;
}

const SIZE_CLASS: Record<string, string> = { xs: 'pt-av--xs', sm: 'pt-av--sm', md: '', lg: 'pt-av--lg' };

export function Avatar({ name, seed, url, size = 'md', empty = false }: AvatarProps) {
  const [broken, setBroken] = React.useState(false);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const showImage = !!url && !broken;
  const cls = `pt-av ${SIZE_CLASS[size] ?? ''} ${empty && !showImage ? 'pt-av--none' : ''}`.trim();
  return (
    <div className={cls} style={showImage ? undefined : { background: empty ? undefined : tintFor(seed || name) }}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url as string} alt="" onError={() => setBroken(true)} />
      ) : (
        initial
      )}
    </div>
  );
}
