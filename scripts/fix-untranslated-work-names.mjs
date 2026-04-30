#!/usr/bin/env node
/**
 * Fix curriculum work names where the translated column equals the English
 * name (placeholder leftover) OR is null/empty.
 *
 * Usage:
 *   node scripts/fix-untranslated-work-names.mjs <lang> [classroom_id]
 *   node scripts/fix-untranslated-work-names.mjs uk          # Whale Class
 *   node scripts/fix-untranslated-work-names.mjs uk all      # Every classroom
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               ANTHROPIC_API_KEY.
 */
import process from 'node:process';

const HAIKU = 'claude-haiku-4-5-20251001';
const BATCH = 25;

const LANG_CONFIG = {
  zh: { col: 'name_chinese', extra: ['name_zh'], description: 'Simplified Chinese (use AMI Montessori terminology)' },
  es: { col: 'name_es', description: 'Argentine Spanish (voseo, AMI Montessori terms)' },
  de: { col: 'name_de', description: 'German (formal Sie, AMI: Praktisches Leben/Sinnesmaterial/Mathematik/Sprache/Kulturelles)' },
  fr: { col: 'name_fr', description: 'French (formal vous, AMI: Vie Pratique/Sensoriel/Mathématiques/Langage/Culture)' },
  pt: { col: 'name_pt', description: 'Brazilian Portuguese (AMI: Vida Prática/Sensorial/Matemática/Linguagem/Cultural)' },
  nl: { col: 'name_nl', description: 'Dutch (AMI: Praktisch Leven/Zintuiglijk/Wiskunde/Taal/Cultureel)' },
  it: { col: 'name_it', description: 'Italian (AMI: Vita Pratica/Sensoriale/Matematica/Linguaggio/Culturale)' },
  ja: { col: 'name_ja', description: 'Japanese (polite register, AMI: 日常生活/感覚/算数/言語/文化)' },
  ko: { col: 'name_ko', description: 'Korean (formal register, AMI: 일상생활/감각/수학/언어/문화)' },
  uk: { col: 'name_uk', description: 'Ukrainian (AMI: Практичне Життя/Сенсорний/Математика/Мова/Культура)' },
  ru: { col: 'name_ru', description: 'Russian (AMI: Практическая Жизнь/Сенсорика/Математика/Язык/Культура)' },
};

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
if (!URL || !KEY) { console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!ANTHROPIC) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1); }

async function sb(path, opts = {}) {
  const headers = {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  return fetch(`${URL}/rest/v1/${path}`, { ...opts, headers });
}

async function translateBatch(rows, langConfig) {
  const properties = {};
  for (const row of rows) {
    properties[`work_${row.id}`] = {
      type: 'string',
      description: `Translation of: "${row.name}" (Montessori area: ${row.areaHint || 'unknown'})`,
    };
  }
  const tool = {
    name: 'submit_work_name_translations',
    description: `Submit translated Montessori work names in ${langConfig.description}.`,
    input_schema: {
      type: 'object',
      properties,
      required: rows.map(r => `work_${r.id}`),
    },
  };

  const system = `You are a professional Montessori curriculum translator. Translate Montessori work/material names into ${langConfig.description}.

CRITICAL rules:
- Keep names short, like a curriculum label (2-6 words typical).
- Use established AMI Montessori terminology for the target language where possible.
- Keep "Golden Beads" as the localized AMI name for that material in the target language.
- Numbers stay numeric (e.g. "1-10" stays "1-10").
- Cards / Material / Box / Tray / etc. should be translated to the AMI equivalent in the target language.
- Submit translations by calling the submit_work_name_translations tool.`;

  const user = `Translate these Montessori work names into ${langConfig.description}, then call submit_work_name_translations:\n\n` +
    rows.map(r => `work_${r.id}: ${r.name}`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': ANTHROPIC,
    },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 8192,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_work_name_translations' },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const tu = (data.content || []).find(c => c.type === 'tool_use');
  if (!tu) throw new Error(`No tool_use: ${JSON.stringify(data).slice(0, 300)}`);
  const out = new Map();
  for (const r of rows) {
    const t = tu.input[`work_${r.id}`];
    if (typeof t === 'string' && t.trim().length > 0) out.set(r.id, t.trim());
  }
  return out;
}

async function main() {
  const lang = process.argv[2];
  const classroomArg = process.argv[3] || 'whale';
  const cfg = LANG_CONFIG[lang];
  if (!cfg) { console.error(`Unknown language: ${lang}. Valid: ${Object.keys(LANG_CONFIG).join(',')}`); process.exit(1); }

  const classroomFilter = classroomArg === 'all'
    ? ''
    : classroomArg === 'whale'
      ? 'classroom_id=eq.51e7adb6-cd18-4e03-b707-eceb0a1d2e69&'
      : `classroom_id=eq.${classroomArg}&`;

  // Pull all rows: id, name, area_id, name_<lang>
  const r = await sb(`montree_classroom_curriculum_works?${classroomFilter}select=id,name,area_id,${cfg.col}`);
  if (!r.ok) { console.error('Fetch failed:', r.status, await r.text()); process.exit(1); }
  const rows = await r.json();

  // Build area lookup (try classroom areas first, then school areas)
  const areaIds = [...new Set(rows.map(r => r.area_id).filter(Boolean))];
  const areaMap = new Map();
  if (areaIds.length > 0) {
    for (const tbl of ['montree_classroom_curriculum_areas', 'montree_school_curriculum_areas']) {
      const ar = await sb(`${tbl}?id=in.(${areaIds.join(',')})&select=id,key`);
      if (ar.ok) {
        const areas = await ar.json();
        if (Array.isArray(areas)) for (const a of areas) areaMap.set(a.id, a.key);
      }
    }
  }

  const broken = rows.filter(row => {
    const v = row[cfg.col];
    return !v || v.trim() === '' || v.trim() === row.name.trim();
  });

  console.log(`[${lang}] Total works: ${rows.length}, untranslated: ${broken.length}`);
  if (broken.length === 0) { console.log('Nothing to do.'); return; }

  const translations = new Map();
  for (let i = 0; i < broken.length; i += BATCH) {
    const slice = broken.slice(i, i + BATCH).map(r => ({ id: r.id, name: r.name, areaHint: areaMap.get(r.area_id) }));
    process.stdout.write(`  batch ${Math.floor(i/BATCH)+1}/${Math.ceil(broken.length/BATCH)}... `);
    let attempt = 0;
    while (attempt < 3) {
      try {
        const result = await translateBatch(slice, cfg);
        for (const [id, t] of result) translations.set(id, t);
        process.stdout.write(`✓ ${result.size}/${slice.length}\n`);
        break;
      } catch (e) {
        attempt++;
        process.stdout.write(`\n    ⚠ attempt ${attempt}: ${e.message.slice(0, 100)}\n`);
        if (attempt >= 3) throw e;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    await new Promise(r => setTimeout(r, 400));
  }

  // Update DB rows one-by-one (PATCH).
  let updated = 0, failed = 0;
  for (const [id, translation] of translations) {
    const body = { [cfg.col]: translation };
    if (cfg.extra) for (const c of cfg.extra) body[c] = translation;
    const r = await sb(`montree_classroom_curriculum_works?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    });
    if (r.ok) updated++;
    else { failed++; console.warn(`  ⚠ Failed to update ${id}: ${r.status}`); }
  }
  console.log(`\n[${lang}] Updated ${updated} rows, ${failed} failed.`);
}

main().catch(e => { console.error(e); process.exit(1); });
