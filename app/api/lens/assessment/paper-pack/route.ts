// GET /api/lens/assessment/paper-pack?band=A4&form=A
// GET /api/lens/assessment/paper-pack?sheet=scoring
//
// The printable packs for the paper path. These are the SAME PDFs the Montree
// paper path uses — built from the same item bank by the same generator and
// stamped with the bank version they were rendered from — so a Lens observer and
// a Montree teacher are administering identical material.
//
// 🚨 NO USER INPUT REACHES THE FILESYSTEM. The band and form are checked against
// closed lists and the filename is then ASSEMBLED from those constants, so there
// is no string from the request in the path at any point. `sheet=scoring` maps to
// one fixed name. Anything else is a 404.
//
// The packs live in evaluation-kit/paper/, which is outside public/ on purpose:
// they are ~6 MB each and 40 MB in total, and shipping them as static assets
// would put that in every build's public payload. next.config.ts names this route
// in `outputFileTracingIncludes` so the standalone build carries them.

import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openAssessmentRoute } from '@/lib/lens/assessment/bridge';
import { badRequest, lensError, notFound } from '@/lib/lens/route-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BANDS = ['A3', 'A4', 'A5'] as const;
const FORMS = ['A', 'B'] as const;
const PAPER_DIR = 'evaluation-kit/paper';
const SCORING_SHEETS = 'D3_scoring_sheets_only.pdf';

export async function GET(request: NextRequest) {
  const opened = await openAssessmentRoute(request);
  if ('response' in opened) return opened.response;

  const params = request.nextUrl.searchParams;
  let filename: string;

  if (params.get('sheet') === 'scoring') {
    filename = SCORING_SHEETS;
  } else {
    const band = params.get('band') ?? '';
    const form = params.get('form') ?? '';
    const safeBand = BANDS.find((b) => b === band);
    const safeForm = FORMS.find((f) => f === form);
    if (!safeBand || !safeForm) {
      // G1 has no printed pack yet — say so rather than 404ing into silence.
      return badRequest(
        band === 'G1'
          ? 'There is no printed pack for Grade 1 yet. Run that band digitally.'
          : 'Pick a band (A3, A4 or A5) and a form (A or B).',
      );
    }
    filename = `D3_paper_pack_${safeBand}_form${safeForm}.pdf`;
  }

  try {
    const file = await readFile(path.join(process.cwd(), PAPER_DIR, filename));
    return new NextResponse(new Uint8Array(file), {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${filename}"`,
        // Private: only ever served to an authenticated observer, so no shared
        // cache may hold it, but her own browser may keep it for the visit.
        'cache-control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'ENOENT') {
      return notFound('That printable pack isn’t on this server.');
    }
    return lensError('assessment:paper-pack', error);
  }
}
