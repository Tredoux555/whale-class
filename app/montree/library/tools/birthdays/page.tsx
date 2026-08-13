"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import {
  buildBirthdayBoardPdf, buildBirthdayCardsPdf, buildBirthdayTrackerPdf,
  type BirthdayBoardChild, type TrackerSize,
} from '@/lib/montree/birthdays/pdfTemplates';
import {
  parseBirthdayList, birthdayFacts, sortByCalendar, MONTH_ABBR,
  type DateOrder, type BirthdayUnknown,
} from '@/lib/montree/birthdays/parse';
import {
  loadClassRoster, rosterToBirthdays, fetchRosterPhotos, RosterAuthError,
  type RosterChild,
} from '@/lib/montree/birthdays/roster';
import { fileToArrayBuffer } from '@/lib/montree/birthdays/assets';

// ============================================
// BIRTHDAYS
// ============================================
// Three printables off one class list — pasted, or pulled straight off the
// teacher's own roster with "Load my class":
//
//   • Class birthday board — the whole class on ONE festive page, every child
//     as a circular photo in calendar order inside a decorated border. The
//     primary output; the only one that uses the children's photographs.
//   • Birthday cards — one page per child in a single merged PDF, with the
//     name, the birth date, the age they're turning, a photo slot and light
//     vector party decoration.
//   • Birthday wall chart — the whole class on ONE page, twelve month
//     boxes in a 3x4 grid, at A4 or A3.
//
// "Load my class" reads /api/montree/children with the teacher's own session
// cookie, so it only ever sees their own school. It fills the entry list with
// real names, birthdays and photos; the paste box stays as the path for anyone
// who isn't signed in, or whose list lives in a message rather than the app.
//

// Structure mirrors the Tracing Work tool: pure maths/parsing in
// lib/montree/birthdays/parse.ts, vector decoration primitives in
// decorations.ts, jsPDF page builders in pdfTemplates.ts, this file is UI only.
//
// Parsing is the same format-agnostic engine (lib/cms/engine/paste-parser)
// the class-list roster importer uses, so whatever a teacher pastes — a
// spreadsheet column, a comma list, "Name  YYYY-MM-DD" with just a space —
// gets read the same forgiving way here as it does onboarding a class.
// ============================================

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'class';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const PLACEHOLDER = [
  'Joey, 2020-03-03',
  'Henry\t2019-11-21',
  'Segina 2020-08-14',
  'Kayla, 9 Jan 2021',
].join('\n');

export default function BirthdaysPage() {
  const { t } = useI18n();

  const [className, setClassName] = useState('Whale Class');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [listText, setListText] = useState('');
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [trackerSize, setTrackerSize] = useState<TrackerSize>('A4');
  const [busy, setBusy] = useState<null | 'board' | 'cards' | 'tracker'>(null);
  const [error, setError] = useState<string | null>(null);

  // "Load my class". `roster === null` means the tool is running off the paste
  // box; once a roster is loaded it takes over as the source of entries, and
  // "use a pasted list instead" puts it back. The two are never merged — a
  // half-roster-half-paste class list is a duplicate waiting to be printed.
  const [roster, setRoster] = useState<RosterChild[] | null>(null);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterNote, setRosterNote] = useState<string | null>(null);
  const [photoProgress, setPhotoProgress] = useState<{ done: number; total: number } | null>(null);

  // One clock for the whole session, so the previewed "turns N" and the
  // generated PDF can never disagree mid-render.
  const today = useMemo(() => new Date(), []);
  const parsed = useMemo(
    () => parseBirthdayList(listText, today, dateOrder),
    [listText, today, dateOrder],
  );
  const fromRoster = useMemo(() => (roster ? rosterToBirthdays(roster) : null), [roster]);

  const entries = fromRoster ? fromRoster.entries : parsed.entries;
  const unknownChildren: BirthdayUnknown[] = useMemo(
    () => (fromRoster ? fromRoster.unknown : []),
    [fromRoster],
  );

  const preview = useMemo(
    () => sortByCalendar(entries).map((e) => ({ entry: e, facts: birthdayFacts(e, today) })),
    [entries, today],
  );

  // The board is the one output that keeps a child with no birthday on file.
  const boardCount = entries.length + unknownChildren.length;

  async function logoBytes() {
    return logoFile ? await fileToArrayBuffer(logoFile) : null;
  }

  function guard(): boolean {
    if (entries.length === 0) {
      setError(roster
        ? 'None of the children on your class list have a birthday on file yet — add their birth dates, or paste a list below.'
        : 'Paste at least one child’s name and birth date to get started.');
      return false;
    }
    setError(null);
    return true;
  }

  async function handleLoadClass() {
    setRosterBusy(true);
    setError(null);
    try {
      const children = await loadClassRoster();
      if (children.length === 0) {
        setRoster(null);
        setRosterNote('Your class list is empty — add your students in Montree first, or paste a list below.');
        return;
      }
      setRoster(children);
      setRosterNote(null);
    } catch (e) {
      setRoster(null);
      setRosterNote(e instanceof RosterAuthError
        ? 'Log in to Montree as a teacher to load your class automatically. You can still paste your list below.'
        : 'Couldn’t reach your class list just now. You can still paste your list below.');
    } finally {
      setRosterBusy(false);
    }
  }

  function handleUsePastedList() {
    setRoster(null);
    setRosterNote(null);
    setError(null);
  }

  async function handleBoard() {
    if (entries.length === 0 && unknownChildren.length === 0) {
      setError(roster
        ? 'Your class list came back empty.'
        : 'Paste at least one child’s name and birth date, or load your class.');
      return;
    }
    setError(null);
    setBusy('board');
    try {
      // Photos are fetched here, not inside the builder: the builder is a pure
      // jsPDF page and the network belongs to the screen that can show a
      // progress line while a class of two dozen downloads.
      const paths = [
        ...entries.map((e) => e.photoUrl),
        ...unknownChildren.map((c) => c.photoUrl),
      ];
      let photos = new Map<string, string>();
      if (paths.some(Boolean)) {
        setPhotoProgress({ done: 0, total: paths.filter(Boolean).length });
        photos = await fetchRosterPhotos(paths, 5, (done, total) => setPhotoProgress({ done, total }));
      }
      setPhotoProgress(null);

      const photoOf = (path?: string) => (path ? photos.get(path) ?? null : null);
      const children: BirthdayBoardChild[] = [
        ...entries.map((e) => ({ name: e.name, entry: e, photoDataUrl: photoOf(e.photoUrl) })),
        ...unknownChildren.map((c) => ({ name: c.name, entry: null, photoDataUrl: photoOf(c.photoUrl) })),
      ];

      const blob = await buildBirthdayBoardPdf({
        children,
        className: className.trim() || 'Our Class',
        logoBytes: await logoBytes(),
        today,
      });
      downloadBlob(blob, `birthday-board-${slugify(className)}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the birthday board. Please try again.');
    } finally {
      setPhotoProgress(null);
      setBusy(null);
    }
  }

  async function handleCards() {
    if (!guard()) return;
    setBusy('cards');
    try {
      const blob = await buildBirthdayCardsPdf({
        entries,
        className: className.trim() || 'Our Class',
        logoBytes: await logoBytes(),
        today,
      });
      downloadBlob(blob, `birthdays-${slugify(className)}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the cards. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function handleTracker() {
    if (!guard()) return;
    setBusy('tracker');
    try {
      const blob = await buildBirthdayTrackerPdf({
        entries,
        className: className.trim() || 'Our Class',
        logoBytes: await logoBytes(),
        size: trackerSize,
        today,
      });
      downloadBlob(blob, `birthday-tracker-${slugify(className)}-${trackerSize}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the wall chart. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white on-light">
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
              ← {t('tools.back_to_library')}
            </Link>

            <LanguageToggle />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">{t('tools.birthdays')}</h1>
          <p className="text-emerald-200 mt-1">{t('tools.birthdays_desc')}</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Class details */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Class details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">Class name (shown on every sheet)</span>
              <input
                type="text" value={className} onChange={(e) => setClassName(e.target.value)}
                placeholder="Whale Class"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">Class emblem / logo (optional)</span>
              <input
                type="file" accept="image/png,image/jpeg"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm"
              />
            </label>
          </div>
        </section>

        {/* The class list */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Your class</h2>
            <button
              type="button" onClick={handleLoadClass} disabled={rosterBusy || busy !== null}
              className="btn btn-secondary btn-sm on-light"
            >
              {rosterBusy ? 'Loading…' : 'Load my class'}
            </button>
          </div>

          {rosterNote && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {rosterNote}
            </p>
          )}

          {roster && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#0D3330]">
                <span className="font-bold">
                  {roster.length} {roster.length === 1 ? 'child' : 'children'} loaded from your class
                </span>
                {' — '}names, birthdays and photos come straight from Montree.
              </p>
              <button
                type="button" onClick={handleUsePastedList}
                className="btn btn-ghost btn-sm on-light"
              >
                Use a pasted list instead
              </button>
            </div>
          )}

          <div>
            {roster ? (
              <p className="text-sm text-gray-500 mt-1">
                Your loaded class is being used. Anything typed below is ignored until you switch
                back to a pasted list.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                One child per line — paste it straight from a spreadsheet, a message, or type it out.
                A comma, tab, or just a space between the name and the date all work, and the date can
                be written as <code className="bg-gray-100 rounded px-1">2020-03-03</code>,
                {' '}<code className="bg-gray-100 rounded px-1">03/03/2020</code> or
                {' '}<code className="bg-gray-100 rounded px-1">3 March 2020</code>.
              </p>
            )}
          </div>
          <textarea
            value={listText} onChange={(e) => setListText(e.target.value)}
            rows={10} placeholder={PLACEHOLDER} spellCheck={false}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <label className={`flex items-center gap-2 text-sm text-gray-600 ${roster ? 'hidden' : ''}`}>
            <span>Read a date like 05/03 as</span>
            <select
              value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="dmy">Day first — 5 March</option>
              <option value="mdy">Month first — 3 May</option>
            </select>
          </label>

          {!roster && parsed.issues.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-900">
                {parsed.issues.length} line{parsed.issues.length === 1 ? '' : 's'} couldn&apos;t be read —
                {' '}they&apos;ll be left out until you fix them:
              </p>
              <ul className="mt-2 space-y-1">
                {parsed.issues.map((issue) => (
                  <li key={issue.line} className="text-sm text-amber-900">
                    <span className="font-mono font-bold">Line {issue.line}</span>
                    {' — '}
                    <span className="font-mono">{issue.text}</span>
                    {' · '}
                    <span className="italic">{issue.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(preview.length > 0 || unknownChildren.length > 0) && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-sm font-bold text-[#0D3330]">
                {preview.length} {preview.length === 1 ? 'child' : 'children'} ready
              </p>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {preview.map(({ entry, facts }) => (
                  <li key={`${entry.line}-${entry.iso}`} className="text-sm text-gray-700 flex justify-between gap-3">
                    <span className="truncate">
                      <span className="font-semibold text-[#0D3330]">{entry.name}</span>
                      <span className="text-gray-500"> · {MONTH_ABBR[entry.month - 1]} {entry.day}</span>
                      {entry.ambiguousDate && (
                        <span className="text-amber-600" title="Both parts of the date could be a month — double-check day and month.">
                          {' '}⚠︎ guessed
                        </span>
                      )}
                      {entry.duplicate && (
                        <span className="text-amber-600" title="Same name and birth date appear earlier in this list.">
                          {' '}⚠︎ duplicate
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-emerald-700">
                      {facts.isToday ? `turns ${facts.turning} today` : `turns ${facts.turning}`}
                    </span>
                  </li>
                ))}
              </ul>

              {unknownChildren.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <p className="text-sm font-bold text-gray-600">
                    {unknownChildren.length}{' '}
                    {unknownChildren.length === 1 ? 'child has' : 'children have'} no birthday on file
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    They still appear on the class board, last, marked &ldquo;not on file&rdquo; — they
                    can&apos;t appear on the cards or the wall chart, which need a date.
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {unknownChildren.map((c) => c.name).join(' · ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Output A — the class board (primary) */}
        <section className="bg-white rounded-2xl border-2 border-emerald-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">
              Class birthday board — one page
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Every child on a single decorated page, photo by photo, in calendar order from
              January to December. Load your class and the photos come from Montree; a pasted
              list prints the same board with an initial in place of each face.
            </p>
          </div>

          <button
            type="button" onClick={handleBoard} disabled={busy !== null || rosterBusy}
            className="btn btn-primary btn-lg"
          >
            {busy === 'board'
              ? (photoProgress
                ? `Fetching photos… ${photoProgress.done}/${photoProgress.total}`
                : 'Generating…')
              : `Generate the class board${boardCount ? ` (${boardCount})` : ''}`}
          </button>

          {busy === 'board' && photoProgress && (
            <p className="text-xs text-gray-500">
              Downloading each child&apos;s photo — this takes a moment the first time.
            </p>
          )}
        </section>

        {/* Output B — cards */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Birthday cards</h2>
            <p className="text-sm text-gray-500 mt-1">
              One page per child in a single PDF — name, birth date, the age they&apos;re turning,
              a photo slot and party decoration. Print the whole class in one go.
            </p>
          </div>
          <button
            type="button" onClick={handleCards} disabled={busy !== null || rosterBusy}
            className="btn btn-secondary btn-lg on-light"
          >
            {busy === 'cards'
              ? 'Generating…'
              : `Generate ${preview.length || ''} card${preview.length === 1 ? '' : 's'} (one PDF)`}
          </button>
        </section>

        {/* Output C — tracker */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Birthday wall chart</h2>
            <p className="text-sm text-gray-500 mt-1">
              The whole class on one page — twelve month boxes, every child under their month
              and day. Made to be pinned on the wall.
            </p>
          </div>

          <div>
            <span className="text-sm text-gray-600">Print size</span>
            <div className="flex gap-2 mt-1">
              {(['A4', 'A3'] as TrackerSize[]).map((size) => (
                <button
                  key={size} type="button" onClick={() => setTrackerSize(size)}
                  className={`btn btn-sm btn-pill ${trackerSize === size ? 'btn-primary' : 'btn-secondary on-light'}`}
                >
                  {size}
                </button>
              ))}
              <span className="self-center text-xs text-gray-500">
                {trackerSize === 'A4' ? 'desk / folder size' : 'big wall poster — roomier boxes, bigger type'}
              </span>
            </div>
          </div>

          <button
            type="button" onClick={handleTracker} disabled={busy !== null || rosterBusy}
            className="btn btn-gold btn-lg"
          >
            {busy === 'tracker' ? 'Generating…' : `Generate wall chart (${trackerSize})`}
          </button>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
