// tests/security/media-proxy-xss.test.ts
//
// Guards the stored-XSS fix on the media proxies.
//
// The hole: /api/montree/media/proxy/[...path] reflected the upstream
// Content-Type verbatim, and the upstream Content-Type is whatever the uploader
// sent (`contentType: file.type` in the upload route, with the JPEG gate only
// covering media_type=photo). Storing a file as media_type=video with
// `Content-Type: text/html` and then requesting it back gave you script
// execution on the montree.xyz origin.
//
// Two halves are tested:
//   1. the proxy refuses to serve a dangerous type inline (this is the part
//      that also protects files uploaded BEFORE the fix), and
//   2. the upload route refuses to store one in the first place.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  decideProxyContentType,
  validateUploadContentType,
} from '@/lib/montree/media/safe-content-type';

// ── The upstream (Supabase) response the proxy will see ──────────────────────
let upstreamContentType = 'image/jpeg';

const fetchMock = vi.fn(async () => {
  return new Response('BODY', {
    status: 200,
    headers: {
      'content-type': upstreamContentType,
      'content-length': '4',
    },
  });
});

vi.stubGlobal('fetch', fetchMock);
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');

const { handleRequest } = await import(
  '@/app/api/montree/media/proxy/[...path]/route'
);

function get(path: string[], qs = '') {
  return new NextRequest(
    `http://localhost/api/montree/media/proxy/${path.join('/')}${qs}`
  );
}

beforeEach(() => {
  fetchMock.mockClear();
  upstreamContentType = 'image/jpeg';
});

// ─────────────────────────────────────────────────────────────────────────────
describe('decideProxyContentType (the allow-list itself)', () => {
  it('passes ordinary media through untouched', () => {
    for (const t of ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'application/pdf']) {
      const d = decideProxyContentType(t);
      expect(d.contentType, t).toBe(t);
      expect(d.downgraded, t).toBe(false);
      expect(d.forceAttachment, t).toBe(false);
    }
  });

  it('tolerates a charset parameter and odd casing', () => {
    const d = decideProxyContentType('IMAGE/JPEG; charset=binary');
    expect(d.contentType).toBe('image/jpeg');
    expect(d.downgraded).toBe(false);
  });

  it('defangs every scriptable document type', () => {
    const dangerous = [
      'text/html',
      'text/html; charset=utf-8',
      'image/svg+xml',
      'application/xhtml+xml',
      'application/xml',
      'text/xml',
      'application/javascript',
      'text/javascript',
    ];
    for (const t of dangerous) {
      const d = decideProxyContentType(t);
      expect(d.contentType, t).toBe('application/octet-stream');
      expect(d.downgraded, t).toBe(true);
      expect(d.forceAttachment, t).toBe(true);
    }
  });

  it('defangs a missing or empty content type rather than guessing', () => {
    for (const t of [null, undefined, '']) {
      expect(decideProxyContentType(t).contentType).toBe('application/octet-stream');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/montree/media/proxy — response headers', () => {
  it('serves a real photo inline, as itself', async () => {
    upstreamContentType = 'image/jpeg';
    const res = await handleRequest(get(['school', 'child', 'photos', 'a.jpg']), ['school', 'child', 'photos', 'a.jpg'], 'GET');

    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Content-Disposition')).toBeNull();
  });

  it('NEVER serves a stored text/html object as a document', async () => {
    upstreamContentType = 'text/html';
    const res = await handleRequest(get(['s', 'c', 'videos', 'evil.html']), ['s', 'c', 'videos', 'evil.html'], 'GET');

    // The whole point: the browser must not be told this is HTML.
    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment/);
  });

  it('NEVER serves a stored SVG inline (SVG documents execute script)', async () => {
    upstreamContentType = 'image/svg+xml';
    const res = await handleRequest(get(['s', 'c', 'photos', 'evil.svg']), ['s', 'c', 'photos', 'evil.svg'], 'GET');

    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment/);
  });

  it('sets nosniff on every response, so the browser cannot sniff its way back to HTML', async () => {
    for (const t of ['image/jpeg', 'text/html', 'video/mp4']) {
      upstreamContentType = t;
      const res = await handleRequest(get(['s', 'c', 'photos', 'x']), ['s', 'c', 'photos', 'x'], 'GET');
      expect(res.headers.get('X-Content-Type-Options'), t).toBe('nosniff');
    }
  });

  it('applies the same rules to HEAD', async () => {
    upstreamContentType = 'text/html';
    const res = await handleRequest(get(['s', 'c', 'videos', 'evil.html']), ['s', 'c', 'videos', 'evil.html'], 'HEAD');

    expect(res.headers.get('Content-Type')).toBe('application/octet-stream');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('still honours ?download=1 for legitimate media', async () => {
    upstreamContentType = 'video/mp4';
    const res = await handleRequest(
      get(['s', 'c', 'videos', 'film.mp4'], '?download=1'),
      ['s', 'c', 'videos', 'film.mp4'],
      'GET'
    );
    expect(res.headers.get('Content-Type')).toBe('video/mp4');
    expect(res.headers.get('Content-Disposition')).toMatch(/^attachment/);
  });

  it('leaves path traversal rejection intact', async () => {
    const res = await handleRequest(get(['..', 'etc']), ['..', 'etc'], 'GET');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('validateUploadContentType (the upload-side gate)', () => {
  it('rejects the dangerous set', () => {
    for (const t of ['text/html', 'image/svg+xml', 'application/javascript', 'text/css']) {
      expect(validateUploadContentType(t), t).toBeTruthy();
    }
  });

  it('allows ordinary media, including the video/audio path that used to be ungated', () => {
    for (const t of ['image/jpeg', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/x-m4a']) {
      expect(validateUploadContentType(t), t).toBeNull();
    }
  });

  it('allows an absent content type (the JPEG gate handles nameless photo uploads)', () => {
    expect(validateUploadContentType('')).toBeNull();
    expect(validateUploadContentType(null)).toBeNull();
  });
});
