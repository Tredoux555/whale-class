'use client';

// components/cms/enroll/RowCard.tsx
// The chrome a REPEATED row wears — one allergy, one dietary requirement, one
// previous setting, one emergency contact. Four steps needed the same thing, so
// it is built once: a sunk plate, a quiet numbered caption, a Remove in the
// corner, and the fields inside.
//
// `RowList` is its sibling: the empty line, the rows, and the Add button, in
// the one order every list step uses. Neither knows what a row CONTAINS — that
// is the step's business.

import type { ReactNode } from 'react';
import { useT } from '@/lib/cms/i18n/provider';
import type { TranslationKey } from '@/lib/cms/i18n/t';

export function RowCard({
  titleKey,
  index,
  onRemove,
  children,
}: {
  /** Takes an `{n}` — "Allergy 2". The caption, not a heading: these rows are
   *  fields, and a page of <h3>s would drown the step's own title. */
  titleKey: TranslationKey;
  index: number;
  onRemove: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className="cms-card-sunk p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="cms-label">{t(titleKey, { n: index + 1 })}</span>
        <button
          type="button"
          className="cms-btn cms-btn-ghost cms-btn-chip ms-auto text-harbor-danger-deep"
          onClick={onRemove}
        >
          {t('common.remove')}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function RowList({
  rows,
  emptyKey,
  addKey,
  onAdd,
  canAdd = true,
}: {
  rows: ReactNode;
  emptyKey: TranslationKey;
  addKey: TranslationKey;
  onAdd: () => void;
  canAdd?: boolean;
}) {
  const t = useT();
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows;
  return (
    <div className="grid gap-3">
      {isEmpty ? (
        <p className="cms-card-sunk px-3.5 py-3 m-0 text-[12.5px] text-harbor-muted leading-relaxed">
          {t(emptyKey)}
        </p>
      ) : (
        rows
      )}
      <div>
        <button
          type="button"
          className="cms-btn cms-btn-ghost cms-btn-outline cms-btn-sm"
          onClick={onAdd}
          disabled={!canAdd}
        >
          {t(addKey)}
        </button>
      </div>
    </div>
  );
}

/** One field's error line. Same 11.5px scale as the help text it replaces in the
 *  reading order — the design system's invalid-field pattern (§9). */
export function FieldError({ messageKey }: { messageKey?: TranslationKey }) {
  const t = useT();
  if (!messageKey) return null;
  return (
    <span className="block text-[11.5px] text-harbor-danger-deep mt-1.5 leading-snug">
      {t(messageKey)}
    </span>
  );
}

/** `cms-input` plus the danger border when the field is in error. */
export function inputClass(hasError: boolean): string {
  return hasError ? 'cms-input !border-harbor-danger' : 'cms-input';
}

/** A checkbox the way CMS draws one: the control, then the label, then quiet
 *  help beneath — never a bare `<input type=checkbox>` at a call site. */
export function CheckField({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-[18px] h-[18px] accent-harbor-accent shrink-0 cursor-pointer"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-harbor-text leading-snug">
          {label}
        </span>
        {help ? (
          <span className="block text-[11.5px] text-harbor-muted mt-1 leading-snug">{help}</span>
        ) : null}
      </span>
    </label>
  );
}
