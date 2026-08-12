'use client';

// components/cms/teacher/PasteImport.tsx
// ============================================================================
// "I'm itching to put my class list in." This is that box. Phase 4.
// ============================================================================
// A teacher pastes whatever is on their clipboard — a Word table, a WhatsApp
// message, a column out of a spreadsheet, last year's register — and gets a
// PREVIEW TABLE before a single row is written.
//
// The preview is the whole design. Nothing here writes on parse; the teacher
// reads what the parser understood, fixes the two lines it got wrong, removes
// the one that was a header row, and only then presses the button. A paste
// importer that writes first and apologises afterwards is a paste importer
// nobody uses twice.
//
// Parsing is `lib/cms/engine/paste-parser` — the SAME pure function the server
// would reach for, so what the teacher sees in the preview is exactly what the
// import writes. The route re-validates; this validates for the message.

import { useMemo, useState } from 'react';
import { Card } from '@/components/cms/Card';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  parseRoster,
  type DateOrder,
  type ParseIssue,
  type ParsedRosterLine,
} from '@/lib/cms/engine/paste-parser';

/** A preview row: what the parser said, plus whatever the teacher edited. */
interface PreviewRow {
  key: string;
  line: number;
  name: string;
  dateOfBirth: string;
  issues: ParseIssue[];
  dateText: string | null;
}

const ISSUE_KEY: Record<ParseIssue, TranslationKey> = {
  no_name: 'teacher.roster.issue.no_name',
  bad_date: 'teacher.roster.issue.bad_date',
  ambiguous_date: 'teacher.roster.issue.ambiguous_date',
  future_date: 'teacher.roster.issue.future_date',
  implausible_age: 'teacher.roster.issue.implausible_age',
  duplicate_in_paste: 'teacher.roster.issue.duplicate_in_paste',
};

function toPreview(lines: ParsedRosterLine[]): PreviewRow[] {
  return lines.map((line, i) => ({
    key: `${line.line}-${i}`,
    line: line.line,
    name: line.name,
    dateOfBirth: line.dateOfBirth ?? '',
    issues: line.issues,
    dateText: line.dateText,
  }));
}

function ageOf(dateOfBirth: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) years -= 1;
  return years >= 0 && years < 100 ? years : null;
}

export interface PasteImportProps {
  /** Writes the rows. Resolves with what actually happened. */
  onImport: (
    rows: { name: string; dateOfBirth: string }[]
  ) => Promise<{ ok: boolean; created: number; skipped: number; error?: string }>;
  disabled?: boolean;
}

/** The preview table's column heading. Same 11px uppercase rhythm as
 *  `.cms-label`, without that class's `display: block`. */
const HEAD =
  'text-start pb-2 pe-3 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-harbor-muted align-bottom';

export function PasteImport({ onImport, disabled = false }: PasteImportProps) {
  const t = useT();
  const [text, setText] = useState('');
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const usable = useMemo(() => (rows ?? []).filter((r) => r.name.trim()), [rows]);
  const needsAttention = useMemo(
    () => (rows ?? []).filter((r) => r.issues.length > 0).length,
    [rows]
  );

  function read() {
    const parsed = parseRoster(text, { dateOrder });
    setRows(toPreview(parsed.lines));
    setMessage(null);
    setFailed(false);
  }

  function patch(key: string, next: Partial<PreviewRow>) {
    setRows((prev) => (prev ?? []).map((r) => (r.key === key ? { ...r, ...next } : r)));
  }

  function drop(key: string) {
    setRows((prev) => (prev ?? []).filter((r) => r.key !== key));
  }

  async function confirm() {
    if (usable.length === 0 || busy) return;
    setBusy(true);
    setMessage(null);
    setFailed(false);
    const result = await onImport(
      usable.map((r) => ({ name: r.name, dateOfBirth: r.dateOfBirth }))
    );
    setBusy(false);
    if (!result.ok) {
      setFailed(true);
      setMessage(t('teacher.roster.saveError'));
      return;
    }
    // Report BOTH halves. "Added 18, skipped 2 already in this room" is the
    // sentence that proves a re-paste did the right thing; a bare "Added 18"
    // leaves the teacher wondering where the other two went.
    setMessage(
      result.created === 0
        ? t('teacher.roster.importedNone')
        : result.skipped > 0
          ? t('teacher.roster.importedSkipped', {
              count: result.created,
              skipped: result.skipped,
            })
          : t('teacher.roster.imported', { count: result.created })
    );
    setRows(null);
    setText('');
  }

  return (
    <Card className="mb-5">
      <h2 className="font-head text-[18px] m-0">{t('teacher.roster.paste.title')}</h2>
      <p className="text-[13px] text-harbor-muted mt-1.5 mb-4 leading-relaxed max-w-[68ch]">
        {t('teacher.roster.paste.body')}
      </p>

      {rows === null ? (
        <>
          <textarea
            className="cms-input min-h-[150px] font-mono text-[13px]"
            dir="auto"
            spellCheck={false}
            value={text}
            placeholder={t('teacher.roster.paste.placeholder')}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('teacher.roster.paste.title')}
            disabled={disabled}
          />
          <div className="flex flex-wrap items-center gap-3 mt-3.5">
            <button
              type="button"
              className="cms-btn cms-btn-primary cms-btn-md"
              onClick={read}
              disabled={disabled || !text.trim()}
            >
              {t('teacher.roster.paste.read')}
            </button>
            <label className="flex items-center gap-2 text-[12.5px] text-harbor-muted">
              <span>{t('teacher.roster.paste.dateOrder')}</span>
              <select
                className="cms-input !w-auto !py-1.5 text-[12.5px]"
                value={dateOrder}
                onChange={(e) => setDateOrder(e.target.value as DateOrder)}
                aria-label={t('teacher.roster.paste.dateOrder')}
              >
                <option value="dmy">{t('teacher.roster.paste.dmy')}</option>
                <option value="mdy">{t('teacher.roster.paste.mdy')}</option>
              </select>
            </label>
            {text.trim() ? (
              <button
                type="button"
                className="cms-btn cms-btn-ghost cms-btn-sm"
                onClick={() => setText('')}
              >
                {t('teacher.roster.paste.clear')}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <h3 className="font-head text-[15.5px] m-0">
              {t('teacher.roster.preview.title')}
            </h3>
            {needsAttention > 0 ? (
              <span className="cms-tag cms-tone-amber">
                {t('teacher.roster.preview.attention', { count: needsAttention })}
              </span>
            ) : null}
          </div>
          <p className="text-[12.5px] text-harbor-muted mt-0 mb-4 leading-relaxed">
            {t('teacher.roster.preview.body', { count: rows.length })}
          </p>

          <div className="overflow-x-auto">
            {/* 🚨 NOT `.cms-label` on a <th>. That class is display:block (it is
                the stacked caption above a field), and on a table header it
                collapses every column into one — the whole grid folds. The
                heading style is spelled out here instead. */}
            <table className="w-full border-collapse text-[13px] table-fixed min-w-[38rem]">
              <thead>
                <tr>
                  <th className={HEAD} style={{ width: '3rem' }}>#</th>
                  <th className={HEAD} style={{ width: '42%' }}>
                    {t('teacher.roster.preview.name')}
                  </th>
                  <th className={HEAD} style={{ width: '11rem' }}>
                    {t('teacher.roster.preview.dob')}
                  </th>
                  <th className={HEAD} style={{ width: '4rem' }}>
                    {t('teacher.roster.preview.age')}
                  </th>
                  <th className="pb-2" style={{ width: '5.5rem' }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const age = ageOf(row.dateOfBirth);
                  return (
                    <tr key={row.key} className="border-t border-harbor-border align-top">
                      <td className="py-2 pe-3 text-[11.5px] text-harbor-muted whitespace-nowrap">
                        {row.line}
                      </td>
                      <td className="py-2 pe-3">
                        <input
                          className={
                            row.name.trim() ? 'cms-input' : 'cms-input !border-harbor-danger'
                          }
                          dir="auto"
                          value={row.name}
                          aria-label={t('teacher.roster.preview.name')}
                          onChange={(e) => patch(row.key, { name: e.target.value })}
                        />
                        {row.issues.length > 0 ? (
                          <span className="block text-[11.5px] text-harbor-amber-deep mt-1.5 leading-snug">
                            {row.issues
                              .map((issue) =>
                                t(ISSUE_KEY[issue], {
                                  text: row.dateText ?? '',
                                  date: row.dateOfBirth,
                                  years: age ?? 0,
                                })
                              )
                              .join(' · ')}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pe-3">
                        <input
                          className="cms-input"
                          type="date"
                          dir="ltr"
                          value={row.dateOfBirth}
                          aria-label={t('teacher.roster.preview.dob')}
                          onChange={(e) => patch(row.key, { dateOfBirth: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pe-3 text-harbor-muted whitespace-nowrap pt-4">
                        {age === null ? t('doc.none') : age}
                      </td>
                      <td className="py-2 pt-3">
                        <button
                          type="button"
                          className="cms-btn cms-btn-ghost cms-btn-chip text-harbor-danger-deep"
                          onClick={() => drop(row.key)}
                        >
                          {t('teacher.roster.preview.remove')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <button
              type="button"
              className="cms-btn cms-btn-primary cms-btn-md"
              onClick={confirm}
              disabled={busy || disabled || usable.length === 0}
            >
              {busy
                ? t('teacher.roster.importing')
                : t('teacher.roster.preview.confirm', { count: usable.length })}
            </button>
            <button
              type="button"
              className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-sm"
              onClick={() => setRows(null)}
              disabled={busy}
            >
              {t('teacher.roster.preview.cancel')}
            </button>
          </div>
        </div>
      )}

      {message ? (
        <p
          role="status"
          className={`text-[12.5px] mt-3.5 mb-0 ${
            failed ? 'text-harbor-danger-deep' : 'text-harbor-success'
          }`}
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
