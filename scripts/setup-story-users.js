// Setup script to hash passwords and insert initial users
// Run this ONCE with: node scripts/setup-story-users.js
// Make sure DATABASE_URL is set in your environment

const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function setupUsers() {
  try {
    // Hash passwords
    const tPasswordHash = await bcrypt.hash('redoux', 10);
    const zPasswordHash = await bcrypt.hash('oe', 10);

    // Insert users (upsert - updates if exists)
    await pool.query(
      `INSERT INTO story_users (username, password_hash) 
       VALUES ($1, $2), ($3, $4)
       ON CONFLICT (username) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash`,
      ['T', tPasswordHash, 'Z', zPasswordHash]
    );

    console.log('✅ Story users created successfully!');
    console.log('Username: T, Password: redoux');
    console.log('Username: Z, Password: oe');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error setting up users:', error);
    process.exit(1);
  }
}

setupUsers();



