'use client';

// components/cms/teacher/RosterEditor.tsx
// ============================================================================
// The roster list, and the state that owns it. Phase 4.
// ============================================================================
// One client island for the whole page. It holds three things and no more:
// which room is showing, which child is open, and whatever the open child's
// form currently says. Everything else — the children, their chips, whether a
// family owns the record — arrives as props from the server component and is
// re-fetched with `router.refresh()` after a write, so there is exactly one
// source of truth and it is the database.
//
// The row itself is a summary a teacher can read at a stride: the name, the
// age, the allergy chips (severe first, tinted by the shared FlagCategory
// scale), an EpiPen badge, the dietary labels, the contact count. Everything a
// document prints is visible before the row is opened, which is the point —
// "does my pickup sheet have a phone number for Layla?" should be answerable
// by scrolling, not by opening twenty rows.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar } from '@/components/cms/Avatar';
import { Card } from '@/components/cms/Card';
import { Tag } from '@/components/cms/Chip';
import { PlusIcon } from '@/components/cms/icons';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';
import {
  EMPTY_ROSTER_CHILD,
  errorPath,
  validateRosterChild,
  type RosterChildValues,
} from '@/lib/cms/validation';
import { ChildEditor } from './ChildEditor';
import { PasteImport } from './PasteImport';
import type { RosterChildRow, RosterRoomOption } from './roster-shapes';

/**
 * Field path → the message key the teacher reads.
 *
 * 🚨 The server's own English messages are NEVER rendered (I18N LAW). They are
 * for logs and API consumers; the UI maps the FIELD to a key and translates.
 * Row fields are keyed by their index-free path (`allergies.#.severity`), so
 * nine allergy rows still need one line here.
 */
const FIELD_ERROR_KEY: Record<string, TranslationKey> = {
  preferredName: 'teacher.roster.error.preferredName',
  dateOfBirth: 'enrol.error.dateOfBirth',
  rows: 'teacher.roster.error.rows',
  allergies: 'enrol.error.tooMany',
  'allergies.#.allergen': 'enrol.error.allergies.allergen',
  'allergies.#.severity': 'enrol.error.allergies.severity',
  dietary: 'enrol.error.tooMany',
  'dietary.#.label': 'enrol.error.requirements.label',
  'dietary.#.reason': 'enrol.error.requirements.reason',
  contacts: 'enrol.error.tooMany',
  'contacts.#.fullName': 'enrol.error.contacts.fullName',
  'contacts.#.relationship': 'enrol.error.contacts.relationship',
  'contacts.#.phone': 'enrol.error.contacts.phone',
  'contacts.#.email': 'enrol.error.contacts.email',
};

function toFieldErrors(fields: { field: string }[]): Record<string, TranslationKey> {
  const mapped: Record<string, TranslationKey> = {};
  for (const f of fields) {
    const key = FIELD_ERROR_KEY[errorPath(f.field)];
    if (key) mapped[f.field] = key;
  }
  return mapped;
}

export interface RosterEditorProps {
  rooms: RosterRoomOption[];
  activeRoomId: string;
  /** Deliberately NOT called `children` — these are roster rows, not JSX, and
   *  a prop named `children` on a component that renders none is a trap. */
  rows: RosterChildRow[];
  /** Demo mode renders the seed read-only, banner and all. */
  readOnly?: boolean;
}

export function RosterEditor({
  rooms,
  activeRoomId,
  rows,
  readOnly = false,
}: RosterEditorProps) {
  const t = useT();
  const router = useRouter();

  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RosterChildValues>(EMPTY_ROSTER_CHILD);
  const [errors, setErrors] = useState<Record<string, TranslationKey>>({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);

  async function post(body: Record<string, unknown>) {
    const response = await fetch('/api/cms/roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classGroupId: activeRoomId, ...body }),
    });
    // JSON-before-OK: the server can return an HTML error page, and parsing it
    // as JSON would throw a error that reads nothing like the real problem.
    const payload = response.ok || response.status === 400 || response.status === 403
      ? await response.json().catch(() => null)
      : null;
    return { ok: response.ok, status: response.status, payload };
  }

  function openChild(row: RosterChildRow) {
    if (openId === row.id) {
      setOpenId(null);
      return;
    }
    setAdding(false);
    setOpenId(row.id);
    setDraft(row.values);
    setErrors({});
    setBanner(null);
  }

  function startAdd() {
    setOpenId(null);
    setAdding(true);
    setDraft({ ...EMPTY_ROSTER_CHILD });
    setErrors({});
    setBanner(null);
  }

  async function save(action: 'create' | 'update', childId?: string) {
    // Client validates for the message; the route validates for real. Both
    // call the same function, so they can never disagree about what is valid.
    const check = validateRosterChild(draft);
    if (!check.ok) {
      setErrors(toFieldErrors(check.errors));
      setBanner({ tone: 'bad', text: t('teacher.roster.saveError') });
      return;
    }
    setSaving(true);
    setErrors({});
    const { ok, payload } = await post({ action, childId, values: draft });
    setSaving(false);

    if (!ok) {
      if (payload?.error === 'invalid' && Array.isArray(payload.fields)) {
        setErrors(toFieldErrors(payload.fields as { field: string }[]));
      }
      setBanner({
        tone: 'bad',
        text:
          payload?.error === 'family_owned'
            ? t('teacher.roster.locked.body')
            : t('teacher.roster.saveError'),
      });
      return;
    }

    setBanner({ tone: 'ok', text: t('teacher.roster.saved') });
    setOpenId(null);
    setAdding(false);
    router.refresh();
  }

  async function importRows(rows: { name: string; dateOfBirth: string }[]) {
    const { ok, payload } = await post({ action: 'import', rows });
    if (ok) router.refresh();
    return {
      ok,
      created: Number(payload?.created ?? 0),
      skipped: Array.isArray(payload?.skipped) ? payload.skipped.length : 0,
      error: payload?.error as string | undefined,
    };
  }

  return (
    <>
      {rooms.length > 1 ? (
        <nav
          aria-label={t('teacher.roster.room')}
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          <span className="cms-label !mb-0">{t('teacher.roster.room')}</span>
          {rooms.map((room) => (
            <a
              key={room.id}
              href={`/cms/teacher/roster?room=${encodeURIComponent(room.id)}`}
              className={`cms-btn cms-btn-chip ${
                room.id === activeRoomId
                  ? 'cms-btn-primary cms-btn-soft'
                  : 'cms-btn-ghost cms-btn-outline'
              }`}
            >
              {room.name}
            </a>
          ))}
        </nav>
      ) : null}

      {readOnly ? null : (
        <PasteImport onImport={importRows} disabled={saving} />
      )}

      {banner ? (
        <p
          role="status"
          className={`cms-card-sunk px-3.5 py-2.5 text-[12.5px] mb-4 ${
            banner.tone === 'bad' ? 'text-harbor-danger-deep' : 'text-harbor-success'
          }`}
        >
          {banner.text}
        </p>
      ) : null}

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="font-head text-[18px] m-0">{t('teacher.roster.title')}</h2>
            <p className="text-[12.5px] text-harbor-muted m-0 mt-1">
              {t('teacher.roster.count', { count: rows.length })}
            </p>
          </div>
          {readOnly ? null : (
            <button
              type="button"
              className="cms-btn cms-btn-accent cms-btn-sm"
              onClick={startAdd}
            >
              <PlusIcon />
              {t('teacher.roster.addChild')}
            </button>
          )}
        </div>

        {adding ? (
          <div className="px-5 pb-5 pt-4 bg-harbor-sunk border-y border-harbor-border">
            <h3 className="font-head text-[16px] m-0 mb-4">{t('teacher.roster.addChild')}</h3>
            <ChildEditor
              values={draft}
              onChange={setDraft}
              errors={errors}
              saving={saving}
              autoFocus
              saveLabelKey="teacher.roster.addChild.save"
              onSave={() => save('create')}
              onCancel={() => setAdding(false)}
            />
          </div>
        ) : null}

        {rows.length === 0 && !adding ? (
          <div className="px-5 py-10 text-center border-t border-harbor-border">
            <h3 className="font-head text-[17px] m-0">{t('teacher.roster.empty.title')}</h3>
            <p className="text-[13px] text-harbor-muted mt-2 mb-0 leading-relaxed max-w-[52ch] mx-auto">
              {t('teacher.roster.empty.body')}
            </p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 border-t border-harbor-border">
            {rows.map((row) => (
              <li key={row.id} className="border-b border-harbor-border last:border-b-0">
                <div className="flex flex-wrap items-center gap-2.5 px-5 py-3">
                  <Avatar name={row.preferredName} size="sm" quiet />
                  <span
                    dir="auto"
                    className="min-w-[9rem] flex-1 text-[13.5px] font-semibold truncate"
                  >
                    {row.preferredName}
                    {row.surname ? (
                      <span className="font-normal text-harbor-muted"> {row.surname}</span>
                    ) : null}
                  </span>

                  <span className="text-[12px] text-harbor-muted whitespace-nowrap tabular-nums">
                    {row.ageYears === null
                      ? t('teacher.roster.dobUnknown')
                      : t('doc.ageYears', { years: row.ageYears })}
                  </span>

                  <span className="flex flex-wrap items-center justify-end gap-1.5">
                    {row.allergyChips.map((chip, i) => (
                      <Tag
                        key={`${row.id}-a-${i}`}
                        category="allergy"
                        detail={t(
                          chip.severity === 'severe'
                            ? 'teacher.today.severity.severe'
                            : chip.severity === 'moderate'
                              ? 'teacher.today.severity.moderate'
                              : 'teacher.today.severity.mild'
                        )}
                        withIcon
                      >
                        {chip.label}
                      </Tag>
                    ))}
                    {row.carriesEpipen ? (
                      <span className="cms-tag cms-tone-danger font-semibold">
                        {t('doc.classList.epipen')}
                      </span>
                    ) : null}
                    {row.dietaryChips.map((label, i) => (
                      <Tag key={`${row.id}-d-${i}`} category="dietary">
                        {label}
                      </Tag>
                    ))}
                    {row.contactCount > 0 ? (
                      <span className="cms-tag cms-tone-quiet">
                        {t('teacher.documents.count.contacts', { count: row.contactCount })}
                      </span>
                    ) : null}
                    {row.allergyChips.length === 0 &&
                    row.dietaryChips.length === 0 &&
                    row.contactCount === 0 ? (
                      <span className="cms-tag cms-tone-quiet">
                        {t('teacher.roster.nothingYet')}
                      </span>
                    ) : null}

                    {readOnly ? null : row.familyOwned ? (
                      <span
                        className="cms-tag cms-tone-accent"
                        title={t('teacher.roster.locked.body')}
                      >
                        {t('teacher.roster.locked')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="cms-btn cms-btn-ghost cms-btn-chip cms-btn-outline shrink-0"
                        aria-expanded={openId === row.id}
                        onClick={() => openChild(row)}
                      >
                        {openId === row.id ? t('teacher.roster.close') : t('teacher.roster.open')}
                      </button>
                    )}
                  </span>
                </div>

                {row.staffNote ? (
                  <p
                    dir="auto"
                    className="px-5 pb-3 -mt-1 m-0 text-[12px] text-harbor-muted leading-snug"
                  >
                    {row.staffNote}
                  </p>
                ) : null}

                {openId === row.id ? (
                  <div className="px-5 pt-4 pb-5 bg-harbor-sunk border-t border-harbor-border">
                    <ChildEditor
                      values={draft}
                      onChange={setDraft}
                      errors={errors}
                      saving={saving}
                      onSave={() => save('update', row.id)}
                      onCancel={() => setOpenId(null)}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
