// components/cms/Card.tsx
// The surface primitive. Every panel in CMS is one of these — a white card, a
// hairline border, one very soft fall. Same law as the buttons: the visual
// treatment lives in app/globals.css (.cms-card), never at a call site.

import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padded = true,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <Tag className={`cms-card ${padded ? 'p-5' : ''} ${className}`}>{children}</Tag>;
}

/** A quieter inset panel used inside a Card — notes, help text, sub-sections. */
export function SunkPanel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`cms-card-sunk p-3.5 ${className}`}>{children}</div>;
}

/** The tiny uppercase label above a group of facts. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="cms-label mb-1.5">{children}</span>;
}
