import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// This endpoint helps debug table existence issues
export async function GET(req: NextRequest) {
  try {
    const checks: Record<string, any> = {};

    // Check if story_admin_users table exists
    try {
      const result = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'story_admin_users'
        ) as exists`
      );
      checks.story_admin_users_table = result.rows[0].exists;
    } catch (error) {
      checks.story_admin_users_table = false;
      checks.story_admin_users_error = error instanceof Error ? error.message : String(error);
    }

    // Check if story_login_logs table exists
    try {
      const result = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'story_login_logs'
        ) as exists`
      );
      checks.story_login_logs_table = result.rows[0].exists;
    } catch (error) {
      checks.story_login_logs_table = false;
      checks.story_login_logs_error = error instanceof Error ? error.message : String(error);
    }

    // Check if story_message_history table exists
    try {
      const result = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'story_message_history'
        ) as exists`
      );
      checks.story_message_history_table = result.rows[0].exists;
    } catch (error) {
      checks.story_message_history_table = false;
      checks.story_message_history_error = error instanceof Error ? error.message : String(error);
    }

    // Try to query the admin users table
    try {
      const result = await db.query('SELECT COUNT(*) FROM story_admin_users');
      checks.admin_users_count = parseInt(result.rows[0].count);
      checks.admin_users_query_works = true;
    } catch (error) {
      checks.admin_users_query_works = false;
      checks.admin_users_query_error = error instanceof Error ? error.message : String(error);
    }

    // Check if admin user exists
    try {
      const result = await db.query(
        "SELECT username, created_at FROM story_admin_users WHERE username = 'Tredoux'"
      );
      checks.admin_user_exists = result.rows.length > 0;
      if (result.rows.length > 0) {
        checks.admin_user_data = result.rows[0];
      }
    } catch (error) {
      checks.admin_user_exists = false;
      checks.admin_user_error = error instanceof Error ? error.message : String(error);
    }

    // Database connection check
    checks.database_url_set = !!process.env.DATABASE_URL;
    checks.database_url_preview = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL.substring(0, 30) + '...' 
      : 'NOT SET';

    return NextResponse.json({
      success: true,
      checks,
      all_tables_exist: checks.story_admin_users_table && 
                       checks.story_login_logs_table && 
                       checks.story_message_history_table,
      message: checks.story_admin_users_table 
        ? 'Tables exist! ✅' 
        : 'Tables missing - run migration: migrations/009_story_admin_system_simple.sql'
    });
  } catch (error) {
    console.error('Table check error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to check tables'
      },
      { status: 500 }
    );
  }
}

