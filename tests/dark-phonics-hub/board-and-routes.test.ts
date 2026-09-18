// tests/dark-phonics-hub/board-and-routes.test.ts
//
// The board scope the Community tab needs, the share links it hands out, the
// /dp redirect, and the two string tables staying in step.

import { describe, expect, it } from 'vitest';

import { parseBoardRef } from '@/lib/montree/feedback/types';
import { lessonPath, shareText, shareTitle, shareUrl } from '@/lib/montree/dark-phonics/share';
import { HUB_EN, HUB_ZH, makeHubT, isHubLang } from '@/lib/montree/dark-phonics/hub-strings';
import { GET as dpRedirect } from '@/app/dp/route';

describe('parseBoardRef — the product scope', () => {
  it('still parses the two scopes it had before', () => {
    expect(parseBoardRef('public')).toEqual({ scope: 'public', schoolId: null, slug: null, ref: 'public' });
    expect(parseBoardRef('')).toMatchObject({ scope: 'public' });
    const uuid = '11111111-2222-3333-4444-555555555555';
    expect(parseBoardRef(`school:${uuid}`)).toEqual({
      scope: 'school',
      schoolId: uuid,
      slug: null,
      ref: `school:${uuid}`,
    });
  });

  it('parses the Dark Phonics board', () => {
    expect(parseBoardRef('product:dark-phonics')).toEqual({
      scope: 'product',
      schoolId: null,
      slug: 'dark-phonics',
      ref: 'product:dark-phonics',
    });
  });

  it('normalises case and whitespace, as it does for school refs', () => {
    expect(parseBoardRef('  PRODUCT:Dark-Phonics ')).toMatchObject({ ref: 'product:dark-phonics' });
  });

  it('a product board never names a school', () => {
    expect(parseBoardRef('product:dark-phonics')?.schoolId).toBeNull();
  });

  it('refuses a slug that is not a slug, rather than falling back to public', () => {
    for (const ref of [
      'product:',
      'product: ',
      'product:a',
      'product:-leading',
      'product:trailing-',
      'product:double--hyphen',
      'product:Has Space',
      'product:under_score',
      `product:${'x'.repeat(49)}`,
      'product:../../etc',
    ]) {
      expect(parseBoardRef(ref)).toBeNull();
    }
  });

  it('still refuses everything that was never a board ref', () => {
    for (const ref of ['nonsense', 'school:not-a-uuid', 'PRODUCT', 42, null, undefined, {}]) {
      expect(parseBoardRef(ref)).toBeNull();
    }
  });
});

describe('share links', () => {
  it('the canonical path is the deep link', () => {
    expect(lessonPath(5)).toBe('/dark-phonics/l/5');
    expect(lessonPath(21)).toBe('/dark-phonics/l/21');
  });

  it('carries the source and the medium', () => {
    expect(shareUrl(5, 'share')).toBe('/dark-phonics/l/5?utm_source=share&utm_medium=share');
    expect(shareUrl(5, 'copy')).toBe('/dark-phonics/l/5?utm_source=share&utm_medium=copy');
  });

  it('is absolute when an origin is known, with no doubled slash', () => {
    expect(shareUrl(5, 'copy', 'https://montree.xyz')).toBe(
      'https://montree.xyz/dark-phonics/l/5?utm_source=share&utm_medium=copy',
    );
    expect(shareUrl(5, 'copy', 'https://montree.xyz/')).toBe(
      'https://montree.xyz/dark-phonics/l/5?utm_source=share&utm_medium=copy',
    );
  });

  it('says what was finished, in both languages', () => {
    expect(shareTitle('Snake in My Sock')).toBe('We finished Snake in My Sock!');
    expect(shareTitle('In the Pit!', 'zh')).toContain('In the Pit!');
    expect(shareText('In the Pit!')).toContain('We finished In the Pit!');
  });

  it('does not double the exclamation mark most book titles already carry', () => {
    expect(shareTitle('In the Pit!')).toBe('We finished In the Pit!');
    expect(shareTitle('The ___ Naps!')).toBe('We finished The ___ Naps!');
    expect(shareTitle('In the Pit!', 'zh')).toBe('我们读完了《In the Pit!》');
    expect(shareTitle('Snake in My Sock', 'zh')).toBe('我们读完了《Snake in My Sock》！');
  });
});

describe('/dp', () => {
  const call = (url: string) =>
    dpRedirect({ url, nextUrl: new URL(url) } as unknown as Parameters<typeof dpRedirect>[0]);

  it('302s to the hub', async () => {
    const res = await call('https://montree.xyz/dp');
    expect(res.status).toBe(302);
    expect(new URL(res.headers.get('location')!).pathname).toBe('/dark-phonics');
  });

  it('preserves the whole query string, utm and all', async () => {
    const res = await call('https://montree.xyz/dp?utm_source=poster&utm_medium=qr&ref=abc&tab=classroom');
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/dark-phonics');
    expect(loc.searchParams.get('utm_source')).toBe('poster');
    expect(loc.searchParams.get('utm_medium')).toBe('qr');
    expect(loc.searchParams.get('ref')).toBe('abc');
    expect(loc.searchParams.get('tab')).toBe('classroom');
  });

  it('keeps the host it was asked on (teacherpotato as well as montree)', async () => {
    const res = await call('https://www.teacherpotato.xyz/dp?utm_source=x');
    expect(new URL(res.headers.get('location')!).host).toBe('www.teacherpotato.xyz');
  });
});

describe('hub strings', () => {
  it('the two tables carry exactly the same keys', () => {
    expect(Object.keys(HUB_ZH).sort()).toEqual(Object.keys(HUB_EN).sort());
  });

  it('no string is empty in either table', () => {
    for (const [k, v] of Object.entries(HUB_EN)) expect(v.trim(), `en ${k}`).not.toBe('');
    for (const [k, v] of Object.entries(HUB_ZH)) expect(v.trim(), `zh ${k}`).not.toBe('');
  });

  it('makeHubT falls back to English and then to the key itself', () => {
    expect(makeHubT('zh')('tab.play')).toBe(HUB_ZH['tab.play']);
    expect(makeHubT('en')('tab.play')).toBe(HUB_EN['tab.play']);
    expect(makeHubT('en')('no.such.key')).toBe('no.such.key');
  });

  it('isHubLang accepts the two languages and nothing else', () => {
    expect(isHubLang('en')).toBe(true);
    expect(isHubLang('zh')).toBe(true);
    for (const v of ['EN', 'fr', '', null, 1]) expect(isHubLang(v)).toBe(false);
  });
});
