import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
    console.log('Message API called');

    // Test database connection
    try {
      const testResult = await db.query('SELECT 1');
      console.log('Database connection OK');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Check if required tables exist
    try {
      const tablesCheck = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('story_users', 'story_message_history', 'secret_stories')
      `);
      const existingTables = tablesCheck.rows.map(r => r.table_name);
      console.log('Existing tables:', existingTables);

      if (!existingTables.includes('story_users')) {
        return NextResponse.json({ error: 'Database not set up: story_users table missing' }, { status: 500 });
      }
      if (!existingTables.includes('story_message_history')) {
        return NextResponse.json({ error: 'Database not set up: story_message_history table missing' }, { status: 500 });
      }
      if (!existingTables.includes('secret_stories')) {
        return NextResponse.json({ error: 'Database not set up: secret_stories table missing' }, { status: 500 });
      }
    } catch (tableError) {
      console.error('Table check failed:', tableError);
      return NextResponse.json({ error: 'Database setup check failed' }, { status: 500 });
    }

    const token = extractToken(req.headers.get('authorization'));

    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await verifyUserToken(token);
    console.log('User verified:', user?.username);

    const { message, author } = await req.json();
    console.log('Message data:', { message: message?.substring(0, 50), author });

    if (!message || typeof message !== 'string') {
      console.log('Invalid message data');
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    const weekStartDate = getCurrentWeekStart();
    const expiresAt = getExpirationDate();
    console.log('Week start date:', weekStartDate);

    // Check if tables exist
    try {
      const tableCheck = await db.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN ('story_message_history', 'secret_stories')
      `);
      console.log('Existing tables:', tableCheck.rows.map(r => r.table_name));
    } catch (tableError) {
      console.error('Table check failed:', tableError);
    }

    // Save to message history (permanent record)
    console.log('Saving to message history...');
    await db.query(
      `INSERT INTO story_message_history
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, 'text', $2, $3, $4)`,
      [weekStartDate, message, author || 'Unknown', expiresAt]
    );
    console.log('Message history saved');

    // Check if story exists, create one if not
    console.log('Checking if story exists for week:', weekStartDate);
    const existingStoryResult = await db.query(
      'SELECT id FROM secret_stories WHERE week_start_date = $1',
      [weekStartDate]
    );
    const existingStory = existingStoryResult.rows[0];

    if (!existingStory) {
      console.log('No story found, creating basic story with message...');
      // Create a basic story if none exists
      await db.query(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, hidden_message, message_author, created_at, updated_at)
         VALUES ($1, 'Messages', 'Message Board', '{"paragraphs": ["Welcome to our message board.", "Share your thoughts and messages here.", "Click the letters to explore features."]}', $2, $3, NOW(), NOW())`,
        [weekStartDate, message, author || 'Unknown']
      );
      console.log('Basic story created with message');
    } else {
      // Update existing story
      console.log('Updating existing story...');
      await db.query(
        `UPDATE secret_stories
         SET hidden_message = $1,
             message_author = $2,
             updated_at = NOW()
         WHERE week_start_date = $3`,
        [message, author || 'Unknown', weekStartDate]
      );
      console.log('Story updated with message');
    }

    console.log('Message saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Message save error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to save message', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const resultQuery = await db.query(
      `SELECT hidden_message, message_author, updated_at
       FROM secret_stories
       WHERE week_start_date = $1`,
      [weekStartDate]
    );
    const result = resultQuery.rows[0] as MessageCheck | undefined;

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
