// lib/montree/audit-logger.ts
// Shared audit logging utility for all Montree security events
//
// NOTE: Despite table name "montree_super_admin_audit", this logs ALL security events
// including teacher/parent/principal login attempts and password changes.
// The table was created in migration 099 for super-admin tracking but serves as
// the central security audit log. Consider renaming in a future refactoring.

import { SupabaseClient } from '@supabase/supabase-js';

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
      requires_review: entry.action === 'login_failed' || entry.action === 'password_change',
    });
  } catch (e) {
    // Fire-and-forget: log but never throw
    console.error('[Audit] Failed to log security event:', e);
  }
}

/**
 * Extract client IP from request headers (Railway sets x-forwarded-for)
 */
export function getClientIP(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown';
}

/**
 * Extract user-agent from request headers
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown';
}
