#!/usr/bin/env node
// scripts/generate-term-reports.mjs
//
// Generates Language semester term reports for all Whale Class children.
// Outputs individual PPTX files + a ZIP bundle.
//
// Usage: node scripts/generate-term-reports.mjs

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import JSZip from 'jszip';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const CLASSROOM_ID = '51e7adb6-cd18-4e03-b707-eceb0a1d2e69'; // Whale Class
const MODEL = 'claude-sonnet-4-6';
const POLISH_MODEL = 'claude-haiku-4-5-20251001';

// Feb 1, 2026 as cutoff (full term)
const CUTOFF = '2026-02-01T00:00:00Z';

// Children graduating to K class (match by lowercase name)
const GRADUATING_NAMES = new Set([
  'yueze', 'lucky', 'austin', 'mingxi', 'leo', 'eric',
  'jimmy', 'rachel', 'kevin', 'yo-yo', 'yoyo', 'joey', 'molly'
]);

const MAX_BODY_WORDS = 125;
const MAX_CLOSING_WORDS = 35;

// --- Init ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

// --- Helpers ---
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
  // Walk backwards from the limit to find the last COMPLETE sentence
  const joined = words.slice(0, maxWords).join(' ');
  // Try sentence-ending punctuation followed by space or end-of-string
  const sentenceEnd = Math.max(
    joined.lastIndexOf('. '),
    joined.lastIndexOf('! '),
    joined.lastIndexOf('? '),
    joined.endsWith('.') ? joined.length - 1 : -1,
    joined.endsWith('!') ? joined.length - 1 : -1,
    joined.endsWith('?') ? joined.length - 1 : -1,
  );
  if (sentenceEnd > joined.length * 0.3) {
    return joined.slice(0, sentenceEnd + 1);
  }
  // Fallback: trim to word boundary and add period
  const trimmed = joined.replace(/[,;:\s—\-]+$/, '');
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

function scrubHallucinatedWorks(text, allowedWorks) {
  if (allowedWorks.length === 0) return text;
  const lowerAllowed = new Set(allowedWorks.map(w => w.toLowerCase()));

  // Common English phrases that look like capitalized work names but aren't
  const SAFE_STARTS = /^(Dear|Keep|We|You|Next|This|That|Your|Circle|Time|Language|English|Pre|Kindergarten|Good|Big|Well|How|What|Thank|Every|See|One|During|At|The)/;

  // STEP 1 — Mask each occurrence of an allowed work name with a unique
  // placeholder. Sort by length DESCENDING so longer matches win first
  // (e.g. "Classified Cards (Nomenclature Cards)" is masked before the regex
  // can match the inner "Nomenclature Cards" as a separate phrase).
  //
  // This prevents the scrub regex from corrupting the inside of parenthesized
  // work names — the bug that produced "Classified Cards (Nomenclature Cards)
  // (your work)" in earlier runs.
  const sortedWorks = [...allowedWorks].sort((a, b) => b.length - a.length);
  const placeholders = new Map();
  let masked = text;
  let nextId = 0;
  for (const work of sortedWorks) {
    const escaped = work.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    masked = masked.replace(re, () => {
      const id = `__WORK${nextId}__`;
      placeholders.set(id, work);
      nextId++;
      return id;
    });
  }

  // STEP 2 — Run the capitalized-phrase regex on the masked text. Anything
  // that matches now is genuinely a phrase outside any known work name.
  masked = masked.replace(/[A-Z][a-z]+(?:[\s\-]+[A-Z][a-z]+)+/g, (phrase) => {
    if (SAFE_STARTS.test(phrase)) return phrase;
    // Exact match (case-insensitive)
    if (lowerAllowed.has(phrase.toLowerCase())) return phrase;
    // Check if phrase is the start of an allowed work name
    for (const w of allowedWorks) {
      if (w.toLowerCase().startsWith(phrase.toLowerCase())) return w;
    }
    // NOT a fuzzy/substring match — strict replacement
    return 'your work';
  });

  // STEP 3 — Restore each placeholder to its original work name.
  for (const [id, work] of placeholders) {
    masked = masked.split(id).join(work);
  }

  return masked;
}

function postProcess(report, childName, allowedWorks) {
  let opening = cleanText(report.para_opening);
  let closing = cleanText(report.para_english);

  if (!opening.startsWith('Dear')) {
    opening = `Dear ${childName}, ${opening}`;
  }

  opening = scrubHallucinatedWorks(opening, allowedWorks);

  // Remove "Dear X," from closing if Sonnet put it there
  closing = closing.replace(/^Dear\s+\w+,?\s*/i, '');

  let circle = report.para_circle;
  const circlePoints = circle.split(/\\n|\n/).map(p => p.trim()).filter(Boolean);
  const scrubbedPoints = circlePoints.map(p => scrubHallucinatedWorks(p, allowedWorks));
  circle = scrubbedPoints.join('\\n');
  closing = scrubHallucinatedWorks(closing, allowedWorks);

  // De-duplicate work names that got repeated. Handles:
  //   "Metal Insets Metal Insets"            → "Metal Insets"
  //   "Metal Insets - Metal Insets"          → "Metal Insets"
  //   "Metal Insets (Metal Insets)"          → "Metal Insets"
  //   "Pink Series (CVC Words) (CVC Words)"  → "Pink Series (CVC Words)"  ← THE BUG
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dedupTargets = [opening, circle];
  for (let idx = 0; idx < dedupTargets.length; idx++) {
    let txt = dedupTargets[idx];
    for (const w of allowedWorks) {
      const we = escapeRe(w);
      // Pattern A: full work doubled (with optional dash separator)
      txt = txt.replace(new RegExp(we + '\\s*[-–—]?\\s*' + we, 'gi'), w);
      // Pattern B: full work followed by parenthetical of itself
      txt = txt.replace(new RegExp(we + '\\s*\\(' + we + '\\)', 'gi'), w);
      // Pattern C: full work followed by repeated parenthetical from inside it
      // e.g. "Pink Series (CVC Words) (CVC Words)" — extract the parenthetical
      // suffix from the work name and remove its second occurrence.
      const parenMatch = w.match(/\(([^)]+)\)$/);
      if (parenMatch) {
        const innerParen = parenMatch[1];
        const innerEscaped = escapeRe(innerParen);
        // Match: work-name + whitespace + (innerParen) → keep just the work name
        txt = txt.replace(
          new RegExp(we + '\\s+\\(' + innerEscaped + '\\)', 'gi'),
          w
        );
      }
    }
    dedupTargets[idx] = txt;
  }
  opening = dedupTargets[0];
  circle = dedupTargets[1];

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

  const finalBody = countWords(opening) + countWords(circle);
  const finalClosing = countWords(closing);
  console.log(`  Post-process: body=${finalBody}w (max ${MAX_BODY_WORDS}), closing=${finalClosing}w (max ${MAX_CLOSING_WORDS})`);

  return { para_opening: opening, para_circle: circle, para_english: closing };
}

// --- Final grammar polish pass (Haiku) ---
//
// After Sonnet writes and the structural post-process scrubs, run a fast
// Haiku pass that ONLY fixes grammar errors (verb tense, agreement, awkward
// phrasing). Tone, names, line breaks, and content stay identical.
//
// Why: Sonnet occasionally produces "helped you learned" or duplicated
// fragments that the regex scrub can't catch. Haiku at this scope is reliable
// and cheap (~$0.001 per report).
//
const POLISH_TOOL = {
  name: 'polish_report_grammar',
  description: 'Return the same report with grammar errors fixed. Do NOT change content, tone, names, line breaks, or word count meaningfully — only fix grammar.',
  input_schema: {
    type: 'object',
    properties: {
      para_opening: { type: 'string', description: 'Opening with grammar fixed.' },
      para_circle: { type: 'string', description: 'Circle paragraph with grammar fixed. Preserve \\n line breaks between points exactly.' },
      para_english: { type: 'string', description: 'Closing with grammar fixed.' },
    },
    required: ['para_opening', 'para_circle', 'para_english'],
  },
};

async function polishGrammar(report, childName, allowedWorks) {
  const workListBlock = allowedWorks.length > 0
    ? `Work names that MUST stay spelled EXACTLY as written (do not modify):\n${allowedWorks.map(w => `  • ${w}`).join('\n')}`
    : '(no specific work names referenced)';

  const systemPrompt = `You are a copy-editor polishing a Montessori teacher's end-of-semester letter to a child. Your ONLY job is to fix grammar errors.

ABSOLUTE RULES:
- Do NOT change the warm, proud tone
- Do NOT change which works/topics are mentioned
- Do NOT add new sentences or remove sentences
- Do NOT change the child's name or any work name spelling
- Do NOT change line breaks (\\n) — preserve them exactly where they are
- Do NOT add or remove paragraphs

DO fix:
- Verb tense errors ("helped you learned" → "helped you learn")
- Subject-verb agreement
- Awkward phrasing that breaks fluency
- Duplicated words or phrases
- Missing articles or prepositions
- Run-on sentences (split into two if needed, but keep total length similar)

${workListBlock}

If the text is already grammatically perfect, return it unchanged.`;

  const userMessage = `Child: ${childName}

para_opening:
${report.para_opening}

para_circle (lines separated by \\n):
${report.para_circle}

para_english:
${report.para_english}

Return all three paragraphs polished.`;

  const response = await anthropic.messages.create({
    model: POLISH_MODEL,
    max_tokens: 800,
    system: systemPrompt,
    tools: [POLISH_TOOL],
    tool_choice: { type: 'tool', name: 'polish_report_grammar' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    // Polish is best-effort — if Haiku fails, return the unpolished input
    console.log('  ⚠️  Polish pass returned no tool_use — keeping unpolished');
    return report;
  }

  // Sanity-check: the polished output should still contain the child's name
  // and all allowed work names that were in the original. If it stripped any,
  // fall back to the unpolished version (defensive — Haiku rarely strips).
  const polished = block.input;
  const beforeBody = `${report.para_opening} ${report.para_circle}`.toLowerCase();
  const afterBody = `${polished.para_opening} ${polished.para_circle}`.toLowerCase();
  for (const w of allowedWorks) {
    const wl = w.toLowerCase();
    if (beforeBody.includes(wl) && !afterBody.includes(wl)) {
      console.log(`  ⚠️  Polish dropped work name "${w}" — keeping unpolished`);
      return report;
    }
  }

  return polished;
}

// --- Data Loading ---
async function loadAllChildren() {
  const { data, error } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id')
    .eq('classroom_id', CLASSROOM_ID)
    .order('name');

  if (error) throw new Error(`Failed to load children: ${error.message}`);
  return data || [];
}

async function loadLanguageProgress(childId) {
  // Step 1: Get Language area ID
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', CLASSROOM_ID)
    .eq('area_key', 'language')
    .maybeSingle();

  if (!langArea) return { top4: [], allWorks: [] };

  // Step 2: Get Language works
  const { data: langWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name')
    .eq('classroom_id', CLASSROOM_ID)
    .eq('area_id', langArea.id);

  if (!langWorks || langWorks.length === 0) return { top4: [], allWorks: [] };

  const workIdToName = new Map();
  for (const w of langWorks) workIdToName.set(w.id, w.name);
  const langWorkIds = Array.from(workIdToName.keys());

  // Step 3: Get confirmed photos for this child
  const { data: directPhotos } = await supabase
    .from('montree_media')
    .select('work_id, captured_at')
    .eq('child_id', childId)
    .in('work_id', langWorkIds)
    .gte('captured_at', CUTOFF)
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
      .gte('captured_at', CUTOFF)
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .not('work_id', 'is', null);
    groupPhotos = gPhotos || [];
  }

  // Step 4: Count photos per work
  const allPhotos = [...(directPhotos || []), ...groupPhotos];
  const workPhotoCounts = new Map();
  for (const p of allPhotos) {
    if (!p.work_id) continue;
    workPhotoCounts.set(p.work_id, (workPhotoCounts.get(p.work_id) || 0) + 1);
  }

  // Step 5: Check mastery from montree_child_progress
  const masteredWorkNames = new Set();
  const { data: progressRows } = await supabase
    .from('montree_child_progress')
    .select('work_name, status')
    .eq('child_id', childId)
    .eq('status', 'mastered');
  for (const row of (progressRows || [])) {
    masteredWorkNames.add(row.work_name.toLowerCase());
  }

  // Step 6: Build progress rows
  const byName = new Map();
  for (const [workId, count] of workPhotoCounts) {
    const workName = workIdToName.get(workId);
    if (!workName) continue;
    let status;
    if (masteredWorkNames.has(workName.toLowerCase())) status = 'mastered';
    else if (count >= 2) status = 'practicing';
    else status = 'presented';
    byName.set(workName, { work_name: workName, status, photo_count: count });
  }

  // Step 7: Pick top 4
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

  return { top4: result, allWorks: all };
}

// --- Sonnet Generation ---
const REPORT_TOOL = {
  name: 'write_language_semester_report',
  description: 'Write the three narrative sections for a child\'s semester report. Written TO the child in second person ("you", "your").',
  input_schema: {
    type: 'object',
    properties: {
      para_opening: {
        type: 'string',
        description: 'Greeting: "Dear [Name]," + 1-2 warm sentences of pride. HARD LIMIT: 25-30 words maximum. Be concise.',
      },
      para_circle: {
        type: 'string',
        description: 'Three accomplishments, each on its own line separated by \\n. Point 1: circle time / social growth (1-2 sentences). Point 2: a SPECIFIC work from the progress list — name it EXACTLY as written, do NOT repeat the name twice (1-2 sentences). Point 3: character strength or another achievement (1-2 sentences). HARD LIMIT: 60-70 words total. Every sentence must be COMPLETE — never end mid-thought. Use ONLY works from the provided list.',
      },
      para_english: {
        type: 'string',
        description: 'Warm closing: 1-2 complete sentences, personal and encouraging. HARD LIMIT: 20-25 words. No work names. Do NOT start with "Dear".',
      },
    },
    required: ['para_opening', 'para_circle', 'para_english'],
  },
};

async function generateReportWithRetry(childName, progress, isGraduating, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateReport(childName, progress, isGraduating);
    } catch (err) {
      console.error(`  Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      const delay = attempt * 3000;
      console.log(`  Retrying in ${delay/1000}s...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function generateReport(childName, progress, isGraduating) {
  const workNames = progress.map(p => p.work_name);
  const workSummary = progress
    .map(p => `- ${p.work_name} [${statusCode(p.status)}] (${p.photo_count} photos)`)
    .join('\n');

  const workList = workNames.length > 0
    ? `ALLOWED work names (copy EXACTLY — do NOT invent or paraphrase):\n${workNames.map(w => `  • ${w}`).join('\n')}`
    : 'No recorded Language works — speak about their curiosity and early engagement.';

  const closingGuidance = isGraduating
    ? 'This child is GRADUATING to K class. The closing should wish them good luck on their big adventure.'
    : 'This child is RETURNING next semester. The closing should express excitement about seeing them again.';

  const systemPrompt = `You are a Montessori teacher writing an end-of-semester Language report as a personal letter TO ${childName}. Parents read this to their child.

VOICE: Warm, proud, simple. A beloved teacher looking a child in the eye. No jargon.

${workList}

${closingGuidance}

RULES:
- Always "you" and "your" — never third person
- Separate para_circle points with \\n (two characters)
- No line breaks in para_opening or para_english
- No bullets, markdown, emojis, or asterisks
- Do NOT name any works in para_english
- Do NOT start para_english with "Dear"
- NEVER repeat a work name twice in the same sentence
- NEVER invent work names — use ONLY the exact names from the ALLOWED list above
- Write each work name EXACTLY as it appears in the list, ONCE per mention. The
  parenthetical clarification is part of the name itself — DO NOT add it again
  separately afterwards. CORRECT: "Pink Series (CVC Words) showed how bravely…".
  WRONG: "Pink Series (CVC Words) (CVC Words) showed…"
- GRAMMAR MUST BE PERFECT. Common pitfalls to avoid:
  • After "helped you", use the bare infinitive: "helped you LEARN" not
    "helped you learned"
  • After "watched you", use bare infinitive or -ing: "watched you GROW" or
    "watched you GROWING"
  • Subject-verb agreement: a singular work/skill takes a singular verb
- Every sentence MUST be complete — never trail off or end mid-thought
- HARD WORD LIMITS: opening ~25-30 words, circle ~60-70 words, closing ~20-25 words
- Total body (opening + circle) MUST stay under 110 words
- Write beautifully — every sentence worth framing`;

  const closingHint = isGraduating
    ? 'Graduating to K class — wish good luck.'
    : 'Returning next semester — express excitement about next year.';

  const userMessage = `Child: ${childName}

Language progress:
${workSummary || '(no recorded works)'}

${closingHint}

Write the report letter.`;

  const response = await anthropic.messages.create({
    model: MODEL,
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

  const raw = block.input;
  const scrubbed = postProcess(raw, childName, workNames);

  // Final grammar polish (Haiku) — best-effort, never throws
  try {
    const polished = await polishGrammar(scrubbed, childName, workNames);
    // Re-run de-dup on the polished output (extra belt-and-braces — Haiku
    // shouldn't reintroduce duplicates but if it does we catch them)
    return postProcess(polished, childName, workNames);
  } catch (err) {
    console.log(`  ⚠️  Polish pass failed (${err.message}) — using unpolished`);
    return scrubbed;
  }
}

// --- PPTX Template Fill ---
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
      xml = xml.replace(nameTok, '—').replace(statusTok, '—');
    }
  }

  zip.file(slidePath, xml);
  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// --- Main ---
async function main() {
  console.log('=== Whale Class Term Reports — Language Semester ===\n');
  console.log(`Period: Feb 1 – Apr 30, 2026`);
  console.log(`Model: ${MODEL}\n`);

  // Step 1: Load all children
  const children = await loadAllChildren();
  console.log(`Found ${children.length} children in Whale Class:\n`);
  for (const c of children) {
    const grad = GRADUATING_NAMES.has(c.name.toLowerCase().replace(/\s+/g, ''));
    console.log(`  ${grad ? '🎓' : '📚'} ${c.name} ${grad ? '(graduating)' : '(returning)'}`);
  }
  console.log('');

  // Step 2: Load template
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'language-semester-report.pptx');
  const templateBuf = await readFile(templatePath);
  console.log('Template loaded.\n');

  // Step 3: Create output directory (v8 — grammar-polished pass)
  const outDir = path.join(process.cwd(), 'term-reports-v8');
  await mkdir(outDir, { recursive: true });

  // Step 4: Generate reports
  const results = [];
  const errors = [];
  const bundle = new JSZip();

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isGraduating = GRADUATING_NAMES.has(child.name.toLowerCase().replace(/\s+/g, ''));
    console.log(`[${i + 1}/${children.length}] ${child.name} (${isGraduating ? 'graduating' : 'returning'})...`);

    const safeName = child.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fname = `${safeName}_Language_Term_Report.pptx`;
    const filePath = path.join(outDir, fname);

    // Skip if already generated (resume from crash)
    try {
      await access(filePath, constants.F_OK);
      console.log(`  ⏭️  Already exists, skipping.\n`);
      // Still need data for summary — load but don't regenerate
      const { top4, allWorks } = await loadLanguageProgress(child.id);
      results.push({
        name: child.name,
        graduating: isGraduating,
        works: top4.map(w => ({ name: w.work_name, status: statusCode(w.status), photos: w.photo_count })),
        allWorksCount: allWorks.length,
        report: { para_opening: '(skipped — already generated)', para_circle: '', para_english: '' },
      });
      bundle.file(fname, await readFile(filePath));
      continue;
    } catch { /* file doesn't exist, generate it */ }

    try {
      // Load progress
      const { top4, allWorks } = await loadLanguageProgress(child.id);
      console.log(`  Language works with photos: ${allWorks.length} total, top 4: ${top4.map(w => `${w.work_name} [${statusCode(w.status)}]`).join(', ') || '(none)'}`);

      // Generate narrative (with retry)
      const report = await generateReportWithRetry(child.name, allWorks, isGraduating);
      console.log(`  Opening: "${report.para_opening.substring(0, 60)}..."`);
      console.log(`  Closing: "${report.para_english.substring(0, 60)}..."`);

      // Fill PPTX
      const filled = await fillTemplate(templateBuf, report, top4);

      // Save individual file
      await writeFile(filePath, filled);
      bundle.file(fname, filled);

      results.push({
        name: child.name,
        graduating: isGraduating,
        works: top4.map(w => ({ name: w.work_name, status: statusCode(w.status), photos: w.photo_count })),
        allWorksCount: allWorks.length,
        report,
      });

      console.log(`  ✅ Saved ${fname}\n`);
    } catch (err) {
      console.error(`  ❌ FAILED: ${err.message}\n`);
      errors.push({ name: child.name, error: err.message });
    }

    // Small delay between API calls
    if (i < children.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // Step 5: Save ZIP bundle
  const zipBuf = await bundle.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const zipPath = path.join(outDir, 'Whale_Class_Language_Term_Reports.zip');
  await writeFile(zipPath, zipBuf);

  // Step 6: Save summary JSON for review
  const summaryPath = path.join(outDir, 'report_summary.json');
  await writeFile(summaryPath, JSON.stringify({ results, errors }, null, 2));

  console.log('\n=== COMPLETE ===');
  console.log(`Generated: ${results.length}/${children.length} reports`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Output: ${outDir}/`);
  console.log(`ZIP: ${zipPath}`);
  if (errors.length > 0) {
    console.log('\nFailed:');
    for (const e of errors) console.log(`  - ${e.name}: ${e.error}`);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
