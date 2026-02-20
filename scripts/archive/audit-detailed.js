#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const childId = '310743a4-51cf-4f8f-9920-9a087adb084f'; // Leo

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('MONTREE DATA INTEGRITY AUDIT - DETAILED ANALYSIS');
  console.log('Child ID: 310743a4-51cf-4f8f-9920-9a087adb084f (Leo)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // Get all progress records
    const { data: progressData } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    // Check media table
    const { data: mediaData } = await supabase
      .from('child_work_media')
      .select('*')
      .eq('child_id', childId);

    // Check sessions table
    const { data: sessionsData } = await supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', childId);

    console.log('DETAILED ANALYSIS OF SMALL BUTTONS FRAME DUPLICATES');
    console.log('-'.repeat(80));
    console.log('');

    const smallButtonsRecords = progressData.filter(p => p.work_name === 'Small Buttons Frame');
    
    console.log(`Found ${smallButtonsRecords.length} records for "Small Buttons Frame"\n`);
    
    smallButtonsRecords.forEach((rec, idx) => {
      console.log(`Record ${idx + 1}:`);
      console.log(`  ID: ${rec.id}`);
      console.log(`  Status: ${rec.status}`);
      console.log(`  Area: ${rec.area}`);
      console.log(`  Created: ${rec.created_at}`);
      console.log(`  Updated: ${rec.updated_at}`);
      console.log(`  Notes: ${rec.notes || 'N/A'}`);
      console.log('');
    });

    // Check creation order
    const firstCreated = smallButtonsRecords.reduce((min, rec) => 
      new Date(rec.created_at) < new Date(min.created_at) ? rec : min
    );
    const lastCreated = smallButtonsRecords.reduce((max, rec) => 
      new Date(rec.created_at) > new Date(max.created_at) ? rec : max
    );

    console.log('DUPLICATE TIMELINE ANALYSIS:');
    console.log('-'.repeat(80));
    console.log(`First record created: ${firstCreated.created_at}`);
    console.log(`Last record created: ${lastCreated.created_at}`);
    const timeDiff = (new Date(lastCreated.created_at) - new Date(firstCreated.created_at)) / 1000;
    console.log(`Time span: ${timeDiff} seconds (${(timeDiff / 60).toFixed(2)} minutes)`);
    console.log('');

    // Analyze status progression
    const statuses = smallButtonsRecords.map(r => r.status);
    console.log('STATUS PROGRESSION:');
    smallButtonsRecords.forEach((rec, idx) => {
      console.log(`  ${idx + 1}. ${rec.status} (created ${new Date(rec.created_at).toLocaleTimeString()})`);
    });
    console.log('');

    // Check if they represent legitimate status transitions
    console.log('ROOT CAUSE ANALYSIS:');
    console.log('-'.repeat(80));
    console.log('');
    
    const statusOrder = ['presented', 'practicing', 'mastered', 'not_started'];
    const actualOrder = smallButtonsRecords.map(r => r.status);
    
    const isProgression = actualOrder.every((status, idx) => {
      if (idx === 0) return true;
      const currentIdx = statusOrder.indexOf(status);
      const prevIdx = statusOrder.indexOf(actualOrder[idx - 1]);
      return currentIdx !== prevIdx;
    });

    if (isProgression) {
      console.log('⚠️  LIKELY CAUSE: Multiple status updates');
      console.log('  The records show different statuses that appear to be progress changes.');
      console.log('  However, they are stored as separate records instead of updating a single record.');
      console.log('  This suggests the UI or API is creating new records instead of updating existing ones.');
    } else {
      console.log('⚠️  SUSPICIOUS PATTERN: Non-sequential status changes');
      console.log('  The statuses do not follow a logical progression.');
      console.log('  This indicates data corruption or incorrect insertion logic.');
    }
    console.log('');

    // Summary statistics
    console.log('COMPLETE DATABASE SUMMARY');
    console.log('-'.repeat(80));
    console.log(`Total progress records for Leo: ${progressData.length}`);
    
    const workNames = {};
    progressData.forEach(r => {
      if (!workNames[r.work_name]) workNames[r.work_name] = 0;
      workNames[r.work_name]++;
    });

    const duplicatesCount = Object.values(workNames).filter(c => c > 1).reduce((a, b) => a + b, 0);
    const duplicateWorks = Object.entries(workNames).filter(([_, c]) => c > 1);

    console.log(`Unique works: ${Object.keys(workNames).length}`);
    console.log(`Works with duplicates: ${duplicateWorks.length}`);
    console.log(`Total duplicate records: ${duplicatesCount}`);
    console.log('');
    
    if (duplicateWorks.length > 0) {
      console.log('Works with duplicates:');
      duplicateWorks.forEach(([work, count]) => {
        console.log(`  "${work}": ${count} records`);
      });
    }
    console.log('');

    console.log('MEDIA & SESSION STATUS');
    console.log('-'.repeat(80));
    console.log(`Media records for Leo: ${mediaData ? mediaData.length : 0}`);
    console.log(`Session records for Leo: ${sessionsData ? sessionsData.length : 0}`);
    console.log('');

    console.log('RECOMMENDATIONS');
    console.log('-'.repeat(80));
    console.log('');
    console.log('1. IMMEDIATE: Review the API/UI code that inserts progress records');
    console.log('   Location: Search for where montree_child_progress INSERT happens');
    console.log('   Issue: Should UPDATE existing record, not CREATE new one');
    console.log('');
    console.log('2. DATA CLEANUP: Delete duplicate records, keeping the most recent');
    console.log('   For "Small Buttons Frame": Keep the latest created record (newest timestamp)');
    console.log('   SQL: DELETE FROM montree_child_progress WHERE id IN (...)');
    console.log('');
    console.log('3. SCHEMA FIX: Add UNIQUE constraint to prevent duplicates');
    console.log('   Suggested: UNIQUE(child_id, work_name)');
    console.log('   This forces one record per child per work');
    console.log('');
    console.log('4. TESTING: After fix, verify status transitions work correctly');
    console.log('');

    console.log('='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

auditDatabase();
