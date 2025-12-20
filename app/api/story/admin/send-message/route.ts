import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

export async function POST(req: NextRequest) {
  // Check admin session - support both Authorization header and cookie
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader) {
    token = authHeader.replace('Bearer ', '');
  } else {
    // Try cookie as fallback
    const cookies = req.cookies;
    const sessionCookie = cookies.get('story_admin_session');
    if (sessionCookie) {
      token = sessionCookie.value;
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, author = 'Admin' } = await req.json();

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Expiration: 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log('[SEND-MESSAGE] Week start date:', weekStartDate);
    console.log('[SEND-MESSAGE] Message:', message.trim());
    console.log('[SEND-MESSAGE] Author:', author);

    // Step 1: Check if tables exist, if not return clear error
    let tablesExist = false;
    try {
      const checkResult = await db.query(`
        SELECT 
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'story_message_history') as history_exists,
          EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'secret_stories') as stories_exists
      `);
      
      const historyExists = checkResult.rows[0].history_exists;
      const storiesExists = checkResult.rows[0].stories_exists;
      
      console.log('[SEND-MESSAGE] Tables check:', { historyExists, storiesExists });
      
      if (!historyExists || !storiesExists) {
        return NextResponse.json({
          error: 'Database tables missing',
          details: `Missing tables: ${!historyExists ? 'story_message_history ' : ''}${!storiesExists ? 'secret_stories' : ''}`,
          fix: 'Run the SQL script: FIX_STORY_TABLES_NOW.sql in Supabase SQL Editor',
          sqlLocation: '/FIX_STORY_TABLES_NOW.sql in your project root'
        }, { status: 500 });
      }
      
      tablesExist = true;
    } catch (checkError) {
      console.error('[SEND-MESSAGE] Error checking tables:', checkError);
      return NextResponse.json({
        error: 'Database connection error',
        details: checkError instanceof Error ? checkError.message : String(checkError)
      }, { status: 500 });
    }

    // Step 2: Try to insert into message history
    try {
      console.log('[SEND-MESSAGE] Inserting into message history...');
      await db.query(
        `INSERT INTO story_message_history 
         (week_start_date, message_type, message_content, author, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [weekStartDate, 'text', message.trim(), author, expiresAt]
      );
      console.log('[SEND-MESSAGE] Message history inserted successfully');
    } catch (insertError) {
      console.error('[SEND-MESSAGE] Error inserting message history:', insertError);
      return NextResponse.json({
        error: 'Failed to save message history',
        details: insertError instanceof Error ? insertError.message : String(insertError)
      }, { status: 500 });
    }

    // Step 3: Check if story exists for this week
    let storyExists = false;
    try {
      console.log('[SEND-MESSAGE] Checking if story exists for week:', weekStartDate);
      const checkStory = await db.query(
        'SELECT id FROM secret_stories WHERE week_start_date = $1',
        [weekStartDate]
      );
      storyExists = checkStory.rows.length > 0;
      console.log('[SEND-MESSAGE] Story exists:', storyExists);
    } catch (checkStoryError) {
      console.error('[SEND-MESSAGE] Error checking story:', checkStoryError);
    }

    // Step 4: Create story if it doesn't exist
    if (!storyExists) {
      try {
        console.log('[SEND-MESSAGE] Creating story for week:', weekStartDate);
        await db.query(
          `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, hidden_message, message_author)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            weekStartDate,
            'Weekly Adventure',
            'Our Weekly Story',
            JSON.stringify({ paragraphs: ['Once upon a time...', 'The end.'] }),
            message.trim(),
            author
          ]
        );
        console.log('[SEND-MESSAGE] Story created successfully');
      } catch (createError) {
        console.error('[SEND-MESSAGE] Error creating story:', createError);
        return NextResponse.json({
          error: 'Failed to create story',
          details: createError instanceof Error ? createError.message : String(createError),
          hint: 'Message was saved to history but story creation failed'
        }, { status: 500 });
      }
    } else {
      // Step 5: Update existing story
      try {
        console.log('[SEND-MESSAGE] Updating existing story...');
        const result = await db.query(
          `UPDATE secret_stories 
           SET hidden_message = $1, 
               message_author = $2, 
               updated_at = NOW()
           WHERE week_start_date = $3
           RETURNING *`,
          [message.trim(), author, weekStartDate]
        );
        console.log('[SEND-MESSAGE] Story updated successfully');
      } catch (updateError) {
        console.error('[SEND-MESSAGE] Error updating story:', updateError);
        return NextResponse.json({
          error: 'Failed to update story',
          details: updateError instanceof Error ? updateError.message : String(updateError),
          hint: 'Message was saved to history but story update failed'
        }, { status: 500 });
      }
    }

    console.log('[SEND-MESSAGE] SUCCESS - Message sent completely');
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sentAt: new Date().toISOString(),
      weekStartDate: weekStartDate
    });
  } catch (error) {
    console.error('[SEND-MESSAGE] Top-level error:', error);
    
    // Handle JWT verification errors
    if (error instanceof Error && error.message.includes('JWT')) {
      return NextResponse.json({ 
        error: 'Invalid session',
        details: error.message 
      }, { status: 401 });
    }
    
    // Return detailed error
    return NextResponse.json({
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
