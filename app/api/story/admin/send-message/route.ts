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

    // Ensure story_message_history table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS story_message_history (
          id SERIAL PRIMARY KEY,
          week_start_date DATE NOT NULL,
          message_type VARCHAR(20) NOT NULL,
          message_content TEXT,
          media_url TEXT,
          media_filename TEXT,
          author VARCHAR(10) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP,
          is_expired BOOLEAN DEFAULT FALSE
        )
      `);
      
      // Create indexes if they don't exist
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_story_message_history_week 
        ON story_message_history(week_start_date)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_story_message_history_created 
        ON story_message_history(created_at DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_story_message_history_expired 
        ON story_message_history(is_expired, expires_at)
      `);
    } catch (createError) {
      console.error('Error ensuring table exists:', createError);
      // Continue anyway - table might already exist
    }

    // Save to message history
    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [weekStartDate, 'text', message.trim(), author, expiresAt]
    );

    // Ensure secret_stories table exists
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS secret_stories (
          id SERIAL PRIMARY KEY,
          week_start_date DATE NOT NULL UNIQUE,
          theme VARCHAR(255) NOT NULL,
          story_title VARCHAR(255) NOT NULL,
          story_content JSONB NOT NULL,
          hidden_message TEXT,
          message_author VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_secret_stories_week 
        ON secret_stories(week_start_date)
      `);
    } catch (createError) {
      console.error('Error ensuring secret_stories table exists:', createError);
      // Continue anyway - table might already exist
    }

    // Update the story's hidden message (this is what users see when clicking 't')
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message.trim(), author, weekStartDate]
    );

    if (result.rows.length === 0) {
      // Story doesn't exist yet, create it first
      return NextResponse.json(
        { error: 'No story exists for this week. Visit the story page first to generate one.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin send message error:', error);
    
    // Handle JWT verification errors
    if (error instanceof Error && error.message.includes('JWT')) {
      return NextResponse.json({ 
        error: 'Invalid session',
        details: error.message 
      }, { status: 401 });
    }
    
    // Handle database errors
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Check for specific database errors
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
        return NextResponse.json({
          error: 'Database table missing',
          details: errorMessage,
          hint: 'Make sure story_message_history and secret_stories tables exist'
        }, { status: 500 });
      }
      
      // Return detailed error in development
      return NextResponse.json({
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error',
        stack: process.env.NODE_ENV === 'development' && error.stack ? error.stack : undefined
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { error: 'Failed to send message', details: 'Unknown error' },
      { status: 500 }
    );
  }
}

