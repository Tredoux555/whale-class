import { NextRequest, NextResponse } from 'next/server';
import { query, tableExists } from '@/lib/story/db';
import { extractToken, verifyAdminToken } from '@/lib/story/auth';
import { getCurrentWeekStart, getExpirationDate } from '@/lib/story/week';

export async function POST(req: NextRequest) {
  try {
    // Verify admin
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);
    const { message } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check tables exist
    const storiesExist = await tableExists('secret_stories');
    const historyExist = await tableExists('story_message_history');
    
    if (!storiesExist || !historyExist) {
      return NextResponse.json(
        { error: 'Database tables not initialized. Please run migrations.' },
        { status: 500 }
      );
    }

    const weekStartDate = getCurrentWeekStart();
    const author = payload.username;
    const expiresAt = getExpirationDate();
    const trimmedMessage = message.trim();

    // Save to message history
    await query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, 'text', $2, $3, $4)`,
      [weekStartDate, trimmedMessage, author, expiresAt]
    );

    // Check if story exists for this week
    const storyExists = await query(
      'SELECT id FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );

    if (storyExists.rows.length > 0) {
      // Update existing story
      await query(
        `UPDATE secret_stories 
         SET hidden_message = $1, message_author = $2, updated_at = NOW()
         WHERE week_start_date = $3`,
        [trimmedMessage, author, weekStartDate]
      );
    } else {
      // Create story with default content
      await query(
        `INSERT INTO secret_stories 
         (week_start_date, theme, story_title, story_content, hidden_message, message_author)
         VALUES ($1, 'Admin Message', 'Story Coming Soon', '{"paragraphs": ["The story is being prepared...", "Check back soon!", "Something wonderful awaits.", "Keep reading and learning.", "See you next time!"]}', $2, $3)`,
        [weekStartDate, trimmedMessage, author]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sentAt: new Date().toISOString(),
      weekStartDate
    });
  } catch (error) {
    console.error('Send message error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to send message', details: message },
      { status: 500 }
    );
  }
}
