import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getJWTSecret } from '@/lib/story-db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';
import crypto from 'crypto';

const VAULT_PASSWORD_HASH = process.env.VAULT_PASSWORD_HASH;
if (!VAULT_PASSWORD_HASH) {
  console.error('[Vault] VAULT_PASSWORD_HASH must be set in environment variables');
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const ipAddress = getClientIP(req.headers);

    // audit-fix M2 (Jun 2026): the old bespoke limiter (vault_unlock_attempts
    // table) was keyed on raw `x-forwarded-for` (attacker-rotatable header →
    // unlimited bcrypt guesses) and failed OPEN on any DB error. Replaced with
    // the shared hardened limiter (lib/rate-limiter — same one the Montree
    // login routes use with failMode 'closed'):
    //   • keyed on the AUTHENTICATED admin identity + IP — this route runs
    //     post-admin-auth (verifyAdminToken above), so the key can't be spoofed
    //     by header rotation; IP is still included via the app-standard
    //     getClientIP chain so two stolen-token holders don't share a bucket.
    //   • failMode 'closed' — a limiter backend error DENIES (429) instead of
    //     letting brute force run unmetered.
    // Semantic change: every attempt in the window counts (5/15min), not just
    // failures — acceptable, a legit operator unlocks at most a few times/hour
    // (vault token TTL is 1h).
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase,
      `${adminUsername}|${ipAddress}`,
      '/api/story/admin/vault/unlock',
      5,
      15,
      'closed'
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many unlock attempts. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds ?? 900) } }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const bcrypt = await import('bcryptjs');
    const validPassword = await bcrypt.compare(password, VAULT_PASSWORD_HASH);

    if (!validPassword) {
      await supabase.from('vault_audit_log').insert({
        action: 'unlock_attempt',
        admin_username: adminUsername,
        ip_address: ipAddress,
        details: 'Wrong password',
        success: false
      });
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const { SignJWT } = await import('jose');
    const token = await new SignJWT({ vaultAccess: true, encryptionKey, iat: Date.now() })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(getJWTSecret());

    await supabase.from('vault_audit_log').insert({
      action: 'unlock_success',
      admin_username: adminUsername,
      ip_address: ipAddress,
      details: 'Vault unlocked',
      success: true
    });

    return NextResponse.json({ success: true, vaultToken: token });
  } catch (error) {
    console.error('[Vault Unlock] Error:', error);
    return NextResponse.json({ error: 'Unlock failed' }, { status: 500 });
  }
}
