import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getAdminSession();
    if (!session || !session.isAdmin) {
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

    // Call the database function to reject signup
    // Pass NULL for reviewer_id since we don't have user tracking in this simple auth
    const result = await db.query(
      'SELECT reject_parent_signup($1, $2, $3) as success',
      [signupId, null, notes]
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

