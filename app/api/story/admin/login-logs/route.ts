import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/story/db';
import { extractToken, verifyAdminToken } from '@/lib/story/auth';
import { LoginLog } from '@/lib/story/types';

export async function GET(req: NextRequest) {
  try {
    // Verify admin
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyAdminToken(token);

    // Get query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get login logs
    const result = await query<LoginLog>(
      `SELECT id, username, login_time, session_id, ip_address, user_agent
       FROM story_login_logs
       ORDER BY login_time DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    // Get total count
    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM story_login_logs'
    );
    const total = parseInt(countResult.rows[0]?.count || '0');

    return NextResponse.json({
      logs: result.rows,
      total,
      limit,
      offset
    });
  } catch (error) {
    console.error('Login logs error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
