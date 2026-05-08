// components/montree/admin/TracyAvatar.tsx
//
// Tracy's avatar — gold T monogram, falls back to a CSS-rendered placeholder
// if /public/tracy-avatar.png is missing in the deploy. Shared between the
// /montree/admin chat page and the TracyFloat (cockpit-wide). Keep this file
// the single source of truth for avatar rendering — bumping the version or
// swapping the asset only needs one edit.
'use client';

import { useState } from 'react';

// Bump this every time /public/tracy-avatar.png contents change. Appended as
// a query string on the <img src> so Chrome / Safari / Firefox treat it as
// a fresh URL and bypass their HTTP image cache. Without this, swapping the
// avatar bytes leaves users staring at the previously-cached image for hours.
// History: v1 = original T monogram (Session 87), v2 = stretched-borders T
// monogram, v3 = watercolor portrait, v4 = back to T monogram for comparison.
export const TRACY_AVATAR_VERSION = 4;

// Crop shape — must match the active avatar's composition:
//   'square' (radius 22%) → T monogram. Preserves the sprout+stem at the
//                          bottom edge that a circle crop would clip.
//   'circle' (radius 50%) → watercolor portrait. Lets cream/peach
//                          brushstrokes feather into the dark forest UI.
export const TRACY_AVATAR_SHAPE: 'square' | 'circle' = 'square';

const GOLD = '#E8C96A';
const GOLD_ON_GOLD = '#2a1f08';
const SERIF = '"Lora", Georgia, serif';

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
        T
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/tracy-avatar.png?v=${TRACY_AVATAR_VERSION}`}
      alt="Tracy"
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
