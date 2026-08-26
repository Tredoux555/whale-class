// POST /api/lens/reports/[id]/translate — the report, into Simplified Chinese.
//
// 🚨 SECTION BY SECTION, NOT ALL AT ONCE.
// One call carrying a whole report comes back as a wall of Chinese that has to
// be split again on markers the model chose, and a single missed marker
// silently shifts every following section into the wrong place. Instead each
// section and each list item is its own short call, so a failure is confined to
// the one paragraph it happened in and the rest of the translation still lands.
//
// 🚨 THE GLOSSARY IS THE POINT. Montessori Chinese terminology is settled, and
// a model left to its own devices produces reasonable-sounding alternatives —
// 常态化 for normalisation, 预备环境 for prepared environment — which read to a
// Chinese Montessori head of school exactly the way jargon-soup reads in
// English. The locked table goes into the system prompt and
// findGlossaryViolations checks what comes back. The check is ADVISORY: it
// surfaces in the editor for her to judge and never blocks a save, because a
// legitimate rephrasing can drop a term honestly and a checker that cries wolf
// gets ignored.

import { NextRequest, NextResponse } from 'next/server';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { checkLensRateLimit, clientKey } from '@/lib/lens/auth';
import { asReportRow, lensDb, loadOwnedReport, REPORT_COLUMNS } from '@/lib/lens/db';
import { instructionFor } from '@/lib/lens/guru/modes';
import { buildLensSystemPrompt } from '@/lib/lens/guru/system-prompt';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import { findGlossaryViolations } from '@/lib/lens/knowledge/montessori-glossary-zh';
import { readStoredContent, sectionTitle } from '@/lib/lens/reports/schema';
import { lensError, notFound, requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/** A short paragraph does not need 4096 tokens; a long section does. */
function budgetFor(source: string): number {
  return Math.min(4096, Math.max(512, Math.ceil(source.length * 1.2)));
}

export async function POST(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  if (!AI_ENABLED || !anthropic) {
    return NextResponse.json(
      { error: 'Translation isn’t configured on this deployment.' },
      { status: 503 },
    );
  }
  const ai = anthropic;

  if (!checkLensRateLimit(clientKey(request, 'lens-translate'), 6)) {
    return NextResponse.json({ error: 'Give it a minute.' }, { status: 429 });
  }

  // ?force=1 re-translates sections that already have Chinese. Without it, a
  // second run only fills the gaps — so re-running after she edited two English
  // paragraphs costs two calls, not thirty, and does not overwrite Chinese she
  // has already corrected by hand.
  const force = request.nextUrl.searchParams.get('force') === '1';

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');
    if (owned.report.status === 'final') {
      return NextResponse.json(
        { error: 'That report is final. Reopen it before translating.' },
        { status: 409 },
      );
    }

    const context = await loadReportContext(
      supabase,
      session.observerId,
      owned.report,
      owned.visit,
    );
    if (!context) return notFound('That report isn’t yours.');

    const content = readStoredContent(owned.report);
    const systemPrompt = buildLensSystemPrompt({
      observer: context.observer,
      engagement: owned.visit.engagement_type,
      includeGlossary: true,
      modeInstruction: instructionFor('translate'),
    });

    const translate = async (source: string, label: string): Promise<string | null> => {
      if (!source.trim()) return null;
      try {
        const message = await ai.messages.create({
          model: AI_MODEL,
          max_tokens: budgetFor(source),
          temperature: 0,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Translate this into Simplified Chinese. Return the Chinese and nothing else — no preamble, no notes, no English.\n\n[${label}]\n${source}`,
            },
          ],
        });
        const block = message.content.find((b) => b.type === 'text');
        return block && block.type === 'text' ? block.text.trim() : null;
      } catch (err) {
        // One failed paragraph must not lose the other twenty-nine.
        console.error(`[lens/translate] "${label}" failed:`, err);
        return null;
      }
    };

    const warnings: string[] = [];
    const note = (label: string, en: string, zh: string | null) => {
      if (!zh) {
        warnings.push(`${label} did not translate — try again on that one.`);
        return;
      }
      for (const v of findGlossaryViolations(en, zh)) {
        warnings.push(`${label}: ${v.message}`);
      }
    };

    // Sections first, in order — they are the bulk of the document and the part
    // she will read first.
    for (const section of content.sections) {
      if (section.body_zh && !force) continue;
      const label = sectionTitle(section.key);
      const zh = await translate(section.body_en, label);
      if (zh) section.body_zh = zh;
      note(label, section.body_en, zh);
    }

    for (const listKey of ['commendations', 'recommendations', 'required_actions', 'next_steps'] as const) {
      for (const [index, item] of content[listKey].entries()) {
        if (item.text_zh && !force) continue;
        const label = `${listKey} ${index + 1}`;
        const zh = await translate(item.text_en, label);
        if (zh) item.text_zh = zh;
        note(label, item.text_en, zh);
      }
    }

    const languages = Array.from(new Set([...(owned.report.languages ?? ['en']), 'zh']));

    const { data, error } = await supabase
      .from('lens_reports')
      .update({
        sections: content.sections,
        commendations: content.commendations,
        recommendations: content.recommendations,
        required_actions: content.required_actions,
        next_steps: content.next_steps,
        languages,
      })
      .eq('id', owned.report.id)
      .select(REPORT_COLUMNS)
      .single();
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      warnings,
      report: { ...asReportRow(data), content: readStoredContent(asReportRow(data)) },
    });
  } catch (error) {
    return lensError('report:translate', error);
  }
}
