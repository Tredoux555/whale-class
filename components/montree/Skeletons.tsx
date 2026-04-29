// components/montree/Skeletons.tsx
// Reusable skeleton loading components for instant perceived performance.
// Shows content shapes instead of blank screens while data loads.
// Dark forest visual treatment — all shapes preserved
'use client';

import React from 'react';

// Dark forest tokens
const SK = {
  bone: 'rgba(52,211,153,0.10)',
  cardBorder: 'rgba(52,211,153,0.15)',
  cardBg: 'rgba(255,255,255,0.04)',
};

const STYLE_TAG = (
  <style>{`
    @keyframes mt-skel-pulse {
      0%, 100% { opacity: 0.55; }
      50% { opacity: 1; }
    }
    .mt-bone { animation: mt-skel-pulse 1.6s ease-in-out infinite; }
  `}</style>
);

// --- Base Skeleton Primitive ---

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`mt-bone ${className}`}
      style={{
        background: SK.bone,
        borderRadius: 8,
        ...style,
      }}
    />
  );
}

const cardStyle: React.CSSProperties = {
  background: SK.cardBg,
  border: `1px solid ${SK.cardBorder}`,
  borderRadius: 16,
  padding: 14,
};

// --- Dashboard: Student Grid ---

export function DashboardSkeleton() {
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {STYLE_TAG}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Bone style={{ height: 32, width: 192 }} />
        <Bone style={{ height: 32, width: 32, borderRadius: '50%' }} />
      </div>
      <Bone style={{ height: 20, width: 128 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Bone style={{ width: 48, height: 48, borderRadius: '50%' }} />
              <Bone style={{ height: 20, width: 80 }} />
            </div>
            <Bone style={{ height: 12, width: '100%' }} />
            <Bone style={{ height: 12, width: '75%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Child Week View ---

export function WeekViewSkeleton() {
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {STYLE_TAG}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Bone style={{ width: 56, height: 56, borderRadius: '50%' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <Bone style={{ height: 24, width: 128 }} />
          <Bone style={{ height: 16, width: 96 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <Bone key={i} style={{ height: 36, width: 80, borderRadius: 999 }} />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bone style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <Bone style={{ height: 20, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Bone style={{ height: 28, width: 80, borderRadius: 999 }} />
            <Bone style={{ height: 28, width: 64, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Gallery Grid ---

export function GallerySkeleton({ count = 9 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {STYLE_TAG}
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} style={{ aspectRatio: '1 / 1', borderRadius: 14 }} />
      ))}
    </div>
  );
}

// --- Progress Page ---

export function ProgressSkeleton() {
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {STYLE_TAG}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              ...cardStyle,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Bone style={{ height: 32, width: 48 }} />
            <Bone style={{ height: 16, width: 64 }} />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Bone style={{ height: 16, width: 96 }} />
            <Bone style={{ height: 16, width: 32 }} />
          </div>
          <Bone style={{ height: 12, width: '100%', borderRadius: 999 }} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} style={{ width: 80, height: 80, borderRadius: 12, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

// --- RAZ Tracker ---

export function RAZSkeleton() {
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {STYLE_TAG}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Bone style={{ height: 28, width: 160 }} />
        <Bone style={{ height: 36, width: 144, borderRadius: 10 }} />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...cardStyle,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Bone style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <Bone style={{ height: 20, width: 96, flex: 1 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <Bone style={{ height: 32, width: 64, borderRadius: 10 }} />
            <Bone style={{ height: 32, width: 64, borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Curriculum Page ---

export function CurriculumSkeleton() {
  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {STYLE_TAG}
      <Bone style={{ height: 28, width: 192 }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ ...cardStyle, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bone style={{ width: 40, height: 40, borderRadius: '50%' }} />
            <Bone style={{ height: 20, width: 128 }} />
          </div>
          <Bone style={{ height: 12, width: '100%', borderRadius: 999 }} />
          <Bone style={{ height: 16, width: 80 }} />
        </div>
      ))}
    </div>
  );
}

// --- Generic List ---

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {STYLE_TAG}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
          <Bone style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bone style={{ height: 16, width: '75%' }} />
            <Bone style={{ height: 12, width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
