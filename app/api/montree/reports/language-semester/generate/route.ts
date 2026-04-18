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
// Sonnet writes the three narrative paragraphs + picks up to 4 spotlight works with
// P/Pr/MD status codes. All XML edits are plain string replaces on ppt/slides/slide1.xml
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
  works: Array<{ name: string; status: 'P' | 'Pr' | 'MD' }>;
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

// --- Sonnet --------------------------------------------------------------

const REPORT_TOOL = {
  name: 'write_language_semester_report',
  description:
    'Write the three narrative paragraphs and select up to 4 spotlight Language works for this child\'s official semester report.',
  input_schema: {
    type: 'object' as const,
    properties: {
      para_opening: {
        type: 'string',
        description:
          'Opening paragraph addressed to the parents. Start with "Dear [Child Name],". 3-5 sentences. Warm, specific, Montessori-literate. Celebrates growth this semester. No bullet points, no line breaks inside the paragraph. End with a sentence including the child\'s name like "...we are so proud of you [Name].".',
      },
      para_circle: {
        type: 'string',
        description:
          'Paragraph describing the child\'s participation and growth during circle time / group time this semester. 3-5 sentences. Reference listening, turn-taking, songs, stories, and engagement with the community. No bullet points. Single paragraph.',
      },
      para_english: {
        type: 'string',
        description:
          'Paragraph about the child\'s progress in the English / Language section of the classroom. 4-6 sentences. Reference their journey through Language works — listening games, sandpaper letters, movable alphabet, reading, writing — based on the actual works provided. Process-focused. Single paragraph, no bullet points.',
      },
      works: {
        type: 'array',
        description:
          'Up to 4 spotlight Language works that best represent this child\'s semester. Order from most advanced/representative first. Each has a display name (plain English, no internal codes) and a status code: MD (Mastered), Pr (Practicing), or P (Presented).',
        minItems: 1,
        maxItems: 4,
        items: {
          type: 'object' as const,
          properties: {
            name: { type: 'string', description: 'Work name, e.g. "Sandpaper Letters" or "Moveable Alphabet".' },
            status: {
              type: 'string',
              enum: ['P', 'Pr', 'MD'],
              description: 'P = Presented, Pr = Practicing, MD = Mastered.',
            },
          },
          required: ['name', 'status'],
        },
      },
    },
    required: ['para_opening', 'para_circle', 'para_english', 'works'],
  },
};

async function generateReport(childName: string, progress: ProgressRow[]): Promise<SonnetReport> {
  if (!AI_ENABLED || !anthropic) {
    throw new Error('AI not configured (ANTHROPIC_API_KEY missing)');
  }

  const workSummary = progress
    .map((p) => `- ${p.work_name} [${statusCode(p.status)}]`)
    .join('\n');

  const systemPrompt = `You are a Montessori-trained lead teacher writing the official end-of-semester Language report for a child.

Voice: warm, specific, Montessori-literate. Written to the child's parents. No jargon without explanation. No hype. No emojis. No bullet points or markdown — plain paragraph prose only.

You will receive the child's name and a list of Language works with their current status (P=Presented, Pr=Practicing, MD=Mastered). Use this as ground truth — do not invent works or skills the child has not touched.

Output three narrative paragraphs and up to 4 spotlight works via the write_language_semester_report tool.`;

  const userMessage = `Child: ${childName}

Language work progress this semester:
${workSummary || '(no recorded Language work yet — speak to early engagement and beginnings)'}

Please write the semester report.`;

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
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

// --- template fill ---------------------------------------------------------

async function fillTemplate(templateBuf: Buffer, report: SonnetReport): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBuf);
  const slidePath = 'ppt/slides/slide1.xml';
  const slideFile = zip.file(slidePath);
  if (!slideFile) throw new Error('Template missing slide1.xml');

  let xml = await slideFile.async('string');

  // Narrative paragraphs
  xml = xml
    .replace('{{PARA_OPENING}}', xmlEscape(report.para_opening))
    .replace('{{PARA_CIRCLE}}', xmlEscape(report.para_circle))
    .replace('{{PARA_ENGLISH}}', xmlEscape(report.para_english));

  // Works table — fill up to 4 slots, blank out the rest
  for (let i = 0; i < 4; i++) {
    const w = report.works[i];
    const nameTok = `{{WORK_${i + 1}_NAME}}`;
    const statusTok = `{{WORK_${i + 1}_STATUS}}`;
    if (w) {
      xml = xml.replace(nameTok, xmlEscape(w.name)).replace(statusTok, xmlEscape(w.status));
    } else {
      xml = xml.replace(nameTok, '').replace(statusTok, '');
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

  let body: { child_ids?: unknown };
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
      const report = await generateReport(child.name, progress);
      const filled = await fillTemplate(templateBuf, report);
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
