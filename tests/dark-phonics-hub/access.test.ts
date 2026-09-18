// tests/dark-phonics-hub/access.test.ts
//
// The paywall's rules, flag off and flag on. These are the tests that have to
// stay green the day somebody flips DARK_PHONICS_PAYWALL: everything else in
// the hub is chrome, and this is the part that decides whether a teacher can
// teach.

import { describe, expect, it } from 'vitest';

import {
  DP_ACTIVE_STATUSES,
  DP_FREE_LESSONS,
  accessFor,
  canPlayLesson,
  isLessonLocked,
  isPaywallOn,
} from '@/lib/montree/dark-phonics/access';

describe('isPaywallOn', () => {
  it('is off when the variable is missing', () => {
    expect(isPaywallOn({})).toBe(false);
  });

  it('is off for anything that is not exactly "on"', () => {
    for (const v of ['off', 'OFF', '', 'true', '1', 'yes', 'ON ', 'onn']) {
      expect(isPaywallOn({ DARK_PHONICS_PAYWALL: v === 'ON ' ? v : v })).toBe(v.trim().toLowerCase() === 'on');
    }
  });

  it('is on for "on", with whitespace and case forgiven', () => {
    expect(isPaywallOn({ DARK_PHONICS_PAYWALL: 'on' })).toBe(true);
    expect(isPaywallOn({ DARK_PHONICS_PAYWALL: ' ON ' })).toBe(true);
  });
});

describe('canPlayLesson — FLAG OFF (today)', () => {
  it('opens every lesson for everybody, free tier included', () => {
    for (let n = 1; n <= 49; n++) {
      expect(canPlayLesson(n, 'free', false)).toBe(true);
      expect(canPlayLesson(n, 'full', false)).toBe(true);
      expect(isLessonLocked(n, 'free', false)).toBe(false);
    }
  });
});

describe('canPlayLesson — FLAG ON', () => {
  it('gives a full subscriber everything', () => {
    for (let n = 1; n <= 49; n++) expect(canPlayLesson(n, 'full', true)).toBe(true);
  });

  it('gives a free visitor exactly lessons 1-3', () => {
    expect(DP_FREE_LESSONS).toEqual([1, 2, 3]);
    for (const n of [1, 2, 3]) expect(canPlayLesson(n, 'free', true)).toBe(true);
    for (const n of [4, 5, 12, 21, 49]) expect(canPlayLesson(n, 'free', true)).toBe(false);
  });

  it('locks exactly the lessons it does not open', () => {
    for (let n = 1; n <= 49; n++) {
      expect(isLessonLocked(n, 'free', true)).toBe(!canPlayLesson(n, 'free', true));
    }
  });
});

describe('accessFor', () => {
  const NOW = new Date('2026-09-17T12:00:00.000Z');

  it('flag off is always full, session or not', () => {
    expect(accessFor({ paywallOn: false })).toMatchObject({ tier: 'full', reason: 'flag_off' });
    expect(accessFor({ paywallOn: false, userId: 'u1' })).toMatchObject({ tier: 'full', reason: 'flag_off' });
  });

  it('flag on with no session is free', () => {
    expect(accessFor({ paywallOn: true })).toMatchObject({ tier: 'free', reason: 'no_session' });
    expect(accessFor({ paywallOn: true, userId: null })).toMatchObject({ tier: 'free', reason: 'no_session' });
  });

  it('flag on with a session but no row is free', () => {
    expect(accessFor({ paywallOn: true, userId: 'u1' })).toMatchObject({
      tier: 'free',
      reason: 'no_subscription',
      userId: 'u1',
    });
  });

  it('accepts every status Stripe reports as still-paying', () => {
    for (const status of DP_ACTIVE_STATUSES) {
      expect(
        accessFor({ paywallOn: true, userId: 'u1', subscriptionStatus: status, now: NOW }),
      ).toMatchObject({ tier: 'full', reason: 'subscribed' });
    }
  });

  it('rejects the statuses that mean they stopped paying', () => {
    for (const status of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', '']) {
      expect(
        accessFor({ paywallOn: true, userId: 'u1', subscriptionStatus: status, now: NOW }),
      ).toMatchObject({ tier: 'free', reason: 'no_subscription' });
    }
  });

  it('a lapsed period end takes access away even from an "active" row', () => {
    expect(
      accessFor({
        paywallOn: true,
        userId: 'u1',
        subscriptionStatus: 'active',
        currentPeriodEnd: '2026-09-01T00:00:00.000Z',
        now: NOW,
      }),
    ).toMatchObject({ tier: 'free' });
  });

  it('a future period end leaves access alone', () => {
    expect(
      accessFor({
        paywallOn: true,
        userId: 'u1',
        subscriptionStatus: 'active',
        currentPeriodEnd: '2026-10-17T00:00:00.000Z',
        now: NOW,
      }),
    ).toMatchObject({ tier: 'full' });
  });

  it('an unparseable period end is ignored rather than locking somebody out', () => {
    expect(
      accessFor({
        paywallOn: true,
        userId: 'u1',
        subscriptionStatus: 'active',
        currentPeriodEnd: 'not a date',
        now: NOW,
      }),
    ).toMatchObject({ tier: 'full' });
  });
});
