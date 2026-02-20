#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const childId = '310743a4-51cf-4f8f-9920-9a087adb084f'; // Leo

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('MONTREE DATA INTEGRITY AUDIT - LEO');
  console.log('Child ID: 310743a4-51cf-4f8f-9920-9a087adb084f');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Check montree_child_progress table
    console.log('1. MONTREE_CHILD_PROGRESS TABLE ANALYSIS');
    console.log('-'.repeat(80));
    const { data: progressData, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId);

    if (progressError) {
      console.log('ERROR:', progressError.message);
      progressData = [];
    } else if (!progressData || progressData.length === 0) {
      console.log('No records found');
      progressData = [];
    } else {
      console.log(`Found ${progressData.length} records\n`);
      
      // Group by work_name
      const workNameMap = {};
      progressData.forEach(record => {
        if (!workNameMap[record.work_name]) {
          workNameMap[record.work_name] = [];
        }
        workNameMap[record.work_name].push(record);
      });

      // Display analysis
      const duplicates = Object.entries(workNameMap).filter(([_, recs]) => recs.length > 1);
      
      if (duplicates.length > 0) {
        console.log('DUPLICATE WORK NAMES DETECTED:\n');
        duplicates.forEach(([workName, records]) => {
          console.log(`  Work: "${workName}"`);
          console.log(`  Duplicates: ${records.length} records`);
          records.forEach((rec, i) => {
            console.log(`    ${i + 1}. ID: ${rec.id}`);
            console.log(`       Status: ${rec.status}`);
            console.log(`       Work ID: ${rec.work_id || 'NULL'}`);
            console.log(`       Created: ${rec.created_at}`);
            console.log(`       Updated: ${rec.updated_at}`);
          });
          console.log('');
        });
      } else {
        console.log('✓ No duplicates found\n');
      }

      console.log('COMPLETE WORK INVENTORY:');
      Object.entries(workNameMap).sort().forEach(([name, recs]) => {
        console.log(`  "${name}": ${recs.length} record(s)`);
      });
    }

    console.log('\n');

    // 2. Check child_work_media table
    console.log('2. CHILD_WORK_MEDIA TABLE ANALYSIS');
    console.log('-'.repeat(80));
    const { data: mediaData, error: mediaError } = await supabase
      .from('child_work_media')
      .select('*')
      .eq('child_id', childId);

    if (mediaError) {
      console.log('ERROR:', mediaError.message);
    } else if (!mediaData || mediaData.length === 0) {
      console.log('No media records found');
    } else {
      console.log(`Found ${mediaData.length} media records\n`);

      // Separate by type
      const photos = mediaData.filter(m => m.media_type === 'photo');
      const videos = mediaData.filter(m => m.media_type === 'video');
      
      console.log(`  Photos: ${photos.length}`);
      console.log(`  Videos: ${videos.length}\n`);

      // Group by work_name
      const byWork = {};
      mediaData.forEach(m => {
        const work = m.work_name || 'UNKNOWN';
        if (!byWork[work]) byWork[work] = [];
        byWork[work].push(m);
      });

      console.log('MEDIA BY WORK NAME:\n');
      Object.entries(byWork).forEach(([work, items]) => {
        console.log(`  "${work}": ${items.length} item(s)`);
        items.forEach((item, i) => {
          console.log(`    ${i + 1}. Type: ${item.media_type}, Work ID: ${item.work_id || 'NULL'}`);
          console.log(`       Created: ${item.created_at}`);
        });
      });
    }

    console.log('\n');

    // 3. Check montree_work_sessions
    console.log('3. MONTREE_WORK_SESSIONS TABLE ANALYSIS');
    console.log('-'.repeat(80));
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', childId);

    if (sessionsError) {
      console.log('ERROR:', sessionsError.message);
    } else if (!sessionsData || sessionsData.length === 0) {
      console.log('No work session records found');
    } else {
      console.log(`Found ${sessionsData.length} sessions\n`);

      const byWorkId = {};
      sessionsData.forEach(s => {
        if (!byWorkId[s.work_id]) byWorkId[s.work_id] = [];
        byWorkId[s.work_id].push(s);
      });

      console.log('SESSIONS BY WORK_ID:\n');
      Object.entries(byWorkId).forEach(([wid, sessions]) => {
        console.log(`  "${wid}": ${sessions.length} session(s)`);
        sessions.forEach((s, i) => {
          console.log(`    ${i + 1}. Type: ${s.session_type}, Duration: ${s.duration_minutes}min`);
          console.log(`       Observed: ${s.observed_at}`);
        });
      });
    }

    console.log('\n');

    // 4. Data Integrity Summary
    console.log('4. DATA INTEGRITY SUMMARY');
    console.log('-'.repeat(80));

    if (progressData && progressData.length > 0) {
      const workNameMap = {};
      progressData.forEach(r => {
        if (!workNameMap[r.work_name]) workNameMap[r.work_name] = 0;
        workNameMap[r.work_name]++;
      });

      const dupeCount = Object.values(workNameMap).filter(c => c > 1).reduce((a, b) => a + b, 0);
      
      console.log(`Progress Tracking Issues:`);
      console.log(`  Total Records: ${progressData.length}`);
      console.log(`  Unique Works: ${Object.keys(workNameMap).length}`);
      console.log(`  Duplicate Entries: ${dupeCount} (across ${Object.entries(workNameMap).filter(([_, c]) => c > 1).length} works)`);
      console.log('');
    }

    if (mediaData && mediaData.length > 0) {
      const missingWorkId = mediaData.filter(m => !m.work_id).length;
      const missingName = mediaData.filter(m => !m.work_name || m.work_name === 'UNKNOWN').length;
      
      console.log(`Media Integrity Issues:`);
      console.log(`  Total Media Items: ${mediaData.length}`);
      console.log(`  Missing work_id: ${missingWorkId}`);
      console.log(`  Missing/Unknown work_name: ${missingName}`);
      console.log('');
    }

    if (sessionsData && sessionsData.length > 0) {
      console.log(`Session Data:`);
      console.log(`  Total Sessions: ${sessionsData.length}`);
    } else {
      console.log(`Session Data: No records (sessions table may not be populated)`);
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

auditDatabase();
