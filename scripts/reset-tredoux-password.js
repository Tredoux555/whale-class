// Reset password for Tredoux
// Phase 2: Migrated to bcrypt (was SHA-256)
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function resetPassword() {
  // First, find any admin with "tredoux" in their name or email
  const { data: admins, error: findError } = await supabase
    .from('montree_school_admins')
    .select('*')
    .or('email.ilike.%tredoux%,name.ilike.%tredoux%');

  console.log('Found admins:', admins);

  if (!admins || admins.length === 0) {
    console.log('No admin found with "tredoux". Let me check teachers...');

    const { data: teachers } = await supabase
      .from('montree_teachers')
      .select('*')
      .or('email.ilike.%tredoux%,name.ilike.%tredoux%');

    console.log('Found teachers:', teachers);
    return;
  }

  // Reset password to admin123
  const newPasswordHash = await hashPassword('admin123');

  for (const admin of admins) {
    const { error: updateError } = await supabase
      .from('montree_school_admins')
      .update({ password_hash: newPasswordHash })
      .eq('id', admin.id);

    if (updateError) {
      console.error('Error updating:', updateError);
    } else {
      console.log(`✅ Password reset for: ${admin.email}`);
      console.log(`   Login at /montree/principal/login with:`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: admin123`);
    }
  }
}

resetPassword().catch(console.error);
