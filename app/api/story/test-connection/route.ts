import { NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * Simple connection test endpoint
 * Use this to verify your DATABASE_URL is correct
 * Visit: /api/story/test-connection
 */
export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      ...results,
      error: 'DATABASE_URL not set',
      instructions: [
        '1. Go to Vercel Dashboard → Settings → Environment Variables',
        '2. Add DATABASE_URL with your Supabase connection string',
        '3. Format: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres',
        '4. Or use connection pooling: postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
      ]
    }, { status: 500 });
  }

  const connectionString = process.env.DATABASE_URL;
  const isSupabase = connectionString.includes('supabase') || connectionString.includes('supabase.co');
  const isPooler = connectionString.includes('pooler') || connectionString.includes(':6543');
  
  results.connectionInfo = {
    isSupabase,
    isPooler,
    port: connectionString.match(/:(\d+)\//)?.[1] || 'unknown',
    host: connectionString.match(/@([^:]+)/)?.[1] || 'unknown',
  };

  // Test connection
  let pool: Pool | null = null;
  try {
    pool = new Pool({
      connectionString,
      ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    // Test 1: Basic connection
    try {
      const test1 = await pool.query('SELECT NOW() as time, version() as version');
      results.test1_connection = {
        success: true,
        serverTime: test1.rows[0].time,
        postgresVersion: test1.rows[0].version?.substring(0, 50),
      };
    } catch (e) {
      results.test1_connection = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Check if password is correct and database is accessible'
      };
      await pool.end();
      return NextResponse.json(results, { status: 500 });
    }

    // Test 2: Check if we can query tables
    try {
      const test2 = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      results.test2_query = {
        success: true,
        tableCount: test2.rows.length,
        sampleTables: test2.rows.map(r => r.table_name),
      };
    } catch (e) {
      results.test2_query = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }

    // Test 3: Check story tables
    try {
      const test3 = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE 'story%' OR table_name = 'secret_stories')
      `);
      results.test3_storyTables = {
        success: true,
        tables: test3.rows.map(r => r.table_name),
      };
    } catch (e) {
      results.test3_storyTables = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        hint: 'Tables will be created automatically on first use'
      };
    }

    await pool.end();
    results.overall = 'SUCCESS - Database connection is working!';
    
    return NextResponse.json(results);
  } catch (error) {
    if (pool) {
      try {
        await pool.end();
      } catch {
        // Ignore
      }
    }
    
    results.overall = 'FAILED';
    results.error = error instanceof Error ? error.message : 'Unknown error';
    results.errorType = error instanceof Error ? error.constructor.name : 'Unknown';
    
    // Provide helpful hints
    if (results.error && typeof results.error === 'string') {
      if (results.error.includes('password') || results.error.includes('authentication')) {
        results.hint = 'Password is incorrect. Reset it in Supabase Dashboard → Settings → Database → Reset Database Password';
      } else if (results.error.includes('ECONNREFUSED') || results.error.includes('timeout')) {
        results.hint = 'Cannot connect to database. Check if DATABASE_URL host and port are correct';
      } else if (results.error.includes('ENOTFOUND')) {
        results.hint = 'Database host not found. Check if DATABASE_URL hostname is correct';
      }
    }
    
    return NextResponse.json(results, { status: 500 });
  }
}


