// tests/dark-phonics-hub/attribution.test.ts
//
// utm parsing, the cookie's shape, and the anonymous id.

import { describe, expect, it } from 'vitest';

import {
  DP_AID_COOKIE,
  DP_AID_MAX_AGE,
  DP_UTM_COOKIE,
  DP_UTM_MAX_AGE,
  cookieString,
  isAid,
  newAid,
  parseUtmCookie,
  parseUtmFromSearch,
  readCookie,
  serializeUtmCookie,
} from '@/lib/montree/dark-phonics/attribution';

const NOW = new Date('2026-09-17T09:30:00.000Z');

describe('parseUtmFromSearch', () => {
  it('returns null when nothing identifying is present', () => {
    expect(parseUtmFromSearch(new URLSearchParams(''), NOW)).toBeNull();
    expect(parseUtmFromSearch(new URLSearchParams('tab=classroom&lang=zh'), NOW)).toBeNull();
    expect(parseUtmFromSearch({}, NOW)).toBeNull();
  });

  it('reads the five fields off a query string', () => {
    const utm = parseUtmFromSearch(
      new URLSearchParams(
        'utm_source=youtube&utm_medium=description&utm_campaign=launch&utm_content=pinned&ref=abc123',
      ),
      NOW,
    );
    expect(utm).toEqual({
      source: 'youtube',
      medium: 'description',
      campaign: 'launch',
      content: 'pinned',
      ref: 'abc123',
      ts: '2026-09-17T09:30:00.000Z',
    });
  });

  it('a single utm_source is enough', () => {
    const utm = parseUtmFromSearch(new URLSearchParams('utm_source=share'), NOW);
    expect(utm?.source).toBe('share');
    expect(utm?.medium).toBeNull();
  });

  it('reads a searchParams object as well as a URLSearchParams', () => {
    expect(parseUtmFromSearch({ utm_source: 'wechat' }, NOW)?.source).toBe('wechat');
    // Next hands a repeated parameter over as an array; the first one wins.
    expect(parseUtmFromSearch({ utm_source: ['a', 'b'] }, NOW)?.source).toBe('a');
  });

  it('trims, caps at 120 characters and strips cookie-breaking characters', () => {
    const long = 'x'.repeat(300);
    const utm = parseUtmFromSearch({ utm_source: `  ${long}  `, utm_medium: 'a;b\nc' }, NOW);
    expect(utm?.source).toHaveLength(120);
    expect(utm?.medium).toBe('abc');
  });

  it('an empty or whitespace-only value is null, not an empty string', () => {
    expect(parseUtmFromSearch({ utm_source: '   ' }, NOW)).toBeNull();
  });
});

describe('the dp_utm cookie round-trips', () => {
  it('serialises and parses back to the same object', () => {
    const utm = parseUtmFromSearch(new URLSearchParams('utm_source=wechat&ref=poster'), NOW)!;
    const cookie = serializeUtmCookie(utm);
    // URI-encoded, so it is safe as a cookie value.
    expect(cookie).not.toContain('"');
    expect(cookie).not.toContain(';');
    expect(parseUtmCookie(cookie)).toEqual(utm);
  });

  it('parses an un-encoded value too, for a cookie set by hand', () => {
    expect(parseUtmCookie('{"source":"x","ts":"2026-01-01T00:00:00.000Z"}')?.source).toBe('x');
  });

  it('never throws on rubbish', () => {
    for (const v of [undefined, null, '', 'not json', '%7B', '[]', '"a string"', '42']) {
      expect(parseUtmCookie(v)).toBeNull();
    }
  });

  it('a JSON object missing every field still parses, with a zero timestamp', () => {
    const got = parseUtmCookie(encodeURIComponent('{}'));
    expect(got).toEqual({
      source: null,
      medium: null,
      campaign: null,
      content: null,
      ref: null,
      ts: '1970-01-01T00:00:00.000Z',
    });
  });
});

describe('cookieString', () => {
  it('writes a Lax, path-/ cookie with the right lifetime', () => {
    expect(cookieString(DP_UTM_COOKIE, 'v', DP_UTM_MAX_AGE)).toBe(
      'dp_utm=v; max-age=7776000; path=/; SameSite=Lax',
    );
    expect(cookieString(DP_AID_COOKIE, 'v', DP_AID_MAX_AGE)).toBe(
      'dp_aid=v; max-age=31536000; path=/; SameSite=Lax',
    );
  });

  it('90 days and a year, in seconds', () => {
    expect(DP_UTM_MAX_AGE).toBe(60 * 60 * 24 * 90);
    expect(DP_AID_MAX_AGE).toBe(60 * 60 * 24 * 365);
  });
});

describe('readCookie', () => {
  it('finds a cookie among others', () => {
    const all = 'fb_lang=zh; dp_aid=abc; other=1';
    expect(readCookie(all, 'dp_aid')).toBe('abc');
    expect(readCookie(all, 'fb_lang')).toBe('zh');
  });

  it('does not match a prefix of another cookie name', () => {
    expect(readCookie('dp_aid_other=no; dp_aid=yes', 'dp_aid')).toBe('yes');
  });

  it('is null for a missing cookie or a missing jar', () => {
    expect(readCookie('a=1', 'dp_aid')).toBeNull();
    expect(readCookie('', 'dp_aid')).toBeNull();
    expect(readCookie(null, 'dp_aid')).toBeNull();
  });
});

describe('the anonymous id', () => {
  it('newAid makes a v4 uuid that isAid accepts', () => {
    for (let i = 0; i < 25; i++) expect(isAid(newAid())).toBe(true);
  });

  it('two calls do not collide', () => {
    expect(new Set(Array.from({ length: 200 }, newAid)).size).toBe(200);
  });

  it('isAid rejects anything that is not a v4 uuid', () => {
    for (const v of [
      '',
      'abc',
      '123e4567-e89b-12d3-a456-426614174000', // v1
      '00000000-0000-4000-0000-000000000000', // bad variant nibble
      'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA', // upper case
      42,
      null,
      undefined,
    ]) {
      expect(isAid(v)).toBe(false);
    }
  });
});
