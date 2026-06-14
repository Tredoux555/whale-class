// lib/story/coach/profile.ts
//
// Joe's "information pack" about Tredoux — a static brief loaded from disk
// (about-tredoux.md) and injected into Joe's system prompt every turn so he
// always starts from who Tredoux is. Cached for the process lifetime; edit the
// .md and restart to update. The intake + memory enrich it over time.

import { readFile } from 'fs/promises';
import { join } from 'path';

const PROFILE_PATH = join(process.cwd(), 'lib/story/coach/about-tredoux.md');

let cached: string | null = null;
let cachedPromise: Promise<string> | null = null;

export async function getCoachProfile(): Promise<string> {
  if (cached !== null) return cached;
  if (cachedPromise) return cachedPromise;
  cachedPromise = readFile(PROFILE_PATH, 'utf8').catch((e) => {
    console.warn('[coach/profile] failed to load about-tredoux.md:', e instanceof Error ? e.message : 'unknown');
    return '';
  });
  try {
    cached = await cachedPromise;
    return cached;
  } finally {
    cachedPromise = null;
  }
}

export function resetCoachProfileCache(): void {
  cached = null;
  cachedPromise = null;
}
