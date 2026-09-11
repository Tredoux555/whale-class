// tests/media/transcode-filter.test.ts
//
// The playback transcode's -vf chain (lib/montree/media/transcode.ts).
//
// 🚨 WHY: a teacher's clip is recorded by MediaRecorder on whatever phone is
// in her hand. Those files arrive with non-square pixels, odd dimensions and
// rotation matrices. The one thing the transcode must never do is change the
// SHAPE of the picture — a stretched child is not a memory anyone keeps.
// This chain is a pure string, so the guarantee can be asserted without
// ffmpeg, in milliseconds, on every run.

import { describe, expect, it } from 'vitest';
import { buildTranscodeVideoFilter, MAX_LONG_EDGE } from '@/lib/montree/media/transcode';

describe('buildTranscodeVideoFilter', () => {
  const filter = buildTranscodeVideoFilter();

  it('squares non-square pixels BEFORE measuring the aspect', () => {
    // Without this first link, `a` below is the storage aspect, and an
    // anamorphic source is fitted to the wrong box.
    expect(filter.startsWith('scale=iw*sar:ih,')).toBe(true);
  });

  it('declares square pixels on the output', () => {
    expect(filter).toContain('setsar=1');
  });

  it('emits yuv420p, the only pixel format Safari will decode', () => {
    expect(filter).toContain('format=yuv420p');
  });

  it('derives the second dimension with -2, so aspect is preserved and even', () => {
    // `-2` is ffmpeg for "whatever keeps the aspect, rounded to even".
    // Both branches of the landscape/portrait test must use it.
    // `a` is ffmpeg's DISPLAY aspect — correct only because link 1 already
    // squared the pixels. One `-2` for the landscape branch, one for portrait.
    expect(filter).toContain('gt(a,1)');
    expect(filter.match(/-2/g)).toHaveLength(2);
  });

  it('caps the long edge at MAX_LONG_EDGE on both orientations', () => {
    expect(MAX_LONG_EDGE).toBe(1280);
    expect(filter).toContain(`min(${MAX_LONG_EDGE},iw)`);
    expect(filter).toContain(`min(${MAX_LONG_EDGE},ih)`);
  });

  it('forces the capped edge even too, for an odd-width source', () => {
    expect(filter).toContain(`trunc(min(${MAX_LONG_EDGE},iw)/2)*2`);
    expect(filter).toContain(`trunc(min(${MAX_LONG_EDGE},ih)/2)*2`);
  });

  it('never pads, crops, stretches or forces a fixed WxH', () => {
    // A literal `scale=W:H` with two numbers, a pad or a crop would all change
    // the display aspect. None of them may ever appear here.
    expect(filter).not.toContain('pad=');
    expect(filter).not.toContain('crop=');
    expect(filter).not.toContain('setdar');
    expect(filter).not.toMatch(/scale=\d+:\d+/);
    expect(filter).not.toContain('force_original_aspect_ratio=disable');
  });

  it('honours a custom cap', () => {
    const small = buildTranscodeVideoFilter(640);
    expect(small).toContain('min(640,iw)');
    expect(small).toContain('min(640,ih)');
    expect(small).not.toContain('min(1280,iw)');
  });

  it('refuses a nonsense cap rather than emitting an unusable chain', () => {
    // 0 or a negative would make ffmpeg produce a zero-width frame.
    expect(buildTranscodeVideoFilter(0)).toContain('min(2,iw)');
    expect(buildTranscodeVideoFilter(-100)).toContain('min(2,iw)');
    // A fractional cap is floored, never left as a decimal in the expression.
    expect(buildTranscodeVideoFilter(720.9)).toContain('min(720,iw)');
  });

  it('is stable — the drain script mirrors this exact string', () => {
    expect(filter).toBe(
      'scale=iw*sar:ih,' +
        "scale='if(gt(a,1),trunc(min(1280,iw)/2)*2,-2)':'if(gt(a,1),-2,trunc(min(1280,ih)/2)*2)'," +
        'setsar=1,' +
        'format=yuv420p'
    );
  });
});
