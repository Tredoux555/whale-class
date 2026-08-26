// GET /api/lens/reports/[id]/pdf?lang=en|zh|both — the deliverable.
//
// Rendered on demand rather than stored: the report is edited right up to the
// moment it is sent, and a cached PDF is a document that disagrees with the one
// on screen. `lens_reports.pdf_path` exists in the schema for a future
// share-link feature; nothing writes to it in v1.
//
// 🚨 `Content-Disposition: inline`, not attachment. She opens this to CHECK it,
// dozens of times, before anyone else ever sees it — forcing a download on every
// look would leave a folder of near-identical files. The browser's own share
// sheet handles sending it.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, loadOwnedReport, loadOwnedSchool } from '@/lib/lens/db';
import { loadReportContext } from '@/lib/lens/guru/load-context';
import { generateLensReportPDF, type PdfLanguage } from '@/lib/lens/reports/pdf-generator';
import { readStoredContent } from '@/lib/lens/reports/schema';
import { lensError, notFound, requireObserver } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

function languageOf(raw: string | null): PdfLanguage {
  return raw === 'zh' || raw === 'both' ? raw : 'en';
}

/** A filename a human can find again in a downloads folder. */
function filenameFor(school: string, room: string | null, date: string): string {
  const safe = (s: string) =>
    s
      .normalize('NFKD')
      // Anything that is not a letter, digit, space or hyphen becomes a hyphen —
      // including the CJK a Chinese school's name is made of, which most
      // download folders and mail clients handle badly in a filename.
      .replace(/[^\w\s-]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  const parts = [safe(school), room ? safe(room) : 'level-report', date].filter(Boolean);
  const stem = parts.join('_') || 'lens-report';
  return `${stem}.pdf`;
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  try {
    const supabase = lensDb();
    const owned = await loadOwnedReport(supabase, session.observerId, id);
    if (!owned) return notFound('That report isn’t yours.');

    const context = await loadReportContext(supabase, session.observerId, owned.report, owned.visit);
    if (!context) return notFound('That report isn’t yours.');

    const school = await loadOwnedSchool(supabase, session.observerId, owned.visit.school_id);
    if (!school) return notFound('That report isn’t yours.');

    // 🚨 The appendix uses the SAME moment scope the Guru saw — the whole visit
    // for a level report, one room for a classroom report (loadReportContext
    // decides). That is what makes it impossible for the appendix to contain an
    // observation the narrative above it was never allowed to cite.
    const moments = context.moments;

    const debrief = Array.isArray(owned.report.debrief)
      ? (owned.report.debrief as { stage: string; question: string }[])
      : [];

    const buffer = await generateLensReportPDF({
      observer: context.observer,
      school,
      visit: owned.visit,
      classroom: context.classroom,
      staff: context.staff,
      moments,
      content: readStoredContent(owned.report),
      version: owned.report.version,
      finalisedAt: owned.report.finalised_at,
      language: languageOf(request.nextUrl.searchParams.get('lang')),
      debrief,
    });

    const filename = filenameFor(
      school.name,
      context.classroom?.name ?? null,
      owned.visit.visit_date,
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `inline; filename="${filename}"`,
        // Private and uncached: the document changes on every edit, and a shared
        // cache holding one observer's client report would be a real leak.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return lensError('report:pdf', error);
  }
}
