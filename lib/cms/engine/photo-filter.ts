// lib/cms/engine/photo-filter.ts
// ============================================================================
// STUB — signatures are real, bodies are not. Phase 6.
// ============================================================================
// The consent gate for imagery. Before ANY photo reaches ANY parent, it passes
// through here: a photo of five children may only be sent to a family if every
// child in it has photography consent, or the photo is cropped/blurred first.
//
// This is the module most likely to end up in a legal argument, so it is
// deliberately fail-closed: unknown consent is treated as refusal, and an
// unidentified face blocks the photo rather than being ignored.

import type { ChildId, Consent } from './types';

export interface PhotoAsset {
  id: string;
  url: string;
  takenAt: string;
  /** Children detected/tagged in the frame. An empty array means "not yet reviewed". */
  taggedChildIds: ChildId[];
  /** Faces detected but not matched to a child. Any of these blocks release. */
  unidentifiedFaceCount: number;
}

export type PhotoDecision =
  | { allowed: true }
  | { allowed: false; reason: 'no_consent' | 'unidentified_face' | 'unreviewed'; blockedBy: ChildId[] };

/**
 * May this photo be shown to the guardians of `audienceChildId`?
 *
 * FAIL-CLOSED: a child with no consent record on file counts as refused, and an
 * `unidentifiedFaceCount > 0` blocks regardless of consents.
 */
export function canReleasePhoto(
  _photo: PhotoAsset,
  _audienceChildId: ChildId,
  _consentsByChild: Map<ChildId, Consent[]>
): PhotoDecision {
  throw new Error('photo-filter.canReleasePhoto: not implemented (phase 6)');
}

/**
 * Filter a batch down to what one family may see, and report what was withheld
 * so the UI can honestly say "3 photos withheld" instead of quietly hiding them.
 */
export function filterAlbum(
  _photos: PhotoAsset[],
  _audienceChildId: ChildId,
  _consentsByChild: Map<ChildId, Consent[]>
): { released: PhotoAsset[]; withheld: { photo: PhotoAsset; decision: PhotoDecision }[] } {
  throw new Error('photo-filter.filterAlbum: not implemented (phase 6)');
}

/**
 * Regions to blur so a photo that would otherwise be blocked can be released.
 * Coordinates are fractions of width/height so they survive resizing.
 */
export function blurPlanFor(
  _photo: PhotoAsset,
  _audienceChildId: ChildId,
  _consentsByChild: Map<ChildId, Consent[]>
): { x: number; y: number; w: number; h: number }[] {
  throw new Error('photo-filter.blurPlanFor: not implemented (phase 6)');
}
