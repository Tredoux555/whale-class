import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';

// Diagnostic endpoint: check story_login_logs and story_admin_login_logs table schemas
// GET /api/story/admin/login-logs/diagnose
export async function GET(req: NextRequest) {
  try {
    const admin = await verifyAdminToken(req.headers.get('authorization'));
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const results: Record<string, unknown> = {};

    // Test 1: Can we SELECT with the expected column names from story_login_logs?
    const { data: loginTest, error: loginErr } = await supabase
      .from('story_login_logs')
      .select('id, username, login_at, session_token, ip_address, user_agent, logout_at')
      .limit(1);
    results.story_login_logs = {
      ok: !loginErr,
      error: loginErr ? { code: loginErr.code, message: loginErr.message, hint: loginErr.hint } : null,
      sampleRow: loginTest?.[0] || null,
      rowCount: loginTest?.length ?? 0,
    };

    // Test 2: Same for story_admin_login_logs
    const { data: adminTest, error: adminErr } = await supabase
      .from('story_admin_login_logs')
      .select('id, username, login_at, session_token, ip_address, user_agent, logout_at')
      .limit(1);
    results.story_admin_login_logs = {
      ok: !adminErr,
      error: adminErr ? { code: adminErr.code, message: adminErr.message, hint: adminErr.hint } : null,
      sampleRow: adminTest?.[0] || null,
      rowCount: adminTest?.length ?? 0,
    };

    // Test 3: Check if old column names still exist (would indicate migration not run)
    const { error: oldColErr } = await supabase
      .from('story_login_logs')
      .select('login_time')
      .limit(1);
    results.old_login_time_column_exists = !oldColErr;

    const { error: oldSessionErr } = await supabase
      .from('story_login_logs')
      .select('session_id')
      .limit(1);
    results.old_session_id_column_exists = !oldSessionErr;

    // Test 4: Count total rows in each table
    const { count: loginCount } = await supabase
      .from('story_login_logs')
      .select('*', { count: 'exact', head: true });
    results.story_login_logs_total_rows = loginCount;

    const { count: adminCount } = await supabase
      .from('story_admin_login_logs')
      .select('*', { count: 'exact', head: true });
    results.story_admin_login_logs_total_rows = adminCount;

    // Test 5: Try a test INSERT and immediately DELETE (proves write works)
    const testUsername = '__diag_test__';
    const { error: insertErr } = await supabase
      .from('story_login_logs')
      .insert({
        username: testUsername,
        login_at: new Date().toISOString(),
        session_token: 'diagnose-test-token',
        ip_address: '0.0.0.0',
        user_agent: 'diagnostic-check',
      });
    results.test_insert = {
      ok: !insertErr,
      error: insertErr ? { code: insertErr.code, message: insertErr.message, hint: insertErr.hint } : null,
    };

    // Clean up test row
    if (!insertErr) {
      await supabase
        .from('story_login_logs')
        .delete()
        .eq('username', testUsername)
        .eq('session_token', 'diagnose-test-token');
      results.test_cleanup = 'done';
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[LoginLogs Diagnose] Error:', error);
    return NextResponse.json({ error: 'Diagnostic failed' }, { status: 500 });
  }
}
