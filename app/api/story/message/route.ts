import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';
import { getWeekStartDate, getExpirationDate, validateMessage, sanitizeInput } from '@/lib/story-utils';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { message, author } = await req.json();

    // Validate message
    const validation = validateMessage(message);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid message' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedMessage = sanitizeInput(message);
    const sanitizedAuthor = sanitizeInput(author || (payload.username as string));

    // Get current week's Monday
    const weekStartDate = getWeekStartDate();

    // Save to message history (permanent record for admin)
    // Messages expire after 7 days from public view but stay in history
    const expiresAt = getExpirationDate();

    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [weekStartDate, 'text', sanitizedMessage, sanitizedAuthor, expiresAt]
    );

    // Update the story with the new hidden message
    // This OVERWRITES any previous message (no history)
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [sanitizedMessage, sanitizedAuthor, weekStartDate]
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

// Optional: GET endpoint to check if there's a message waiting
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    await jwtVerify(token, JWT_SECRET);

    const weekStartDate = getWeekStartDate();

    const result = await db.query(
      `SELECT hidden_message, message_author, updated_at 
       FROM secret_stories 
       WHERE week_start_date = $1`,
      [weekStartDate]
    );

    if (result.rows.length === 0 || !result.rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.rows[0].message_author,
      timestamp: result.rows[0].updated_at
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}



