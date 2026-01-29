// Quick script to verify database tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking AI Analyst tables...\n');

  // Check montree_child_sensitive_periods
  const { data: sp, error: spErr } = await supabase
    .from('montree_child_sensitive_periods')
    .select('*')
    .limit(1);
  
  if (spErr) {
    console.log('❌ montree_child_sensitive_periods:', spErr.message);
  } else {
    console.log('✅ montree_child_sensitive_periods - EXISTS');
  }

  // Check montree_weekly_analysis
  const { data: wa, error: waErr } = await supabase
    .from('montree_weekly_analysis')
    .select('*')
    .limit(1);
  
  if (waErr) {
    console.log('❌ montree_weekly_analysis:', waErr.message);
  } else {
    console.log('✅ montree_weekly_analysis - EXISTS');
  }

  // Check montree_child_focus_works
  const { data: fw, error: fwErr } = await supabase
    .from('montree_child_focus_works')
    .select('*')
    .limit(1);
  
  if (fwErr) {
    console.log('❌ montree_child_focus_works:', fwErr.message);
  } else {
    console.log('✅ montree_child_focus_works - EXISTS');
  }

  // Check new columns on montree_child_progress
  const { data: cp, error: cpErr } = await supabase
    .from('montree_child_progress')
    .select('duration_minutes, repetition_count, concentration_quality')
    .limit(1);
  
  if (cpErr) {
    console.log('❌ montree_child_progress columns:', cpErr.message);
  } else {
    console.log('✅ montree_child_progress - NEW COLUMNS EXIST');
  }

  console.log('\n✨ Database check complete!');
}

checkTables();
