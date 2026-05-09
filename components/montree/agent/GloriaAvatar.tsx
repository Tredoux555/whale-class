// components/montree/agent/GloriaAvatar.tsx
//
// Gloria's avatar. Mirror of TracyAvatar — falls back to a CSS-rendered
// monogram if the PNG isn't on disk yet. Drop a 1024×1024 PNG at
// /public/gloria-avatar.png to activate the image variant.

import { useState } from 'react';

interface GloriaAvatarProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function GloriaAvatar({ size = 56, className, style }: GloriaAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const radius = Math.round(size * 0.22); // rounded square — same as Tracy

  if (imgError) {
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
          fontFamily: '"Lora", Georgia, serif',
          fontSize: Math.round(size * 0.42),
          fontWeight: 600,
          letterSpacing: -1,
          border: '1px solid rgba(232,201,106,0.30)',
          ...style,
        }}
      >
        G
      </div>
    );
  }

  return (
    <img
      src="/gloria-avatar.png"
      alt="Gloria"
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
