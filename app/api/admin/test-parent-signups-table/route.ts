import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test if parent_signups table exists
    const result = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'parent_signups'
      );
    `);

    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      return NextResponse.json({
        error: 'parent_signups table does not exist',
        message: 'Please run migration 008_parent_signups.sql in Supabase SQL Editor',
        migrationPath: 'migrations/008_parent_signups.sql',
        tableExists: false,
      }, { status: 500 });
    }

    // If table exists, check if we can query it
    const testQuery = await db.query('SELECT COUNT(*) FROM parent_signups');
    
    return NextResponse.json({
      success: true,
      tableExists: true,
      signupCount: testQuery.rows[0].count,
      message: 'parent_signups table is ready!',
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error.message,
      hint: error.hint || 'Check if migration 008_parent_signups.sql has been run',
      tableExists: false,
    }, { status: 500 });
  }
}










