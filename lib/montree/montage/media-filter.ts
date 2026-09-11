// lib/montree/montage/media-filter.ts
//
// ONE definition of "media a montage may draw from", shared by every
// app-side selection path (enqueue eligibility counts, the Montage Manager
// picker list). The worker enforces the same rule in SQL — see
// montage-worker/src/db.ts (mediaTypeSql) and src/media.ts.
//
// Since migration 353 a montage is a MIXED timeline: photos AND video clips.
//
// 🚨 A video only qualifies once it has been transcoded to an H.264/AAC MP4
// (montree_media.playback_path, see migrations/354). An untranscoded
// clip is still VP9/Opus WebM; the render worker skips it with a logged reason
// rather than feeding it to ffmpeg, so it must not be counted as eligible here
// either — otherwise the teacher is told "12 items" and gets a film of 9.
//
// parent_visible / teacher_confirmed / school / scope filters are unchanged
// and applied by the caller exactly as before — videos are admitted under the
// SAME rules as photos, never looser ones.

/** PostgREST `.or(...)` predicate: photos, plus already-transcoded videos. */
export const MONTAGE_MEDIA_OR =
  'media_type.eq.photo,and(media_type.eq.video,playback_path.not.is.null)';

/** Photos only — for callers that explicitly opt out of clips. */
export const MONTAGE_PHOTO_ONLY_OR = 'media_type.eq.photo';

export function montageMediaOr(includeVideos = true): string {
  return includeVideos ? MONTAGE_MEDIA_OR : MONTAGE_PHOTO_ONLY_OR;
}

// ---------------------------------------------------------------------------
// PICKER / COVERAGE visibility  (≠ render eligibility)
// ---------------------------------------------------------------------------
// MONTAGE_MEDIA_OR above answers "may the worker feed this to ffmpeg?".
// It is the wrong question for the picker grid and the coverage boards, which
// answer "did the teacher capture this?". A clip whose transcode has not run
// yet (playback_path IS NULL) is a real capture — it must be SHOWN (greyed,
// "converting for playback") and must count as coverage — it just cannot go
// into a film yet. Filtering it out of the picker made 15 clips of one child
// read as "No photos here yet", which is what this pair of constants fixes.

/** PostgREST `.or(...)`: everything a teacher captured — photos AND clips,
 *  transcoded or not. Use for the picker grid and coverage, NEVER for the
 *  media_ids handed to the worker (see isRenderEligibleMedia). */
export const MONTAGE_PICKER_MEDIA_OR = 'media_type.eq.photo,media_type.eq.video';

/** True when this row may actually be rendered into a film right now:
 *  any photo, or a video that already has its H.264 playback_path. */
export function isRenderEligibleMedia(row: {
  media_type?: string | null;
  playback_path?: string | null;
}): boolean {
  if (row.media_type === 'video') return !!row.playback_path;
  return true;
}

/** True for a clip that exists but is still waiting on the transcoder. */
export function isProcessingClip(row: {
  media_type?: string | null;
  playback_path?: string | null;
}): boolean {
  return row.media_type === 'video' && !row.playback_path;
}
