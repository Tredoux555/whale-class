// app/lens/assessment/new/page.tsx — start a check-in.
//
// School → room (optional) → who → how old → how it will be run. Five decisions
// on one screen, because this is usually being filled in standing at the back of
// a room with a phone in one hand.
//
// 🚨 THE CHILD IS A NAME SHE TYPES. There is no roster to pick from and there is
// not going to be one — see the header of migrations/340_lens_assessment.sql.
// The alias is stored exactly as given and is never treated as an identity by
// anything except the growth comparison, which additionally requires the same
// observer and the same school.
//
// 🚨 THE WINDOW IS NOT ASSUMED. It used to be filed as 'autumn' whatever the
// month, with no picker anywhere — so a May sitting became an autumn one and any
// later comparison read as a child going backwards over a year they had actually
// grown through. It is now derived from today's date and shown for her to
// confirm or change, and the server derives it too rather than trusting this.
//
// 🚨 THE OBSERVATION SECTION IS GATED ON CO-RATING. A visiting observer cannot
// rate what she "has already seen" of a child she met this morning; that section
// only appears when somebody who knows the child is rating alongside her. See
// lib/lens/assessment/session-facts.ts for why, and for the copy.
//
// 🚨 ageBandFromMonths is imported from runner-engine, NOT from bank.ts.
// bank.ts imports the 3.5 MB item-bank.json; runner-engine imports only types
// and the pure locale gate, so it is safe in a browser bundle. Do not "tidy"
// this import to point at bank.ts.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, LABEL } from '@/lib/lens/ui';
import { LEVEL_LABELS, type LensClassroom, type LensSchool } from '@/lib/lens/types';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { ageBandFromMonths, schoolYearForDate, windowForDate } from '@/lib/montree/evaluation/runner-engine';
import {
  CO_RATED_CHECKBOX, CO_RATED_HELP, CO_RATED_QUESTION, CO_RATER_LABEL, CO_RATER_PLACEHOLDER,
  OBSERVATION_MODULE_ID,
} from '@/lib/lens/assessment/session-facts';
import type { AgeBand, DeliveryMode, TabletExportPayload, WindowCode } from '@/lib/montree/evaluation/types';

const AGE_BANDS: AgeBand[] = ['A3', 'A4', 'A5', 'G1'];

const BAND_BLURB: Record<AgeBand, string> = {
  A3: 'Around 3 — under 4 years',
  A4: 'Around 4 — 4 to 5 years',
  A5: 'Around 5 — 5 to 6 years',
  G1: 'Grade 1 — 6 years and up',
};

const MODULES: Array<{ id: string; label: string; blurb: string }> = [
  { id: 'M-LIT', label: 'Literacy', blurb: 'Sounds, words, print' },
  { id: 'M-MATH', label: 'Maths', blurb: 'Number, quantity, pattern' },
  { id: 'M-EFL', label: 'English', blurb: 'Reported separately, never merged in' },
  {
    id: OBSERVATION_MODULE_ID,
    label: 'Observations',
    blurb: 'What has been seen over weeks in the room — needs the child’s own adult',
  },
];

/** Sep–Dec, Jan–Mar, Apr–Aug — the same three windows Montree files against. */
const WINDOWS: Array<{ code: WindowCode; label: string; months: string }> = [
  { code: 'autumn', label: 'Autumn', months: 'Sep–Dec' },
  { code: 'winter', label: 'Winter', months: 'Jan–Mar' },
  { code: 'spring', label: 'Spring', months: 'Apr–Aug' },
];

type Mode = 'digital' | 'paper' | 'import';

const MODE_BLURB: Record<Mode, string> = {
  digital: 'Run it now on this device. The child taps; you read the prompts.',
  paper: 'Print the pack, sit with the paper, key the sheet in afterwards.',
  import: 'Upload a file exported by the offline tablet build.',
};

export default function LensNewAssessmentPage() {
  const router = useRouter();

  const [schools, setSchools] = useState<LensSchool[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [classrooms, setClassrooms] = useState<LensClassroom[]>([]);
  const [classroomId, setClassroomId] = useState('');
  const [alias, setAlias] = useState('');
  const [ageMonths, setAgeMonths] = useState('');
  const [bandOverride, setBandOverride] = useState<AgeBand | null>(null);
  const [modules, setModules] = useState<string[]>(['M-LIT', 'M-MATH', 'M-EFL']);
  const [mode, setMode] = useState<Mode>('digital');
  const [file, setFile] = useState<File | null>(null);

  // Derived once, on this render, from the device's own clock — then hers to
  // change. The server derives it again; this is a suggestion, not the record.
  const [today] = useState(() => new Date());
  const derivedWindow = windowForDate(today);
  const schoolYear = schoolYearForDate(today);
  const [windowCode, setWindowCode] = useState<WindowCode>(derivedWindow);

  const [coRated, setCoRated] = useState(false);
  const [coRater, setCoRater] = useState('');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lensApi<{ schools: LensSchool[] }>('/api/lens/schools')
      .then((data) => {
        setSchools(data.schools);
        if (data.schools.length === 1) setSchoolId(data.schools[0].id);
      })
      .catch((err) => {
        if (err instanceof LensApiError && err.status === 401) router.replace('/lens');
        else setError(err instanceof LensApiError ? err.message : 'Could not load your schools.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!schoolId) { setClassrooms([]); setClassroomId(''); return; }
    lensApi<{ classrooms: LensClassroom[] }>(`/api/lens/schools/${schoolId}/classrooms`)
      .then((data) => setClassrooms(data.classrooms))
      .catch(() => setClassrooms([]));
  }, [schoolId]);

  const months = Number(ageMonths);
  const derivedBand: AgeBand | null =
    Number.isFinite(months) && months >= 24 && months <= 84 ? ageBandFromMonths(months) : null;
  const band = bandOverride ?? derivedBand;

  const toggleModule = (id: string) => {
    if (id === OBSERVATION_MODULE_ID && !coRated) return;  // gated, not merely discouraged
    setModules((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  // Un-ticking co-rating takes the observation section back out rather than
  // leaving a selection that the server would silently drop.
  const setCoRatedAndPrune = (on: boolean) => {
    setCoRated(on);
    if (!on) {
      setCoRater('');
      setModules((prev) => prev.filter((m) => m !== OBSERVATION_MODULE_ID));
    }
  };

  const create = useCallback(async () => {
    setError(null);
    if (!schoolId) { setError('Pick a school.'); return; }
    if (!alias.trim()) { setError('Type a name or alias for the child.'); return; }
    if (!band) { setError('Give an age in months, or pick a band.'); return; }
    if (!modules.length) { setError('Pick at least one module.'); return; }

    setBusy(true);
    try {
      const deliveryMode: DeliveryMode = mode === 'paper' ? 'paper' : 'tablet';
      const created = await lensApi<{ session: { id: string } }>('/api/lens/assessment/sessions', {
        method: 'POST',
        json: {
          school_id: schoolId,
          classroom_id: classroomId || null,
          child_alias: alias.trim(),
          child_age_months: derivedBand ? months : null,
          age_band: band,
          window_code: windowCode,
          school_year: schoolYear,
          modules,
          delivery_mode: deliveryMode,
          co_rated: coRated,
          co_rater: coRated && coRater.trim() ? coRater.trim() : null,
        },
      });
      router.replace(
        mode === 'paper'
          ? `/lens/assessment/paper/${created.session.id}`
          : `/lens/assessment/run/${created.session.id}`,
      );
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not start the check-in.');
      setBusy(false);
    }
  }, [schoolId, classroomId, alias, band, derivedBand, months, modules, mode,
    windowCode, schoolYear, coRated, coRater, router]);

  const importFile = useCallback(async () => {
    setError(null);
    if (!schoolId) { setError('Pick a school.'); return; }
    if (!alias.trim()) { setError('Type a name or alias for the child.'); return; }
    if (!file) { setError('Choose the file the tablet exported.'); return; }

    setBusy(true);
    try {
      const text = await file.text();
      let payload: TabletExportPayload;
      try {
        payload = JSON.parse(text) as TabletExportPayload;
      } catch {
        setError('That file isn’t readable as a check-in export.');
        setBusy(false);
        return;
      }
      const result = await lensApi<{ sessionId: string }>('/api/lens/assessment/import', {
        method: 'POST',
        json: {
          school_id: schoolId,
          classroom_id: classroomId || null,
          child_alias: alias.trim(),
          child_age_months: derivedBand ? months : null,
          school_year: schoolYear,
          co_rated: coRated,
          co_rater: coRated && coRater.trim() ? coRater.trim() : null,
          payload,
        },
      });
      router.replace(`/lens/assessment/results/${result.sessionId}`);
    } catch (err) {
      // A 409 is the bank-checksum question, and it is hers to answer — it is
      // surfaced as the server's own sentence rather than swallowed.
      setError(err instanceof LensApiError ? err.message : 'Could not import that file.');
      setBusy(false);
    }
  }, [schoolId, classroomId, alias, derivedBand, months, file, schoolYear, coRated, coRater, router]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-3">
        <LensHeader title="New check-in" back="/lens/assessment" />
        <p className="text-sm text-forest-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-24 pt-3">
      <LensHeader title="New check-in" back="/lens/assessment" />

      <ErrorNote message={error} />

      <div className={`${CARD} mt-4`}>
        <label className={LABEL} htmlFor="ln-school">School</label>
        <select
          id="ln-school"
          className="ln-field"
          value={schoolId}
          onChange={(e) => setSchoolId(e.target.value)}
        >
          <option value="">Pick a school…</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {classrooms.length > 0 && (
          <div className="mt-4">
            <label className={LABEL} htmlFor="ln-room">Classroom (optional)</label>
            <select
              id="ln-room"
              className="ln-field"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
            >
              <option value="">Not recorded</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {LEVEL_LABELS[c.level] ?? c.level}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-forest-muted">
              Leaving this blank is honest. Guessing a room is not.
            </p>
          </div>
        )}
      </div>

      <div className={`${CARD} mt-4`}>
        <label className={LABEL} htmlFor="ln-alias">Child</label>
        <input
          id="ln-alias"
          className="ln-field"
          value={alias}
          maxLength={120}
          placeholder="First name, initials, or however you refer to them"
          onChange={(e) => setAlias(e.target.value)}
        />
        <p className="mt-1.5 text-[12px] text-forest-muted">
          Whatever you type is what gets stored. Lens keeps no roster.
        </p>

        <div className="mt-4">
          <label className={LABEL} htmlFor="ln-age">Age in months</label>
          <input
            id="ln-age"
            className="ln-field"
            inputMode="numeric"
            value={ageMonths}
            placeholder="e.g. 54"
            onChange={(e) => { setAgeMonths(e.target.value.replace(/[^0-9]/g, '')); setBandOverride(null); }}
          />
        </div>

        <div className="mt-4">
          <span className={LABEL}>Band</span>
          <div className="ln-rail">
            {AGE_BANDS.map((b) => (
              <button
                key={b}
                type="button"
                className="ln-chip"
                data-on={band === b ? '1' : '0'}
                onClick={() => setBandOverride(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[12px] text-forest-muted">
            {band
              ? `${BAND_BLURB[band]}${bandOverride ? ' · your choice' : ' · from the age you gave'}`
              : 'A child is checked at their chronological band unless you say otherwise.'}
          </p>
        </div>
      </div>

      <div className={`${CARD} mt-4`}>
        <span className={LABEL}>When is this check-in?</span>
        <div className="ln-rail">
          {WINDOWS.map((w) => (
            <button
              key={w.code}
              type="button"
              className="ln-chip"
              data-on={windowCode === w.code ? '1' : '0'}
              onClick={() => setWindowCode(w.code)}
            >
              {w.label} · {w.months}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-forest-muted">
          {windowCode === derivedWindow
            ? `From today’s date · school year ${schoolYear}`
            : `Changed from ${WINDOWS.find((w) => w.code === derivedWindow)?.label} · school year ${schoolYear}`}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-forest-muted">
          The window is how a later check-in knows where this one sits. Filing a spring visit as autumn
          makes every comparison after it untrue, so it is worth a glance.
        </p>
      </div>

      <div className={`${CARD} mt-4`}>
        <span className={LABEL}>{CO_RATED_QUESTION}</span>
        <button
          type="button"
          onClick={() => setCoRatedAndPrune(!coRated)}
          aria-pressed={coRated}
          className={`ln-tap flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
            coRated
              ? 'border-[rgba(52,211,153,0.55)] bg-[rgba(52,211,153,0.10)]'
              : 'border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)]'
          }`}
        >
          <span
            aria-hidden
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[12px] font-bold ${
              coRated
                ? 'border-emerald-primary bg-emerald-primary text-forest-ink'
                : 'border-[rgba(52,211,153,0.35)] text-transparent'
            }`}
          >
            ✓
          </span>
          <span className="block text-[14px] leading-snug text-forest-text">{CO_RATED_CHECKBOX}</span>
        </button>
        <p className="mt-2 text-[12px] leading-relaxed text-forest-muted">{CO_RATED_HELP}</p>

        {coRated && (
          <div className="mt-4">
            <label className={LABEL} htmlFor="ln-corater">{CO_RATER_LABEL}</label>
            <input
              id="ln-corater"
              className="ln-field"
              value={coRater}
              maxLength={200}
              placeholder={CO_RATER_PLACEHOLDER}
              onChange={(e) => setCoRater(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className={`${CARD} mt-4`}>
        <span className={LABEL}>What to look at</span>
        <div className="flex flex-col gap-2">
          {MODULES.map((m) => {
            const on = modules.includes(m.id);
            const locked = m.id === OBSERVATION_MODULE_ID && !coRated;
            return (
              <button
                key={m.id}
                type="button"
                disabled={locked}
                onClick={() => toggleModule(m.id)}
                className={`ln-tap rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                  locked
                    ? 'cursor-not-allowed border-[rgba(52,211,153,0.10)] bg-[rgba(8,20,12,0.35)] opacity-55'
                    : on
                      ? 'border-[rgba(52,211,153,0.55)] bg-[rgba(52,211,153,0.10)]'
                      : 'border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)]'
                }`}
              >
                <span className="block text-[15px] text-forest-text">{m.label}</span>
                <span className="block text-[12px] text-forest-muted">{m.blurb}</span>
                {locked && (
                  <span className="mt-1 block text-[12px] text-forest-gold">
                    Available once you tick the box above.
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${CARD} mt-4`}>
        <span className={LABEL}>How you’ll run it</span>
        <div className="flex flex-col gap-2">
          {(['digital', 'paper', 'import'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`ln-tap rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                mode === m
                  ? 'border-[rgba(52,211,153,0.55)] bg-[rgba(52,211,153,0.10)]'
                  : 'border-[rgba(52,211,153,0.16)] bg-[rgba(8,20,12,0.5)]'
              }`}
            >
              <span className="block text-[15px] capitalize text-forest-text">
                {m === 'digital' ? 'Digital, now' : m === 'paper' ? 'Paper' : 'Import a tablet file'}
              </span>
              <span className="block text-[12px] text-forest-muted">{MODE_BLURB[m]}</span>
            </button>
          ))}
        </div>

        {mode === 'import' && (
          <div className="mt-4">
            <label className={LABEL} htmlFor="ln-file">Export file</label>
            <input
              id="ln-file"
              type="file"
              accept="application/json,.json"
              className="ln-field"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1.5 text-[12px] text-forest-muted">
              The bands are recomputed here from this server’s bank — the tablet’s own totals are
              kept only as an audit trail.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => (mode === 'import' ? void importFile() : void create())}
        className={`${BTN_PRIMARY} mt-6 w-full text-base`}
      >
        {busy
          ? 'Working…'
          : mode === 'digital' ? 'Start the check-in'
          : mode === 'paper' ? 'Set up the paper sheet'
          : 'Import the file'}
      </button>

      <button
        type="button"
        onClick={() => router.back()}
        className={`${BTN_SECONDARY} mt-3 w-full`}
      >
        Cancel
      </button>
    </main>
  );
}
