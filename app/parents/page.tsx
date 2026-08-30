// /parents — the Whale Class front door to the parent-led Dark Phonics lessons.
//
// teacherpotato.xyz's middleware bounces /montree/* (except the library) to
// montree.xyz, so the parent-led lesson gets this top-level Whale-Class route:
// the same <ParentLedLessons /> the parent portal serves at
// /montree/parent/lessons, zero auth, local state only. Linked from the
// homepage "Parents" tab, which replaced the "Interactive" tab (that tab's
// English Journey player stays available to teachers at
// /montree/dashboard/journey, and /interactive now redirects here).
//
// PUBLIC BY DESIGN: nothing here is private — public curriculum art and text,
// every bit of lesson state local to the tab, no server writes at all. The
// route is listed in middleware's publicPaths exactly as '/interactive' was.
'use client';

import '@/styles/dark-phonics-live-tokens.css';

import ParentLedLessons from '@/components/montree/dark-phonics-live/ParentLedLessons';

export default function ParentsPage() {
  return <ParentLedLessons backHref="/" backLabel="Home" />;
}
