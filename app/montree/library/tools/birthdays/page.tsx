"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import {
  buildBirthdayCardsPdf, buildBirthdayTrackerPdf, type TrackerSize,
} from '@/lib/montree/birthdays/pdfTemplates';
import {
  parseBirthdayList, birthdayFacts, sortByCalendar, MONTH_ABBR,
} from '@/lib/montree/birthdays/parse';
import { fileToArrayBuffer } from '@/lib/montree/birthdays/assets';

// ============================================
// BIRTHDAYS
// ============================================
// Two printables off one pasted class list (`Name, YYYY-MM-DD` per line):
//
//   • Birthday cards — one page per child in a single merged PDF, with the
//     name, the birth date, the age they're turning, a photo slot and light
//     vector party decoration.
//   • Birthday board — the whole class on ONE wall-chart page, twelve month
//     boxes in a 3x4 grid, at A4 or A3.
//
// Structure mirrors the Tracing Work tool: pure maths/parsing in
// lib/montree/birthdays/parse.ts, vector decoration primitives in
// decorations.ts, jsPDF page builders in pdfTemplates.ts, this file is UI only.
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
  'Henry, 2019-11-21',
  'Segina, 2020-08-14',
  'Kayla, 2021-01-09',
].join('\n');

export default function BirthdaysPage() {
  const { t } = useI18n();

  const [className, setClassName] = useState('Whale Class');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [listText, setListText] = useState('');
  const [trackerSize, setTrackerSize] = useState<TrackerSize>('A4');
  const [busy, setBusy] = useState<null | 'cards' | 'tracker'>(null);
  const [error, setError] = useState<string | null>(null);

  // One clock for the whole session, so the previewed "turns N" and the
  // generated PDF can never disagree mid-render.
  const today = useMemo(() => new Date(), []);
  const parsed = useMemo(() => parseBirthdayList(listText, today), [listText, today]);
  const preview = useMemo(
    () => sortByCalendar(parsed.entries).map((e) => ({ entry: e, facts: birthdayFacts(e, today) })),
    [parsed.entries, today],
  );

  async function logoBytes() {
    return logoFile ? await fileToArrayBuffer(logoFile) : null;
  }

  function guard(): boolean {
    if (parsed.entries.length === 0) {
      setError('Paste at least one line in the form “Name, YYYY-MM-DD”.');
      return false;
    }
    setError(null);
    return true;
  }

  async function handleCards() {
    if (!guard()) return;
    setBusy('cards');
    try {
      const blob = await buildBirthdayCardsPdf({
        entries: parsed.entries,
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
        entries: parsed.entries,
        className: className.trim() || 'Our Class',
        logoBytes: await logoBytes(),
        size: trackerSize,
        today,
      });
      downloadBlob(blob, `birthday-tracker-${slugify(className)}-${trackerSize}.pdf`);
    } catch (e) {
      console.error(e);
      setError('Something went wrong generating the birthday board. Please try again.');
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
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Your class</h2>
            <p className="text-sm text-gray-500 mt-1">
              One child per line, as <code className="bg-gray-100 rounded px-1">Name, YYYY-MM-DD</code>.
            </p>
          </div>
          <textarea
            value={listText} onChange={(e) => setListText(e.target.value)}
            rows={10} placeholder={PLACEHOLDER} spellCheck={false}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

          {parsed.issues.length > 0 && (
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

          {preview.length > 0 && (
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
                    </span>
                    <span className="shrink-0 text-emerald-700">
                      {facts.isToday ? `turns ${facts.turning} today` : `turns ${facts.turning}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Output A — cards */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Birthday cards</h2>
            <p className="text-sm text-gray-500 mt-1">
              One page per child in a single PDF — name, birth date, the age they&apos;re turning,
              a photo slot and party decoration. Print the whole class in one go.
            </p>
          </div>
          <button
            type="button" onClick={handleCards} disabled={busy !== null}
            className="btn btn-primary btn-lg"
          >
            {busy === 'cards'
              ? 'Generating…'
              : `Generate ${preview.length || ''} card${preview.length === 1 ? '' : 's'} (one PDF)`}
          </button>
        </section>

        {/* Output B — tracker */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#0D3330] uppercase tracking-wide">Birthday board</h2>
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
            type="button" onClick={handleTracker} disabled={busy !== null}
            className="btn btn-gold btn-lg"
          >
            {busy === 'tracker' ? 'Generating…' : `Generate birthday board (${trackerSize})`}
          </button>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
