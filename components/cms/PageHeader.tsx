// components/cms/PageHeader.tsx
// Title + subtitle + optional actions. One component so every screen's first
// 80px are identical and a new page cannot invent its own heading rhythm.

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow ? <span className="cms-label mb-2">{eyebrow}</span> : null}
        <h1 className="font-head text-[30px] leading-[1.12] m-0">{title}</h1>
        {subtitle ? (
          <p className="text-[14px] text-harbor-muted leading-relaxed mt-2 mb-0 max-w-[62ch]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
