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

const spotCheck = await client.query(`
  SELECT work_key, work_name, area, description_confidence, length(visual_description) as desc_len,
         array_length(negative_descriptions, 1) as neg_count, source
  FROM montree_global_visual_memory
  WHERE work_key IN ('ma_spindle_box', 'se_cylinder_block_1', 'se_knobless_cylinders')
  ORDER BY work_key
`);
console.log('Confusion-cluster spot-check:');
spotCheck.rows.forEach(r => console.log(`  ${r.work_key} | ${r.work_name} | ${r.area} | conf=${r.description_confidence} | desc_len=${r.desc_len} | negs=${r.neg_count} | source=${r.source}`));

await client.end();
