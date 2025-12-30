import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getJWTSecret } from '@/lib/story-db';
import crypto from 'crypto';

const VAULT_PASSWORD_HASH = '$2b$10$ECecBvSrgN8mfruLKzvdjehcTXZaQonVkUyriGoIKdZPWHvrixssC';

async function checkRateLimit(supabase: ReturnType<typeof getSupabase>, ipAddress: string) {
  try {
    const { data } = await supabase
      .from('vault_unlock_attempts')
      .select('*')
      .eq('ip_address', ipAddress)
      .gt('locked_until', new Date().toISOString())
      .limit(1);
    
    if (data && data.length > 0) {
      const lockoutTime = new Date(data[0].locked_until);
      const minutesLeft = Math.ceil((lockoutTime.getTime() - Date.now()) / 60000);
      return { allowed: false, lockoutMinutes: minutesLeft };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

async function recordAttempt(supabase: ReturnType<typeof getSupabase>, ipAddress: string, success: boolean) {
  try {
    if (!success) {
      const { data: existing } = await supabase
        .from('vault_unlock_attempts')
        .select('attempt_count')
        .eq('ip_address', ipAddress)
        .limit(1);
      
      if (existing && existing.length > 0) {
        const newCount = existing[0].attempt_count + 1;
        const update: Record<string, unknown> = { attempt_count: newCount, last_attempt: new Date().toISOString() };
        if (newCount >= 5) {
          update.locked_until = new Date(Date.now() + 15 * 60000).toISOString();
        }
        await supabase.from('vault_unlock_attempts').update(update).eq('ip_address', ipAddress);
      } else {
        await supabase.from('vault_unlock_attempts').insert({ ip_address: ipAddress, attempt_count: 1 });
      }
    } else {
      await supabase.from('vault_unlock_attempts').delete().eq('ip_address', ipAddress);
    }
  } catch (e) {
    console.error('[Vault] Attempt recording error:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    
    const rateLimit = await checkRateLimit(supabase, ipAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rateLimit.lockoutMinutes} minutes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length < 8) {
      await recordAttempt(supabase, ipAddress, false);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const bcrypt = await import('bcryptjs');
    const validPassword = await bcrypt.compare(password, VAULT_PASSWORD_HASH);

    if (!validPassword) {
      await recordAttempt(supabase, ipAddress, false);
      await supabase.from('vault_audit_log').insert({
        action: 'unlock_attempt',
        admin_username: adminUsername,
        ip_address: ipAddress,
        details: 'Wrong password',
        success: false
      });
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    await recordAttempt(supabase, ipAddress, true);
    
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
