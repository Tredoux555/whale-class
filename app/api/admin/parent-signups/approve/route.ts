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
    const { signupId } = body;

    if (!signupId) {
      return NextResponse.json(
        { error: 'Signup ID required' },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Call the database function to approve signup
    const result = await pool.query(
      'SELECT approve_parent_signup($1, $2) as child_id',
      [signupId, auth.userId]
    );

    const childId = result.rows[0].child_id;

    // Get the signup details for response
    const signupResult = await pool.query(
      'SELECT * FROM parent_signups WHERE id = $1',
      [signupId]
    );

    return NextResponse.json({
      success: true,
      message: 'Signup approved successfully',
      childId,
      signup: signupResult.rows[0],
    });
  } catch (error: any) {
    console.error('Error approving signup:', error);
    
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: 'Signup not found or already processed' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to approve signup' },
      { status: 500 }
    );
  }
}

