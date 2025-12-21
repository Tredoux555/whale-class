import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken, getCurrentWeekStart, getExpirationDate } from '@/lib/story-auth';

// POST: Save a text message
export async function POST(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { message, author } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const weekStartDate = getCurrentWeekStart();
    const expiresAt = getExpirationDate();
    const messageAuthor = author || payload.username;

    // Save to message history (permanent record)
    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, author, message_type, content, expires_at)
       VALUES ($1, $2, 'text', $3, $4)`,
      [weekStartDate, messageAuthor, message.trim(), expiresAt]
    );

    // Update the story's hidden message (this is what shows when clicking 't')
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, message_author = $2, updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message.trim(), messageAuthor, weekStartDate]
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

// GET: Check if there's a message for this week
export async function GET(req: NextRequest) {
  const token = extractToken(req.headers.get('authorization'));
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const weekStartDate = getCurrentWeekStart();

    // Get the latest text message for this week
    const result = await db.query(
      `SELECT content, author, created_at 
       FROM story_message_history 
       WHERE week_start_date = $1 
         AND message_type = 'text'
         AND is_expired = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC 
       LIMIT 1`,
      [weekStartDate]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ hasMessage: false });
    }

    const msg = result.rows[0];
    return NextResponse.json({
      hasMessage: true,
      message: msg.content,
      author: msg.author,
      timestamp: msg.created_at
    });
  } catch (error) {
    console.error('Message fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
  }
}
