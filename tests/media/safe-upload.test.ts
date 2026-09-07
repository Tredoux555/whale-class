// tests/media/safe-upload.test.ts
// Pure unit tests for the upload allow-list that keeps a client-declared
// Content-Type from ever being stored (and re-served same-origin by the
// media proxy) verbatim. See lib/montree/media/safe-upload.ts.

import { describe, it, expect } from 'vitest';
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  MAX_OTHER_UPLOAD_BYTES,
  safeContentType,
  uploadKind,
  assertUploadSize,
} from '@/lib/montree/media/safe-upload';

const MB = 1024 * 1024;

describe('safeContentType', () => {
  it('stores an HTML payload declared as video as octet-stream (the stored-XSS case)', () => {
    expect(safeContentType('text/html', 'poc.html')).toBe('application/octet-stream');
    // media_type=video used to skip validation entirely — the declared type
    // is still HTML and must never survive.
    expect(safeContentType('text/html', 'poc.mp4')).toBe('application/octet-stream');
    expect(safeContentType('video/mp4', 'poc.html')).toBe('application/octet-stream');
    expect(safeContentType('image/svg+xml', 'poc.svg')).toBe('application/octet-stream');
  });

  it('passes allow-listed media through unchanged', () => {
    expect(safeContentType('image/jpeg', 'photo.jpg')).toBe('image/jpeg');
    expect(safeContentType('image/jpeg', 'photo.jpeg')).toBe('image/jpeg');
    expect(safeContentType('image/png', 'a.png')).toBe('image/png');
    expect(safeContentType('video/quicktime', 'clip.mov')).toBe('video/quicktime');
    expect(safeContentType('audio/mpeg', 'song.mp3')).toBe('audio/mpeg');
    expect(safeContentType('application/pdf', 'sheet.pdf')).toBe('application/pdf');
  });

  it('tolerates charset parameters and common browser aliases', () => {
    expect(safeContentType('image/jpeg; charset=binary', 'photo.jpg')).toBe('image/jpeg');
    expect(safeContentType('IMAGE/JPG', 'photo.jpg')).toBe('image/jpeg');
    expect(safeContentType('audio/x-m4a', 'song.m4a')).toBe('audio/mp4');
  });

  it('rejects a declared type that disagrees with the extension', () => {
    expect(safeContentType('image/jpeg', 'photo.png')).toBe('application/octet-stream');
    expect(safeContentType('audio/mpeg', 'song.pdf')).toBe('application/octet-stream');
    expect(safeContentType('application/pdf', 'doc.docx')).toBe('application/octet-stream');
  });

  it('accepts a missing extension, and infers from the extension when no type is declared', () => {
    expect(safeContentType('image/jpeg', 'photo')).toBe('image/jpeg');
    expect(safeContentType('image/jpeg')).toBe('image/jpeg');
    expect(safeContentType('', 'photo.jpg')).toBe('image/jpeg');
    expect(safeContentType('', 'payload.html')).toBe('application/octet-stream');
    expect(safeContentType('', '')).toBe('application/octet-stream');
  });

  it('never returns anything outside the allow-list', () => {
    for (const declared of ['text/html', 'application/javascript', 'image/svg+xml', 'x/y', '']) {
      const out = safeContentType(declared, 'f.bin');
      expect(ALLOWED_UPLOAD_MIME.has(out) || out === 'application/octet-stream').toBe(true);
    }
  });
});

describe('uploadKind', () => {
  it('classifies allow-listed types and rejects everything else', () => {
    expect(uploadKind('image/webp', 'a.webp')).toBe('image');
    expect(uploadKind('video/webm', 'a.webm')).toBe('video');
    expect(uploadKind('audio/wav', 'a.wav')).toBe('audio');
    expect(uploadKind('application/pdf', 'a.pdf')).toBe('pdf');
    expect(uploadKind('text/html', 'a.html')).toBeNull();
  });
});

describe('assertUploadSize', () => {
  it('applies the per-class cap', () => {
    expect(MAX_UPLOAD_BYTES.image).toBe(15 * MB);
    expect(MAX_UPLOAD_BYTES.video).toBe(200 * MB);
    expect(MAX_UPLOAD_BYTES.audio).toBe(50 * MB);
    expect(MAX_UPLOAD_BYTES.pdf).toBe(20 * MB);

    expect(assertUploadSize({ size: 14 * MB }, 'image')).toBeNull();
    expect(assertUploadSize({ size: 16 * MB }, 'image')).toMatch(/too large/);
    // A 16MB video is fine — the class decides the cap, not the byte count.
    expect(assertUploadSize({ size: 16 * MB }, 'video')).toBeNull();
    expect(assertUploadSize({ size: 201 * MB }, 'video')).toMatch(/too large/);
    expect(assertUploadSize({ size: 51 * MB }, 'audio')).toMatch(/too large/);
    expect(assertUploadSize({ size: 21 * MB }, 'pdf')).toMatch(/too large/);
  });

  it('derives the class from the file when no kind is given', () => {
    expect(assertUploadSize({ size: 16 * MB, type: 'image/jpeg', name: 'p.jpg' })).toMatch(/too large/);
    expect(assertUploadSize({ size: 16 * MB, type: 'video/mp4', name: 'c.mp4' })).toBeNull();
  });

  it('falls back to the non-media cap for anything unrecognised', () => {
    expect(MAX_OTHER_UPLOAD_BYTES).toBe(25 * MB);
    expect(assertUploadSize({ size: 24 * MB, type: 'text/html', name: 'p.html' })).toBeNull();
    expect(assertUploadSize({ size: 26 * MB, type: 'text/html', name: 'p.html' })).toMatch(/too large/);
  });
});
