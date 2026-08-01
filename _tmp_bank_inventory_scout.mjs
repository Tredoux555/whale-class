import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

// total count
const { count: total, error: e1 } = await sb.from('montree_photo_bank').select('id', { count: 'exact', head: true });
console.log('TOTAL ROWS:', total, e1?.message || '');

// paginate to get all rows for extension/dupe analysis
let rows = [];
let from = 0; const PAGE = 1000;
while (true) {
  const { data, error } = await sb.from('montree_photo_bank').select('id, filename, label, storage_path, mime_type, category, file_size, uploaded_by').range(from, from+PAGE-1);
  if (error) { console.error('ERR', error.message); break; }
  if (!data || data.length === 0) break;
  rows.push(...data);
  if (data.length < PAGE) break;
  from += PAGE;
}
console.log('FETCHED ROWS:', rows.length);

const extCount = {};
for (const r of rows) {
  const fn = r.storage_path || r.filename || '';
  const m = fn.match(/\.([A-Za-z0-9]+)$/);
  const ext = m ? m[1].toLowerCase() : '(none)';
  extCount[ext] = (extCount[ext]||0)+1;
}
console.log('BY EXTENSION:', JSON.stringify(extCount, null, 2));

const mimeCount = {};
for (const r of rows) {
  const m = r.mime_type || '(null)';
  mimeCount[m] = (mimeCount[m]||0)+1;
}
console.log('BY MIME:', JSON.stringify(mimeCount, null, 2));

// duplicate label detection
const byLabel = {};
for (const r of rows) {
  const l = (r.label||'').toLowerCase().trim();
  byLabel[l] = (byLabel[l]||[]);
  byLabel[l].push(r.id);
}
const dupLabels = Object.entries(byLabel).filter(([l,ids]) => ids.length > 1);
console.log('DUPLICATE LABEL GROUPS:', dupLabels.length);
console.log('TOTAL ROWS INVOLVED IN DUP LABELS:', dupLabels.reduce((s,[,ids])=>s+ids.length,0));
console.log('SAMPLE DUP LABELS:', dupLabels.slice(0,15).map(([l,ids])=>`${l} x${ids.length}`).join(' | '));

// uploaded_by breakdown
const byUploader = {};
for (const r of rows) { const u = r.uploaded_by||'(null)'; byUploader[u]=(byUploader[u]||0)+1; }
console.log('BY UPLOADER:', JSON.stringify(byUploader,null,2));

// total file_size
const totalSize = rows.reduce((s,r)=>s+(r.file_size||0),0);
console.log('TOTAL SIZE BYTES (approx, only where recorded):', totalSize, '(~' + (totalSize/1024/1024).toFixed(1) + ' MB)');
console.log('ROWS MISSING file_size:', rows.filter(r=>!r.file_size).length);
