// lib/montree/super-admin-security.ts
// Maximum security utilities for super admin access

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const ENCRYPTION_KEY = process.env.SUPER_ADMIN_ENCRYPTION_KEY || process.env.MESSAGE_ENCRYPTION_KEY || 'default-key-change-me';
const ALGORITHM = 'aes-256-gcm';

// ============================================
// ENCRYPTION UTILITIES
// ============================================

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// ============================================
// DATA MASKING
// ============================================

export function maskLoginCode(code: string): string {
  if (!code || code.length < 4) return '******';
  return code.substring(0, 2) + '****';
}

export function maskEmail(email: string): string {
  if (!email) return '***@***.***';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  const maskedLocal = local.substring(0, 2) + '***';
  const domainParts = domain.split('.');
  const maskedDomain = domainParts[0].substring(0, 2) + '***.' + domainParts.slice(1).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

export function maskName(name: string): string {
  if (!name || name.length < 2) return '***';
  return name.substring(0, 1) + '***' + name.substring(name.length - 1);
}

// ============================================
// TOTP 2FA
// ============================================

export function generateTOTPSecret(): string {
  // Generate 20 random bytes for TOTP secret
  return crypto.randomBytes(20).toString('base32');
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8-character alphanumeric codes
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

// TOTP verification (simplified - in production use a library like 'otpauth')
export function verifyTOTP(secret: string, token: string): boolean {
  // This is a simplified implementation
  // For production, use a proper TOTP library like 'otpauth' or 'speakeasy'
  const timeStep = 30; // 30 second windows
  const currentTime = Math.floor(Date.now() / 1000 / timeStep);

  // Check current and adjacent time windows
  for (let i = -1; i <= 1; i++) {
    const expectedToken = generateTOTPToken(secret, currentTime + i);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

function generateTOTPToken(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32'));
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1000000;

  return code.toString().padStart(6, '0');
}

// ============================================
// AUDIT LOGGING
// ============================================

interface AuditLogEntry {
  adminIdentifier: string;
  action: 'view' | 'reveal' | 'edit' | 'delete' | 'login' | 'login_failed' | 'totp_setup' | 'export';
  resourceType: 'school' | 'classroom' | 'teacher' | 'child' | 'login_code' | 'system' | 'config';
  resourceId?: string;
  resourceDetails?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  isSensitive?: boolean;
}

export async function logAudit(supabase: unknown, entry: AuditLogEntry): Promise<void> {
  try {
    const client = supabase as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<unknown> } };
    await client.from('montree_super_admin_audit').insert({
      admin_identifier: entry.adminIdentifier,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      resource_details: entry.resourceDetails,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      is_sensitive: entry.isSensitive || false,
      requires_review: entry.action === 'delete' || entry.action === 'export',
    });
  } catch (error) {
    // Log to console as fallback - audit logging should never silently fail
    console.error('[AUDIT] Failed to log audit entry:', entry, error);
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  supabase: unknown,
  ipAddress: string,
  userAgent: string,
  timeoutMinutes: number = 15
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

  const client = supabase as { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<unknown> } };
  await client.from('montree_super_admin_sessions').insert({
    token_hash: tokenHash,
    ip_address: ipAddress,
    user_agent: userAgent,
    expires_at: expiresAt.toISOString(),
  });

  return token;
}

export async function validateSession(
  supabase: unknown,
  token: string,
  ipAddress: string
): Promise<{ valid: boolean; totpVerified: boolean; reason?: string }> {
  const tokenHash = hashSessionToken(token);

  const client = supabase as {
    from: (table: string) => {
      select: (query: string) => {
        eq: (key: string, value: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
        }
      }
    }
  };
  const { data: session, error } = await client
    .from('montree_super_admin_sessions')
    .select('*')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !session) {
    return { valid: false, totpVerified: false, reason: 'Session not found' };
  }

  if (session.revoked) {
    return { valid: false, totpVerified: false, reason: 'Session revoked' };
  }

  if (new Date(session.expires_at) < new Date()) {
    return { valid: false, totpVerified: false, reason: 'Session expired' };
  }

  // IP binding check (optional strict mode)
  if (session.ip_address !== ipAddress) {
    // Log suspicious activity but don't block (IPs can change)
    console.warn(`[SECURITY] Session IP mismatch: expected ${session.ip_address}, got ${ipAddress}`);
  }

  // Update last activity
  await supabase
    .from('montree_super_admin_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('token_hash', tokenHash);

  return { valid: true, totpVerified: session.totp_verified };
}

// ============================================
// IP ALLOWLIST
// ============================================

export function isIPAllowed(ip: string, allowedIPs: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    return true; // No allowlist = allow all
  }

  return allowedIPs.some(allowed => {
    // Support CIDR notation in future
    return allowed === ip || allowed === '*';
  });
}

// ============================================
// ALERTS
// ============================================

export async function sendAlert(
  type: 'login' | 'sensitive_access' | 'suspicious',
  details: Record<string, any>,
  config: { email?: string; webhookUrl?: string }
): Promise<void> {
  const message = {
    type,
    timestamp: new Date().toISOString(),
    ...details,
  };

  // Email alert (using Resend if configured)
  if (config.email && process.env.RESEND_API_KEY) {
    try {
      // Would use Resend here
    } catch (e) {
    }
  }

  // Webhook alert (Slack, Discord, etc.)
  if (config.webhookUrl) {
    try {
      await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔐 Super Admin Alert: ${type}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Super Admin Alert*\nType: ${type}\nTime: ${message.timestamp}\nDetails: ${JSON.stringify(details, null, 2)}`,
              },
            },
          ],
        }),
      });
    } catch (e) {
      console.error('[ALERT] Failed to send webhook:', e);
    }
  }
}
