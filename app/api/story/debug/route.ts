import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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
      console.error('[Debug] Pool error:', err);
    });
  }
  return pool;
}

export async function GET() {
  const status: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_PREVIEW: process.env.DATABASE_URL 
        ? `${process.env.DATABASE_URL.substring(0, 20)}...${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 10)}`
        : 'NOT SET',
      STORY_JWT_SECRET: !!process.env.STORY_JWT_SECRET,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  };

  // Test database connection
  if (!process.env.DATABASE_URL) {
    status.database = { connected: false, error: 'DATABASE_URL not set' };
    return NextResponse.json(status);
  }

  try {
    const pool = getPool();
    
    // Test basic connection
    try {
      const result = await pool.query('SELECT NOW() as time, version() as version');
      status.database = { 
        connected: true, 
        serverTime: result.rows[0].time,
        postgresVersion: result.rows[0].version?.substring(0, 50)
      };
    } catch (queryError) {
      status.database = { 
        connected: false, 
        error: queryError instanceof Error ? queryError.message : 'Query failed',
        errorType: queryError instanceof Error ? queryError.constructor.name : 'Unknown'
      };
      return NextResponse.json(status);
    }

    // Check tables
    try {
      const tables = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'story%' OR table_name = 'secret_stories')
        ORDER BY table_name
      `);
      status.tables = tables.rows.map(r => r.table_name);
    } catch (e) {
      status.tables = `Error: ${e instanceof Error ? e.message : 'Unknown'}`;
    }

    // Check users
    try {
      const users = await pool.query('SELECT username, created_at FROM story_users ORDER BY username');
      status.storyUsers = users.rows.map(r => ({ username: r.username, created: r.created_at }));
    } catch (e) {
      status.storyUsers = {
        error: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Table may not exist - will be created on first login'
      };
    }

    // Check admin users
    try {
      const admins = await pool.query('SELECT username, created_at, last_login FROM story_admin_users ORDER BY username');
      status.adminUsers = admins.rows.map(r => ({ 
        username: r.username, 
        created: r.created_at,
        lastLogin: r.last_login 
      }));
    } catch (e) {
      status.adminUsers = {
        error: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Table may not exist - will be created on first admin login'
      };
    }

    // Check secret_stories
    try {
      const stories = await pool.query('SELECT COUNT(*) as count FROM secret_stories');
      status.secretStories = {
        count: parseInt(stories.rows[0]?.count || '0'),
        tableExists: true
      };
    } catch (e) {
      status.secretStories = {
        error: e instanceof Error ? e.message : 'Unknown error',
        tableExists: false
      };
    }

  } catch (e) {
    status.database = { 
      connected: false, 
      error: e instanceof Error ? e.message : 'Unknown error',
      errorType: e instanceof Error ? e.constructor.name : 'Unknown',
      stack: process.env.NODE_ENV === 'development' && e instanceof Error ? e.stack : undefined
    };
  }

  return NextResponse.json(status, { 
    status: status.database && (status.database as { connected?: boolean }).connected ? 200 : 500 
  });
}
