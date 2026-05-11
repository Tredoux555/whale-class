// lib/montree/changelog.ts
// Canonical changelog data — append entries to the top. Both /changelog page
// and the in-app modal read from here, so there's exactly one source.
//
// Each entry has:
//   id           — stable slug used by localStorage to track "seen"
//   date         — ISO YYYY-MM-DD (display only)
//   title        — short, action-oriented
//   summary      — one paragraph, public-tone (no jargon, no "session N")
//   audience     — who should see this in the in-app modal
//                   'all'      — everyone
//                   'principal' — principals only
//                   'teacher'  — teachers only
//                   'agent'    — agents only
//   highlights   — optional bullet points

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  summary: string;
  audience: 'all' | 'principal' | 'teacher' | 'agent';
  highlights?: string[];
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: '2026-05-11-money-tab',
    date: '2026-05-11',
    title: 'Real money flows — Money tab + Stripe Connect payouts',
    summary:
      "If you're a principal, your billing now lands as a clean P&L view for Tredoux. If you're an agent, your earnings are now read from actual paid + pending payouts (not estimates). And the Stripe Connect wire-out automation means payouts are one-click for super-admin.",
    audience: 'all',
    highlights: [
      'Super-admin Money tab with full P&L (Revenue − Direct costs − Commissions − Op-expenses = Margin)',
      'Stripe Connect wire-out with idempotency key (no double-pay possible)',
      'Monthly accountant CSV export pack',
      'Agent dashboard reads actuals — paid + pending visible per period',
    ],
  },
  {
    id: '2026-05-11-parent-invites-bulk',
    date: '2026-05-11',
    title: 'Teacher-driven parent invites + bulk email',
    summary:
      "Teachers can now generate, share, and reset parent codes for the children in their classroom directly from the dashboard — and email them all at once.",
    audience: 'teacher',
    highlights: [
      'New Parent codes page in the 3-dot menu',
      'Email codes to multiple parents in one click',
      'Principals still see school-wide codes in their own panel',
    ],
  },
  {
    id: '2026-05-11-agent-messaging',
    date: '2026-05-11',
    title: 'Agent → principal messaging',
    summary:
      "Agents can now message principals of the schools they referred directly through Montree — no more relying on email bouncing between accounts.",
    audience: 'agent',
    highlights: [
      'Messages tab in the agent dashboard',
      'Thread per school, principal sees it as a normal communication',
      'Mira can help draft, you press send',
    ],
  },
  {
    id: '2026-05-11-system-health',
    date: '2026-05-11',
    title: 'System health dashboard',
    summary:
      "New super-admin Health tab shows database round-trip, Stripe webhook deliveries, AI cost trend, Web Vitals p75, recent payout calc runs, and active school count. Read at a glance.",
    audience: 'principal',
    highlights: [
      'Six health cards with status dots',
      'Recent payout periods table',
      '🔄 Run check button',
    ],
  },
  {
    id: '2026-05-11-trial-drip',
    date: '2026-05-11',
    title: 'Trial drip campaign + welcome-to-paid email',
    summary:
      "Trial schools now get gentle nudge emails on day 7, day 14, and day 25 of their trial — and an automatic welcome when their trial converts to paid.",
    audience: 'all',
  },
];

export function getChangelogEntries(audience?: ChangelogEntry['audience']): ChangelogEntry[] {
  if (!audience || audience === 'all') return CHANGELOG_ENTRIES;
  return CHANGELOG_ENTRIES.filter((e) => e.audience === 'all' || e.audience === audience);
}

/**
 * The most recent entry id — used by the in-app modal to track "seen".
 */
export function getLatestEntryId(): string {
  return CHANGELOG_ENTRIES[0]?.id || '';
}
