// components/montree/feedback/StatusChip.tsx
//
// The two chips every row, sheet and admin line reuses. Pure presentational
// and server-renderable: they take a status or a type and a language, and hold
// no state at all. Keeping them here rather than inlining a span in six places
// is what stops "Planned" being blue in one view and grey in another.

import type { Lang, PostStatus, PostType } from '@/lib/montree/feedback/types';
import { statusIsStruck, statusLabel, statusTone, typeLabel } from '@/lib/montree/feedback/statuses';

export function StatusChip({
  status,
  lang,
  className,
}: {
  status: PostStatus;
  lang: Lang;
  className?: string;
}) {
  const tone = statusTone(status);
  const classes = [
    'fb-chip',
    `fb-chip--${tone}`,
    statusIsStruck(status) ? 'fb-chip--struck' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return <span className={classes}>{statusLabel(status, lang)}</span>;
}

export function TypeChip({ type, lang }: { type: PostType; lang: Lang }) {
  return <span className="fb-chip">{typeLabel(type, lang)}</span>;
}

/** The small grey pill after a name: Teacher, Parent, Guide, Guest. */
export function RoleChip({ role, lang }: { role: string | null; lang: Lang }) {
  if (!role) return null;
  const labels: Record<string, Record<Lang, string>> = {
    teacher: { en: 'Teacher', zh: '老师' },
    principal: { en: 'Principal', zh: '园长' },
    homeschool_parent: { en: 'Parent', zh: '家长' },
    parent: { en: 'Parent', zh: '家长' },
    community: { en: 'Guide', zh: '引导员' },
    agent: { en: 'Guide', zh: '引导员' },
    org_admin: { en: 'Director', zh: '总监' },
    guest: { en: 'Guest', zh: '访客' },
  };
  const label = labels[role]?.[lang];
  if (!label) return null;
  return <span className="fb-chip">{label}</span>;
}
