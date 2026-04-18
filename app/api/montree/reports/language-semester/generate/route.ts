// app/api/montree/reports/language-semester/generate/route.ts
//
// Fills the official Language semester report PPTX template for one or more children
// and returns a zip bundle (or a single .pptx if only one child is requested).
//
// Template: public/templates/language-semester-report.pptx
// Tokens:
//   {{PARA_OPENING}}, {{PARA_CIRCLE}}, {{PARA_ENGLISH}}
//   {{WORK_1_NAME}}..{{WORK_4_NAME}}, {{WORK_1_STATUS}}..{{WORK_4_STATUS}}
//
// Sonnet writes the three narrative sections (validated + retried if quality fails).
// Works table is filled from real child progress data (top 4 by status rank).
// All XML edits are plain string replaces on ppt/slides/slide1.xml
// (the template was pre-tokenized so every token sits in a single <a:r> run).

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Large classroom = many Sonnet calls + zip repacks

// --- types -----------------------------------------------------------------

type ChildRow = { id: string; name: string; classroom_id: string };
type ProgressRow = { work_name: string; status: string };

interface SonnetReport {
  para_opening: string;
  para_circle: string;
  para_english: string;
}

// --- helpers ---------------------------------------------------------------

function statusCode(status: string | null | undefined): 'P' | 'Pr' | 'MD' {
  const s = (status || '').toLowerCase();
  if (s === 'mastered') return 'MD';
  if (s === 'practicing') return 'Pr';
  return 'P';
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Convert newlines in Sonnet output to PPTX line breaks AFTER xmlEscape.
 *  Handles both actual newline chars AND literal \n two-char sequences
 *  (Sonnet tool_use sometimes outputs literal backslash-n). */
function textWithBreaks(raw: string): string {
  const escaped = xmlEscape(raw);
  const BR = '</a:t></a:r><a:br/><a:r><a:rPr lang="en-US" dirty="0"/><a:t>';
  return escaped
    .replace(/\\n/g, BR)   // literal backslash-n (2 chars) — Sonnet tool_use quirk
    .replace(/\n/g, BR);   // actual newline char
}

function countWords(s: string): number {
  return s.replace(/\\n/g, ' ').split(/\s+/).filter(Boolean).length;
}

/** Strip literal \n sequences for clean plaintext. */
function cleanText(s: string): string {
  return s.replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- Sonnet ---------------------------------------------------------------

const REPORT_TOOL = {
  name: 'write_language_semester_report',
  description:
    'Write the three narrative sections for this child\'s official semester report letter. Written directly TO the child in second person ("you", "your"). The works table is filled separately — you only write the prose.',
  input_schema: {
    type: 'object' as const,
    properties: {
      para_opening: {
        type: 'string',
        description:
          'Warm greeting and congratulations written TO the child. Start with "Dear [Child Name]," followed by 2-3 sentences of warm praise. Around 30-40 words total. Proud, celebratory, personal. Example tone: "Dear Amy, what a wonderful semester of learning you have had. You have grown in so many ways and you should feel very proud of all your hard work this year."',
      },
      para_circle: {
        type: 'string',
        description:
          'The heart of the letter. Three distinct accomplishments, each on its OWN LINE separated by the two characters backslash-n. Each accomplishment is 2-3 sentences (20-30 words each). Written TO the child using "you" and "your". Point 1: something about circle time, community, social growth, or classroom participation. Point 2: a SPECIFIC language work from their progress list — name it exactly and describe what the child achieved with it. Point 3: another specific achievement, a favourite moment, or a character strength you have noticed. Around 70-85 words total across all three points. IMPORTANT: use ONLY works from the provided progress list — do not invent or paraphrase work names.',
      },
      para_english: {
        type: 'string',
        description:
          'Warm closing written TO the child. 2-3 sentences. Personal and encouraging. Around 25-35 words. The closing sentiment depends on whether this child is graduating — this will be specified in the user message.',
      },
    },
    required: ['para_opening', 'para_circle', 'para_english'],
  },
};

function buildSystemPrompt(childName: string, workNames: string[], isGraduating: boolean): string {
  const workList = workNames.length > 0
    ? `The ONLY works you may reference by name are:\n${workNames.map(w => `  • ${w}`).join('\n')}\nDo NOT invent, paraphrase, or abbreviate any work name. If you mention a work, copy its name EXACTLY from this list. In the closing paragraph, do NOT mention any works or future curriculum — keep the closing about the child personally.`
    : 'This child has no recorded Language works yet — speak warmly about their early engagement, curiosity, and the beginnings of their language journey.';

  const closingGuidance = isGraduating
    ? `This child is GRADUATING to Kindergarten next semester. The closing (para_english) should warmly wish them good luck in K class — celebrate how ready they are for this next big adventure. Do NOT mention coming back next semester.`
    : `This child is RETURNING next semester. The closing (para_english) should express excitement about seeing them again — how much more you look forward to exploring together. Do NOT mention graduation or K class.`;

  return `You are a Montessori lead teacher writing the official end-of-semester Language progress report as a personal letter TO ${childName}. The parents will read it aloud to their child, so every word is addressed directly to the child in second person.

VOICE: Warm, proud, specific. Like a beloved teacher looking a child in the eye with genuine pride. Simple, beautiful language — a parent reads this to a 4-year-old. No jargon. No filler.

STRUCTURE:
1. para_opening — "Dear ${childName}," followed by 2-3 warm sentences. Celebrate this semester of growth.
2. para_circle — Three distinct highlights, each separated by backslash then n (two characters: \\n). Each point is 2-3 rich sentences about something specific this child did. At least one must name a specific work from their list and describe what they achieved with it.
3. para_english — Warm closing. ${closingGuidance}

SPACE CONSTRAINT: This prints on a PowerPoint slide. The text MUST fill the available white space. Target 135-155 words total across all three sections. Not fewer than 125, not more than 165. Aim for the middle of this range.

${workList}

QUALITY RULES:
- ALWAYS "you" and "your" — NEVER "he/she/they" or the child's name as subject after the greeting
- Each para_circle point MUST be a complete, distinct thought — not a run-on
- Separate para_circle points with backslash then n (two characters). No other line breaks anywhere.
- No bullets, no markdown, no emojis, no asterisks
- Do NOT reference any works or curriculum topics in para_english — the closing is about the child, not about works
- Write like a craftsperson — every sentence should be beautiful enough to frame

Output via the write_language_semester_report tool.`;
}

// --- validation -----------------------------------------------------------

interface ValidationResult {
  valid: boolean;
  issues: string[];
}

function validateReport(
  report: SonnetReport,
  childName: string,
  allowedWorks: string[],
): ValidationResult {
  const issues: string[] = [];

  // 1. Word count check
  const totalWords =
    countWords(report.para_opening) +
    countWords(report.para_circle) +
    countWords(report.para_english);
  if (totalWords < 110) issues.push(`Too short: ${totalWords} words (min 110)`);
  if (totalWords > 180) issues.push(`Too long: ${totalWords} words (max 180)`);

  // 2. Must start with "Dear"
  if (!report.para_opening.trim().startsWith('Dear')) {
    issues.push('para_opening must start with "Dear [Name],"');
  }

  // 3. Voice check — should not talk ABOUT the child in 3rd person
  const thirdPerson = new RegExp(
    `\\b${childName}\\s+(is|was|has|had|loves|loved|enjoys|enjoyed|shows|showed|brings|brought|demonstrates|demonstrated)\\b`,
    'i'
  );
  const allText = `${report.para_opening} ${report.para_circle} ${report.para_english}`;
  if (thirdPerson.test(allText)) {
    issues.push('Uses third person about the child — must be "you" throughout');
  }

  // 4. Check for formatting artifacts
  if (/\\n/g.test(report.para_opening) || /\n/.test(report.para_opening)) {
    issues.push('para_opening must not contain line breaks');
  }
  if (/\\n/g.test(report.para_english) || /\n/.test(report.para_english)) {
    issues.push('para_english must not contain line breaks');
  }

  // 5. Hallucination check — any quoted work names must be in allowed list
  if (allowedWorks.length > 0) {
    const lowerAllowed = new Set(allowedWorks.map(w => w.toLowerCase()));
    // Check for Montessori-sounding capitalized phrases that aren't in the list
    const capitalPhrases = allText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || [];
    for (const phrase of capitalPhrases) {
      // Skip common phrases that aren't work names
      if (/^(Dear|Keep|We|You|Next|This|Your|Circle|Language|English)/.test(phrase)) continue;
      if (!lowerAllowed.has(phrase.toLowerCase())) {
        // Check fuzzy — is it a substring of any allowed work?
        const isFuzzyMatch = allowedWorks.some(w =>
          w.toLowerCase().includes(phrase.toLowerCase()) ||
          phrase.toLowerCase().includes(w.toLowerCase())
        );
        if (!isFuzzyMatch) {
          issues.push(`Possible hallucinated work: "${phrase}" — not in progress list`);
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

// --- generate with validation + retry -------------------------------------

async function generateReport(childName: string, progress: ProgressRow[], isGraduating: boolean): Promise<SonnetReport> {
  if (!AI_ENABLED || !anthropic) {
    throw new Error('AI not configured (ANTHROPIC_API_KEY missing)');
  }

  const workNames = progress.map(p => p.work_name);
  const workSummary = progress
    .map((p) => `- ${p.work_name} [${statusCode(p.status)}]`)
    .join('\n');

  const systemPrompt = buildSystemPrompt(childName, workNames, isGraduating);

  const closingHint = isGraduating
    ? 'This child is graduating to K class — the closing should wish them good luck on their exciting new journey.'
    : 'This child is returning next semester — the closing should express how much you look forward to seeing them again.';

  const userMessage = `Child: ${childName}

Language work progress this semester:
${workSummary || '(no recorded Language work yet)'}

${closingHint}

Write the semester report letter to ${childName}. Remember: target 135-155 words total. Fill the space.`;

  // Attempt 1
  let report = await callSonnet(systemPrompt, userMessage);
  const v1 = validateReport(report, childName, workNames);

  if (!v1.valid) {
    console.warn(`[LanguageSemester] Validation failed for ${childName} (attempt 1):`, v1.issues);

    // Attempt 2 — retry with explicit correction instructions
    const retryUser = `${userMessage}

IMPORTANT CORRECTIONS from your previous attempt:
${v1.issues.map(i => `- ${i}`).join('\n')}

Please fix these issues and try again.`;

    report = await callSonnet(systemPrompt, retryUser);
    const v2 = validateReport(report, childName, workNames);
    if (!v2.valid) {
      console.warn(`[LanguageSemester] Validation still has issues for ${childName} (attempt 2):`, v2.issues);
      // Use it anyway but clean up what we can
      report = cleanupReport(report, childName);
    }
  }

  return report;
}

async function callSonnet(systemPrompt: string, userMessage: string): Promise<SonnetReport> {
  if (!anthropic) throw new Error('AI not configured');

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    tools: [REPORT_TOOL],
    tool_choice: { type: 'tool', name: 'write_language_semester_report' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = response.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('Sonnet did not return tool_use output');
  }
  return block.input as SonnetReport;
}

/** Last-resort cleanup for reports that still have issues after retry. */
function cleanupReport(report: SonnetReport, childName: string): SonnetReport {
  // Strip any accidental line breaks from opening/closing
  let opening = cleanText(report.para_opening);
  let closing = cleanText(report.para_english);

  // Ensure opening starts with Dear
  if (!opening.startsWith('Dear')) {
    opening = `Dear ${childName}, ${opening}`;
  }

  return {
    para_opening: opening,
    para_circle: report.para_circle, // keep breaks in circle
    para_english: closing,
  };
}

// --- template fill ---------------------------------------------------------

async function fillTemplate(
  templateBuf: Buffer,
  report: SonnetReport,
  progress: ProgressRow[],
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuf);
  const slidePath = 'ppt/slides/slide1.xml';
  const slideFile = zip.file(slidePath);
  if (!slideFile) throw new Error('Template missing slide1.xml');

  let xml = await slideFile.async('string');

  // Narrative paragraphs — PARA_CIRCLE uses textWithBreaks for the 3-point structure
  xml = xml
    .replace('{{PARA_OPENING}}', xmlEscape(report.para_opening))
    .replace('{{PARA_CIRCLE}}', textWithBreaks(report.para_circle))
    .replace('{{PARA_ENGLISH}}', xmlEscape(report.para_english));

  // Works table — fill from REAL progress data (top 4 by status rank).
  // If fewer than 4 works, pad remaining slots with em-dash so no box is blank.
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
      // No work for this slot — use dash so boxes aren't blank
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

// --- data --------------------------------------------------------------

async function loadLanguageProgress(
  supabase: ReturnType<typeof getSupabase>,
  childId: string,
  classroomId: string
): Promise<ProgressRow[]> {
  // Resolve Language area id for classroom
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
    .eq('area_id', (langArea as { id: string }).id);

  const langWorkIds = new Set<string>(((langWorks || []) as Array<{ id: string }>).map((w) => w.id));
  const langNames = new Set<string>(((langWorks || []) as Array<{ name: string }>).map((w) => w.name.toLowerCase()));

  const { data: progressRows } = await supabase
    .from('montree_child_progress')
    .select('work_name, area, status')
    .eq('child_id', childId);

  const rows = (progressRows || []) as Array<{
    work_name: string;
    area: string | null;
    status: string;
  }>;

  const filtered = rows.filter(
    (r) =>
      (r.area && r.area.toLowerCase() === 'language') ||
      langNames.has((r.work_name || '').toLowerCase())
  );

  // Dedupe by work_name, keep highest status
  const rank: Record<string, number> = { presented: 1, practicing: 2, mastered: 3 };
  const byName = new Map<string, ProgressRow>();
  for (const r of filtered) {
    const key = (r.work_name || '').trim();
    if (!key) continue;
    const prev = byName.get(key);
    if (!prev || (rank[r.status.toLowerCase()] || 0) > (rank[prev.status.toLowerCase()] || 0)) {
      byName.set(key, { work_name: key, status: r.status });
    }
  }
  return Array.from(byName.values()).sort((a, b) => {
    const ar = rank[a.status.toLowerCase()] || 0;
    const br = rank[b.status.toLowerCase()] || 0;
    return br - ar;
  });
}

// --- route ---------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { child_ids?: unknown; graduating_ids?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const childIds = Array.isArray(body.child_ids) ? (body.child_ids as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  if (childIds.length === 0) {
    return NextResponse.json({ error: 'child_ids array required' }, { status: 400 });
  }
  if (childIds.length > 30) {
    return NextResponse.json({ error: 'Too many children (max 30 per batch)' }, { status: 400 });
  }

  // graduating_ids from the UI toggles — child IDs marked as graduating to K class
  const graduatingIds = new Set<string>(
    Array.isArray(body.graduating_ids)
      ? (body.graduating_ids as unknown[]).filter((x): x is string => typeof x === 'string')
      : []
  );

  const supabase = getSupabase();

  // Load all children, verify ownership
  const { data: childRows } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id')
    .in('id', childIds);

  const children = (childRows || []) as ChildRow[];
  if (children.length === 0) {
    return NextResponse.json({ error: 'No valid children found' }, { status: 404 });
  }

  for (const c of children) {
    const access = await verifyChildBelongsToSchool(c.id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: `Forbidden: child ${c.id}` }, { status: 403 });
    }
  }

  // Load template once
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'language-semester-report.pptx');
  let templateBuf: Buffer;
  try {
    templateBuf = await readFile(templatePath);
  } catch (err) {
    console.error('[LanguageSemester] Template read failed:', err);
    return NextResponse.json({ error: 'Template not found on server' }, { status: 500 });
  }

  // Generate each
  const results: Array<{ child_id: string; name: string; buf: Buffer }> = [];
  const errors: Array<{ child_id: string; name: string; error: string }> = [];

  for (const child of children) {
    try {
      const progress = await loadLanguageProgress(supabase, child.id, child.classroom_id);
      const isGraduating = graduatingIds.has(child.id);
      const report = await generateReport(child.name, progress, isGraduating);
      const filled = await fillTemplate(templateBuf, report, progress);
      results.push({ child_id: child.id, name: child.name, buf: filled });
    } catch (err) {
      console.error(`[LanguageSemester] Failed for ${child.name}:`, err);
      errors.push({ child_id: child.id, name: child.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: 'All reports failed', errors }, { status: 500 });
  }

  // Single child → return the pptx directly
  if (results.length === 1) {
    const safeName = results[0].name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(new Uint8Array(results[0].buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${safeName}_Language_Semester_Report.pptx"`,
        'X-Report-Errors': errors.length.toString(),
      },
    });
  }

  // Multiple → zip bundle
  const bundle = new JSZip();
  const usedNames = new Set<string>();
  for (const r of results) {
    let base = r.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    let fname = `${base}_Language_Semester_Report.pptx`;
    let n = 2;
    while (usedNames.has(fname)) {
      fname = `${base}_${n}_Language_Semester_Report.pptx`;
      n++;
    }
    usedNames.add(fname);
    bundle.file(fname, r.buf);
  }
  if (errors.length > 0) {
    bundle.file(
      '_errors.txt',
      `Some reports failed to generate:\n\n${errors.map((e) => `- ${e.name} (${e.child_id}): ${e.error}`).join('\n')}\n`
    );
  }

  const zipBuf = await bundle.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(zipBuf), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="Language_Semester_Reports_${stamp}.zip"`,
      'X-Report-Count': results.length.toString(),
      'X-Report-Errors': errors.length.toString(),
    },
  });
}
