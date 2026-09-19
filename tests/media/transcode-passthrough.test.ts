// tests/media/transcode-passthrough.test.ts
//
// 🚨 WHY: the passthrough decision is the one place where getting it wrong
// costs a teacher a dead video card instead of a few seconds of CPU. A real
// iPhone upload answers "h264 + aac + mp4" — the whole of the first version of
// this check — and still does not play, because of pix_fmt, a rotation matrix
// and a fragmented container. Those exact bytes are pinned below.

import { describe, expect, it } from 'vitest';
import { decideBrowserPlayable, type VideoProbe } from '@/lib/montree/media/transcode';

/** What our own ffmpeg pipeline emits. The ONLY shape that may pass through. */
const ours: VideoProbe = {
  videoCodec: 'h264',
  formatName: 'mov,mp4,m4a,3gp,3g2,mj2',
  audioCodec: 'aac',
  pixFmt: 'yuv420p',
  rotation: 0,
  encoder: 'Lavf60.16.100',
  compatibleBrands: 'isomiso2avc1mp41',
  fragmented: false,
};

describe('decideBrowserPlayable', () => {
  it('passes our own transcode output through', () => {
    expect(decideBrowserPlayable(ours, 'a/b/clip-playback.mp4')).toBe(true);
  });

  it('REJECTS the real iPhone upload that started all this', () => {
    // .../1789704447994-oc1iqq.mp4 — h264 + aac + mp4 and unplayable.
    expect(decideBrowserPlayable({
      ...ours,
      pixFmt: 'yuvj420p',
      rotation: -90,
      encoder: null,
      compatibleBrands: 'isomiso5hlsf',
      fragmented: true,
    }, 'a/b/1789704447994-oc1iqq.mp4')).toBe(false);
  });

  it.each([
    ['JPEG-range pixels', { pixFmt: 'yuvj420p' }],
    ['10-bit pixels', { pixFmt: 'yuv420p10le' }],
    ['an unbaked rotation matrix', { rotation: -90 }],
    ['a fragmented container', { fragmented: true }],
    ['HLS brands', { compatibleBrands: 'isomiso5hlsf' }],
    ['DASH brands', { compatibleBrands: 'isomdash' }],
    ['no encoder tag at all', { encoder: null }],
    ['a non-ffmpeg muxer', { encoder: 'HandBrake 1.7.2' }],
    ['HEVC video', { videoCodec: 'hevc' }],
    ['VP9 video', { videoCodec: 'vp9' }],
    ['Opus audio', { audioCodec: 'opus' }],
    ['a WebM container', { formatName: 'matroska,webm' }],
  ])('transcodes a file with %s', (_label, patch) => {
    expect(decideBrowserPlayable({ ...ours, ...patch }, 'a/b/clip.mp4')).toBe(false);
  });

  it('accepts a silent clip (no audio stream)', () => {
    expect(decideBrowserPlayable({ ...ours, audioCodec: null }, 'a/b/clip.mp4')).toBe(true);
  });

  it('transcodes a .mov even when its codecs are fine', () => {
    // A QuickTime .mov shares the mp4 family's format_name; Android Chrome's
    // .mov support is not reliable, so the extension still has a veto.
    expect(decideBrowserPlayable(ours, 'a/b/clip.mov')).toBe(false);
  });

  it('treats 360° of rotation as upright', () => {
    expect(decideBrowserPlayable({ ...ours, rotation: 0 }, 'a/b/clip.m4v')).toBe(true);
  });
});
