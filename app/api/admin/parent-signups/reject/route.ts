import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { signupId, notes } = body;

    if (!signupId) {
      return NextResponse.json(
        { error: 'Signup ID required' },
        { status: 400 }
      );
    }

    if (!notes || !notes.trim()) {
      return NextResponse.json(
        { error: 'Rejection notes required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Call the database function to reject signup
    const result = await pool.query(
      'SELECT reject_parent_signup($1, $2, $3) as success',
      [signupId, auth.userId, notes]
    );

    if (!result.rows[0].success) {
      return NextResponse.json(
        { error: 'Signup not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Signup rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting signup:', error);
    return NextResponse.json(
      { error: 'Failed to reject signup' },
      { status: 500 }
    );
  }
}

