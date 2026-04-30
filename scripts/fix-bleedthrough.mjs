#!/usr/bin/env node
/**
 * Re-translate Cyrillic-language work names that still contain English
 * fragments (bleed-through). Detects names where Cyrillic and Latin chars
 * coexist in significant amounts, then re-asks Haiku with stricter rules.
 */
import process from 'node:process';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC = process.env.ANTHROPIC_API_KEY;
const HAIKU = 'claude-haiku-4-5-20251001';
const CL = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';

const LANG_NAMES = {
  uk: 'Ukrainian (Українська) — formal ви register, AMI Montessori terminology. Use Cyrillic transliteration for any English loan words (e.g. "tie-dye" → "тай-дай"). NEVER leave English Latin words in the translation.',
  ru: 'Russian (Русский) — formal вы register, AMI Montessori terminology. Use Cyrillic transliteration for any English loan words (e.g. "puzzle" → "пазл", "skittles" → "кегли"). NEVER leave English Latin words in the translation.',
};

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

async function callHaiku(rows, lang) {
  const properties = {};
  for (const r of rows) {
    properties[`work_${r.id}`] = { type: 'string', description: `Pure-${lang} translation of: "${r.name}"` };
  }
  const tool = {
    name: 'submit_translations',
    description: `Submit pure-${lang} translations.`,
    input_schema: { type: 'object', properties, required: rows.map(r => `work_${r.id}`) },
  };
  const system = `You are a Montessori curriculum translator. Translate work names into ${LANG_NAMES[lang]}.

ABSOLUTE RULE: The output MUST contain ZERO Latin alphabet characters (no A-Z, no a-z). Transliterate any English names into the Cyrillic script. Examples:
- "Golden Beads" → "Золотi Бiсеринки" (UK) / "Золотые Бусы" (RU)
- "Color Box" → "Кольорова Коробка" (UK) / "Цветная Коробка" (RU)
- "Tie-Dye" → "тай-дай" (UK) / "тай-дай" (RU)
- "I Spy" → "Я бачу" (UK) / "Я вижу" (RU)
- "Skittles" → "кеглі" (UK) / "кегли" (RU)
- "Puzzle" → "пазл" (UK/RU)
- Numbers stay numeric: "1-10" stays "1-10"
- Punctuation can be kept

Submit your translations via the submit_translations tool.`;
  const user = `Translate to ${lang.toUpperCase()}, ZERO Latin letters allowed:\n\n` + rows.map(r => `work_${r.id}: ${r.name}`).join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': ANTHROPIC },
    body: JSON.stringify({
      model: HAIKU,
      max_tokens: 4096,
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'submit_translations' },
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Haiku ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const tu = data.content.find(c => c.type === 'tool_use');
  return tu?.input || {};
}

async function main() {
  for (const lang of ['uk', 'ru']) {
    const col = `name_${lang}`;
    const r = await sb(`montree_classroom_curriculum_works?classroom_id=eq.${CL}&select=id,name,${col}`);
    const works = await r.json();
    const broken = works.filter(w => {
      const v = w[col];
      if (!v) return false;
      const cyr = (v.match(/[Ѐ-ӿ]/g) || []).length;
      const lat = (v.match(/[A-Za-z]/g) || []).length;
      return lat > 3 && cyr > 0;
    });
    console.log(`[${lang}] ${broken.length} works to fix`);
    if (broken.length === 0) continue;
    let attempt = 0;
    let translations = {};
    while (attempt < 3) {
      try {
        translations = await callHaiku(broken, lang);
        break;
      } catch (e) {
        attempt++;
        console.log(`  attempt ${attempt} failed: ${e.message.slice(0, 100)}`);
        if (attempt >= 3) throw e;
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    let updated = 0;
    for (const w of broken) {
      const t = translations[`work_${w.id}`];
      if (typeof t !== 'string' || t.trim().length === 0) continue;
      // Check it has no Latin
      const lat = (t.match(/[A-Za-z]/g) || []).length;
      if (lat > 0) {
        console.log(`  ⚠ Still contains Latin: "${w.name}" → "${t}" — keeping anyway`);
      }
      const body = { [col]: t.trim() };
      const u = await sb(`montree_classroom_curriculum_works?id=eq.${w.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(body),
      });
      if (u.ok) {
        updated++;
        console.log(`  ✓ ${w.name}  →  ${t}`);
      }
    }
    console.log(`[${lang}] Updated ${updated}/${broken.length}\n`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
