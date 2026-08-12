// app/api/cms/demo/today/route.ts
// The teacher's Today roster as JSON, built by the SAME engine call the page
// makes. It exists to prove the engine is UI-independent: the page and the API
// share `buildDailyRoster` and differ only in how they render the result.
//
// Phase 1 only — this route disappears when real data lands.

import { NextResponse } from 'next/server';
import { buildDailyRoster, type RosterLabels } from '@/lib/cms/engine/roster';
import {
  DEMO_DATE,
  demoAllergies,
  demoChildren,
  demoClassGroup,
  demoDailyFacts,
  demoDietary,
  demoMedical,
  demoSchool,
} from '@/lib/cms/demo/seed';
import { DEFAULT_LOCALE, isLocale } from '@/lib/cms/i18n/config';
import { getT } from '@/lib/cms/i18n/t';
import { safeErrorLog } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const requested = new URL(request.url).searchParams.get('locale');
    const t = getT(isLocale(requested) ? requested : DEFAULT_LOCALE);

    const labels: RosterLabels = {
      severity: {
        severe: t('teacher.today.severity.severe'),
        moderate: t('teacher.today.severity.moderate'),
        mild: t('teacher.today.severity.mild'),
      },
      pickup: (time, person) => t('teacher.today.pickupBy', { time, person }),
      droppedOff: (time) => t('teacher.today.droppedOff', { time }),
      absent: (reason) => t('teacher.today.absentReason', { reason }),
      noFlags: t('child.flags.none'),
    };

    const roster = buildDailyRoster(
      {
        school: demoSchool,
        classGroup: demoClassGroup,
        date: DEMO_DATE,
        children: demoChildren,
        allergies: demoAllergies,
        dietary: demoDietary,
        medical: demoMedical,
        daily: demoDailyFacts,
      },
      labels
    );

    return NextResponse.json(roster);
  } catch (error) {
    safeErrorLog('api/cms/demo/today', error);
    return NextResponse.json({ error: 'Failed to build roster' }, { status: 500 });
  }
}
