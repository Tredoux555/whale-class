'use client';

// /components/montree/super-admin/BillingOverrideModal.tsx
//
// Per-school billing override editor (migration 202). Super-admin sets a
// custom per-student price (e.g. $5 for early adopters) instead of the
// platform default ($7). Set null to clear the override and return to
// the default rate.
//
// When the override is set on a school with an active Stripe subscription,
// the PATCH route fires syncSubscriptionQuantity in the background so the
// Price swaps on Stripe — see app/api/montree/super-admin/schools/route.ts.
//
// Architectural rule (Session 107):
//   * billing_override_usd is the SOLE per-school rate signal. Never hardcode
//     a school's price anywhere else.
//   * The override is recorded with a free-text note for audit ("Early
//     adopter through Jun 2027"). The note is principal-invisible.

import { useEffect, useState } from 'react';

interface BillingOverrideModalProps {
  schoolId: string;
  schoolName: string;
  currentOverrideUsd: number | string | null | undefined;
  currentNote: string | null | undefined;
  defaultPriceUsd: number;  // platform default ($7) — surfaced so super admin sees both
  sessionToken: string;
  onClose: () => void;
  /**
   * Called with the saved values after a successful PATCH. Pass null for
   * `override` to indicate the override was cleared (school back to default).
   * SchoolsTab uses this for optimistic display updates.
   */
  onSaved: (override: number | null, note: string | null) => void;
}

export default function BillingOverrideModal({
  schoolId,
  schoolName,
  currentOverrideUsd,
  currentNote,
  defaultPriceUsd,
  sessionToken,
  onClose,
  onSaved,
}: BillingOverrideModalProps) {
  const [overrideStr, setOverrideStr] = useState<string>(
    currentOverrideUsd != null ? String(currentOverrideUsd) : ''
  );
  const [note, setNote] = useState<string>(currentNote || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const parsedOverride = overrideStr.trim() === '' ? null : Number(overrideStr);
  const overrideIsValid =
    parsedOverride === null ||
    (!Number.isNaN(parsedOverride) && parsedOverride >= 0 && parsedOverride <= 100);

  const submit = async (clear: boolean = false) => {
    setError(null);
    setSaving(true);
    try {
      const savedOverride: number | null = clear ? null : parsedOverride;
      const savedNote: string | null = clear ? null : (note.trim() || null);
      const body: Record<string, unknown> = {
        schoolId,
        billing_override_usd: savedOverride,
        billing_override_note: savedNote,
      };
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      onSaved(savedOverride, savedNote);
      onClose();
    } catch (e) {
      console.error('[BillingOverrideModal] save failed:', e);
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const hasExistingOverride = currentOverrideUsd !== null && currentOverrideUsd !== undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Billing override</h2>
            <p className="text-xs text-slate-400 mt-1">{schoolName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-slate-500 hover:text-white text-xl leading-none disabled:opacity-40"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-xs text-slate-300">
            <p>Platform default: <span className="text-emerald-300 font-mono">${defaultPriceUsd.toFixed(2)}</span>/student/month.</p>
            <p className="mt-1 text-slate-500">
              Set a custom rate to charge this school differently. Leave blank to use the default.
            </p>
          </div>

          <div>
            <label htmlFor="override-usd" className="block text-xs text-slate-300 mb-1">
              Custom rate (USD per student per month)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">$</span>
              <input
                id="override-usd"
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder={`${defaultPriceUsd.toFixed(2)} (default)`}
                value={overrideStr}
                onChange={(e) => setOverrideStr(e.target.value)}
                disabled={saving}
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500 text-xs">/student/mo</span>
            </div>
            {!overrideIsValid && (
              <p className="text-red-400 text-xs mt-1">Must be a number between 0 and 100.</p>
            )}
          </div>

          <div>
            <label htmlFor="override-note" className="block text-xs text-slate-300 mb-1">
              Note <span className="text-slate-500">(super-admin only — invisible to the school)</span>
            </label>
            <input
              id="override-note"
              type="text"
              maxLength={200}
              placeholder="e.g. Early adopter through Jun 2027"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-slate-500 text-[10px] mt-1">{note.length}/200</p>
          </div>

          {parsedOverride !== null && overrideIsValid && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-100 text-xs">
              <p className="font-medium">Preview</p>
              <p className="mt-1">
                This school will be charged <span className="font-mono">${parsedOverride.toFixed(2)}</span>/student/month
                {parsedOverride < defaultPriceUsd && (
                  <span className="text-amber-300"> (${(defaultPriceUsd - parsedOverride).toFixed(2)} below default)</span>
                )}
                {parsedOverride > defaultPriceUsd && (
                  <span className="text-amber-300"> (${(parsedOverride - defaultPriceUsd).toFixed(2)} above default)</span>
                )}
                .
              </p>
              <p className="mt-1 text-amber-200/80">
                If they already have an active Stripe subscription, the price swaps on next sync (with proration).
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          {hasExistingOverride ? (
            <button
              onClick={() => submit(true)}
              disabled={saving}
              className="text-xs text-red-300 hover:text-red-200 underline disabled:opacity-40"
            >
              Clear override
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => submit(false)}
              disabled={saving || !overrideIsValid || overrideStr.trim() === ''}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium"
            >
              {saving ? 'Saving…' : 'Save override'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
