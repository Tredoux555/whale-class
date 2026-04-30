// /api/montree/super-admin/i18n-sync/route.ts
//
// Detect + fix curriculum work-name translation drift across every locale
// for active classrooms. Designed for two callers:
//
//   1. Manual button in super-admin UI (POST with no body, or { mode: 'fix' })
//   2. Railway scheduled task (POST with header `x-cron-secret: <CRON_SECRET>`)
//
// Default behaviour (no body): dry-run report only. Pass `{ mode: 'fix' }` to
// actually translate. Pass `{ mode: 'fix', allClassrooms: true }` to include
// inactive / empty classrooms (rarely wanted — costs more).
//
// Security:
// - Requires either super-admin session (cookie) OR x-cron-secret header
//   matching the CRON_SECRET env var (so Railway scheduled tasks can call
//   without a session).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300; // up to 5 min for full backfill runs

const HAIKU = 'claude-haiku-4-5-20251001';
const BATCH = 25;

const LANGS: Record<string, { col: string; extra?: string[]; description: string }> = {
  zh: { col: 'name_chinese', extra: ['name_zh'], description: 'Simplified Chinese (AMI Montessori terminology)' },
  es: { col: 'name_es', description: 'Argentine Spanish (voseo, AMI: Vida Práctica/Sensorial/Matemáticas/Lenguaje/Cultural)' },
  de: { col: 'name_de', description: 'German (formal Sie, AMI: Praktisches Leben/Sinnesmaterial/Mathematik/Sprache/Kulturelles)' },
  fr: { col: 'name_fr', description: 'French (formal vous, AMI: Vie Pratique/Sensoriel/Mathématiques/Langage/Culture)' },
  pt: { col: 'name_pt', description: 'Brazilian Portuguese (AMI: Vida Prática/Sensorial/Matemática/Linguagem/Cultural)' },
  nl: { col: 'name_nl', description: 'Dutch (AMI: Praktisch Leven/Zintuiglijk/Wiskunde/Taal/Cultureel)' },
  it: { col: 'name_it', description: 'Italian (AMI: Vita Pratica/Sensoriale/Matematica/Linguaggio/Culturale)' },
  ja: { col: 'name_ja', description: 'Japanese (polite register, AMI: 日常生活/感覚/算数/言語/文化)' },
  ko: { col: 'name_ko', description: 'Korean (formal register, AMI: 일상생활/감각/수학/언어/문화)' },
  uk: { col: 'name_uk', description: 'Ukrainian (Cyrillic only, ZERO Latin chars; AMI: Практичне Життя/Сенсорний/Математика/Мова/Культура)' },
  ru: { col: 'name_ru', description: 'Russian (Cyrillic only, ZERO Latin chars; AMI: Практическая Жизнь/Сенсорика/Математика/Язык/Культура)' },
};

const KNOWN_LOANWORDS = new Set([
  'bingo', 'bingo - ing', 'collage', 'origami', 'yoga', 'sudoku', 'tangram', 'mandala',
]);

function isLoanword(name: string) {
  return KNOWN_LOANWORDS.has(name.trim().toLowerCase());
}

function normalizeCyrillic(s: string): string {
  return s
    .replace(/(?<=[Ѐ-ӿ])i/g, 'і')
    .replace(/i(?=[Ѐ-ӿ])/g, 'і')
    .replace(/(?<=[Ѐ-ӿ])I/g, 'І')
    .replace(/I(?=[Ѐ-ӿ])/g, 'І');
}

interface TranslateRow { id: string; name: string }

async function translateBatch(
  rows: TranslateRow[],
  lang: string,
  cfg: typeof LANGS[string],
  anthropic: Anthropic,
): Promise<Map<string, string>> {
  const properties: Record<string, { type: string; description: string }> = {};
  for (const r of rows) {
    properties[`work_${r.id}`] = {
      type: 'string',
      description: `${cfg.description} translation of: "${r.name}"`,
    };
  }
  const isCyrillic = lang === 'uk' || lang === 'ru';
  const tool = {
    name: 'submit_translations',
    description: `Submit translated Montessori work names in ${cfg.description}.`,
    input_schema: {
      type: 'object' as const,
      properties,
      required: rows.map(r => `work_${r.id}`),
    },
  };
  const system = `You are a professional Montessori curriculum translator. Translate work names into ${cfg.description}.

Rules:
- Keep names short (2-6 words typical), like a curriculum label.
- Use established AMI Montessori terminology in the target language.
- Numbers stay numeric.
${isCyrillic ? '- ABSOLUTE RULE: ZERO Latin alphabet characters in output. Transliterate any English loanword to Cyrillic.\n' : ''}- Submit translations by calling submit_translations.`;

  const userMsg = `Translate to ${lang.toUpperCase()}, then call submit_translations:\n\n` +
    rows.map(r => `work_${r.id}: ${r.name}`).join('\n');

  const resp = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 8192,
    system,
    tools: [tool as unknown as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool', name: 'submit_translations' },
    messages: [{ role: 'user', content: userMsg }],
  });
  const tu = resp.content.find(c => c.type === 'tool_use');
  if (!tu || tu.type !== 'tool_use') throw new Error('No tool_use in response');
  const out = new Map<string, string>();
  const input = tu.input as Record<string, unknown>;
  for (const r of rows) {
    const t = input[`work_${r.id}`];
    if (typeof t === 'string' && t.trim().length > 0) out.set(r.id, t.trim());
  }
  return out;
}

interface ClassroomSummary {
  classroom: string;
  name: string | null;
  totalGaps: number;
  fixed: number;
  byLang: Record<string, { gaps: number; fixed: number; error?: string }>;
}

async function processClassroom(
  classroomId: string,
  classroomName: string | null,
  dryRun: boolean,
  anthropic: Anthropic,
): Promise<ClassroomSummary> {
  const supabase = getSupabase();
  const summary: ClassroomSummary = {
    classroom: classroomId,
    name: classroomName,
    totalGaps: 0,
    fixed: 0,
    byLang: {},
  };

  for (const [lang, cfg] of Object.entries(LANGS)) {
    const { data: rows, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`id, name, ${cfg.col}`)
      .eq('classroom_id', classroomId);
    if (error) {
      summary.byLang[lang] = { gaps: 0, fixed: 0, error: error.message };
      continue;
    }
    type Row = { id: string; name: string; [k: string]: string | null };
    const broken = (rows as unknown as Row[]).filter(row => {
      const v = row[cfg.col];
      const empty = !v || (typeof v === 'string' && v.trim() === '');
      const sameAsEn = !empty && typeof v === 'string' && v.trim() === row.name.trim();
      if (sameAsEn && isLoanword(row.name)) return false;
      return empty || sameAsEn;
    });
    summary.byLang[lang] = { gaps: broken.length, fixed: 0 };
    summary.totalGaps += broken.length;
    if (broken.length === 0 || dryRun) continue;

    const translations = new Map<string, string>();
    for (let i = 0; i < broken.length; i += BATCH) {
      const slice = broken.slice(i, i + BATCH).map(r => ({ id: r.id, name: r.name }));
      let attempt = 0;
      while (attempt < 3) {
        try {
          const result = await translateBatch(slice, lang, cfg, anthropic);
          for (const [id, t] of result) translations.set(id, t);
          break;
        } catch (e) {
          attempt++;
          if (attempt >= 3) {
            summary.byLang[lang].error = e instanceof Error ? e.message.slice(0, 100) : String(e);
            break;
          }
          await new Promise(r => setTimeout(r, 2000 * attempt));
        }
      }
      await new Promise(r => setTimeout(r, 400));
    }
    let fixed = 0;
    for (const [id, raw] of translations) {
      const translation = (lang === 'uk' || lang === 'ru') ? normalizeCyrillic(raw) : raw;
      const body: Record<string, string> = { [cfg.col]: translation };
      if (cfg.extra) for (const c of cfg.extra) body[c] = translation;
      const { error: upErr } = await supabase
        .from('montree_classroom_curriculum_works')
        .update(body)
        .eq('id', id);
      if (!upErr) fixed++;
    }
    summary.byLang[lang].fixed = fixed;
    summary.fixed += fixed;
  }
  return summary;
}

interface I18nSyncRequest {
  mode?: 'check' | 'fix';
  allClassrooms?: boolean;
  classroomId?: string;
}

export async function POST(request: NextRequest) {
  // Auth: super-admin session OR cron secret header.
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedCronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && !!expectedCronSecret && cronSecret === expectedCronSecret;

  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }
  const anthropic = new Anthropic({ apiKey, timeout: 60_000 });

  let body: I18nSyncRequest = {};
  try { body = await request.json(); } catch { /* empty body = defaults */ }

  const dryRun = body.mode !== 'fix';
  const supabase = getSupabase();

  // Pick classrooms
  type Classroom = { id: string; name: string | null };
  let classrooms: Classroom[] = [];
  if (body.classroomId) {
    classrooms = [{ id: body.classroomId, name: null }];
  } else if (body.allClassrooms) {
    const { data } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .order('name');
    classrooms = (data as Classroom[]) || [];
  } else {
    // active + has-children
    const { data: active } = await supabase
      .from('montree_classrooms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    for (const c of (active as Classroom[]) || []) {
      const { data: kids } = await supabase
        .from('montree_children')
        .select('id')
        .eq('classroom_id', c.id)
        .limit(1);
      if (kids && kids.length > 0) classrooms.push(c);
    }
  }

  const t0 = Date.now();
  const results: ClassroomSummary[] = [];
  let totalGaps = 0, totalFixed = 0;
  for (const c of classrooms) {
    const r = await processClassroom(c.id, c.name, dryRun, anthropic);
    results.push(r);
    totalGaps += r.totalGaps;
    totalFixed += r.fixed;
  }

  return NextResponse.json({
    mode: dryRun ? 'check' : 'fix',
    elapsed_ms: Date.now() - t0,
    classrooms: classrooms.length,
    totalGaps,
    totalFixed,
    classroomsWithDrift: results.filter(r => r.totalGaps > 0).length,
    summary: results.filter(r => r.totalGaps > 0),
  });
}

// GET — quick read-only drift report (no Haiku, just counts)
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedCronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && !!expectedCronSecret && cronSecret === expectedCronSecret;
  if (!isCron) {
    const { valid } = await verifySuperAdminAuth(request.headers);
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: classrooms } = await supabase
    .from('montree_classrooms')
    .select('id, name, is_active');

  const langCounts: Record<string, { gaps: number; classrooms: number }> = {};
  for (const lang of Object.keys(LANGS)) langCounts[lang] = { gaps: 0, classrooms: 0 };
  let totalActive = 0;

  for (const c of (classrooms as Array<{ id: string; name: string; is_active: boolean }>) || []) {
    if (!c.is_active) continue;
    const { data: kids } = await supabase
      .from('montree_children')
      .select('id')
      .eq('classroom_id', c.id)
      .limit(1);
    if (!kids || kids.length === 0) continue;
    totalActive++;

    for (const [lang, cfg] of Object.entries(LANGS)) {
      const { data: rows } = await supabase
        .from('montree_classroom_curriculum_works')
        .select(`name, ${cfg.col}`)
        .eq('classroom_id', c.id);
      type Row = { name: string; [k: string]: string | null };
      const broken = ((rows as unknown as Row[]) || []).filter(row => {
        const v = row[cfg.col];
        const empty = !v || (typeof v === 'string' && v.trim() === '');
        const sameAsEn = !empty && typeof v === 'string' && v.trim() === row.name.trim();
        if (sameAsEn && isLoanword(row.name)) return false;
        return empty || sameAsEn;
      });
      if (broken.length > 0) {
        langCounts[lang].gaps += broken.length;
        langCounts[lang].classrooms++;
      }
    }
  }

  return NextResponse.json({
    activeClassroomsWithChildren: totalActive,
    drift: langCounts,
    totalGaps: Object.values(langCounts).reduce((a, b) => a + b.gaps, 0),
  });
}
