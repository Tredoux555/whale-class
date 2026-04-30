#!/usr/bin/env node
/**
 * Sync all curriculum work name translations across every classroom and
 * every supported locale. Detects rows where the translated column is null,
 * empty, or equals the English text (placeholder leftover) and re-translates
 * them via Haiku.
 *
 * Designed for both:
 *   - Local CLI: `npm run i18n:fix-names`
 *   - Railway scheduled task / cron
 *
 * Usage:
 *   node scripts/sync-curriculum-translations.mjs           # all classrooms
 *   node scripts/sync-curriculum-translations.mjs <classroom_id>
 *   node scripts/sync-curriculum-translations.mjs --dry-run # report only
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               ANTHROPIC_API_KEY.
 *
 * Cost: ~$0.03 per classroom-language pair when there's drift, $0 when
 * nothing needs translating (no API calls fired).
 */
import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const HAIKU = 'claude-haiku-4-5-20251001';
const BATCH = 25;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;

if (!URL || !KEY) { console.error('✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
if (!ANTHROPIC) { console.error('✖ Missing ANTHROPIC_API_KEY'); process.exit(1); }

const DRY_RUN = process.argv.includes('--dry-run');
const ALL_CLASSROOMS = process.argv.includes('--all');
const ONLY_CLASSROOM = process.argv.find(a => /^[0-9a-f]{8}-[0-9a-f]{4}/.test(a));

const LANGS = {
  zh: { col: 'name_chinese', extra: ['name_zh'], description: 'Simplified Chinese (AMI Montessori terminology)' },
  es: { col: 'name_es', description: 'Argentine Spanish (voseo, AMI: Vida Práctica/Sensorial/Matemáticas/Lenguaje/Cultural)' },
  de: { col: 'name_de', description: 'German (formal Sie, AMI: Praktisches Leben/Sinnesmaterial/Mathematik/Sprache/Kulturelles)' },
  fr: { col: 'name_fr', description: 'French (formal vous, AMI: Vie Pratique/Sensoriel/Mathématiques/Langage/Culture)' },
  pt: { col: 'name_pt', description: 'Brazilian Portuguese (AMI: Vida Prática/Sensorial/Matemática/Linguagem/Cultural)' },
  nl: { col: 'name_nl', description: 'Dutch (AMI: Praktisch Leven/Zintuiglijk/Wiskunde/Taal/Cultureel)' },
  it: { col: 'name_it', description: 'Italian (AMI: Vita Pratica/Sensoriale/Matematica/Linguaggio/Culturale)' },
  ja: { col: 'name_ja', description: 'Japanese (polite register, AMI: 日常生活/感覚/算数/言語/文化)' },
  ko: { col: 'name_ko', description: 'Korean (formal register, AMI: 일상생활/감각/수학/언어/문화)' },
  uk: { col: 'name_uk', description: 'Ukrainian (Cyrillic only, ZERO Latin chars allowed; AMI: Практичне Життя/Сенсорний/Математика/Мова/Культура)' },
  ru: { col: 'name_ru', description: 'Russian (Cyrillic only, ZERO Latin chars allowed; AMI: Практическая Жизнь/Сенсорика/Математика/Язык/Культура)' },
};

// Names that legitimately stay identical in many European languages
// (loanwords, proper nouns). The script will skip flagging these.
const KNOWN_LOANWORDS = new Set([
  'bingo', 'bingo - ing',
  'collage',
  'origami',
  'yoga',
  'sudoku',
  'tangram',
  'mandala',
]);

function isKnownLoanword(name) {
  return KNOWN_LOANWORDS.has(name.trim().toLowerCase());
}

async function sb(path, opts = {}) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

async function translateBatch(rows, lang, cfg) {
  const properties = {};
  for (const r of rows) {
    properties[`work_${r.id}`] = {
      type: 'string',
      description: `${cfg.description} translation of: "${r.name}"`,
    };
  }
  const tool = {
    name: 'submit_translations',
    description: `Submit translated Montessori work names in ${cfg.description}.`,
    input_schema: { type: 'object', properties, required: rows.map(r => `work_${r.id}`) },
  };
  const isCyrillic = lang === 'uk' || lang === 'ru';
  const system = `You are a professional Montessori curriculum translator. Translate work names into ${cfg.description}.

Rules:
- Keep names short (2-6 words typical), like a curriculum label.
- Use established AMI Montessori terminology in the target language.
- Numbers stay numeric (e.g. "1-10" stays "1-10").
${isCyrillic ? '- ABSOLUTE RULE: ZERO Latin alphabet characters in the output. Transliterate any English loanword into Cyrillic (e.g. "Tie-Dye" → "тай-дай", "Skittles" → "кегли", "I Spy" → "Я бачу" / "Я вижу").\n' : ''}- Submit translations by calling submit_translations.`;

  const user = `Translate to ${lang.toUpperCase()}, then call submit_translations:\n\n` +
    rows.map(r => `work_${r.id}: ${r.name}`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': ANTHROPIC },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 8192,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_translations' },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const tu = data.content.find(c => c.type === 'tool_use');
  if (!tu) throw new Error('No tool_use in response');
  const out = new Map();
  for (const r of rows) {
    const t = tu.input[`work_${r.id}`];
    if (typeof t === 'string' && t.trim().length > 0) out.set(r.id, t.trim());
  }
  return out;
}

// Replace Latin-i homoglyphs in Cyrillic strings with proper Cyrillic equivalents.
function normalizeCyrillic(s) {
  return s
    .replace(/(?<=[Ѐ-ӿ])i/g, 'і')
    .replace(/i(?=[Ѐ-ӿ])/g, 'і')
    .replace(/(?<=[Ѐ-ӿ])I/g, 'І')
    .replace(/I(?=[Ѐ-ӿ])/g, 'І');
}

async function processClassroom(classroomId) {
  const summary = { classroom: classroomId, totalGaps: 0, fixed: 0, byLang: {} };

  for (const [lang, cfg] of Object.entries(LANGS)) {
    const r = await sb(`montree_classroom_curriculum_works?classroom_id=eq.${classroomId}&select=id,name,${cfg.col}`);
    if (!r.ok) {
      console.error(`  ✖ [${lang}] fetch failed: ${r.status}`);
      summary.byLang[lang] = { error: `fetch ${r.status}` };
      continue;
    }
    const rows = await r.json();
    const broken = rows.filter(row => {
      const v = row[cfg.col];
      const empty = !v || v.trim() === '';
      const sameAsEn = !empty && v.trim() === row.name.trim();
      // Skip known loanwords that legitimately stay identical to English
      if (sameAsEn && isKnownLoanword(row.name)) return false;
      return empty || sameAsEn;
    });
    if (broken.length === 0) {
      summary.byLang[lang] = { gaps: 0, fixed: 0 };
      continue;
    }

    summary.totalGaps += broken.length;
    summary.byLang[lang] = { gaps: broken.length, fixed: 0 };

    if (DRY_RUN) {
      console.log(`  [${lang}] ${broken.length} gaps (dry-run, skipping)`);
      continue;
    }

    console.log(`  [${lang}] ${broken.length} gaps — translating...`);
    const translations = new Map();
    for (let i = 0; i < broken.length; i += BATCH) {
      const slice = broken.slice(i, i + BATCH).map(r => ({ id: r.id, name: r.name }));
      let attempt = 0;
      while (attempt < 3) {
        try {
          const result = await translateBatch(slice, lang, cfg);
          for (const [id, t] of result) translations.set(id, t);
          break;
        } catch (e) {
          attempt++;
          console.error(`    ⚠ batch attempt ${attempt}: ${e.message.slice(0, 100)}`);
          if (attempt >= 3) break;
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }

    let fixed = 0;
    for (const [id, raw] of translations) {
      let translation = raw;
      if (lang === 'uk' || lang === 'ru') translation = normalizeCyrillic(translation);
      const body = { [cfg.col]: translation };
      if (cfg.extra) for (const c of cfg.extra) body[c] = translation;
      const u = await sb(`montree_classroom_curriculum_works?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (u.ok) fixed++;
    }
    summary.byLang[lang].fixed = fixed;
    summary.fixed += fixed;
    console.log(`  [${lang}] ✓ fixed ${fixed}/${broken.length}`);
  }

  return summary;
}

async function main() {
  const t0 = Date.now();

  // Fetch active classrooms (with at least one child) by default. Use --all
  // to translate every classroom, or pass a UUID to target one.
  let classrooms;
  if (ONLY_CLASSROOM) {
    classrooms = [{ id: ONLY_CLASSROOM, name: 'specified' }];
  } else if (ALL_CLASSROOMS) {
    const r = await sb('montree_classrooms?select=id,name&order=name.asc');
    classrooms = await r.json();
  } else {
    // Default: only classrooms that are active AND have at least one child.
    // Avoids paying to translate curriculum for trial/test/abandoned schools.
    const r = await sb('montree_classrooms?is_active=eq.true&select=id,name&order=name.asc');
    if (!r.ok) { console.error('Could not list classrooms:', await r.text()); process.exit(1); }
    const allActive = await r.json();
    const filtered = [];
    for (const c of allActive) {
      const cr = await sb(`montree_children?classroom_id=eq.${c.id}&select=id&limit=1`);
      const cd = await cr.json();
      if (cd.length > 0) filtered.push(c);
    }
    classrooms = filtered;
  }

  const mode = ONLY_CLASSROOM ? '(specified)' : ALL_CLASSROOMS ? '(--all)' : '(active + has children)';
  console.log(`Syncing ${classrooms.length} classroom(s) ${mode}${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

  const allSummaries = [];
  let totalGaps = 0, totalFixed = 0;
  for (const c of classrooms) {
    console.log(`Classroom: ${c.name || c.id}  (${c.id})`);
    const s = await processClassroom(c.id);
    allSummaries.push({ ...s, name: c.name });
    totalGaps += s.totalGaps;
    totalFixed += s.fixed;
    console.log('');
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('═══════════════════════════════════════');
  console.log(`Total gaps: ${totalGaps}, fixed: ${totalFixed} in ${elapsed}s`);
  if (DRY_RUN) console.log('(dry-run — no database writes)');
  if (totalGaps > 0 && totalFixed === 0 && !DRY_RUN) {
    console.error('✖ Detected gaps but failed to fix any. Check Haiku errors above.');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
