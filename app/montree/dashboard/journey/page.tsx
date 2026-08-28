// /montree/dashboard/journey — The English Journey (v2: the player).
// One lit stage, one work at a time, matching → sounds → words → reading →
// writing — the whole English area as the same digital platform the Writing
// Shelf established. Data: lib/montree/journey/journey-data.ts (work-based
// steps, no external game links); works: components/montree/journey/.
'use client';

import '@/styles/dark-phonics-live-tokens.css';

import JourneyPlayer from '@/components/montree/journey/JourneyPlayer';

export default function JourneyPage() {
  return <JourneyPlayer />;
}
