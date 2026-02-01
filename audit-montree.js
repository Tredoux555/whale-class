#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const childId = '310743a4-51cf-4f8f-9920-9a087adb084f'; // Leo

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('MONTREE DATA INTEGRITY AUDIT - LEO (child_id: 310743a4-51cf-4f8f-9920-9a087adb084f)');
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Check montree_child_progress table
    console.log('1. QUERYING montree_child_progress TABLE');
    console.log('-'.repeat(80));
    const { data: progressData, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (progressError) {
      console.log('ERROR:', progressError.message);
    } else if (!progressData || progressData.length === 0) {
      console.log('No records found in montree_child_progress');
    } else {
      console.log(`Found ${progressData.length} records in montree_child_progress`);
      console.log('');
      
      // Group by work_name to find duplicates
      const workNameMap = {};
      progressData.forEach(record => {
        if (!workNameMap[record.work_name]) {
          workNameMap[record.work_name] = [];
        }
        workNameMap[record.work_name].push(record);
      });

      // Display duplicates
      const duplicateWorks = Object.entries(workNameMap).filter(([_, records]) => records.length > 1);
      if (duplicateWorks.length > 0) {
        console.log('DUPLICATE WORK NAMES FOUND:');
        duplicateWorks.forEach(([workName, records]) => {
          console.log(`\n  "${workName}" appears ${records.length} times:`);
          records.forEach((record, idx) => {
            console.log(`    ${idx + 1}. ID: ${record.id}`);
            console.log(`       Status: ${record.status || 'N/A'}`);
            console.log(`       Created: ${record.created_at || 'N/A'}`);
            console.log(`       Last Updated: ${record.updated_at || 'N/A'}`);
            if (record.data) console.log(`       Data: ${JSON.stringify(record.data)}`);
          });
        });
      } else {
        console.log('No duplicate work names found in montree_child_progress');
      }

      console.log('\n\nALL WORK NAMES IN PROGRESS TABLE:');
      Object.entries(workNameMap).forEach(([workName, records]) => {
        console.log(`  - "${workName}": ${records.length} record(s)`);
      });
    }

    console.log('\n');

    // 2. Check montree_child_photos table
    console.log('2. QUERYING montree_child_photos TABLE');
    console.log('-'.repeat(80));
    const { data: photosData, error: photosError } = await supabase
      .from('montree_child_photos')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (photosError) {
      console.log('ERROR:', photosError.message);
    } else if (!photosData || photosData.length === 0) {
      console.log('No records found in montree_child_photos');
    } else {
      console.log(`Found ${photosData.length} photo records`);
      console.log('');

      // Group by work_name
      const photoWorkMap = {};
      photosData.forEach(photo => {
        const workName = photo.work_name || 'UNKNOWN';
        if (!photoWorkMap[workName]) {
          photoWorkMap[workName] = [];
        }
        photoWorkMap[workName].push(photo);
      });

      console.log('PHOTOS BY WORK NAME:');
      Object.entries(photoWorkMap).forEach(([workName, photos]) => {
        console.log(`\n  "${workName}" (${photos.length} photo(s)):`);
        photos.forEach((photo, idx) => {
          console.log(`    ${idx + 1}. ID: ${photo.id}`);
          console.log(`       URL: ${photo.photo_url ? photo.photo_url.substring(0, 60) + '...' : 'N/A'}`);
          console.log(`       Session ID: ${photo.session_id || 'N/A'}`);
          console.log(`       Created: ${photo.created_at || 'N/A'}`);
        });
      });
    }

    console.log('\n');

    // 3. Check montree_work_sessions table
    console.log('3. QUERYING montree_work_sessions TABLE');
    console.log('-'.repeat(80));
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('observed_at', { ascending: false });

    if (sessionsError) {
      console.log('ERROR:', sessionsError.message);
    } else if (!sessionsData || sessionsData.length === 0) {
      console.log('No records found in montree_work_sessions');
    } else {
      console.log(`Found ${sessionsData.length} work session records`);
      console.log('');

      // Group by work_id
      const sessionWorkMap = {};
      sessionsData.forEach(session => {
        if (!sessionWorkMap[session.work_id]) {
          sessionWorkMap[session.work_id] = [];
        }
        sessionWorkMap[session.work_id].push(session);
      });

      console.log('SESSIONS BY WORK_ID:');
      Object.entries(sessionWorkMap).forEach(([workId, sessions]) => {
        console.log(`\n  Work ID: "${workId}" (${sessions.length} session(s)):`);
        sessions.forEach((session, idx) => {
          console.log(`    ${idx + 1}. ID: ${session.id}`);
          console.log(`       Type: ${session.session_type || 'N/A'}`);
          console.log(`       Duration: ${session.duration_minutes || 'N/A'} minutes`);
          console.log(`       Observed: ${session.observed_at || 'N/A'}`);
          console.log(`       Notes: ${session.notes || 'N/A'}`);
          if (session.media_urls && session.media_urls.length > 0) {
            console.log(`       Media URLs: ${session.media_urls.length} item(s)`);
          }
        });
      });

      // Check for duplicates (same work_id on same day)
      console.log('\n\nDUPLICATE SESSION CHECK (same work_id on same day):');
      let duplicatesFound = false;
      Object.entries(sessionWorkMap).forEach(([workId, sessions]) => {
        const dateMap = {};
        sessions.forEach(session => {
          const date = new Date(session.observed_at).toLocaleDateString();
          if (!dateMap[date]) dateMap[date] = [];
          dateMap[date].push(session);
        });

        Object.entries(dateMap).forEach(([date, daySessions]) => {
          if (daySessions.length > 1) {
            duplicatesFound = true;
            console.log(`  Work ID "${workId}" on ${date}: ${daySessions.length} sessions`);
            daySessions.forEach((s, idx) => {
              console.log(`    ${idx + 1}. ${s.observed_at} - Type: ${s.session_type}`);
            });
          }
        });
      });

      if (!duplicatesFound) {
        console.log('  No duplicate sessions found for the same work on the same day');
      }
    }

    console.log('\n');

    // 4. INTEGRITY CHECK: Cross-reference photos with sessions
    console.log('4. CROSS-REFERENCE CHECK: Photos <-> Sessions');
    console.log('-'.repeat(80));
    
    if (photosData && sessionsData) {
      console.log(`Photos with session_id references: ${photosData.filter(p => p.session_id).length}`);
      
      const orphanedPhotos = photosData.filter(p => p.session_id && !sessionsData.find(s => s.id === p.session_id));
      if (orphanedPhotos.length > 0) {
        console.log(`\nWARNING: ${orphanedPhotos.length} ORPHANED PHOTOS (session not found):`);
        orphanedPhotos.forEach(photo => {
          console.log(`  - Photo ID: ${photo.id}`);
          console.log(`    Session ID (missing): ${photo.session_id}`);
          console.log(`    Work Name: ${photo.work_name}`);
          console.log(`    Created: ${photo.created_at}`);
        });
      } else {
        console.log('All photos with session_id references have corresponding sessions');
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('FATAL ERROR:', error);
  }
}

auditDatabase();
