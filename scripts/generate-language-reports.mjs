// scripts/generate-language-reports.mjs
// Generates Language Semester Reports for all Whale Class children.
// Mirrors the logic in app/api/montree/reports/language-semester/generate/route.ts
//
// Usage: node scripts/generate-language-reports.mjs
//
// Outputs one .pptx per child to:
//   ~/Desktop/Master Brain/ACTIVE/whale/Language_Semester_Reports/

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import JSZip from 'jszip';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ---- Load env vars from .env.local ----------------------------------------

function loadEnv() {
  const envPath = path.join(REPO_ROOT, '.env.local');
  if (!existsSync(envPath)) throw new Error('.env.local not found at ' + envPath);
  const raw = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = val;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const ANTHROPIC_API_KEY = env['ANTHROPIC_API_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase credentials in .env.local');
if (!ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY in .env.local');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ---- Constants -------------------------------------------------------------

const SCHOOL_ID = 'c6280fae-567c-45ed-ad4d-934eae79aabc';
const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69';
const AI_MODEL = 'claude-sonnet-4-6';
const MAX_BODY_WORDS = 125;
const MAX_CLOSING_WORDS = 35;
const TEMPLATE_PATH = path.join(REPO_ROOT, 'public', 'templates', 'language-semester-report.pptx');
const OUTPUT_DIR = path.join(REPO_ROOT, 'Language_Semester_Reports');

// Children who are graduating to K class — add child names here if needed
const GRADUATING_NAMES = new Set([
  // e.g. 'Amy', 'Eric'
  // Leave empty to mark all as "returning next semester"
]);

// ---- Helpers ---------------------------------------------------------------

function statusCode(status) {
  const s = (status || '').toLowerCase();
  if (s === 'mastered') return 'MD';
  if (s === 'practicing') return 'Pr';
  return 'P';
}

function xmlEscape(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textWithBreaks(raw) {
  const escaped = xmlEscape(raw);
  const BR =
    '</a:t></a:r><a:br/><a:r>' +
    '<a:rPr kumimoji="1" lang="en-US" altLang="zh-CN" sz="1400" dirty="0">' +
    '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr><a:t>';
  return escaped
    .replace(/\\n/g, BR)
    .replace(/\n/g, BR);
}

function countWords(s) {
  return s.replace(/\\n/g, ' ').replace(/\n/g, ' ').split(/\s+/).filter(Boolean).length;
}

function cleanText(s) {
  return s.replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimToWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  const joined = words.slice(0, maxWords).join(' ');
  const lastPeriod = Math.max(joined.lastIndexOf('. '), joined.lastIndexOf('! '), joined.lastIndexOf('? '));
  if (lastPeriod > joined.length * 0.5) {
    return joined.slice(0, lastPeriod + 1);
  }
  const trimmed = joined.replace(/[,;:\s]+$/, '');
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

function scrubHallucinatedWorks(text, allowedWorks) {
  if (allowedWorks.length === 0) return text;
  const lowerAllowed = new Set(allowedWorks.map(w => w.toLowerCase()));
  return text.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, (phrase) => {
    if (/^(Dear|Keep|We|You|Next|This|That|Your|Circle|Time|Language|English|Pre|Kindergarten|Good|Big|Well|How|What|Thank|Every)/.test(phrase)) {
      return phrase;
    }
    if (lowerAllowed.has(phrase.toLowerCase())) return phrase;
    for (const w of allowedWorks) {
      if (w.toLowerCase().includes(phrase.toLowerCase()) ||
          phrase.toLowerCase().includes(w.toLowerCase())) {
        return w;
      }
    }
    return 'your work';
  });
}

function postProcess(report, childName, allowedWorks) {
  let opening = cleanText(report.para_opening);
  let closing = cleanText(report.para_english);

  if (!opening.startsWith('Dear')) {
    opening = `Dear ${childName}, ${opening}`;
  }

  opening = scrubHallucinatedWorks(opening, allowedWorks);
  let circle = report.para_circle;
  const circlePoints = circle.split(/\\n|\n/).map(p => p.trim()).filter(Boolean);
  const scrubbedPoints = circlePoints.map(p => scrubHallucinatedWorks(p, allowedWorks));
  circle = scrubbedPoints.join('\\n');
  closing = scrubHallucinatedWorks(closing, allowedWorks);

  const openingWords = countWords(opening);
  const circleWords = countWords(circle);
  const bodyWords = openingWords + circleWords;

  if (bodyWords > MAX_BODY_WORDS) {
    const overBy = bodyWords - MAX_BODY_WORDS;
    if (scrubbedPoints.length >= 2) {
      const lastPoint = scrubbedPoints[scrubbedPoints.length - 1];
      const lastWords = countWords(lastPoint);
      const targetLastWords = Math.max(10, lastWords - overBy);
      scrubbedPoints[scrubbedPoints.length - 1] = trimToWords(lastPoint, targetLastWords);
      circle = scrubbedPoints.join('\\n');

      const bodyNow = countWords(opening) + countWords(circle);
      if (bodyNow > MAX_BODY_WORDS && scrubbedPoints.length >= 3) {
        const over2 = bodyNow - MAX_BODY_WORDS;
        const midPoint = scrubbedPoints[scrubbedPoints.length - 2];
        const midWords = countWords(midPoint);
        scrubbedPoints[scrubbedPoints.length - 2] = trimToWords(midPoint, Math.max(10, midWords - over2));
        circle = scrubbedPoints.join('\\n');
      }
    }
  }

  closing = trimToWords(closing, MAX_CLOSING_WORDS);

  return { para_opening: opening, para_circle: circle, para_english: closing };
}

// ---- Sonnet call -----------------------------------------------------------

const REPORT_TOOL = {
  name: 'write_language_semester_report',
  description: "Write the three narrative sections for a child's semester report. Written TO the child in second person (\"you\", \"your\").",
  input_schema: {
    type: 'object',
    properties: {
      para_opening: {
        type: 'string',
        description: 'Greeting: "Dear [Name]," + 2-3 warm sentences of pride. ~30-40 words.',
      },
      para_circle: {
        type: 'string',
        description: 'Three accomplishments, each on its own line separated by \\n. Point 1: circle time / social growth. Point 2: a SPECIFIC work from the progress list — name it EXACTLY. Point 3: character strength or another achievement. Each point 2-3 sentences. ~75-90 words total. Use ONLY works from the provided list.',
      },
      para_english: {
        type: 'string',
        description: 'Warm closing: 2 sentences, personal and encouraging. ~25-30 words. No work names.',
      },
    },
    required: ['para_opening', 'para_circle', 'para_english'],
  },
};

function buildSystemPrompt(childName, workNames, isGraduating) {
  const workList = workNames.length > 0
    ? `ALLOWED work names (copy EXACTLY — do NOT invent or paraphrase):\n${workNames.map(w => `  • ${w}`).join('\n')}`
    : 'No recorded Language works — speak about their curiosity and early engagement.';

  const closingGuidance = isGraduating
    ? 'This child is GRADUATING to K class. The closing should wish them good luck on their big adventure.'
    : 'This child is RETURNING next semester. The closing should express excitement about seeing them again.';

  return `You are a Montessori teacher writing an end-of-semester Language report as a personal letter TO ${childName}. Parents read this to their child.

VOICE: Warm, proud, simple. A beloved teacher looking a child in the eye. No jargon.

${workList}

${closingGuidance}

RULES:
- Always "you" and "your" — never third person
- Separate para_circle points with \\n (two characters)
- No line breaks in para_opening or para_english
- No bullets, markdown, emojis, or asterisks
- Do NOT name any works in para_english
- Write beautifully — every sentence worth framing`;
}

async function callSonnet(systemPrompt, userMessage) {
  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    tools: [REPORT_TOOL],
    tool_choice: { type: 'tool', name: 'write_language_semester_report' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('Sonnet did not return tool_use output');
  }
  return block.input;
}

async function generateReport(childName, progress, isGraduating) {
  const workNames = progress.map(p => p.work_name);
  const workSummary = progress.map(p => `- ${p.work_name} [${statusCode(p.status)}]`).join('\n');

  const systemPrompt = buildSystemPrompt(childName, workNames, isGraduating);
  const closingHint = isGraduating
    ? 'Graduating to K class — wish good luck.'
    : 'Returning next semester — express excitement about next year.';

  const userMessage = `Child: ${childName}

Language progress:
${workSummary || '(no recorded works)'}

${closingHint}

Write the report letter.`;

  const raw = await callSonnet(systemPrompt, userMessage);
  return postProcess(raw, childName, workNames);
}

// ---- Data loading ----------------------------------------------------------

async function loadLanguageProgress(childId, classroomId) {
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  if (!langArea) return [];

  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name')
    .eq('classroom_id', classroomId)
    .eq('area_id', langArea.id);

  if (!langWorks || langWorks.length === 0) return [];

  const workIdToName = new Map();
  for (const w of langWorks) workIdToName.set(w.id, w.name);
  const langWorkIds = Array.from(workIdToName.keys());

  const { data: directPhotos } = await supabase
    .from('montree_media')
    .select('work_id, captured_at')
    .eq('child_id', childId)
    .in('work_id', langWorkIds)
    .or('identification_status.is.null,identification_status.neq.pending_review')
    .not('work_id', 'is', null);

  const { data: groupLinks } = await supabase
    .from('montree_media_children')
    .select('media_id')
    .eq('child_id', childId);

  let groupPhotos = [];
  if (groupLinks && groupLinks.length > 0) {
    const mediaIds = groupLinks.map(l => l.media_id);
    const { data: gPhotos } = await supabase
      .from('montree_media')
      .select('work_id, captured_at')
      .in('id', mediaIds)
      .in('work_id', langWorkIds)
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .not('work_id', 'is', null);
    groupPhotos = gPhotos || [];
  }

  const allPhotos = [...(directPhotos || []), ...groupPhotos];
  const workPhotoCounts = new Map();
  for (const p of allPhotos) {
    if (!p.work_id) continue;
    workPhotoCounts.set(p.work_id, (workPhotoCounts.get(p.work_id) || 0) + 1);
  }

  const byName = new Map();
  for (const [workId, count] of workPhotoCounts) {
    const workName = workIdToName.get(workId);
    if (!workName) continue;
    let status;
    if (count >= 4) status = 'mastered';
    else if (count >= 2) status = 'practicing';
    else status = 'presented';
    byName.set(workName, { work_name: workName, status });
  }

  const all = Array.from(byName.values());
  const rank = { presented: 1, practicing: 2, mastered: 3 };
  all.sort((a, b) => (rank[b.status] || 0) - (rank[a.status] || 0) || a.work_name.localeCompare(b.work_name));

  const mastered = all.filter(w => w.status === 'mastered');
  const practicing = all.filter(w => w.status === 'practicing');
  const presented = all.filter(w => w.status === 'presented');

  const result = [];
  for (const w of mastered) { if (result.length < 2) result.push(w); }
  for (const w of practicing) { if (result.length < 4) result.push(w); }
  for (const w of presented) { if (result.length < 4) result.push(w); }
  for (const w of mastered) { if (result.length < 4 && !result.includes(w)) result.push(w); }

  return result;
}

// ---- Template fill ---------------------------------------------------------

async function fillTemplate(templateBuf, report, progress) {
  const zip = await JSZip.loadAsync(templateBuf);
  const slidePath = 'ppt/slides/slide1.xml';
  const slideFile = zip.file(slidePath);
  if (!slideFile) throw new Error('Template missing slide1.xml');

  let xml = await slideFile.async('string');

  xml = xml
    .replace('{{PARA_OPENING}}', xmlEscape(report.para_opening))
    .replace('{{PARA_CIRCLE}}', textWithBreaks(report.para_circle))
    .replace('{{PARA_ENGLISH}}', xmlEscape(report.para_english));

  const top4 = progress.slice(0, 4);
  for (let i = 0; i < 4; i++) {
    const w = top4[i];
    const nameTok = `{{WORK_${i + 1}_NAME}}`;
    const statusTok = `{{WORK_${i + 1}_STATUS}}`;
    if (w) {
      xml = xml
        .replace(nameTok, xmlEscape(w.work_name))
        .replace(statusTok, xmlEscape(statusCode(w.status)));
    } else {
      xml = xml.replace(nameTok, '\u2014').replace(statusTok, '\u2014');
    }
  }

  zip.file(slidePath, xml);
  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('=== Language Semester Report Generator ===\n');

  // Load template
  let templateBuf;
  try {
    templateBuf = await readFile(TEMPLATE_PATH);
    console.log(`✓ Template loaded (${Math.round(templateBuf.length / 1024)}KB)`);
  } catch (err) {
    throw new Error('Template not found: ' + TEMPLATE_PATH + '\n' + err.message);
  }

  // Create output directory
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`✓ Output directory: ${OUTPUT_DIR}\n`);

  // Load all active children from Whale Class
  const { data: children, error: childErr } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id')
    .eq('classroom_id', CLASSROOM_ID)
    .eq('is_active', true)
    .order('name');

  if (childErr || !children || children.length === 0) {
    throw new Error('Could not load children: ' + (childErr?.message || 'no rows'));
  }

  // Filter to specific children if RETRY_NAMES is set
  const RETRY_NAMES = new Set(['Amy', 'Kevin']);
  const filtered = RETRY_NAMES.size > 0 ? children.filter(c => RETRY_NAMES.has(c.name)) : children;
  console.log(`Found ${children.length} active children. Running for: ${filtered.map(c => c.name).join(', ')}\n`);
  const childrenToProcess = filtered;

  // Generate each report
  const results = [];
  const errors = [];

  for (const child of childrenToProcess) {
    const isGraduating = GRADUATING_NAMES.has(child.name);
    process.stdout.write(`Processing ${child.name}${isGraduating ? ' [GRADUATING]' : ''}... `);

    try {
      const progress = await loadLanguageProgress(child.id, child.classroom_id);

      if (progress.length === 0) {
        console.log(`⚠ No Language photo evidence — writing encouragement-only report`);
      } else {
        const workList = progress.map(p => `${p.work_name} (${statusCode(p.status)})`).join(', ');
        console.log(`${progress.length} works [${workList}]`);
      }

      const report = await generateReport(child.name, progress, isGraduating);
      const filled = await fillTemplate(templateBuf, report, progress);

      const safeName = child.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const outPath = path.join(OUTPUT_DIR, `${safeName}_Language_Semester_Report.pptx`);
      await writeFile(outPath, filled);

      results.push({ name: child.name, path: outPath });
      console.log(`  ✓ Saved → ${safeName}_Language_Semester_Report.pptx`);
    } catch (err) {
      console.log(`  ✗ FAILED: ${err.message}`);
      errors.push({ name: child.name, error: err.message });
    }

    // Small delay between Sonnet calls to avoid rate limits
    await new Promise(r => setTimeout(r, 800));
  }

  // Summary
  console.log('\n=== Done ===');
  console.log(`✓ ${results.length}/${children.length} reports generated`);
  if (errors.length > 0) {
    console.log(`✗ ${errors.length} failures:`);
    for (const e of errors) console.log(`  - ${e.name}: ${e.error}`);
  }
  console.log(`\nFiles saved to:\n  ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
