// components/lens/LensChrome.tsx
// The small pieces of furniture every Lens screen shares.
//
// Deliberately NOT a Montree component: nothing here imports DashboardHeader,
// the .btn system, or any Montree nav. Lens has one user and no site-wide
// navigation to speak of — a back chevron and a title is the whole chrome.

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BTN_GHOST, RULE } from '@/lib/lens/ui';

export function LensHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string | null;
  /** A href, or 'auto' to use browser history. Omit for no back control. */
  back?: string | 'auto';
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="ln-noprint sticky top-0 z-20 -mx-5 mb-4 border-b border-[rgba(52,211,153,0.15)] bg-[#0A1A0F]/95 px-5 pb-3 pt-3 backdrop-blur">
      <div className="flex items-center gap-2">
        {back && (
          <button
            type="button"
            aria-label="Back"
            className={`${BTN_GHOST} -ml-2 px-2`}
            onClick={() => (back === 'auto' ? router.back() : router.push(back))}
          >
            <span aria-hidden className="text-lg leading-none">
              ‹
            </span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-lg text-forest-text">{title}</h1>
          {subtitle && <p className="truncate text-[12px] text-forest-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className={`${RULE} mt-3`} />
    </header>
  );
}

/** "3 waiting to upload" — the honest state of the device queue. */
export function QueuePill({
  waiting,
  syncing,
  rejected,
  onRetry,
}: {
  waiting: number;
  syncing: boolean;
  rejected: number;
  onRetry: () => void;
}) {
  if (waiting === 0 && rejected === 0) return null;
  return (
    <div className="ln-noprint flex items-center gap-2 text-[12px]">
      {waiting > 0 && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-[rgba(232,201,106,0.35)] bg-[rgba(232,201,106,0.10)] px-3 py-1.5 text-forest-gold"
        >
          {syncing ? 'Uploading…' : `${waiting} waiting`}
        </button>
      )}
      {rejected > 0 && (
        <span className="rounded-full border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.10)] px-3 py-1.5 text-forest-danger">
          {rejected} couldn’t save
        </span>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[rgba(52,211,153,0.22)] px-5 py-8 text-center">
      <p className="font-serif text-[17px] text-forest-text">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-forest-muted">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-[13px] text-forest-danger">
      {message}
    </p>
  );
}

export function RowLink({
  href,
  title,
  meta,
  badge,
}: {
  href: string;
  title: string;
  meta?: string | null;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="ln-tap flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)] px-4 py-3 transition active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-forest-text">{title}</p>
        {meta && <p className="truncate text-[12px] text-forest-muted">{meta}</p>}
      </div>
      {badge}
      <span aria-hidden className="text-forest-muted">
        ›
      </span>
    </Link>
  );
}
