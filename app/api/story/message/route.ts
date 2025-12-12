import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_JWT_SECRET || 'change-this-secret-in-production'
);

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
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message' },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

    // Update the story with the new hidden message
    // This OVERWRITES any previous message (no history)
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message, author, weekStartDate]
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

    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = monday.toISOString().split('T')[0];

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



