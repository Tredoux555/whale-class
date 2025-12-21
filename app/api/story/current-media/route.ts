import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { getWeekStartDate } from '@/lib/story-utils';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    await jwtVerify(token, JWT_SECRET);

    // Get current week's Monday
    const weekStartDate = getWeekStartDate();

    // Get all non-expired media for current week
    const result = await db.query(
      `SELECT 
        id,
        message_type,
        media_url,
        media_filename,
        author,
        created_at
       FROM story_message_history
       WHERE week_start_date = $1
         AND message_type IN ('image', 'video')
         AND (expires_at IS NULL OR expires_at > NOW())
         AND is_expired = FALSE
       ORDER BY created_at DESC`,
      [weekStartDate]
    );

    return NextResponse.json({
      media: result.rows
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}





