// tests/auth-tokens.test.ts
// Safety net for the JWT auth layer (lib/montree/server-auth.ts).
// These lock down the security-critical properties BEFORE we shorten the
// token TTL (weekend hardening step 4), so we can prove the change is safe.

import { describe, it, expect } from 'vitest';
import {
  createMontreeToken,
  verifyMontreeToken,
  createParentToken,
  verifyParentToken,
} from '@/lib/montree/server-auth';
import { SignJWT, decodeJwt } from 'jose';

const SECRET = new TextEncoder().encode(
  'test-only-secret-do-not-use-in-prod-1234567890'
);

describe('montree token round-trip', () => {
  it('signs and verifies a principal token', async () => {
    const token = await createMontreeToken({
      sub: 'teacher-1',
      schoolId: 'school-A',
      classroomId: 'class-1',
      role: 'principal',
    });
    const payload = await verifyMontreeToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe('teacher-1');
    expect(payload?.schoolId).toBe('school-A');
    expect(payload?.role).toBe('principal');
  });

  it('rejects a tampered token', async () => {
    const token = await createMontreeToken({
      sub: 'teacher-1',
      schoolId: 'school-A',
      role: 'teacher',
    });
    const tampered = token.slice(0, -3) + 'xyz';
    expect(await verifyMontreeToken(tampered)).toBeNull();
  });

  it('rejects an expired token', async () => {
    // Hand-sign a token that expired one hour ago.
    const expired = await new SignJWT({ schoolId: 'school-A', role: 'teacher' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('teacher-1')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(SECRET);
    expect(await verifyMontreeToken(expired)).toBeNull();
  });

  it('rejects a token signed with the wrong secret', async () => {
    const wrong = await new SignJWT({ schoolId: 'school-A', role: 'teacher' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('teacher-1')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('a-totally-different-secret'));
    expect(await verifyMontreeToken(wrong)).toBeNull();
  });

  it('rejects a token with an unknown role', async () => {
    const weird = await new SignJWT({ schoolId: 'school-A', role: 'superuser' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('x')
      .setExpirationTime('1h')
      .sign(SECRET);
    expect(await verifyMontreeToken(weird)).toBeNull();
  });
});

describe('auth-domain isolation (parent vs montree)', () => {
  it('a montree token does NOT verify as a parent token', async () => {
    const montree = await createMontreeToken({
      sub: 'teacher-1',
      schoolId: 'school-A',
      role: 'teacher',
    });
    // Same secret, but role !== 'parent' must be rejected by the parent verifier.
    expect(await verifyParentToken(montree)).toBeNull();
  });

  it('a parent token does NOT verify as a montree token', async () => {
    const parent = await createParentToken({
      sub: 'child-1',
      childName: 'Yoyo',
      classroomId: 'class-1',
    });
    expect(await verifyMontreeToken(parent)).toBeNull();
  });

  it('a parent token round-trips through the parent verifier', async () => {
    const parent = await createParentToken({ sub: 'child-1', parentId: 'p-1' });
    const payload = await verifyParentToken(parent);
    expect(payload?.sub).toBe('child-1');
    expect(payload?.parentId).toBe('p-1');
  });
});

describe('token TTL (step 4 — no more 365-day tokens)', () => {
  it('issues a ~30-day token by default, not a year', async () => {
    const token = await createMontreeToken({
      sub: 'teacher-1',
      schoolId: 'school-A',
      role: 'principal',
    });
    const { iat, exp } = decodeJwt(token);
    expect(iat).toBeTypeOf('number');
    expect(exp).toBeTypeOf('number');
    const days = ((exp as number) - (iat as number)) / 86400;
    // Default is 30 days. Guard: must be well under the old 365-day value.
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(31);
    expect(days).toBeLessThan(90);
  });
});
