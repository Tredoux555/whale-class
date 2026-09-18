// components/montree/dark-phonics/HubServer.tsx
//
// The server half of the hub, shared by /dark-phonics and /dark-phonics/l/[n].
//
// It does the three things a client component cannot: read the paywall (which
// needs the community session cookie and the subscriptions table), read the
// language cookie, and fetch the Community board's first page directly through
// the repo — no internal HTTP hop, so the discussion is in the HTML even for a
// visitor whose JavaScript has not arrived yet.
//
// Everything interactive is handed to <DarkPhonicsHub/>, which is the client
// island. The Community panel is passed to it as a prop (a server-rendered
// ReactNode), which is how a client component gets to host server-fetched
// content without becoming a server component itself.

import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';

import '@/components/montree/feedback/feedback.css';

import BoardNotReady from '@/components/montree/feedback/BoardNotReady';
import FeedbackBoard from '@/components/montree/feedback/FeedbackBoard';
import { db } from '@/lib/montree/feedback/data';
import { clientViewer, getPageContext } from '@/lib/montree/feedback/server';
import type { ListResult } from '@/lib/montree/feedback/types';

import {
  DP_FREE_LESSONS,
  accessFor,
  isPaywallOn,
  type DpTier,
} from '@/lib/montree/dark-phonics/access';
import { isHubLang, type HubLang } from '@/lib/montree/dark-phonics/hub-strings';
import DarkPhonicsHub, { type HubVariant } from './DarkPhonicsHub';
import type { HubTab } from './HubTabs';

/** The Dark Phonics community board's ref. One constant, used by the page, the
 *  migration's seed row and the docs. */
export const DP_BOARD_REF = 'product:dark-phonics';
export const DP_BOARD_HREF = '/dark-phonics?tab=community';
/** The migration that seeds DP_BOARD_REF — what the not-ready state points at. */
const DP_MIGRATION = '360_dark_phonics_hub.sql';

const EMPTY_LIST: ListResult = {
  posts: [],
  nextCursor: null,
  counts: { all: 0, problem: 0, idea: 0, question: 0, discussion: 0 },
};

/**
 * The paywall answer for a server render.
 *
 * getDarkPhonicsAccess() in access.ts takes a NextRequest, which a page does
 * not have; this is the next/headers twin of it, with the same fail-open
 * posture and the same single source of truth for the rule (accessFor).
 */
async function readTier(): Promise<{ tier: DpTier; paywallOn: boolean }> {
  const paywallOn = isPaywallOn();
  if (!paywallOn) return { tier: 'full', paywallOn: false };

  try {
    const { COMMUNITY_COOKIE, verifyCommunityToken } = await import('@/lib/montree/community/auth');
    const jar = await cookies();
    const token = jar.get(COMMUNITY_COOKIE)?.value;
    const userId = token ? await verifyCommunityToken(token) : null;
    if (!userId) return { tier: 'free', paywallOn: true };

    const { getSupabase } = await import('@/lib/supabase-client');
    const { data, error } = await getSupabase()
      .from('montree_dp_subscriptions')
      .select('status, current_period_end')
      .eq('community_user_id', userId)
      .maybeSingle();
    if (error) {
      console.error('[dp/hub] subscription lookup failed; failing OPEN:', error.message);
      return { tier: 'full', paywallOn: true };
    }
    const access = accessFor({
      paywallOn: true,
      userId,
      subscriptionStatus: (data?.status as string | undefined) ?? null,
      currentPeriodEnd: (data?.current_period_end as string | undefined) ?? null,
    });
    return { tier: access.tier, paywallOn: true };
  } catch (err) {
    console.error('[dp/hub] access read threw; failing OPEN:', err);
    return { tier: 'full', paywallOn: true };
  }
}

async function readLang(override?: unknown): Promise<HubLang> {
  if (isHubLang(override)) return override;
  try {
    const jar = await cookies();
    return jar.get('fb_lang')?.value === 'zh' ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

/** The Community tab's body, or the calm "not set up yet" state. */
async function CommunityPanel({ lang }: { lang: HubLang }) {
  const ctx = await getPageContext(DP_BOARD_REF, lang);
  if (!ctx.board || ctx.notReady) {
    return <BoardNotReady lang={ctx.lang} migration={DP_MIGRATION} />;
  }

  let initial = EMPTY_LIST;
  try {
    initial = await db.listPosts(ctx.board.id, { sort: 'trending' }, ctx.viewer.key);
  } catch (err) {
    console.error('[dp/hub] community list failed', err);
    return <BoardNotReady lang={ctx.lang} migration={DP_MIGRATION} />;
  }

  return (
    <div className="fb-root dp-board" lang={ctx.lang === 'zh' ? 'zh-Hans' : 'en'}>
      <div className="fb-page">
        <main className="fb-main">
          <FeedbackBoard
            board={ctx.board.ref}
            boardName={ctx.lang === 'zh' ? 'Dark Phonics 社区' : ctx.board.name}
            lang={ctx.lang}
            viewer={clientViewer(ctx.viewer)}
            initial={initial}
            hrefBase={DP_BOARD_HREF}
          />
        </main>
      </div>
    </div>
  );
}

export interface HubServerProps {
  searchParams: Record<string, string | string[] | undefined>;
  /** Set by the /l/[n] deep link; null on the plain hub. */
  lesson?: number | null;
  tab?: HubTab;
  /** 'hub' (montree.xyz/dark-phonics) or 'parents' (the Whale Class door). */
  variant?: HubVariant;
  /** The route this hub is mounted at — what ?tab= is written back onto. */
  basePath?: string;
  brandHref?: string;
  backHref?: string;
  backLabel?: string;
}

export default async function HubServer({
  searchParams,
  lesson = null,
  tab,
  variant = 'hub',
  basePath = '/dark-phonics',
  brandHref = '/montree',
  backHref,
  backLabel,
}: HubServerProps) {
  const [{ tier, paywallOn }, lang] = await Promise.all([readTier(), readLang(searchParams.lang)]);

  // A deep link always lands on Play; otherwise ?tab= decides, defaulting to
  // play. An unknown tab is play, not a 404 — a mistyped share link should
  // still show somebody a lesson.
  const rawTab = Array.isArray(searchParams.tab) ? searchParams.tab[0] : searchParams.tab;
  const resolvedTab: HubTab =
    tab ?? (rawTab === 'classroom' || rawTab === 'community' ? rawTab : 'play');

  const search = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  ).toString();

  return (
    <DarkPhonicsHub
      initialTab={resolvedTab}
      initialLesson={lesson}
      initialLang={lang}
      tier={tier}
      paywallOn={paywallOn}
      search={search ? `?${search}` : ''}
      variant={variant}
      basePath={basePath}
      brandHref={brandHref}
      backHref={backHref}
      backLabel={backLabel}
      communitySlot={
        <Suspense fallback={<div className="dp-loading" />}>
          {/* Rendered on every request, not only when the tab is open: the
              board is the one panel that needs the database, and streaming it
              here means switching to Community is instant. */}
          <CommunityPanel lang={lang} />
        </Suspense>
      }
    />
  );
}

/** Re-exported so the pages and the OG routes agree on the free list. */
export { DP_FREE_LESSONS };

/** The absolute origin, for canonical + OG urls. */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  } catch {
    /* fall through */
  }
  return 'https://montree.xyz';
}
