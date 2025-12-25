const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  console.log('🚀 Running vault tables migration...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '014_vault_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');
    
    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - vault_files');
    console.log('  - vault_audit_log');
    console.log('  - vault_unlock_attempts');
    console.log('\nCreated indexes:');
    console.log('  - idx_vault_files_date');
    console.log('  - idx_vault_audit_time');
    console.log('  - idx_vault_attempts_ip');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Some tables/indexes may already exist. This is OK.');
    } else {
      console.error('\nFull error:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigration();

