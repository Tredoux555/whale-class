// lib/cms/engine/guru-feed.ts
// ============================================================================
// THE FEED — a CMS child profile, in the shape the Montree Guru already reads.
// ============================================================================
// Phase 3's "About your child" step is the first CMS record with a SECOND
// consumer outside CMS: Montree's teaching assistant. This module is the whole
// translation, and it is a pure function — no I/O, no Supabase, no React, in
// keeping with the engine's rules. The montree side calls it with rows it has
// already fetched; the CMS side calls it to render the same summary for a
// teacher. One mapping, two readers, no drift.
//
// ── WHY THIS SHAPE ─────────────────────────────────────────────────────────
// The Guru's context object (`lib/montree/guru/context-builder.ts`) already has
// a slot for exactly this kind of information: `parent_intake`, typed
// `ParentIntakeContext` — the handful of family-provided fields "that actually
// change how a teacher meets a child on Monday morning", added when Montree's
// own child-onboarding shipped (Aug 10). It is deliberately NOT the clinical
// `MentalProfile` (nine numbered temperament traits from
// `montree_child_mental_profiles`): that structure belongs to an instrument a
// practitioner completes, and pushing a parent's four warm answers into it
// would dress a family's description up as an assessment. A CMS profile is the
// same KIND of thing as a parent intake, so it maps to the same slot.
//
// 🚨 The output type is declared here STRUCTURALLY rather than imported from
// `lib/montree/guru/context-builder`. CMS must not import from `lib/montree/**`
// (the reuse-first law's other half: no cross-brand imports), and the engine
// must stay free of Next/React/Supabase. `CmsGuruFeed` is assignable to
// `ParentIntakeContext` field for field — if that type ever changes, this file
// fails to compile at the montree call site, which is exactly the alarm we want.
//
// 🚨 NO CLINICAL LANGUAGE COMES OUT OF HERE. The temperament axes are rendered
// as the family's own phrasing ("settles quickly", "watches first"), never as
// numbers, never as a trait name with a score. The Guru reads prose written by
// a parent, which is what it is.
// ============================================================================

import type { ChildProfile, TemperamentAxis } from './types';

/**
 * The Guru's family-provided context block. Field-for-field assignable to
 * `ParentIntakeContext` in lib/montree/guru/context-builder.ts.
 */
export interface CmsGuruFeed {
  /** What the child is drawn to — the Guru reads this as strengths/leads. */
  strengths?: string;
  /** What they find hard or avoid. */
  growthAreas?: string;
  /** What upsets them, in the family's words. */
  fears?: string;
  /** What helps: the comfort objects and routines. */
  comfortItems?: string;
  /** The temperament picks, as sentences. Never as numbers. */
  temperamentNotes?: string;
  /** How goodbyes go, where that is what the family told us. */
  separationHistory?: string;
  /** Allergens, already formatted "Peanut (severe)" by the caller. */
  allergies: string[];
  /** "What should the teacher know about your child?" — verbatim. */
  otherNotes?: string;
}

/** How each axis reads at each end. Index 0 = the 1-end, index 1 = the 5-end. */
const AXIS_PHRASES: Record<TemperamentAxis, [string, string, string]> = {
  // [low end, middle, high end]
  settling: [
    'settles into a new room quickly',
    'settles at their own pace',
    'needs time and a familiar adult before they settle',
  ],
  company: [
    'is content working alone',
    'moves between playing alone and joining others',
    'looks for company and works best beside someone',
  ],
  adventure: [
    'watches a new thing before trying it',
    'tries new things after a look',
    'goes straight into whatever is new',
  ],
  energy: [
    'is calm and steady through the day',
    'has an even mix of quiet and busy',
    'brings a lot of physical energy to the day',
  ],
};

/** 1–2 → low, 3 → middle, 4–5 → high. */
function phraseFor(axis: TemperamentAxis, value: number): string | null {
  const row = AXIS_PHRASES[axis];
  if (!row) return null;
  if (value <= 2) return row[0];
  if (value >= 4) return row[2];
  return row[1];
}

/** Join a list into one readable clause: "a, b and c". */
function sentence(parts: string[]): string | undefined {
  const clean = parts.map((p) => p.trim()).filter(Boolean);
  if (clean.length === 0) return undefined;
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(', ')} and ${clean[clean.length - 1]}`;
}

export interface GuruFeedInput {
  /** The family's profile. Null/undefined ⇒ no feed at all. */
  profile: Pick<
    ChildProfile,
    'likes' | 'dislikes' | 'interests' | 'temperament' | 'parentNotes' | 'guruSync'
  > | null;
  /** Allergens already formatted for reading, e.g. "Peanut (severe)". */
  allergies?: string[];
}

/**
 * Map a CMS profile onto the Guru's family-context block.
 *
 * Returns **null** — not an empty object — when there is nothing to say, so the
 * caller's merge is a single truthiness check and an absent profile can never
 * blank a field the Guru already had from somewhere else.
 *
 * 🚨 `guruSync === false` returns null unconditionally. That tick is the
 * family's answer to "may this help the teacher's planning assistant", and it
 * is honoured HERE, in the pure function, so no call site can forget it. The
 * montree-side query filters on the column as well; both is deliberate.
 */
export function buildGuruFeed(input: GuruFeedInput): CmsGuruFeed | null {
  const profile = input.profile;
  if (!profile) return null;
  if (profile.guruSync === false) return null;

  const allergies = (input.allergies ?? []).map((a) => a.trim()).filter(Boolean);

  // Likes and interests both answer "what is this child drawn to", and the
  // Guru's slot for that is one field — so they are merged, de-duplicated, in
  // the order the family gave them.
  const drawnTo: string[] = [];
  const seen = new Set<string>();
  for (const item of [...(profile.likes ?? []), ...(profile.interests ?? [])]) {
    const value = String(item ?? '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drawnTo.push(value);
  }

  const avoids = (profile.dislikes ?? []).map((d) => String(d ?? '').trim()).filter(Boolean);

  const temperamentParts: string[] = [];
  for (const [axis, value] of Object.entries(profile.temperament ?? {})) {
    if (typeof value !== 'number') continue;
    const phrase = phraseFor(axis as TemperamentAxis, value);
    if (phrase) temperamentParts.push(phrase);
  }

  const feed: CmsGuruFeed = {
    strengths: sentence(drawnTo),
    // "Would rather avoid" is the family's phrasing, and it maps to the Guru's
    // "finds hard" slot — the closest honest fit. It is NOT re-labelled as a
    // deficit anywhere in the string itself.
    growthAreas: avoids.length ? `Would rather avoid: ${sentence(avoids)}` : undefined,
    fears: undefined,
    comfortItems: undefined,
    temperamentNotes: sentence(temperamentParts),
    separationHistory: undefined,
    allergies,
    otherNotes: profile.parentNotes?.trim() || undefined,
  };

  const hasSomething =
    allergies.length > 0 ||
    Boolean(feed.strengths || feed.growthAreas || feed.temperamentNotes || feed.otherNotes);

  return hasSomething ? feed : null;
}

/**
 * Merge a CMS feed into whatever family context the Guru already holds.
 *
 * EXISTING VALUES WIN. Montree's own committed parent intake was reviewed by a
 * teacher before it reached the Guru; a CMS profile has not been. Where both
 * exist, the reviewed one stays, and CMS only fills the holes. Allergy lists
 * are unioned rather than replaced — a missing allergen is the one failure mode
 * that is never acceptable.
 */
export function mergeGuruFeed<T extends CmsGuruFeed>(
  existing: T | undefined,
  feed: CmsGuruFeed | null
): T | CmsGuruFeed | undefined {
  if (!feed) return existing;
  if (!existing) return feed;
  const merged: CmsGuruFeed = { ...existing };
  for (const key of [
    'strengths',
    'growthAreas',
    'fears',
    'comfortItems',
    'temperamentNotes',
    'separationHistory',
    'otherNotes',
  ] as const) {
    if (!merged[key] && feed[key]) merged[key] = feed[key];
  }
  const seen = new Set(merged.allergies.map((a) => a.toLowerCase()));
  for (const allergen of feed.allergies) {
    if (!seen.has(allergen.toLowerCase())) {
      merged.allergies.push(allergen);
      seen.add(allergen.toLowerCase());
    }
  }
  return merged as T;
}
