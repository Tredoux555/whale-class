// /parents — the Whale Class front door to Dark Phonics.
//
// 🚨 IT IS THE /dark-phonics HUB NOW (2026-09-18, owner's request: he opened
// teacherpotato.xyz/parents and expected the discussion board to be there).
// Same <HubServer/>, same three tabs, same `product:dark-phonics` board —
// ONE component with two mounts, not two pages to keep in step.
//
// What is different here, and only here:
//   - `variant="parents"` drops the hub's hero. These parents were handed the
//     tablet by their child's teacher and already know what this is; the shelf
//     is the first thing on the page, exactly as it was before the tabs.
//   - `backHref="/"` / "Home" keeps the way back to the Whale Class homepage
//     that this route has always offered.
//   - `basePath="/parents"` so switching tabs writes ?tab= onto THIS path, and
//     opening a lesson does not rewrite the address bar to /dark-phonics/l/<n>
//     — that would push a home-screen launch outside the PWA scope declared in
//     app/parents/layout.tsx (which is untouched: manifest, apple tags, all of
//     it, still exactly as it was).
//
// PUBLIC BY DESIGN, unchanged: '/parents' is in middleware's publicPaths and no
// auth runs on this route. The API routes the tabs call (/api/dark-phonics/*,
// /api/montree/feedback/v2/*) are outside the middleware matcher entirely, so
// the teacherpotato.xyz → montree.xyz host split never sees them — which is why
// the feedback board already worked on this host at /montree/library/feedback.
//
// Served on montree.xyz/parents too. That is the same shelf and the same board.

import HubServer from '@/components/montree/dark-phonics/HubServer';

export const dynamic = 'force-dynamic';

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return (
    <HubServer
      searchParams={sp}
      variant="parents"
      basePath="/parents"
      brandHref="/"
      backHref="/"
      backLabel="Home"
    />
  );
}
