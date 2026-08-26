// tests/lens-auth.test.ts
// The cookie is the entire front door of Montree Lens. These tests pin the two
// properties that make it a security boundary rather than a formality:
//
//   1. a token signed with the right secret but the WRONG audience is refused
//   2. a token whose observerId is not a uuid is refused
//
// (1) is the one that matters. Lens, Potato Snaps and Montree all sign with
// ADMIN_SECRET, so without the `aud` check a montree-auth token pasted into the
// lens_observer cookie would VERIFY. It would then fail on shape — which is
// "fails for the wrong reason", and not a boundary anyone should rely on.

import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import {
  createObserverToken,
  verifyLensObserverToken,
  checkLensRateLimit,
  LENS_TOKEN_TTL_DAYS,
  OBSERVER_COOKIE,
} from '@/lib/lens/auth';

const OBSERVER_ID = '3f1c9b7e-2a44-4d1e-9c0b-8e5a7d6f1234';

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.ADMIN_SECRET!);
}

describe('lens observer token', () => {
  it('round-trips a valid token', async () => {
    const token = await createObserverToken(OBSERVER_ID);
    const session = await verifyLensObserverToken(token);
    expect(session).toEqual({ observerId: OBSERVER_ID });
  });

  it('refuses a token signed with the same secret but a different audience', async () => {
    // Exactly what a Potato Snaps teacher cookie looks like: same secret, same
    // algorithm, different `aud`. This must not verify as a Lens session.
    const foreign = await new SignJWT({ observerId: OBSERVER_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('potato-teacher')
      .setIssuedAt()
      .setExpirationTime('10d')
      .sign(secret());

    expect(await verifyLensObserverToken(foreign)).toBeNull();
  });

  it('refuses a token with no audience at all', async () => {
    const noAud = await new SignJWT({ observerId: OBSERVER_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('10d')
      .sign(secret());

    expect(await verifyLensObserverToken(noAud)).toBeNull();
  });

  it('refuses a token signed with a different secret', async () => {
    const wrongSecret = await new SignJWT({ observerId: OBSERVER_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('lens-observer')
      .setIssuedAt()
      .setExpirationTime('10d')
      .sign(new TextEncoder().encode('a-completely-different-secret-000000'));

    expect(await verifyLensObserverToken(wrongSecret)).toBeNull();
  });

  it('refuses a right-audience token whose observerId is not a uuid', async () => {
    // The shape check is the second wall behind the audience check. An id that
    // is not a uuid can never match a lens_observers row, and letting it through
    // would put an unvalidated string into every downstream `.eq('id', …)`.
    const badShape = await new SignJWT({ observerId: 'not-a-uuid' })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('lens-observer')
      .setIssuedAt()
      .setExpirationTime('10d')
      .sign(secret());

    expect(await verifyLensObserverToken(badShape)).toBeNull();
  });

  it('refuses an expired token', async () => {
    const expired = await new SignJWT({ observerId: OBSERVER_ID })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('lens-observer')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret());

    expect(await verifyLensObserverToken(expired)).toBeNull();
  });

  it('refuses obvious garbage without throwing', async () => {
    for (const junk of ['', 'not.a.token', 'a.b.c', '{}']) {
      expect(await verifyLensObserverToken(junk)).toBeNull();
    }
  });

  it('names the cookie and TTL the rest of the app depends on', () => {
    // Both are load-bearing across files (the middleware note, the client, the
    // build log). A silent rename here would sign everybody out.
    expect(OBSERVER_COOKIE).toBe('lens_observer');
    expect(LENS_TOKEN_TTL_DAYS).toBe(3650);
  });
});

describe('lens rate limit', () => {
  it('allows up to the limit and then refuses, per key', () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(checkLensRateLimit(key, 5)).toBe(true);
    expect(checkLensRateLimit(key, 5)).toBe(false);
  });

  it('keeps keys independent', () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkLensRateLimit(a, 3);
    expect(checkLensRateLimit(a, 3)).toBe(false);
    expect(checkLensRateLimit(b, 3)).toBe(true);
  });
});
