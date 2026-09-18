// app/dark-phonics/page.tsx
//
// montree.xyz/dark-phonics — the hub. Play · Classroom · Community, no signup.
//
// A thin server page: everything it does is in HubServer, which /dark-phonics/
// l/[n] mounts too, so the plain hub and a deep link cannot drift apart.
//
// force-dynamic because the paywall, the language cookie and the community
// board are all per-request. Nothing here is expensive: the board's first page
// is one indexed query and the rest of the page is static markup.

import HubServer from '@/components/montree/dark-phonics/HubServer';

export const dynamic = 'force-dynamic';

export default async function DarkPhonicsHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  return <HubServer searchParams={sp} />;
}
