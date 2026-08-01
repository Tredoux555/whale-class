import { Client } from 'pg';
import fs from 'fs';

function getDbPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) return process.env.SUPABASE_DB_PASSWORD;
  const envLocal = fs.readFileSync('.env.local', 'utf8');
  const m = envLocal.match(/DATABASE_URL=.*?:\/\/[^:]+:([^@]+)@/);
  if (m) return decodeURIComponent(m[1]);
  throw new Error('No DB password found');
}

const client = new Client({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.dmfncjjtsoxrnvcdnvjq',
  password: getDbPassword(),
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const total = await client.query(`SELECT count(*) FROM montree_global_visual_memory WHERE is_active = true`);
console.log('Total active rows:', total.rows[0].count);

const byArea = await client.query(`
  SELECT area, count(*) FROM montree_global_visual_memory WHERE is_active = true GROUP BY area ORDER BY area
`);
console.log('\nBy area:');
byArea.rows.forEach(r => console.log(`  ${r.area}: ${r.count}`));

const bySource = await client.query(`
  SELECT source, count(*) FROM montree_global_visual_memory WHERE is_active = true GROUP BY source
`);
console.log('\nBy source:');
bySource.rows.forEach(r => console.log(`  ${r.source}: ${r.count}`));

const spotCheck = await client.query(`
  SELECT work_key, work_name, area, confidence, length(visual_description) as desc_len,
         array_length(negative_descriptions, 1) as neg_count, source
  FROM montree_global_visual_memory
  WHERE work_key IN ('ma_spindle_box', 'se_cylinder_block_1', 'se_knobless_cylinders')
  ORDER BY work_key
`);
console.log('\nConfusion-cluster spot-check:');
spotCheck.rows.forEach(r => console.log(`  ${r.work_key} | ${r.work_name} | ${r.area} | conf=${r.confidence} | desc_len=${r.desc_len} | negs=${r.neg_count} | source=${r.source}`));

await client.end();
