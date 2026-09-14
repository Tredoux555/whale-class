import { describe, it, expect } from 'vitest';
import {
  buildVaultVideoFilter,
  isVaultVideoFilename,
  mp4Filename,
  stripExtension,
} from '@/lib/story/vault/transcode';

// Pure geometry/naming only — no ffmpeg, no network. The filter string itself
// was exercised against real ffmpeg during the build (4K portrait, 4K
// landscape, odd dimensions, SAR 2:1); these lock its SHAPE so a future edit
// cannot quietly drop a link and start stretching or upscaling vault videos.
describe('buildVaultVideoFilter', () => {
  const f = buildVaultVideoFilter();

  it('bakes non-square pixels in before measuring', () => {
    expect(f.startsWith('scale=iw*sar:ih,')).toBe(true);
  });

  it('ends square-pixel and yuv420p so every browser can decode it', () => {
    expect(f.endsWith('setsar=1,format=yuv420p')).toBe(true);
  });

  it('only ever shrinks — the cap is conditional on the source being taller', () => {
    expect(f).toContain('if(gt(ih,1080)');
    expect(f).not.toContain('pad=');
    expect(f).not.toContain('force_original_aspect_ratio');
  });

  it('rounds both axes to even pixels (libx264 rejects odd + yuv420p)', () => {
    expect(f).toContain('trunc(iw/2)*2');
    expect(f).toContain('trunc(ih/2)*2');
  });

  it('honours a custom cap and forces it even', () => {
    expect(buildVaultVideoFilter(721)).toContain('gt(ih,720)');
  });
});

describe('naming helpers', () => {
  it('rewrites the extension to .mp4, case-insensitively', () => {
    expect(mp4Filename('IMG_3376.MOV')).toBe('IMG_3376.mp4');
    expect(mp4Filename('holiday.clip.mov')).toBe('holiday.clip.mp4');
    expect(mp4Filename('noextension')).toBe('noextension.mp4');
  });

  it('strips only a real extension, never a dot in a directory name', () => {
    expect(stripExtension('vault/1736-ab.cd/clip')).toBe('vault/1736-ab.cd/clip');
    expect(stripExtension('vault/1736-abcd.MOV')).toBe('vault/1736-abcd');
  });

  it('recognises the video extensions the vault UI shows as videos', () => {
    expect(isVaultVideoFilename('a.MOV')).toBe(true);
    expect(isVaultVideoFilename('a.mp4')).toBe(true);
    expect(isVaultVideoFilename('a.heic')).toBe(false);
  });
});
