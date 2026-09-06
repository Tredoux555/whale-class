// tests/security/voice-internal-token-ttl.test.ts
//
// /api/montree/admin/voice/llm mints a PRINCIPAL token on every voice turn so
// Astra's tool calls can re-enter the authenticated route path in-process. Its
// comment said "short-lived" — but it passed no ttlSeconds, so it inherited the
// house default of MONTREE_JWT_TTL_DAYS (3650 days ≈ 10 years). Every voice turn
// was minting a full-power, decade-long principal credential and writing it into
// a cookie header carried through the tool executor.
//
// The token stays in-process, so this was never the worst hole in the product —
// but an internal token whose whole justification is "it never leaves this
// server" should be worthless if it ever does. It is now capped at 120s.
//
// Asserted structurally: the route file must pass an explicit, small ttlSeconds
// to createMontreeToken. (Driving the route itself would require standing up
// Agora, Anthropic and the whole tool executor for what is a one-line contract.)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(__dirname, '..', '..', 'app/api/montree/admin/voice/llm/route.ts'),
  'utf8'
);

describe('voice/llm internal principal token', () => {
  it('declares an explicit, short TTL constant', () => {
    const m = SRC.match(/VOICE_INTERNAL_TOKEN_TTL_SECONDS\s*=\s*(\d+)/);
    expect(m, 'no VOICE_INTERNAL_TOKEN_TTL_SECONDS constant').toBeTruthy();

    const seconds = Number(m![1]);
    expect(seconds).toBeGreaterThan(0);
    // One voice turn. Anything approaching an hour means the cap has drifted.
    expect(seconds).toBeLessThanOrEqual(600);
  });

  it('actually passes that TTL to createMontreeToken', () => {
    // The bug was a createMontreeToken call with no options object at all,
    // silently inheriting the 3650-day default.
    expect(
      /createMontreeToken\([\s\S]{0,200}?ttlSeconds:\s*VOICE_INTERNAL_TOKEN_TTL_SECONDS/.test(
        SRC
      ),
      'createMontreeToken is called without the short ttlSeconds — the token ' +
        'inherits MONTREE_JWT_TTL_DAYS (3650 days)'
    ).toBe(true);
  });

  it('mints no principal token without a TTL anywhere in the file', () => {
    const calls = SRC.match(/createMontreeToken\(/g) ?? [];
    const withTtl = SRC.match(/ttlSeconds:/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(withTtl.length).toBe(calls.length);
  });
});
