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
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (progressError) {
      console.log('ERROR:', progressError.message);
    } else if (!progressData || progressData.length === 0) {
      console.log('No records found in montree_child_progress');
    } else {
      console.log(`Found ${progressData.length} progress records\n`);
      
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
        console.log('DUPLICATE WORK NAMES DETECTED:\n');
        duplicateWorks.forEach(([workName, records]) => {
          console.log(`  Work: "${workName}"`);
          console.log(`  Count: ${records.length} duplicate records\n`);
          records.forEach((record, idx) => {
            console.log(`    Record ${idx + 1}:`);
            console.log(`      ID: ${record.id}`);
            console.log(`      Status: ${record.status}`);
            console.log(`      Work ID: ${record.work_id || 'N/A'}`);
            console.log(`      Created: ${new Date(record.created_at).toISOString()}`);
            console.log(`      Updated: ${new Date(record.updated_at).toISOString()}`);
            console.log('');
          });
        });
      } else {
        console.log('✓ No duplicate work names found');
      }

      console.log('\n' + '-'.repeat(80));
      console.log('SUMMARY OF ALL WORKS IN PROGRESS:');
      console.log('-'.repeat(80));
      Object.entries(workNameMap).sort().forEach(([workName, records]) => {
        console.log(`  "${workName}": ${records.length} record(s)`);
      });
    }

    console.log('\n');

    // 2. Check child_work_media table (photos/videos)
    console.log('2. CHILD_WORK_MEDIA TABLE ANALYSIS (Photos & Videos)');
    console.log('-'.repeat(80));
    const { data: mediaData, error: mediaError } = await supabase
      .from('child_work_media')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (mediaError) {
      console.log('ERROR:', mediaError.message);
    } else if (!mediaData || mediaData.length === 0) {
      console.log('No media records found in child_work_media');
    } else {
      console.log(`Found ${mediaData.length} media records\n`);

      // Separate photos and videos
      const photos = mediaData.filter(m => m.media_type === 'photo');
      const videos = mediaData.filter(m => m.media_type === 'video');

      console.log(`  Photos: ${photos.length}`);
      console.log(`  Videos: ${videos.length}\n`);

      // Group by work_name
      const mediaWorkMap = {};
      mediaData.forEach(media => {
        const workName = media.work_name || 'UNKNOWN';
        if (!mediaWorkMap[workName]) {
          mediaWorkMap[workName] = [];
        }
        mediaWorkMap[workName].push(media);
      });

      console.log('MEDIA BY WORK NAME:\n');
      Object.entries(mediaWorkMap).forEach(([workName, items]) => {
        console.log(`  "${workName}": ${items.length} item(s)`);
        items.forEach((item, idx) => {
          console.log(`    ${idx + 1}. Type: ${item.media_type}, Created: ${new Date(item.created_at).toLocaleDateString()}`);
          if (!item.work_id) {
            console.log(`       ⚠️ MISSING work_id!`);
          } else {
            console.log(`       Work ID: ${item.work_id}`);
          }
        });
        console.log('');
      });

      // Check for orphaned or suspicious media
      console.log('-'.repeat(80));
      console.log('MEDIA INTEGRITY CHECKS:\n');
      
      const unknownWorks = mediaData.filter(m => !m.work_name || m.work_name === 'UNKNOWN');
      if (unknownWorks.length > 0) {
        console.log(`  ⚠️ ${unknownWorks.length} media item(s) with unknown work_name:`);
        unknownWorks.forEach(item => {
          console.log(`    ID: ${item.id}, Created: ${new Date(item.created_at).toISOString()}`);
        });
      } else {
        console.log(`  ✓ All media items have work_name`);
      }

      const missingWorkId = mediaData.filter(m => !m.work_id);
      if (missingWorkId.length > 0) {
        console.log(`\n  ⚠️ ${missingWorkId.length} media item(s) missing work_id reference:`);
        missingWorkId.forEach(item => {
          console.log(`    ID: ${item.id}, Work Name: "${item.work_name}"`);
        });
      } else {
        console.log(`\n  ✓ All media items have work_id`);
      }
    }

    console.log('\n');

    // 3. Check montree_work_sessions table
    console.log('3. MONTREE_WORK_SESSIONS TABLE ANALYSIS');
    console.log('-'.repeat(80));
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('observed_at', { ascending: false });

    if (sessionsError) {
      console.log('ERROR:', sessionsError.message);
    } else if (!sessionsData || sessionsData.length === 0) {
      console.log('No work session records found');
    } else {
      console.log(`Found ${sessionsData.length} work session records\n`);

      // Group by work_id
      const sessionWorkMap = {};
      sessionsData.forEach(session => {
        if (!sessionWorkMap[session.work_id]) {
          sessionWorkMap[session.work_id] = [];
        }
        sessionWorkMap[session.work_id].push(session);
      });

      console.log('SESSIONS BY WORK_ID:\n');
      Object.entries(sessionWorkMap).forEach(([workId, sessions]) => {
        console.log(`  "${workId}": ${sessions.length} session(s)`);
        sessions.forEach((session, idx) => {
          console.log(`    ${idx + 1}. Type: ${session.session_type}, Duration: ${session.duration_minutes} min`);
          console.log(`       Observed: ${new Date(session.observed_at).toISOString()}`);
        });
        console.log('');
      });

      // Check for duplicates (same work_id on same day)
      console.log('-'.repeat(80));
      console.log('DUPLICATE SESSION CHECK:\n');
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
            console.log(`  ⚠️ Work "${workId}" on ${date}: ${daySessions.length} sessions`);
            daySessions.forEach((s, idx) => {
              console.log(`     ${idx + 1}. ${new Date(s.observed_at).toLocaleTimeString()} - ${s.session_type}`);
            });
          }
        });
      });

      if (!duplicatesFound) {
        console.log('  ✓ No duplicate sessions for same work on same day');
      }
    }

    console.log('\n');

    // 4. CROSS-REFERENCE ANALYSIS
    console.log('4. CROSS-REFERENCE ANALYSIS & INCONSISTENCIES');
    console.log('-'.repeat(80));
    
    if (progressData && mediaData) {
      console.log('\nProgress Records vs Media:\n');
      
      // Get unique work names from progress
      const progressWorks = new Set(progressData.map(p => p.work_name));
      const mediaWorks = new Set(mediaData.map(m => m.work_name));

      console.log(`  Works in progress tracking: ${progressWorks.size}`);
      console.log(`  Works with media: ${mediaWorks.size}`);

      // Find works with media but no progress
      const mediaOnlyWorks = [...mediaWorks].filter(w => !progressWorks.has(w));
      if (mediaOnlyWorks.length > 0) {
        console.log(`\n  ⚠️ Works with media but NO progress records: ${mediaOnlyWorks.length}`);
        mediaOnlyWorks.forEach(work => {
          const count = mediaData.filter(m => m.work_name === work).length;
          console.log(`     "${work}": ${count} media item(s)`);
        });
      }

      // Find works in progress but no media
      const progressOnlyWorks = [...progressWorks].filter(w => !mediaWorks.has(w));
      if (progressOnlyWorks.length > 0) {
        console.log(`\n  ⚠️ Works in progress but NO media: ${progressOnlyWorks.length}`);
        progressOnlyWorks.forEach(work => {
          const count = progressData.filter(p => p.work_name === work).length;
          console.log(`     "${work}": ${count} progress record(s)`);
        });
      }

      if (mediaOnlyWorks.length === 0 && progressOnlyWorks.length === 0) {
        console.log('\n  ✓ All works have both progress records and/or media (if applicable)');
      }
    }

    console.log('\n');
    console.log('='.repeat(80));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  }
}

auditDatabase();
