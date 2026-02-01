// Run this with: node create-demo-school.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSchool() {
  console.log('Creating Demo School 2...');

  const { data, error } = await supabase
    .from('montree_schools')
    .insert({
      name: 'Demo School 2',
      slug: 'demo-school-2',
      owner_email: 'tredoux555@gmail.com',
      owner_name: 'Tredoux',
      subscription_status: 'trialing',
      plan_type: 'school'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log('✅ School created successfully!');
  console.log('');
  console.log('   ID:', data.id);
  console.log('   Name:', data.name);
  console.log('   Slug:', data.slug);
  console.log('   URL: /admin/schools/' + data.slug);
  console.log('   Status:', data.subscription_status);
  console.log('   Trial ends:', data.trial_ends_at);
}

createSchool();
