import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifyAdminToken } from '@/lib/story-db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const admin = await verifyAdminToken(request.headers.get('Authorization'));
  return admin !== null;
}

// audit-fix M3 (Jun 2026): destructive ops were gated only by the 24h admin
// JWT + the static, non-secret string 'CONFIRM' — a stolen admin token alone
// could wipe everything. These actions now ALSO require per-call re-entry of
// the admin's own password (bcrypt vs story_admin_users), the audit's accepted
// step-up for ops strictly less destructive than the nuke (factory_reset
// touches a subset of the nuke's tables, never secret_stories or the story
// buckets, and preserves the audit log — the nuke keeps its own stronger
// STORY_NUKE_CODE timing-safe gate, see ./nuke/route.ts).
// FAIL-CLOSED: missing/invalid password, DB error, missing hash row, and
// limiter backend error ALL deny.
// Exported for unit testing (tests/system-controls-stepup.test.ts). Behaviour
// is identical to the inline form — export only, no logic change.
export const DESTRUCTIVE_ACTIONS = new Set(['factory_reset', 'clear_vault', 'delete_all_users']);

export async function verifyStepUpPassword(
  supabase: ReturnType<typeof getSupabase>,
  adminUsername: string,
  adminPassword: unknown
): Promise<boolean> {
  if (typeof adminPassword !== 'string' || adminPassword.length === 0) return false;
  try {
    const { data: rows, error } = await supabase
      .from('story_admin_users')
      .select('password_hash')
      .eq('username', adminUsername)
      .limit(1);
    if (error || !rows || rows.length === 0) return false;
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(adminPassword, rows[0].password_hash);
  } catch (e) {
    console.error('[System Controls] Step-up verification error (fail-closed):', e);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // 🚨 Session 113 V2 Story audit F-2.5 — capture the admin username so
  // factory_reset can write a final 'fired by X' audit row before the wipe.
  const adminUsername = await verifyAdminToken(request.headers.get('Authorization'));
  if (!adminUsername) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, confirmCode, adminPassword } = await request.json();
    const supabase = getSupabase();

    // Require confirmation code for destructive actions
    if (confirmCode !== 'CONFIRM') {
      return NextResponse.json({ error: 'Invalid confirmation code' }, { status: 400 });
    }

    // audit-fix M3 (Jun 2026): step-up gate for destructive actions — see the
    // DESTRUCTIVE_ACTIONS comment above. Rate-limit the bcrypt oracle first
    // (5/15min, keyed on authenticated admin + IP, fail-CLOSED — mirrors the
    // M2 vault-unlock fix) so a stolen JWT can't brute-force the admin
    // password through this route either.
    if (DESTRUCTIVE_ACTIONS.has(action)) {
      const ipAddress = getClientIP(request.headers);
      const { allowed, retryAfterSeconds } = await checkRateLimit(
        supabase,
        `${adminUsername}|${ipAddress}`,
        '/api/story/admin/system-controls#destructive',
        5,
        15,
        'closed'
      );
      if (!allowed) {
        return NextResponse.json(
          { error: 'Too many attempts. Try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds ?? 900) } }
        );
      }

      const stepUpOk = await verifyStepUpPassword(supabase, adminUsername, adminPassword);
      if (!stepUpOk) {
        // Leave a forensic trail — a denied destructive attempt is exactly the
        // signal that an admin token may be stolen. Fire-and-forget.
        await supabase.from('vault_audit_log').insert({
          action: 'destructive_action_denied',
          admin_username: adminUsername,
          ip_address: ipAddress,
          details: `Step-up password check failed for action '${action}'`,
          success: false,
        }).then(({ error }) => {
          if (error) console.error('[System Controls] Denied-attempt audit write failed', error);
        });
        return NextResponse.json(
          { error: 'Admin password verification failed' },
          { status: 401 }
        );
      }
    }

    let result = { success: false, message: '', affected: 0 };

    switch (action) {
      case 'clear_messages': {
        // First count, then delete
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_message_history')
          .delete()
          .not('id', 'is', null); // Delete all rows
        
        if (error) throw error;
        result = { success: true, message: 'All messages cleared', affected: count || 0 };
        break;
      }

      case 'clear_expired_messages': {
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true })
          .eq('is_expired', true);
        
        const { error } = await supabase
          .from('story_message_history')
          .delete()
          .eq('is_expired', true);
        
        if (error) throw error;
        result = { success: true, message: 'Expired messages cleared', affected: count || 0 };
        break;
      }

      case 'clear_login_logs': {
        const { count } = await supabase
          .from('story_login_logs')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_login_logs')
          .delete()
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'Login logs cleared', affected: count || 0 };
        break;
      }

      case 'clear_vault': {
        const { data: files } = await supabase
          .from('vault_files')
          .select('id, file_url');

        if (files && files.length > 0) {
          const paths = files
            .map((f: { file_url?: string }) => {
              const match = f.file_url?.match(/vault\/[^?]+/);
              return match ? match[0] : null;
            })
            .filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from('vault-secure').remove(paths);
          }
        }

        const { error } = await supabase
          .from('vault_files')
          .delete()
          .not('id', 'is', null);

        if (error) throw error;
        result = { success: true, message: 'Vault cleared', affected: files?.length || 0 };

        await supabase
          .from('vault_audit_log')
          .delete()
          .not('id', 'is', null);

        break;
      }

      case 'reset_user_sessions': {
        const { count } = await supabase
          .from('story_users')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_users')
          .update({ last_login: null })
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'User sessions reset', affected: count || 0 };
        break;
      }

      case 'delete_all_users': {
        const { count } = await supabase
          .from('story_users')
          .select('*', { count: 'exact', head: true });
        
        const { error } = await supabase
          .from('story_users')
          .delete()
          .not('id', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'All users deleted', affected: count || 0 };
        break;
      }

      case 'clear_all_media': {
        const { count } = await supabase
          .from('story_message_history')
          .select('*', { count: 'exact', head: true })
          .not('media_url', 'is', null);
        
        const { error } = await supabase
          .from('story_message_history')
          .update({ media_url: null, media_filename: null })
          .not('media_url', 'is', null);
        
        if (error) throw error;
        result = { success: true, message: 'All media cleared from messages', affected: count || 0 };
        break;
      }

      case 'factory_reset': {
        // 🚨 Session 113 V2 Story audit F-2.5 — preserve audit logs through
        // factory_reset. The whole point of audit non-repudiation is that
        // admins (or anyone holding an admin token) can't cover their tracks.
        // Previously this deleted vault_audit_log + vault_unlock_attempts;
        // those are now PRESERVED. Write a final 'factory_reset fired' row
        // before the rest of the wipe so the act itself is logged.
        // audit-fix M2/M3 (Jun 2026): app-standard IP extraction (first XFF
        // hop via getClientIP) instead of the raw header blob.
        const ipAddress = getClientIP(request.headers);
        await supabase.from('vault_audit_log').insert({
          action: 'factory_reset',
          admin_username: adminUsername,
          ip_address: ipAddress,
          details: 'Factory reset fired — all non-audit Story data cleared',
          success: true,
        }).then(({ error }) => {
          if (error) console.error('[System Controls] factory_reset audit log write failed', error);
        });

        // Nuclear option - clear everything EXCEPT the audit trail.
        await supabase.from('story_message_history').delete().not('id', 'is', null);
        await supabase.from('story_login_logs').delete().not('id', 'is', null);

        const { data: vaultFiles } = await supabase.from('vault_files').select('file_url');
        if (vaultFiles && vaultFiles.length > 0) {
          const vaultPaths = vaultFiles
            .map((f: { file_url?: string }) => { const m = f.file_url?.match(/vault\/[^?]+/); return m ? m[0] : null; })
            .filter(Boolean);
          if (vaultPaths.length > 0) {
            await supabase.storage.from('vault-secure').remove(vaultPaths);
          }
        }
        await supabase.from('vault_files').delete().not('id', 'is', null);
        // 🚨 INTENTIONALLY NOT DELETING vault_audit_log + vault_unlock_attempts.
        // These survive factory_reset by design — they're the only record of
        // who fired the reset and what they could have accessed beforehand.
        await supabase.from('story_users').delete().not('id', 'is', null);

        result = { success: true, message: 'Factory reset complete - all data cleared (audit logs preserved)', affected: 0 };
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[System Controls] Error:', error);
    return NextResponse.json({
      error: 'Operation failed'
    }, { status: 500 });
  }
}

// GET endpoint to fetch system stats
export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabase();

    const [messages, users, logs, vault] = await Promise.all([
      supabase.from('story_message_history').select('*', { count: 'exact', head: true }),
      supabase.from('story_users').select('*', { count: 'exact', head: true }),
      supabase.from('story_login_logs').select('*', { count: 'exact', head: true }),
      supabase.from('vault_files').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    ]);

    return NextResponse.json({
      stats: {
        messages: messages.count || 0,
        users: users.count || 0,
        loginLogs: logs.count || 0,
        vaultFiles: vault.count || 0,
      }
    });

  } catch (error) {
    console.error('[System Controls] Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

