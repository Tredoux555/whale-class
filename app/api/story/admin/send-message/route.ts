import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken, getCurrentWeekStart, getExpirationDate } from '@/lib/story-auth';

// POST: Admin sends a secret message
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    
    if (!payload || payload.type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const weekStartDate = getCurrentWeekStart();
    const expiresAt = getExpirationDate();

    // Save to message history
    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, author, message_type, content, is_from_admin, expires_at)
       VALUES ($1, 'Admin', 'text', $2, TRUE, $3)`,
      [weekStartDate, message.trim(), expiresAt]
    );

    // Check if story exists first
    const existingStory = await db.query(
      `SELECT id FROM secret_stories WHERE week_start_date = $1`,
      [weekStartDate]
    );

    if (existingStory.rows.length === 0) {
      // Create a basic story for this week only if none exists
      await db.query(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, admin_message, created_at, updated_at)
         VALUES ($1, 'Message', 'A Special Note', '{"paragraphs": ["Today is a special day.", "Something wonderful is happening.", "Can you feel the excitement?", "Look around and notice the little things.", "Every moment is a gift."]}', $2, NOW(), NOW())`,
        [weekStartDate, message.trim()]
      );
    } else {
      // Update existing story's admin message
      await db.query(
        `UPDATE secret_stories
         SET admin_message = $1, updated_at = NOW()
         WHERE week_start_date = $2`,
        [message.trim(), weekStartDate]
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Admin message sent successfully'
    });
  } catch (error) {
    console.error('Admin send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
