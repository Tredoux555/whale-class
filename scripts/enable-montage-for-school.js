// scripts/enable-montage-for-school.js
//
// Turns montree_schools.montage_enabled ON for ONE school, looked up by
// owner_email. Weekly-report montages are a pure enhancement (self-gated on
// >= 8 eligible confirmed parent-visible photos, rendered by a shared
// flag-agnostic Railway worker, never able to block report delivery), so this
// is safe to run for a school whose owner asked for it.
//
// Usage from the repo root (so .env.local resolves):
//   node scripts/enable-montage-for-school.js <owner_email|school_id>
//   node scripts/enable-montage-for-school.js <owner_email|school_id> --dry-run
//
// A school_id (UUID) is accepted as well as an email because schools created by
// the /try instant path get a synthetic owner_email (trial-xxxxxx@montree.app),
// so the real owner's address will not match them.
//
// If the email owns several schools, the NEWEST by created_at is flipped and
// every match is listed. Only that one row is written — never a mass update.
//
// Companion to migrations/302_montage_default_on.sql, which flips the column
// DEFAULT to TRUE for schools created from now on. Existing rows are left alone
// by that migration on purpose, so a school that was deliberately opted out
// stays out; this script is the deliberate per-school opt-in.

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const arg = (process.argv[2] || '').trim();
  const email = arg.toLowerCase();
  const dryRun = process.argv.includes('--dry-run');
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg);

  if (!arg) {
    console.error(
      'Usage: node scripts/enable-montage-for-school.js <owner_email|school_id> [--dry-run]'
    );
    process.exit(1);
  }

  console.log(`Looking up schools by ${isUuid ? 'id' : 'owner_email'} = ${arg}\n`);

  const query = supabase
    .from('montree_schools')
    .select('id, name, owner_email, montage_enabled, created_at');
  const { data: matches, error: findErr } = await (isUuid
    ? query.eq('id', arg)
    : query.eq('owner_email', email).order('created_at', { ascending: false }));

  if (findErr) {
    console.error('Lookup failed:', findErr.message);
    process.exit(1);
  }
  if (!matches || matches.length === 0) {
    console.error('No school found for that owner_email. Nothing changed.');
    process.exit(1);
  }

  console.log(`Found ${matches.length} school(s):`);
  for (const s of matches) {
    console.log(
      `  - ${s.id}  montage_enabled=${s.montage_enabled}  created=${s.created_at}  "${s.name}"`
    );
  }

  const target = matches[0];
  console.log(`\nTarget (newest): ${target.id} "${target.name}"`);
  console.log(`  before: montage_enabled = ${target.montage_enabled}`);

  if (dryRun) {
    console.log('\n--dry-run — no write performed.');
    return;
  }

  const { error: updErr } = await supabase
    .from('montree_schools')
    .update({ montage_enabled: true })
    .eq('id', target.id);

  if (updErr) {
    console.error('Update failed:', updErr.message);
    process.exit(1);
  }

  // Read it back — never trust the write, verify it.
  const { data: after, error: afterErr } = await supabase
    .from('montree_schools')
    .select('id, name, montage_enabled')
    .eq('id', target.id)
    .single();

  if (afterErr) {
    console.error('Verify read failed:', afterErr.message);
    process.exit(1);
  }

  console.log(`  after:  montage_enabled = ${after.montage_enabled}`);
  console.log(
    after.montage_enabled
      ? `\n✓ Montage enabled for "${after.name}" (${after.id})`
      : '\n✖ Flag is still false after the update — check RLS / service-role key.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
