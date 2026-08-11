// components/cms/Chip.tsx
// Chip (pill, roomy — profile contexts) and Tag (rectangular, dense — roster
// rows). They share ONE tint scale, and that scale is a safety convention, not
// a decoration:
//
//     allergy → danger red     dietary → amber      pickup → Harbor blue
//     medical → amber          neutral → quiet grey
//
// A teacher learns the colours once and reads them at a glance for years, so
// nothing may re-map them locally. Pass a FlagCategory, get the right tint.

import type { ReactNode } from 'react';
import type { FlagCategory } from '@/lib/cms/engine/types';
import { AlertTriangleIcon, HandoverIcon, PillIcon, UtensilsIcon } from './icons';

const TONE: Record<FlagCategory, string> = {
  allergy: 'cms-tone-danger',
  dietary: 'cms-tone-amber',
  medical: 'cms-tone-amber',
  pickup: 'cms-tone-accent',
  neutral: 'cms-tone-quiet',
};

function iconFor(category: FlagCategory) {
  switch (category) {
    case 'allergy':
      return <AlertTriangleIcon />;
    case 'dietary':
      return <UtensilsIcon />;
    case 'medical':
      return <PillIcon />;
    case 'pickup':
      return <HandoverIcon />;
    default:
      return null;
  }
}

interface FlagVisualProps {
  category: FlagCategory;
  children: ReactNode;
  /** Small trailing qualifier — severity, a time. Rendered at 85% opacity. */
  detail?: string;
  withIcon?: boolean;
  className?: string;
}

export function Chip({
  category,
  children,
  detail,
  withIcon = true,
  className = '',
}: FlagVisualProps) {
  return (
    <span className={`cms-chip ${TONE[category]} ${className}`}>
      {withIcon ? iconFor(category) : null}
      <span>{children}</span>
      {detail ? <span className="opacity-70">· {detail}</span> : null}
    </span>
  );
}

export function Tag({
  category,
  children,
  detail,
  withIcon = false,
  className = '',
}: FlagVisualProps) {
  return (
    <span className={`cms-tag ${TONE[category]} ${className}`}>
      {withIcon ? iconFor(category) : null}
      <span>{children}</span>
      {detail ? <span className="opacity-70">· {detail}</span> : null}
    </span>
  );
}

/** Success / info tags that are not flags — attendance state, statuses. */
export function StatusTag({
  tone,
  children,
  className = '',
}: {
  tone: 'success' | 'muted' | 'accent';
  children: ReactNode;
  className?: string;
}) {
  return <span className={`cms-tag cms-tone-${tone} ${className}`}>{children}</span>;
}
