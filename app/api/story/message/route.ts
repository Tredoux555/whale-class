import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/story/db';
import { extractToken, verifyUserToken } from '@/lib/story/auth';
import { getCurrentWeekStart, getExpirationDate } from '@/lib/story/week';

interface MessageCheck {
  hidden_message: string | null;
  message_author: string | null;
  updated_at: string;
}

// Save a text message
export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyUserToken(token);
    
    const { message, author } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    const weekStartDate = getCurrentWeekStart();
    const expiresAt = getExpirationDate();

    // Save to message history (permanent record)
    await query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, 'text', $2, $3, $4)`,
      [weekStartDate, message, author || 'Unknown', expiresAt]
    );

    // Update secret_stories with hidden message (overwrites previous)
    const result = await query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message, author || 'Unknown', weekStartDate]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Story not found for current week' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Message save error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}

// Check if message exists
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyUserToken(token);
    const weekStartDate = getCurrentWeekStart();

    const result = await queryOne<MessageCheck>(
      `SELECT hidden_message, message_author, updated_at 
       FROM secret_stories 
       WHERE week_start_date = $1`,
      [weekStartDate]
    );

    if (!result || !result.hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.message_author,
      timestamp: result.updated_at
    });
  } catch (error) {
    console.error('Message check error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
