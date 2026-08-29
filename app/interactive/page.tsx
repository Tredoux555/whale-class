// /interactive — the Whale Class front door to The English Journey.
//
// teacherpotato.xyz's middleware bounces /montree/* (except the library) to
// montree.xyz, so the journey player gets this top-level Whale-Class route:
// same JourneyPlayer the Montree dashboard serves at /montree/dashboard/journey,
// zero auth, local state only. Linked from the homepage "Interactive" tab
// (which replaced the hidden Games tab per Tredoux, Aug 29 2026).
'use client';

import '@/styles/dark-phonics-live-tokens.css';

import JourneyPlayer from '@/components/montree/journey/JourneyPlayer';

export default function InteractivePage() {
  return <JourneyPlayer />;
}
