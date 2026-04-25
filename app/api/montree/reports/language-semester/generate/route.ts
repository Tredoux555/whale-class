// app/api/montree/reports/language-semester/generate/route.ts
//
// Fills the official Language semester report PPTX template for one or more
// children and returns a zip bundle (or a single .pptx for one child).
//
// ARCHITECTURE (Session 38 rewrite — "different angle"):
//   The template has TWO text areas:
//     1. Narrative shape (id=12): {{PARA_OPENING}} + {{PARA_CIRCLE}}
//        — ends at y=8.1in, ABOVE the decorative clouds
//     2. Closing shape (id=99): {{PARA_ENGLISH}}
//        — positioned ON the clouds with white italic text, z-order on top
//
//   Sonnet generates freely. Post-processing enforces fit:
//     - Body text (opening + circle) hard-trimmed to ≤125 words
//     - Closing hard-trimmed to ≤35 words
//     - Any work name reference not in the allowed list is scrubbed
//     - No reliance on Sonnet hitting exact word count targets
//
// Works table: {{WORK_1_NAME}}..{{WORK_4_NAME}}, {{WORK_1_STATUS}}..{{WORK_4_STATUS}}

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { anthropic, AI_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';
import { logApiUsage, checkAiBudget } from '@/lib/montree/api-usage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// --- constants -------------------------------------------------------------

/** Max words for body text (opening + circle) — fits 12 lines at 14pt/26.6pt */
const MAX_BODY_WORDS = 125;
/** Max words for closing — fits the cloud overlay text box */
const MAX_CLOSING_WORDS = 35;

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

/** Convert newlines to PPTX line breaks. Handles both real \n and literal \\n
 *  from Sonnet tool_use. MUST run xmlEscape first on each segment. */
function textWithBreaks(raw: string): string {
  const escaped = xmlEscape(raw);
  // Match formatting from narrative shape: Calibri 14pt, black
  const BR =
    '</a:t></a:r><a:br/><a:r>' +
    '<a:rPr kumimoji="1" lang="en-US" altLang="zh-CN" sz="1400" dirty="0">' +
    '<a:solidFill><a:schemeClr val="tx1"/></a:solidFill></a:rPr><a:t>';
  return escaped
    .replace(/\\n/g, BR)   // literal backslash-n
    .replace(/\n/g, BR);   // actual newline
}

function countWords(s: string): number {
  return s.replace(/\\n/g, ' ').replace(/\n/g, ' ').split(/\s+/).filter(Boolean).length;
}

/** Clean all line break variants to plain space. */
function cleanText(s: string): string {
  return s.replace(/\\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

// --- Sonnet ----------------------------------------------------------------

const REPORT_TOOL = {
  name: 'write_language_semester_report',
  description:
    'Write the three narrative sections for a child\'s semester report. Written TO the child in second person ("you", "your").',
  input_schema: {
    type: 'object' as const,
    properties: {
      para_opening: {
        type: 'string',
        description:
          'Greeting: "Dear [Name]," + 2-3 warm sentences of pride. ~30-40 words.',
      },
      para_circle: {
        type: 'string',
        description:
          'Three accomplishments, each on its own line separated by \\n. Point 1: circle time / social growth. Point 2: a SPECIFIC work from the progress list — name it EXACTLY. Point 3: character strength or another achievement. Each point 2-3 sentences. ~75-90 words total. Use ONLY works from the provided list.',
      },
      para_english: {
        type: 'string',
        description:
          'Warm closing: 2 sentences, personal and encouraging. ~25-30 words. No work names.',
      },
    },
    required: ['para_opening', 'para_circle', 'para_english'],
  },
};

function buildSystemPrompt(childName: string, workNames: string[], isGraduating: boolean): string {
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

async function callSonnet(systemPrompt: string, userMessage: string, schoolId?: string): Promise<SonnetReport> {
  if (!anthropic) throw new Error('AI not configured');

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    tools: [REPORT_TOOL],
    tool_choice: { type: 'tool', name: 'write_language_semester_report' },
    messages: [{ role: 'user', content: userMessage }],
  });

  // Log token usage (fire-and-forget)
  if (schoolId && response.usage) {
    logApiUsage({
      schoolId,
      endpoint: '/api/montree/reports/language-semester/generate',
      model: AI_MODEL,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }

  const block = response.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('Sonnet did not return tool_use output');
  }
  return block.input as SonnetReport;
}

// --- POST-PROCESSING (the "different angle") --------------------------------

/** Trim text to at most maxWords by removing sentences from the end. */
function trimToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  // Walk backwards to find the last sentence boundary within limit
  const joined = words.slice(0, maxWords).join(' ');
  const lastPeriod = Math.max(joined.lastIndexOf('. '), joined.lastIndexOf('! '), joined.lastIndexOf('? '));
  if (lastPeriod > joined.length * 0.5) {
    return joined.slice(0, lastPeriod + 1);
  }
  // No good sentence boundary — just add ellipsis-free period
  const trimmed = joined.replace(/[,;:\s]+$/, '');
  return trimmed.endsWith('.') ? trimmed : trimmed + '.';
}

/** Remove any capitalized multi-word phrases that aren't in the allowed work list.
 *  Replaces them with a generic reference so the sentence stays readable. */
function scrubHallucinatedWorks(text: string, allowedWorks: string[]): string {
  if (allowedWorks.length === 0) return text;
  const lowerAllowed = new Set(allowedWorks.map(w => w.toLowerCase()));

  return text.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, (phrase) => {
    // Skip common English phrases that aren't work names
    if (/^(Dear|Keep|We|You|Next|This|That|Your|Circle|Time|Language|English|Pre|Kindergarten|Good|Big|Well|How|What|Thank|Every)/.test(phrase)) {
      return phrase;
    }
    // If it's in the allowed list (case-insensitive), keep it
    if (lowerAllowed.has(phrase.toLowerCase())) return phrase;
    // Fuzzy: check if it's a substring of an allowed work or vice versa
    for (const w of allowedWorks) {
      if (w.toLowerCase().includes(phrase.toLowerCase()) ||
          phrase.toLowerCase().includes(w.toLowerCase())) {
        return w; // Replace with the EXACT allowed name
      }
    }
    // Not a real work — replace with generic phrase
    return 'your work';
  });
}

/** Full post-processing pipeline. Enforces fit regardless of what Sonnet produced. */
function postProcess(report: SonnetReport, childName: string, allowedWorks: string[]): SonnetReport {
  // 1. Clean line breaks from opening and closing
  let opening = cleanText(report.para_opening);
  let closing = cleanText(report.para_english);

  // 2. Ensure opening starts with "Dear"
  if (!opening.startsWith('Dear')) {
    opening = `Dear ${childName}, ${opening}`;
  }

  // 3. Scrub hallucinated work names from all sections
  opening = scrubHallucinatedWorks(opening, allowedWorks);
  // For para_circle, process each point separately (preserve \\n separators)
  let circle = report.para_circle;
  const circlePoints = circle.split(/\\n|\n/).map(p => p.trim()).filter(Boolean);
  const scrubbedPoints = circlePoints.map(p => scrubHallucinatedWorks(p, allowedWorks));
  circle = scrubbedPoints.join('\\n');
  closing = scrubHallucinatedWorks(closing, allowedWorks);

  // 4. Trim body (opening + circle) to fit the 12-line visible area
  const openingWords = countWords(opening);
  const circleWords = countWords(circle);
  const bodyWords = openingWords + circleWords;

  if (bodyWords > MAX_BODY_WORDS) {
    // Trim sentences from the LAST point of para_circle first
    const overBy = bodyWords - MAX_BODY_WORDS;
    if (scrubbedPoints.length >= 2) {
      const lastPoint = scrubbedPoints[scrubbedPoints.length - 1];
      const lastWords = countWords(lastPoint);
      const targetLastWords = Math.max(10, lastWords - overBy);
      scrubbedPoints[scrubbedPoints.length - 1] = trimToWords(lastPoint, targetLastWords);
      circle = scrubbedPoints.join('\\n');

      // If still over, trim the second-to-last point too
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

  // 5. Trim closing to fit the cloud overlay box
  closing = trimToWords(closing, MAX_CLOSING_WORDS);

  console.log(`[LanguageSemester] Post-process: body=${countWords(opening) + countWords(circle)}w, closing=${countWords(closing)}w`);

  return { para_opening: opening, para_circle: circle, para_english: closing };
}

// --- generate (simple: call Sonnet once, post-process) ---------------------

async function generateReport(childName: string, progress: ProgressRow[], isGraduating: boolean, schoolId?: string): Promise<SonnetReport> {
  if (!AI_ENABLED || !anthropic) {
    throw new Error('AI not configured (ANTHROPIC_API_KEY missing)');
  }

  const workNames = progress.map(p => p.work_name);
  const workSummary = progress
    .map((p) => `- ${p.work_name} [${statusCode(p.status)}]`)
    .join('\n');

  const systemPrompt = buildSystemPrompt(childName, workNames, isGraduating);

  const closingHint = isGraduating
    ? 'Graduating to K class — wish good luck.'
    : 'Returning next semester — express excitement about next year.';

  const userMessage = `Child: ${childName}

Language progress:
${workSummary || '(no recorded works)'}

${closingHint}

Write the report letter.`;

  const raw = await callSonnet(systemPrompt, userMessage, schoolId);
  // Post-processing enforces all constraints — no retry needed
  return postProcess(raw, childName, workNames);
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
  classroomId: string,
  months: number
): Promise<ProgressRow[]> {
  // SOURCE: confirmed photos (montree_media) — NOT montree_child_progress.
  // montree_child_progress includes works seeded by the replan pipeline
  // (planned focus works the child hasn't touched yet). Parents need to see
  // ONLY works with actual photo evidence — "look, here's the picture."

  // Step 1: Resolve Language area + work IDs for this classroom
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

  if (!langWorks || langWorks.length === 0) return [];

  const workIdToName = new Map<string, string>();
  for (const w of langWorks as Array<{ id: string; name: string }>) {
    workIdToName.set(w.id, w.name);
  }
  const langWorkIds = Array.from(workIdToName.keys());

  // Step 2: Get confirmed photos for this child with Language work_ids.
  // Includes both direct photos (child_id on montree_media) and group
  // photos (via montree_media_children junction table).
  // Only photos within the requested time window (months) are included.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffIso = cutoff.toISOString();

  const { data: directPhotos } = await supabase
    .from('montree_media')
    .select('work_id, captured_at')
    .eq('child_id', childId)
    .in('work_id', langWorkIds)
    .gte('captured_at', cutoffIso)
    .or('identification_status.is.null,identification_status.neq.pending_review')
    .not('work_id', 'is', null);

  const { data: groupLinks } = await supabase
    .from('montree_media_children')
    .select('media_id')
    .eq('child_id', childId);

  let groupPhotos: Array<{ work_id: string; captured_at: string }> = [];
  if (groupLinks && groupLinks.length > 0) {
    const mediaIds = (groupLinks as Array<{ media_id: string }>).map(l => l.media_id);
    const { data: gPhotos } = await supabase
      .from('montree_media')
      .select('work_id, captured_at')
      .in('id', mediaIds)
      .in('work_id', langWorkIds)
      .gte('captured_at', cutoffIso)
      .or('identification_status.is.null,identification_status.neq.pending_review')
      .not('work_id', 'is', null);
    groupPhotos = (gPhotos || []) as Array<{ work_id: string; captured_at: string }>;
  }

  // Step 3: Count photos per work → derive status from photo count
  const allPhotos = [
    ...((directPhotos || []) as Array<{ work_id: string; captured_at: string }>),
    ...groupPhotos,
  ];

  const workPhotoCounts = new Map<string, number>();
  for (const p of allPhotos) {
    if (!p.work_id) continue;
    workPhotoCounts.set(p.work_id, (workPhotoCounts.get(p.work_id) || 0) + 1);
  }

  // Convert to ProgressRow with photo-count-based status:
  //   1 photo = P (Presented), 2-3 = Pr (Practicing), 4+ = MD (Mastered)
  const byName = new Map<string, ProgressRow>();
  for (const [workId, count] of workPhotoCounts) {
    const workName = workIdToName.get(workId);
    if (!workName) continue;
    let status: string;
    if (count >= 4) status = 'mastered';
    else if (count >= 2) status = 'practicing';
    else status = 'presented';
    byName.set(workName, { work_name: workName, status });
  }

  // Step 4: Pick top 4 with diverse status mix
  const all = Array.from(byName.values());
  // Sort by status rank descending, then alphabetically for stability
  const rank: Record<string, number> = { presented: 1, practicing: 2, mastered: 3 };
  all.sort((a, b) => (rank[b.status] || 0) - (rank[a.status] || 0) || a.work_name.localeCompare(b.work_name));

  const mastered = all.filter(w => w.status === 'mastered');
  const practicing = all.filter(w => w.status === 'practicing');
  const presented = all.filter(w => w.status === 'presented');

  const result: ProgressRow[] = [];
  // Take up to 2 mastered, then fill with practicing, then presented
  for (const w of mastered) { if (result.length < 2) result.push(w); }
  for (const w of practicing) { if (result.length < 4) result.push(w); }
  for (const w of presented) { if (result.length < 4) result.push(w); }
  // If still under 4, fill remaining from mastered
  for (const w of mastered) { if (result.length < 4 && !result.includes(w)) result.push(w); }

  return result;
}

// --- route ---------------------------------------------------------------

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { child_ids?: unknown; graduating_ids?: unknown; format?: unknown; months?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // format='text' returns plain JSON (works + narrative) for copy-paste
  // format='pptx' (default) returns the filled PPTX template
  const textMode = body.format === 'text';

  // months: how far back to look for photo evidence (1, 3, 6, or 12 months). Default 6.
  const months = typeof body.months === 'number' && [1, 3, 6, 12].includes(body.months as number)
    ? (body.months as number)
    : 6;

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

  // Check AI budget before generating reports
  const budgetStatus = await checkAiBudget(auth.schoolId);
  if (budgetStatus.blocked) {
    return NextResponse.json(
      { error: `AI budget exceeded (${budgetStatus.percentage}% of $${budgetStatus.budget})` },
      { status: 429 }
    );
  }

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

  // In text mode we skip template loading entirely
  let templateBuf: Buffer | null = null;
  if (!textMode) {
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'language-semester-report.pptx');
    try {
      templateBuf = await readFile(templatePath);
    } catch (err) {
      console.error('[LanguageSemester] Template read failed:', err);
      return NextResponse.json({ error: 'Template not found on server' }, { status: 500 });
    }
  }

  // Generate each child's report
  type TextResult = { child_id: string; name: string; progress: ProgressRow[]; report: SonnetReport };
  type PptxResult = { child_id: string; name: string; buf: Buffer };
  const textResults: TextResult[] = [];
  const pptxResults: PptxResult[] = [];
  const errors: Array<{ child_id: string; name: string; error: string }> = [];

  for (const child of children) {
    try {
      const progress = await loadLanguageProgress(supabase, child.id, child.classroom_id, months);
      const isGraduating = graduatingIds.has(child.id);
      const report = await generateReport(child.name, progress, isGraduating);
      if (textMode) {
        textResults.push({ child_id: child.id, name: child.name, progress, report });
      } else {
        const filled = await fillTemplate(templateBuf!, report, progress);
        pptxResults.push({ child_id: child.id, name: child.name, buf: filled });
      }
    } catch (err) {
      console.error(`[LanguageSemester] Failed for ${child.name}:`, err);
      errors.push({ child_id: child.id, name: child.name, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // ── TEXT MODE ── return clean JSON for copy-paste
  if (textMode) {
    if (textResults.length === 0) {
      return NextResponse.json({ error: 'All reports failed', errors }, { status: 500 });
    }
    return NextResponse.json({
      children: textResults.map(r => ({
        name: r.name,
        works: r.progress.slice(0, 4).map(p => ({
          name: p.work_name,
          status: statusCode(p.status),
        })),
        opening: r.report.para_opening,
        // Convert literal \n separators to real newlines for display
        circle: r.report.para_circle.replace(/\\n/g, '\n'),
        closing: r.report.para_english,
      })),
      errors,
    });
  }

  // ── PPTX MODE ── return binary file(s)
  if (pptxResults.length === 0) {
    return NextResponse.json({ error: 'All reports failed', errors }, { status: 500 });
  }

  // Single child → return the pptx directly
  if (pptxResults.length === 1) {
    const safeName = pptxResults[0].name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(new Uint8Array(pptxResults[0].buf), {
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
  for (const r of pptxResults) {
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
      'X-Report-Count': pptxResults.length.toString(),
      'X-Report-Errors': errors.length.toString(),
    },
  });
}
