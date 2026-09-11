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
