// components/montree/Skeletons.tsx
// Reusable skeleton loading components for instant perceived performance.
// Shows content shapes instead of blank screens while data loads.
'use client';

import React from 'react';

// --- Base Skeleton Primitive ---

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded-lg ${className}`}
      style={style}
    />
  );
}

// --- Dashboard: Student Grid ---

export function DashboardSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header area */}
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-48" />
        <Bone className="h-8 w-8 rounded-full" />
      </div>
      {/* Student count */}
      <Bone className="h-5 w-32" />
      {/* Student grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Bone className="w-12 h-12 rounded-full" />
              <Bone className="h-5 w-20" />
            </div>
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Child Week View ---

export function WeekViewSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Child header */}
      <div className="flex items-center gap-3">
        <Bone className="w-14 h-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <Bone className="h-6 w-32" />
          <Bone className="h-4 w-24" />
        </div>
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        {['Week', 'Progress', 'Gallery', 'Reports'].map(t => (
          <Bone key={t} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      {/* Focus works */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Bone className="w-8 h-8 rounded-full" />
            <Bone className="h-5 flex-1" />
          </div>
          <div className="flex gap-2">
            <Bone className="h-7 w-20 rounded-full" />
            <Bone className="h-7 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Gallery Grid ---

export function GallerySkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-2 grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Bone key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}

// --- Progress Page ---

export function ProgressSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-50 p-4 text-center space-y-2">
            <Bone className="h-8 w-12 mx-auto" />
            <Bone className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
      {/* Area bars */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-8" />
          </div>
          <Bone className="h-3 w-full rounded-full" />
        </div>
      ))}
      {/* Photo strip */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="w-20 h-20 rounded-lg flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}

// --- RAZ Tracker ---

export function RAZSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-3">
      {/* Header + date */}
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-40" />
        <Bone className="h-9 w-36 rounded-lg" />
      </div>
      {/* Student cards */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3">
          <Bone className="w-10 h-10 rounded-full" />
          <Bone className="h-5 w-24 flex-1" />
          <div className="flex gap-1">
            <Bone className="h-8 w-16 rounded-lg" />
            <Bone className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Curriculum Page ---

export function CurriculumSkeleton() {
  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <Bone className="h-7 w-48" />
      {/* Area cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Bone className="w-10 h-10 rounded-full" />
            <Bone className="h-5 w-32" />
          </div>
          <Bone className="h-3 w-full rounded-full" />
          <Bone className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// --- Generic List ---

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Bone className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-3/4" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
