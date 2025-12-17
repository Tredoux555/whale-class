import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = 'SELECT * FROM parent_signups';
    const params: any[] = [];

    if (status !== 'all') {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      signups: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching parent signups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signups' },
      { status: 500 }
    );
  }
}

