// tests/dark-phonics-hub/events-and-leads.test.ts
//
// The two open endpoints' validators. Both are the only thing standing between
// a public POST and a table, so both are tested as gatekeepers rather than as
// parsers: what they REFUSE matters more than what they accept.

import { describe, expect, it } from 'vitest';

import {
  DP_EVENTS,
  DP_PROPS_MAX_KEYS,
  isDpEvent,
  validateEvent,
} from '@/lib/montree/dark-phonics/events';
import { DP_LEAD_ROLES, normalizeEmail, validateLead } from '@/lib/montree/dark-phonics/leads';

describe('the event allow-list', () => {
  it('is exactly the thirteen events the brief named', () => {
    expect([...DP_EVENTS]).toEqual([
      'hub_view',
      'tab_view',
      'lesson_open',
      'stage_done',
      'lesson_done',
      'share_open',
      'share_done',
      'lead_submit',
      'print_click',
      'community_view',
      'paywall_view',
      'checkout_start',
      'subscribe_done',
    ]);
  });

  it('isDpEvent accepts only those names', () => {
    for (const e of DP_EVENTS) expect(isDpEvent(e)).toBe(true);
    for (const e of ['', 'HUB_VIEW', 'hub view', 'drop table', 42, null, {}]) {
      expect(isDpEvent(e)).toBe(false);
    }
  });
});

describe('validateEvent', () => {
  it('rejects a body that is not an object', () => {
    for (const b of [null, undefined, 'x', 42, []]) {
      expect(validateEvent(b)).toMatchObject({ ok: false });
    }
  });

  it('rejects an unknown event name', () => {
    expect(validateEvent({ event: 'sneaky' })).toMatchObject({ ok: false, error: 'Unknown event.' });
  });

  it('accepts a bare known event', () => {
    expect(validateEvent({ event: 'hub_view' })).toEqual({
      ok: true,
      value: { event: 'hub_view', lesson: null, stage: null, props: null },
    });
  });

  it('accepts a lesson in range and coerces a numeric string', () => {
    expect(validateEvent({ event: 'lesson_open', lesson: 5 })).toMatchObject({
      ok: true,
      value: { lesson: 5 },
    });
    expect(validateEvent({ event: 'lesson_open', lesson: '21' })).toMatchObject({
      ok: true,
      value: { lesson: 21 },
    });
  });

  it('rejects a lesson out of range or not an integer', () => {
    for (const lesson of [0, 50, -1, 4.5, 'five', Number.NaN, Infinity]) {
      expect(validateEvent({ event: 'lesson_open', lesson })).toMatchObject({ ok: false });
    }
  });

  it('treats a missing / null / empty lesson as no lesson', () => {
    for (const lesson of [undefined, null, '']) {
      expect(validateEvent({ event: 'hub_view', lesson })).toMatchObject({
        ok: true,
        value: { lesson: null },
      });
    }
  });

  it('trims a stage and caps its length', () => {
    const got = validateEvent({ event: 'stage_done', stage: `  ${'s'.repeat(90)}  ` });
    expect(got.ok).toBe(true);
    if (got.ok) expect(got.value.stage).toHaveLength(40);
  });

  it('keeps scalar props and drops the rest', () => {
    const got = validateEvent({
      event: 'print_click',
      props: { book: 'the-pit', item: 'work1', n: 3, ok: true, nested: { a: 1 }, list: [1, 2] },
    });
    expect(got.ok).toBe(true);
    if (got.ok) {
      expect(got.value.props).toMatchObject({ book: 'the-pit', item: 'work1', n: 3, ok: true });
      expect(got.value.props).not.toHaveProperty('nested');
      expect(got.value.props).not.toHaveProperty('list');
    }
  });

  it('caps the number of props', () => {
    const props: Record<string, string> = {};
    for (let i = 0; i < 40; i++) props[`k${i}`] = 'v';
    const got = validateEvent({ event: 'hub_view', props });
    expect(got.ok).toBe(true);
    if (got.ok) expect(Object.keys(got.value.props ?? {})).toHaveLength(DP_PROPS_MAX_KEYS);
  });

  it('an empty props object becomes null rather than {}', () => {
    const got = validateEvent({ event: 'hub_view', props: {} });
    if (got.ok) expect(got.value.props).toBeNull();
  });

  it('ignores unknown top-level keys instead of rejecting the beacon', () => {
    expect(validateEvent({ event: 'hub_view', wat: 1, aid: 'spoofed' })).toMatchObject({ ok: true });
  });

  it('never lets a caller name its own aid', () => {
    const got = validateEvent({ event: 'hub_view', aid: 'spoofed' });
    expect(got.ok).toBe(true);
    if (got.ok) expect(Object.keys(got.value)).toEqual(['event', 'lesson', 'stage', 'props']);
  });
});

describe('normalizeEmail', () => {
  it('lower-cases and trims a plausible address', () => {
    expect(normalizeEmail('  Anna@School.ORG ')).toBe('anna@school.org');
    expect(normalizeEmail('a.b+tag@sub.example.co.uk')).toBe('a.b+tag@sub.example.co.uk');
  });

  it('rejects what is obviously not an address', () => {
    for (const v of ['', '   ', 'anna', 'anna@', '@school.org', 'a@b', 'a b@c.org', 'a@b,c.org', null, 42]) {
      expect(normalizeEmail(v)).toBeNull();
    }
  });

  it('rejects an address longer than the RFC maximum', () => {
    expect(normalizeEmail(`${'a'.repeat(250)}@b.org`)).toBeNull();
  });
});

describe('validateLead', () => {
  it('accepts an address with no role', () => {
    expect(validateLead({ email: 'a@b.org' })).toEqual({
      ok: true,
      value: { email: 'a@b.org', role: null },
    });
  });

  it('accepts the two roles and drops anything else', () => {
    for (const role of DP_LEAD_ROLES) {
      expect(validateLead({ email: 'a@b.org', role })).toMatchObject({ ok: true, value: { role } });
    }
    expect(validateLead({ email: 'a@b.org', role: 'principal' })).toMatchObject({
      ok: true,
      value: { role: null },
    });
  });

  it('flags a filled honeypot without saying so to the caller', () => {
    const got = validateLead({ email: 'a@b.org', website: 'http://spam' });
    expect(got).toMatchObject({ ok: false, honeypot: true });
  });

  it('an empty honeypot is a real person', () => {
    expect(validateLead({ email: 'a@b.org', website: '' })).toMatchObject({ ok: true });
    expect(validateLead({ email: 'a@b.org', website: '   ' })).toMatchObject({ ok: true });
  });

  it('rejects a bad address and a non-object body', () => {
    expect(validateLead({ email: 'nope' })).toMatchObject({ ok: false });
    expect(validateLead(null)).toMatchObject({ ok: false });
    expect(validateLead([])).toMatchObject({ ok: false });
  });
});
