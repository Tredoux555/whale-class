// components/montree/admin/TracyAvatar.tsx
//
// Astra's avatar — gold "A" monogram (Lora serif on a gold gradient square),
// falls back to a CSS-rendered "A" placeholder if /public/astra-avatar.png is
// missing in the deploy. Shared between the /montree/admin chat page and the
// TracyFloat (cockpit-wide). Keep this file the single source of truth for
// avatar rendering — bumping the version or swapping the asset only needs one
// edit here.
'use client';

import { useState } from 'react';

// Asset path — Session 137 swapped the stale Tracy "T" monogram for a proper
// Astra "A" monogram (the AI was renamed Tracy → Astra in Session 136 but the
// avatar still showed a "T"). The file is /public/astra-avatar.png.
export const ASTRA_AVATAR_SRC = '/astra-avatar.png';

// Bump this every time the avatar asset contents change. Appended as a query
// string on the <img src> so Chrome / Safari / Firefox treat it as a fresh URL
// and bypass their HTTP image cache. Without this, swapping the avatar bytes
// leaves users staring at the previously-cached image for hours.
// History: v1-v4 = various Tracy "T" monograms / watercolor (Sessions 87-136).
// v5 = Astra "A" monogram, Lora-Bold on gold gradient (Session 137).
export const TRACY_AVATAR_VERSION = 5;

// Crop shape — must match the active avatar's composition:
//   'square' (radius 22%) → monogram. Full-bleed gold square; CSS rounds the
//                          corners. The "A" is centered so a rounded-square
//                          crop never clips it.
//   'circle' (radius 50%) → reserved for a future portrait-style avatar.
export const TRACY_AVATAR_SHAPE: 'square' | 'circle' = 'square';

const GOLD = '#E8C96A';
const GOLD_ON_GOLD = '#2a1f08';
const SERIF = 'var(--font-lora), Georgia, serif';

export default function TracyAvatar({ size = 36 }: { size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: GOLD,
          color: GOLD_ON_GOLD,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SERIF,
          fontSize: Math.round(size * 0.47),
          fontWeight: 500,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        A
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${ASTRA_AVATAR_SRC}?v=${TRACY_AVATAR_VERSION}`}
      alt="Astra"
      onError={() => setImgFailed(true)}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius:
          TRACY_AVATAR_SHAPE === 'circle' ? '50%' : Math.round(size * 0.22),
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
      }}
    />
  );
}
