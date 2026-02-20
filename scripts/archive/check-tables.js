#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking available montree-related tables...\n');

  try {
    // Get all tables in the public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%montree%');

    if (error) {
      console.log('Error using information_schema:', error.message);
      console.log('Trying alternative approach...\n');
      
      // Try to query each table directly to see which exist
      const tablesToTest = [
        'montree_child_progress',
        'montree_child_photos',
        'montree_work_sessions',
        'montree_photo_work_links',
        'child_work_photos',
        'child_photos',
        'work_photos'
      ];

      for (const table of tablesToTest) {
        try {
          const { data: testData, error: testError } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(1);
          
          if (!testError) {
            console.log(`✓ Table exists: ${table}`);
          }
        } catch (e) {
          // Table doesn't exist
        }
      }
    } else {
      console.log('Montree-related tables found:');
      if (data && data.length > 0) {
        data.forEach(row => console.log(`  - ${row.table_name}`));
      } else {
        console.log('No montree tables found');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();
