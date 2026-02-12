'use client';

import { AREA_CONFIG } from '@/lib/montree/types';

interface AreaBadgeProps {
  area: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
};

// Normalize area key variants to canonical AREA_CONFIG keys
// Handles: shorthand keys ('math', 'culture'), display names ('Practical Life'), canonical keys
export function normalizeArea(area: string): string {
  if (area === 'math') return 'mathematics';
  if (area === 'culture') return 'cultural';
  // Handle display names: 'Practical Life' → 'practical_life', 'Mathematics' → 'mathematics'
  if (area.includes(' ') || area[0] === area[0].toUpperCase()) {
    const snaked = area.toLowerCase().replace(/\s+/g, '_');
    if (AREA_CONFIG[snaked]) return snaked;
  }
  return area;
}

export default function AreaBadge({ area, size = 'md', className }: AreaBadgeProps) {
  const normalized = normalizeArea(area);
  const config = AREA_CONFIG[normalized] || { name: area, icon: '?', color: '#888' };
  return (
    <span
      className={`${SIZES[size]} rounded-full inline-flex items-center justify-center font-bold text-white flex-shrink-0 shadow-sm ${className || ''}`}
      style={{ backgroundColor: config.color }}
    >
      {config.icon}
    </span>
  );
}
