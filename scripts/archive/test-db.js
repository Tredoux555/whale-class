const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabase() {
  console.log('Testing database connection and story tables...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const testResult = await pool.query('SELECT 1');
    console.log('✅ Database connection OK\n');

    // Check required tables
    console.log('2. Checking required tables...');
    const tablesResult = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('story_users', 'story_message_history', 'secret_stories', 'story_login_logs', 'story_admin_users')
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map(r => r.table_name);
    console.log('Existing tables:', existingTables);

    const requiredTables = ['story_users', 'story_message_history', 'secret_stories'];
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
      console.log('\n🔧 SOLUTION: Run the database migration SQL in Supabase SQL Editor');
    } else {
      console.log('✅ All required tables exist\n');

      // Check users
      console.log('3. Checking users...');
      const usersResult = await pool.query('SELECT username FROM story_users');
      console.log('Story users:', usersResult.rows.map(r => r.username));

      const adminResult = await pool.query('SELECT username FROM story_admin_users');
      console.log('Admin users:', adminResult.rows.map(r => r.username));

      // Check current week story
      console.log('\n4. Checking current week story...');
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const storyResult = await pool.query(
        'SELECT id, theme, story_title, hidden_message FROM secret_stories WHERE week_start_date = $1',
        [weekStart]
      );

      if (storyResult.rows.length > 0) {
        const story = storyResult.rows[0];
        console.log('✅ Story exists for current week:', {
          id: story.id,
          theme: story.theme,
          title: story.story_title,
          hasMessage: !!story.hidden_message
        });
      } else {
        console.log('⚠️  No story exists for current week');
        console.log('   This is normal - story will be generated on first visit');
      }

      console.log('\n🎉 Database setup looks good!');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    if (error.message.includes('connect')) {
      console.log('\n🔧 SOLUTION: Check DATABASE_URL in .env.local');
    }
  } finally {
    await pool.end();
  }
}

testDatabase();


