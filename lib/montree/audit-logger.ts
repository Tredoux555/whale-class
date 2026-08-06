// lib/montree/audit-logger.ts
// Shared audit logging utility for all Montree security events
//
// NOTE: Despite table name "montree_super_admin_audit", this logs ALL security events
// including teacher/parent/principal login attempts and password changes.
// The table was created in migration 099 for super-admin tracking but serves as
// the central security audit log. Consider renaming in a future refactoring.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

interface AuditEntry {
  adminIdentifier: string;     // Email, username, IP, or "anonymous"
  action: string;              // 'login_success', 'login_failed', 'password_change', etc.
  resourceType: string;        // 'system', 'teacher', 'parent', 'principal', 'school'
  resourceId?: string;         // UUID of the resource accessed (nullable for system actions)
  resourceDetails?: Record<string, unknown>; // Additional context
  ipAddress?: string;
  userAgent?: string;
  isSensitive?: boolean;       // True if accessing PII or login codes
}

/**
 * Log a security event to the audit table.
 * Fire-and-forget: never throws, never blocks the caller.
 * Auth should never fail because logging failed.
 */
export async function logAudit(supabase: SupabaseClient, entry: AuditEntry): Promise<void> {
  try {
    await supabase.from('montree_super_admin_audit').insert({
      admin_identifier: entry.adminIdentifier,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId || null,
      resource_details: entry.resourceDetails || null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      is_sensitive: entry.isSensitive || false,
      requires_review: ['login_failed', 'password_change', 'school_delete', 'child_delete', 'login_as', 'account_created'].includes(entry.action),
    });
  } catch (e) {
    // Fire-and-forget: log but never throw
    console.error('[Audit] Failed to log security event:', e);
  }
}

/**
 * Extract the client IP from request headers.
 *
 * 🚨 SECURITY (audit fix Aug 2026): the naive `x-forwarded-for.split(',')[0]` is
 * ATTACKER-CONTROLLED. X-Forwarded-For is built left-to-right — each proxy APPENDS the
 * address it saw — so the FIRST entry is whatever the original client sent, which a client
 * can set to anything. Trusting it made every fail-closed rate limiter both bypassable (spoof
 * a fresh IP per attempt) AND a lockout weapon (spoof a victim's IP to burn their bucket).
 *
 * Trust order, most-trustworthy first:
 *   1. `cf-connecting-ip` — set by Cloudflare from the real TCP peer, stripped-and-reset on
 *      every request, not client-appendable. When present it is authoritative.
 *   2. the LAST hop of `x-forwarded-for` — the entry the CLOSEST trusted proxy appended, i.e.
 *      the peer IT saw. A client can prepend spoofed entries but cannot stop the edge from
 *      appending the real one at the end. This is the correct value to trust when there is
 *      exactly one trusted proxy in front (the deployment's edge).
 *   3. `x-real-ip` — single-value edge header, used where set.
 *
 * Signature is unchanged, so every existing caller keeps working — they just get a value that
 * cannot be forged from the request body.
 */
export function getClientIP(headers: Headers): string {
  const cfConnecting = headers.get('cf-connecting-ip')?.trim();
  if (cfConnecting) return cfConnecting;

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const hops = forwarded.split(',').map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Extract user-agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}
