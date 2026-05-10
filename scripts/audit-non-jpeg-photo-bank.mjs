// scripts/audit-non-jpeg-photo-bank.mjs
// READ-ONLY audit — does NOT delete anything.
// Identifies montree_photo_bank rows that are not JPEGs.
//
// Heuristic — flag a row as "non-JPEG" if any of:
//   - filename does not end with .jpg/.jpeg (case-insensitive)
//   - storage_path does not end with .jpg/.jpeg
//   - mime_type is set and is not image/jpeg
//
// Run with:
//   node --env-file=.env.local scripts/audit-non-jpeg-photo-bank.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALLOWED_EXT = new Set(['jpg', 'jpeg']);

function lastExt(s) {
  if (!s || typeof s !== 'string') return '';
  const i = s.lastIndexOf('.');
  if (i === -1) return '';
  return s.slice(i + 1).toLowerCase().replace(/[?#].*$/, '');
}

function isJpegMime(m) {
  if (!m) return null; // null = unknown, not a fail signal on its own
  const lc = String(m).toLowerCase();
  return lc === 'image/jpeg' || lc === 'image/jpg';
}

async function main() {
  console.log('Connecting to', supabaseUrl);

  // Probe the schema first
  const probe = await sb.from('montree_photo_bank').select('*').limit(1);
  if (probe.error) {
    console.error('Probe failed:', probe.error.message);
    process.exit(1);
  }

  const sampleRow = probe.data?.[0] || {};
  const cols = Object.keys(sampleRow);
  console.log('\nColumns on montree_photo_bank:', cols.join(', '));

  const PAGE = 1000;
  let total = 0;
  let nonJpegRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await sb
      .from('montree_photo_bank')
      .select('id, filename, label, category, storage_path, thumbnail_path, public_url, mime_type, file_size, uploaded_by, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('Query failed:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    total += data.length;

    for (const row of data) {
      const mime = row.mime_type;
      const fname = row.filename;
      const storagePathExt = lastExt(row.storage_path);
      const filenameExt = lastExt(fname);

      const mimeIsJpeg = isJpegMime(mime); // null | true | false
      const storagePathIsJpeg = ALLOWED_EXT.has(storagePathExt);
      const filenameIsJpeg = fname ? ALLOWED_EXT.has(filenameExt) : null;

      // Flag if ANY signal is non-JPEG (and at least one negative signal exists)
      const negative =
        mimeIsJpeg === false ||
        (!storagePathIsJpeg && storagePathExt !== '') ||
        (filenameIsJpeg === false);

      if (negative) {
        nonJpegRows.push({
          id: row.id,
          filename: fname,
          label: row.label,
          category: row.category,
          storage_path: row.storage_path,
          thumbnail_path: row.thumbnail_path,
          public_url: row.public_url,
          mime_type: mime,
          file_size: row.file_size,
          uploaded_by: row.uploaded_by,
          created_at: row.created_at,
          storage_path_ext: storagePathExt,
          filename_ext: filenameExt,
        });
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`\nScanned ${total} total rows in montree_photo_bank`);
  console.log(`Non-JPEG rows: ${nonJpegRows.length}\n`);

  if (nonJpegRows.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  // Breakdown by extension / mime
  const byMime = {};
  const byStoragePathExt = {};
  const byFilenameExt = {};

  for (const r of nonJpegRows) {
    const m = r.mime_type || '(null)';
    byMime[m] = (byMime[m] || 0) + 1;

    const sx = r.storage_path_ext || '(none)';
    byStoragePathExt[sx] = (byStoragePathExt[sx] || 0) + 1;

    const fx = r.filename_ext || '(none)';
    byFilenameExt[fx] = (byFilenameExt[fx] || 0) + 1;
  }

  console.log('Breakdown by mime_type:');
  for (const [k, v] of Object.entries(byMime).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  console.log('\nBreakdown by storage_path extension:');
  for (const [k, v] of Object.entries(byStoragePathExt).sort((a, b) => b[1] - a[1])) {
    console.log(`  .${k}: ${v}`);
  }

  console.log('\nBreakdown by filename extension:');
  for (const [k, v] of Object.entries(byFilenameExt).sort((a, b) => b[1] - a[1])) {
    console.log(`  .${k}: ${v}`);
  }

  console.log('\nSample rows (first 10):');
  for (const r of nonJpegRows.slice(0, 10)) {
    console.log(`  id=${r.id}`);
    console.log(`    label="${r.label}"  category=${r.category}`);
    console.log(`    filename=${r.filename}`);
    console.log(`    storage_path=${r.storage_path}`);
    console.log(`    mime_type=${r.mime_type || '(null)'}`);
    console.log(`    created_at=${r.created_at}`);
    console.log('');
  }

  // Write all non-JPEG rows to a JSON file for the deletion script
  const fs = await import('node:fs');
  const outPath = '/tmp/non_jpeg_photo_bank_rows.json';
  fs.writeFileSync(outPath, JSON.stringify(nonJpegRows, null, 2));
  console.log(`\nFull row dump written to ${outPath} (${nonJpegRows.length} rows)`);
}

main().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
