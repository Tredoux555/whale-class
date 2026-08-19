// lib/montree/classroom-jobs/crop-geometry.ts
// ============================================================================
// THE ICON CROPPER'S MATH — image size, zoom, and a desired offset in, a
// clamped on-screen placement AND a source rectangle out.
// ============================================================================
// One function, used twice: the crop modal reads `scale`/`offsetX`/`offsetY`
// to position the live `<img>` (and its small preview) behind the square
// frame, and reads `sourceX`/`sourceY`/`sourceSize` to tell the export canvas
// exactly which square of the ORIGINAL image to draw. Computing both from the
// same call is the whole safety argument: the preview and the export can
// never disagree about what is being cropped.
//
// PURE. No canvas, no DOM, no React — testable with plain numbers, the same
// posture as classroom-jobs/types.ts.

/** 1x is the default cover-fit; 4x is as tight as the slider goes. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The smallest scale that still makes the image COVER a square frame — the
 *  short edge lands exactly on the frame's edge, the long edge overflows it.
 *  "Cover", not "contain": a jobs-poster icon has no room for letterboxing. */
function baseScaleFor(imgW: number, imgH: number, frame: number): number {
  return Math.max(frame / imgW, frame / imgH);
}

export interface CropGeometryInput {
  /** Natural pixel size of the loaded image. */
  imgW: number;
  imgH: number;
  /** CSS pixel size of the square crop frame (or, scaled proportionally, the
   *  small live preview — see the modal's own preview math). */
  frame: number;
  /** 1..4 — clamped again here so a caller cannot ask for a rect the slider
   *  itself could never produce. */
  zoom: number;
  /** The image's desired top-left corner, in CSS pixels, relative to the
   *  frame's own top-left corner — BEFORE clamping. This is the ABSOLUTE
   *  position, not a delta: a drag handler adds its pointer delta directly
   *  onto the previous CLAMPED `offsetX`/`offsetY` this function returned, so
   *  a caller that always stores the clamped output back never drifts into a
   *  "dead zone" where a reversed drag has to first undo an unstored excess
   *  before the image visibly moves. */
  offsetX: number;
  offsetY: number;
}

export interface CropGeometry {
  /** Image pixels → frame CSS pixels at zoom 1 (the cover-fit scale). */
  baseScale: number;
  /** baseScale * zoom — the scale actually used to size and position the
   *  image, and to convert a frame-space size back into image pixels. */
  scale: number;
  /** Clamped so the image always fully covers the frame at this zoom — no
   *  drag position can ever reveal space outside the image inside the frame. */
  offsetX: number;
  offsetY: number;
  /** The square region of the ORIGINAL image, in image pixels, the frame is
   *  currently showing — exactly what `ctx.drawImage`'s source rect should be. */
  sourceX: number;
  sourceY: number;
  sourceSize: number;
}

/**
 * The image's centered, cover-fit position at zoom 1 — the frame's default
 * framing on open. Not folded into `computeCropGeometry` itself: that
 * function clamps whatever offset it is GIVEN, and 0,0 (its natural default
 * argument) is the image's own top-left flush with the frame's, not centered.
 */
export function defaultCoverOffset(
  imgW: number,
  imgH: number,
  frame: number
): { x: number; y: number } {
  const w = Math.max(1, imgW);
  const h = Math.max(1, imgH);
  const f = Math.max(1, frame);
  const baseScale = baseScaleFor(w, h, f);
  return {
    x: (f - w * baseScale) / 2,
    y: (f - h * baseScale) / 2,
  };
}

/**
 * The gate this whole feature runs through. Clamps `offsetX`/`offsetY` into
 * the range that keeps the image covering the frame at the given zoom, and
 * derives the export source rectangle from the result.
 *
 * 🚨 THE CLAMP RANGE IS `[frame - displayed, 0]` ON EACH AXIS. Because the
 * image is always scaled to at least cover the frame (`baseScale`), the
 * displayed size is never smaller than the frame on either axis, so this
 * range is always valid (min ≤ 0) and clamping into it can never expose a
 * pixel outside the image — the hard requirement this function exists to
 * guarantee.
 */
export function computeCropGeometry(input: CropGeometryInput): CropGeometry {
  const imgW = Math.max(1, input.imgW);
  const imgH = Math.max(1, input.imgH);
  const frame = Math.max(1, input.frame);
  const zoom = clamp(input.zoom, MIN_ZOOM, MAX_ZOOM);

  const baseScale = baseScaleFor(imgW, imgH, frame);
  const scale = baseScale * zoom;

  const displayedW = imgW * scale;
  const displayedH = imgH * scale;

  const minOffsetX = frame - displayedW;
  const minOffsetY = frame - displayedH;

  const offsetX = clamp(input.offsetX, minOffsetX, 0);
  const offsetY = clamp(input.offsetY, minOffsetY, 0);

  const sourceX = -offsetX / scale;
  const sourceY = -offsetY / scale;
  const sourceSize = frame / scale;

  return { baseScale, scale, offsetX, offsetY, sourceX, sourceY, sourceSize };
}
