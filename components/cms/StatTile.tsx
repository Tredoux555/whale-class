// components/cms/StatTile.tsx
// One number and its label. Used on the parent dashboard and the teacher Today
// page so both ends of the hourglass summarise themselves the same way.

import type { ReactNode } from 'react';

export function StatTile({
  value,
  label,
  tone = 'accent',
  icon,
}: {
  value: ReactNode;
  label: string;
  tone?: 'accent' | 'danger' | 'amber' | 'success';
  icon?: ReactNode;
}) {
  const toneClass = {
    accent: 'text-harbor-accent-deep',
    danger: 'text-harbor-danger-deep',
    amber: 'text-harbor-amber-deep',
    success: 'text-harbor-success',
  }[tone];

  return (
    <div className="cms-card px-4 py-3.5 flex items-center gap-3.5">
      {icon ? (
        <span className={`cms-card-sunk grid place-items-center w-9 h-9 ${toneClass}`}>
          <span className="w-[18px] h-[18px] block">{icon}</span>
        </span>
      ) : null}
      <span className="min-w-0">
        <span className={`block font-head text-[26px] leading-none ${toneClass}`}>{value}</span>
        <span className="block text-[12px] text-harbor-muted mt-1.5 leading-tight">{label}</span>
      </span>
    </div>
  );
}
