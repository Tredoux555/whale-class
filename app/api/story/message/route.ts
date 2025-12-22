import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

// ============ INLINE HELPERS - NO EXTERNAL IMPORTS ============

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL not set');
    }
    
    const connectionString = process.env.DATABASE_URL;
    const isSupabase = connectionString.includes('supabase') || connectionString.includes('supabase.co');
    
    pool = new Pool({
      connectionString,
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error('[Message] Pool error:', err);
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  try {
    const client = getPool();
    return await client.query(text, params);
  } catch (error) {
    console.error('[Message] dbQuery error:', error);
    throw error;
  }
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch (e) {
    console.error('[Message] Token verify failed:', e);
    return null;
  }
}

// ============ ENSURE TABLES EXIST ============

async function ensureTables() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS secret_stories (
        id SERIAL PRIMARY KEY,
        week_start_date DATE NOT NULL UNIQUE,
        theme VARCHAR(255) NOT NULL,
        story_title VARCHAR(255) NOT NULL,
        story_content JSONB NOT NULL,
        hidden_message TEXT,
        message_author VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_message_history (
        id SERIAL PRIMARY KEY,
        week_start_date DATE NOT NULL,
        message_type VARCHAR(20) NOT NULL,
        content TEXT,
        media_url TEXT,
        media_filename TEXT,
        author VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        is_expired BOOLEAN DEFAULT FALSE
      )
    `);
    
    return true;
  } catch (e) {
    console.error('[Message] ensureTables error:', e);
    throw e;
  }
}

// ============ POST - SAVE MESSAGE ============

export async function POST(req: NextRequest) {
  console.log('[Message] POST request started');
  
  // Check env vars
  if (!process.env.DATABASE_URL) {
    console.error('[Message] DATABASE_URL missing');
    return NextResponse.json({ 
      error: 'Database not configured',
      details: 'DATABASE_URL environment variable is not set'
    }, { status: 500 });
  }
  
  if (!process.env.STORY_JWT_SECRET) {
    console.error('[Message] STORY_JWT_SECRET missing');
    return NextResponse.json({ 
      error: 'Auth not configured',
      details: 'STORY_JWT_SECRET environment variable is not set'
    }, { status: 500 });
  }

  try {
    // Auth check
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      console.log('[Message] Auth failed - no valid token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[Message] User authenticated:', username);

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[Message] JSON parse error:', e);
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: e instanceof Error ? e.message : 'Failed to parse JSON'
      }, { status: 400 });
    }
    
    const { message, author } = body;
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ 
        error: 'Message required',
        details: 'Message must be a non-empty string'
      }, { status: 400 });
    }

    const weekStart = getCurrentWeekStart();
    const msgAuthor = author || username;
    const trimmedMsg = message.trim();
    
    console.log('[Message] Week:', weekStart, 'Author:', msgAuthor);

    // Ensure tables exist
    try {
      await ensureTables();
      console.log('[Message] Tables ensured');
    } catch (e) {
      console.error('[Message] Table creation failed:', e);
      return NextResponse.json({ 
        error: 'Database setup failed', 
        details: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Check database connection and permissions'
      }, { status: 500 });
    }

    // Save to history (non-critical)
    try {
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      
      await dbQuery(
        `INSERT INTO story_message_history (week_start_date, message_type, content, author, expires_at)
         VALUES ($1, 'text', $2, $3, $4)`,
        [weekStart, trimmedMsg, msgAuthor, expires]
      );
      console.log('[Message] Saved to history');
    } catch (e) {
      console.error('[Message] History save failed (non-critical):', e);
      // Continue anyway - history is non-critical
    }

    // Check if story exists
    let storyCheck;
    try {
      storyCheck = await dbQuery(
        'SELECT id FROM secret_stories WHERE week_start_date = $1',
        [weekStart]
      );
      console.log('[Message] Story check result:', storyCheck.rows.length > 0 ? 'exists' : 'new');
    } catch (e) {
      console.error('[Message] Story check failed:', e);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Check if secret_stories table exists'
      }, { status: 500 });
    }

    if (storyCheck.rows.length > 0) {
      // Update existing
      try {
        await dbQuery(
          `UPDATE secret_stories SET hidden_message = $1, message_author = $2, updated_at = NOW() WHERE week_start_date = $3`,
          [trimmedMsg, msgAuthor, weekStart]
        );
        console.log('[Message] Updated existing story');
      } catch (e) {
        console.error('[Message] Update failed:', e);
        return NextResponse.json({ 
          error: 'Failed to update story', 
          details: e instanceof Error ? e.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      // Create new
      try {
        const content = JSON.stringify({
          paragraphs: [
            'The story is being created...',
            'Please wait a moment.',
            'Something special is coming.',
            'Keep watching!',
            'Check back soon.'
          ]
        });
        
        await dbQuery(
          `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, hidden_message, message_author)
           VALUES ($1, 'Message', 'Story Loading...', $2, $3, $4)`,
          [weekStart, content, trimmedMsg, msgAuthor]
        );
        console.log('[Message] Created new story');
      } catch (e) {
        console.error('[Message] Insert failed:', e);
        return NextResponse.json({ 
          error: 'Failed to create story', 
          details: e instanceof Error ? e.message : 'Unknown error',
          hint: 'Check database permissions and table structure'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Message] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed', 
        details: errorMessage,
        stack: errorStack,
        hint: 'Check server logs for more details'
      },
      { status: 500 }
    );
  }
}

// ============ GET - CHECK MESSAGE ============

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStart = getCurrentWeekStart();
    const result = await dbQuery(
      'SELECT hidden_message, message_author FROM secret_stories WHERE week_start_date = $1',
      [weekStart]
    );

    if (result.rows.length === 0 || !result.rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.rows[0].message_author
    });
  } catch (error) {
    console.error('[Message GET] Error:', error);
    return NextResponse.json({ 
      error: 'Failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
