// lib/story/coach/profile.ts
//
// The Coach's "information pack" about the PERSON it belongs to — a static brief
// loaded from disk (about-<space>.md) and injected into the system prompt every
// turn so the coach always starts from who this person is.
//
// MULTI-SPACE: each sanctuary (space) has its own brief. about-tredoux.md is the
// owner's; about-riddick.md is his son's; future people get about-<space>.md.
// If a space has no brief yet, we return '' and the coach gets to know them
// through conversation + memory (the system prompt handles the empty case).
//
// Cached per space for the process lifetime; edit the .md and restart to update.

import { readFile } from 'fs/promises';
import { join } from 'path';

const PROFILE_DIR = join(process.cwd(), 'lib/story/coach');

// space label -> loaded brief (or '' if missing)
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

/** Only allow a safe filename segment so `space` can never traverse the FS. */
function safeSpace(space: string): string {
  return (space || 'tredoux').toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

/**
 * Optional override when a space label differs from how the person should be
 * addressed. Defaults to title-casing the label ('tredoux' -> 'Tredoux').
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  // e.g. 'bayan': 'Bayan'  — only needed if the label ≠ the name
};

export function displayNameForSpace(space: string): string {
  const s = safeSpace(space);
  if (DISPLAY_NAME_OVERRIDES[s]) return DISPLAY_NAME_OVERRIDES[s];
  if (!s) return 'you';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Load the brief for a given space. Returns '' if there isn't one. */
export async function getCoachProfile(space: string): Promise<string> {
  const s = safeSpace(space);
  const hit = cache.get(s);
  if (hit !== undefined) return hit;

  const existing = inflight.get(s);
  if (existing) return existing;

  const path = join(PROFILE_DIR, `about-${s}.md`);
  const p = readFile(path, 'utf8').catch((e) => {
    // Missing brief is normal for a brand-new space — log softly, return ''.
    console.warn(
      `[coach/profile] no brief for space="${s}" (${path}):`,
      e instanceof Error ? e.message : 'unknown'
    );
    return '';
  });
  inflight.set(s, p);
  try {
    const text = await p;
    cache.set(s, text);
    return text;
  } finally {
    inflight.delete(s);
  }
}

export function resetCoachProfileCache(): void {
  cache.clear();
  inflight.clear();
}
