'use client';

// components/montree/super-admin/RecordIncomingWireModal.tsx
//
// Phase C — Inline form for recording an incoming SWIFT wire from a school
// on payment_method='manual_invoice'.
//
// Invoked from the SchoolsTab via ⚡ Record incoming wire button (shown only
// for schools on the manual_invoice rail). Same shape as the agent payout
// record-wire modal from Session 109 but inverse (we receive money).
//
// Submit → POST /api/montree/super-admin/schools/[id]/record-incoming-wire
//   → flips subscription_status='active'
//   → bumps current_period_end forward 30 (monthly) or 365 (annual) days
//   → writes income row(s) to montree_finance_transactions
//   → flips AI tier to premium
//   → audit log entry

import { useState } from 'react';

interface Props {
  schoolId: string;
  schoolName: string;
  token: string;
  onClose: () => void;
  onRecorded: (result: { wire_ref: string; usd_amount: number; new_period_end: string }) => void;
}

export default function RecordIncomingWireModal({
  schoolId,
  schoolName,
  token,
  onClose,
  onRecorded,
}: Props) {
  const [wireRef, setWireRef] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [currencyReceived, setCurrencyReceived] = useState('USD');
  const [fxRate, setFxRate] = useState('1.0');
  const [usdAmount, setUsdAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!wireRef.trim()) {
      setError('Wire reference is required.');
      return;
    }
    const usdNum = Number(usdAmount);
    if (Number.isNaN(usdNum) || usdNum <= 0) {
      setError('USD amount must be a positive number.');
      return;
    }
    const fxNum = Number(fxRate);
    if (Number.isNaN(fxNum) || fxNum <= 0) {
      setError('FX rate must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/montree/super-admin/schools/${schoolId}/record-incoming-wire`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            wire_ref: wireRef.trim(),
            paid_at: new Date(paidAt).toISOString(),
            currency_received: currencyReceived.trim().toUpperCase(),
            fx_rate_used: fxNum,
            usd_amount_received: usdNum,
            notes: notes.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Could not record wire.');
        setSubmitting(false);
        return;
      }
      onRecorded({
        wire_ref: data.wire_ref,
        usd_amount: data.usd_amount,
        new_period_end: data.new_period_end,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="bg-slate-900 border border-emerald-500/30 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-light text-white">⚡ Record incoming wire</h2>
            <p className="text-emerald-200/70 text-xs mt-0.5">
              {schoolName} · manual invoice rail
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-white/40 hover:text-white p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <Field
            label="Wire reference"
            hint="SWIFT memo / Wallex transfer ID — must match what the bank captured."
          >
            <input
              type="text"
              value={wireRef}
              onChange={(e) => setWireRef(e.target.value)}
              placeholder="MONTREE-C6280FAE-202606"
              autoFocus
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
            />
          </Field>

          <Field label="Paid on">
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-emerald-400"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency received">
              <input
                type="text"
                value={currencyReceived}
                onChange={(e) => setCurrencyReceived(e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                placeholder="USD"
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white uppercase tabular-nums focus:outline-none focus:border-emerald-400"
              />
            </Field>
            <Field label="FX rate to USD">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-emerald-400"
              />
            </Field>
          </div>

          <Field
            label="USD amount received"
            hint="Net amount landed in Wallex HK, in USD."
          >
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              placeholder="140.00"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white tabular-nums focus:outline-none focus:border-emerald-400"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. paid via DBS HK, treasurer Liu Mei"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-base sm:text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 resize-none"
            />
          </Field>

          {error && (
            <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 text-red-200 text-xs">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-3 sm:py-2 bg-white/5 hover:bg-white/10 text-white/80 text-sm rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-3 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Recording…' : 'Record wire'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-white/60 text-xs uppercase tracking-wider mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-white/40 text-xs mt-1">{hint}</span>}
    </label>
  );
}
