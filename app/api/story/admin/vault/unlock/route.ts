import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { Pool } from 'pg';
import crypto from 'crypto';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

const VAULT_PASSWORD = process.env.VAULT_PASSWORD || 'change-this-in-env';
const VAULT_PASSWORD_HASH = '$2b$10$ECecBvSrgN8mfruLKzvdjehcTXZaQonVkUyriGoIKdZPWHvrixssC'; // bcrypt hash of zoemylove

async function verifyAdminToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin') return null;
    return payload.username as string;
  } catch {
    return null;
  }
}

async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; lockoutMinutes?: number }> {
  try {
    const result = await dbQuery(
      `SELECT * FROM vault_unlock_attempts WHERE ip_address = $1 AND locked_until > NOW()`,
      [ipAddress]
    );
    
    if (result.rows.length > 0) {
      const lockoutTime = new Date(result.rows[0].locked_until);
      const minutesLeft = Math.ceil((lockoutTime.getTime() - Date.now()) / 60000);
      return { allowed: false, lockoutMinutes: minutesLeft };
    }
    
    return { allowed: true };
  } catch (e) {
    console.error('[Vault] Rate limit check error:', e);
    return { allowed: true };
  }
}

async function recordAttempt(ipAddress: string, success: boolean) {
  try {
    if (!success) {
      const existingResult = await dbQuery(
        `SELECT attempt_count, locked_until FROM vault_unlock_attempts 
         WHERE ip_address = $1`,
        [ipAddress]
      );
      
      if (existingResult.rows.length > 0) {
        const current = existingResult.rows[0];
        const newCount = current.attempt_count + 1;
        
        if (newCount >= 5) {
          const lockoutTime = new Date(Date.now() + 15 * 60000);
          await dbQuery(
            `UPDATE vault_unlock_attempts 
             SET attempt_count = $1, last_attempt = NOW(), locked_until = $2
             WHERE ip_address = $3`,
            [newCount, lockoutTime, ipAddress]
          );
        } else {
          await dbQuery(
            `UPDATE vault_unlock_attempts 
             SET attempt_count = $1, last_attempt = NOW()
             WHERE ip_address = $2`,
            [newCount, ipAddress]
          );
        }
      } else {
        await dbQuery(
          `INSERT INTO vault_unlock_attempts (ip_address, attempt_count)
           VALUES ($1, 1)`,
          [ipAddress]
        );
      }
    } else {
      await dbQuery(
        `DELETE FROM vault_unlock_attempts WHERE ip_address = $1`,
        [ipAddress]
      );
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

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const rateLimit = await checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      await dbQuery(
        `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
         VALUES ($1, $2, $3, $4, FALSE)`,
        ['unlock_attempt', adminUsername, ipAddress, `Rate limited. Lockout minutes: ${rateLimit.lockoutMinutes}`]
      );
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${rateLimit.lockoutMinutes} minutes.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== 'string' || password.length < 8) {
      await recordAttempt(ipAddress, false);
      await dbQuery(
        `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
         VALUES ($1, $2, $3, $4, FALSE)`,
        ['unlock_attempt', adminUsername, ipAddress, 'Invalid password format']
      );
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const validPassword = await compare(password, VAULT_PASSWORD_HASH);

    if (!validPassword) {
      await recordAttempt(ipAddress, false);
      await dbQuery(
        `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
         VALUES ($1, $2, $3, $4, FALSE)`,
        ['unlock_attempt', adminUsername, ipAddress, 'Wrong password']
      );
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
    }

    await recordAttempt(ipAddress, true);
    
    const encryptionKey = crypto.randomBytes(32).toString('hex');
    const token = await new (await import('jose')).SignJWT({ 
      vaultAccess: true, 
      encryptionKey,
      iat: Date.now() 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(getJWTSecret());

    await dbQuery(
      `INSERT INTO vault_audit_log (action, admin_username, ip_address, details, success)
       VALUES ($1, $2, $3, $4, TRUE)`,
      ['unlock_success', adminUsername, ipAddress, 'Vault unlocked']
    );

    return NextResponse.json({
      success: true,
      vaultToken: token
    });

  } catch (error) {
    console.error('[Vault Unlock] Error:', error);
    return NextResponse.json(
      { error: 'Unlock failed' },
      { status: 500 }
    );
  }
}

