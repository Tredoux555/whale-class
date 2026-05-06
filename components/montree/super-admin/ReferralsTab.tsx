'use client';

// Super-admin Referrals tab.
//
// Tredoux issues a referral code per pitch. Each code is bound to an agent
// (teacher, multiplier, consultant — anyone) at a negotiated revenue share %.
// Plain code is shown ONCE on creation with a Copy button. After that the
// code lives in the table only as plaintext (super-admin only) plus on any
// school that redeemed it.
//
// Pending codes can be revoked. Redeemed codes are locked.

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Referral {
  id: string;
  code: string;
  agent_id: string | null;
  agent_display_name: string;
  agent_email: string;
  agent_pitch_label: string | null;
  revenue_share_pct: number;
  status: 'pending' | 'redeemed' | 'revoked' | 'expired';
  redeemed_by_school_id: string | null;
  redeemed_by_school_name: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  created_at: string;
  notes: string | null;
}

interface ReferralsTabProps {
  saToken: string;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_PILL: Record<Referral['status'], { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  redeemed: { label: 'Redeemed', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  revoked: { label: 'Revoked', cls: 'bg-slate-700 text-slate-400 border-slate-600' },
  expired: { label: 'Expired', cls: 'bg-slate-700 text-slate-400 border-slate-600' },
};

export default function ReferralsTab({ saToken }: ReferralsTabProps) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Issue-code form state.
  const [showForm, setShowForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [pct, setPct] = useState('50');
  const [pitchLabel, setPitchLabel] = useState('');
  const [creating, setCreating] = useState(false);

  // Reveal-once banner state.
  const [revealed, setRevealed] = useState<{ code: string; agent: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters.
  const [statusFilter, setStatusFilter] = useState<'all' | Referral['status']>('all');

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-super-admin-token': saToken,
    }),
    [saToken]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/referral-codes', {
        headers: { 'x-super-admin-token': saToken },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReferrals(data.codes || []);
    } catch (err) {
      console.error('[ReferralsTab] load error:', err);
      setError('Could not load referral codes.');
    } finally {
      setLoading(false);
    }
  }, [saToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentEmail.trim()) return;
    const pctNum = Number(pct);
    if (Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
      setError('Revenue share % must be between 0 and 100.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/referral-codes', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          agent_display_name: agentName.trim(),
          agent_email: agentEmail.trim().toLowerCase(),
          revenue_share_pct: pctNum,
          agent_pitch_label: pitchLabel.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create code.');
        return;
      }
      setRevealed({ code: data.code, agent: data.referral.agent_display_name });
      setCopied(false);
      // Reset form
      setAgentName('');
      setAgentEmail('');
      setPct('50');
      setPitchLabel('');
      setShowForm(false);
      await load();
    } catch (err) {
      console.error('[ReferralsTab] create error:', err);
      setError('Network error creating code.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, code: string) => {
    if (!confirm(`Revoke code ${code}? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/referral-codes?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': saToken },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not revoke code.');
        return;
      }
      await load();
    } catch (err) {
      console.error('[ReferralsTab] revoke error:', err);
      setError('Network error revoking code.');
    }
  };

  const copy = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers — fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return referrals;
    return referrals.filter(r => r.status === statusFilter);
  }, [referrals, statusFilter]);

  const counts = useMemo(() => ({
    pending: referrals.filter(r => r.status === 'pending').length,
    redeemed: referrals.filter(r => r.status === 'redeemed').length,
    revoked: referrals.filter(r => r.status === 'revoked').length,
  }), [referrals]);

  return (
    <div className="space-y-4">
      {/* Reveal banner (shown once after creation) */}
      {revealed && (
        <div className="bg-emerald-500/15 border-2 border-emerald-500/50 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-emerald-200 text-xs uppercase tracking-wider font-semibold mb-1">
                Code created — copy it now
              </p>
              <p className="text-white text-sm mb-2">
                For <span className="font-semibold">{revealed.agent}</span>. This is the only time
                the code is shown — once dismissed you can still see it in the table below, but
                share it with the agent now while it&apos;s at hand.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <code className="px-4 py-2.5 bg-black/40 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono text-lg tracking-wider">
                  {revealed.code}
                </code>
                <button
                  onClick={() => copy(revealed.code)}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => { setRevealed(null); setCopied(false); }}
              className="text-slate-400 hover:text-white text-sm self-start"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Header + new button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            🎟️ Referral codes
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {counts.pending} pending · {counts.redeemed} redeemed · {counts.revoked} revoked
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {showForm ? 'Cancel' : '+ Issue code'}
        </button>
      </div>

      {/* Issue form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                Agent name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Sarah Johnson"
                required
                autoFocus
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                Used for the code prefix (first word). E.g. &quot;Sarah&quot; → SARAH-XXXX.
              </p>
            </div>
            <div>
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                Agent email
              </label>
              <input
                type="email"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                placeholder="sarah@example.com"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                Revenue share %
              </label>
              <input
                type="number"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                min="0"
                max="100"
                step="1"
                required
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                Of net profit (after API costs and Stripe fees).
              </p>
            </div>
            <div>
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                Pitch label <span className="text-slate-500 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={pitchLabel}
                onChange={(e) => setPitchLabel(e.target.value)}
                placeholder="Greenfield Montessori — May 2026"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-400 hover:text-white text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating…' : 'Generate code'}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'redeemed', 'revoked'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {s === 'all' ? `All (${referrals.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl py-10 text-center text-slate-400">
          {referrals.length === 0
            ? 'No referral codes yet. Issue one to get started.'
            : `No codes with status "${statusFilter}".`}
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 text-left">Code</th>
                  <th className="px-3 py-3 text-left">Agent</th>
                  <th className="px-3 py-3 text-right">%</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">School</th>
                  <th className="px-3 py-3 text-left">Pitch</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filtered.map(r => {
                  const pill = STATUS_PILL[r.status];
                  return (
                    <tr key={r.id} className="hover:bg-slate-700/20">
                      <td className="px-3 py-3 font-mono text-emerald-300">{r.code}</td>
                      <td className="px-3 py-3 text-white">
                        <div>{r.agent_display_name}</div>
                        <div className="text-slate-400 text-xs">{r.agent_email}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-white tabular-nums">
                        {Number(r.revenue_share_pct).toFixed(0)}%
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${pill.cls}`}>
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {r.redeemed_by_school_name || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs max-w-[200px] truncate">
                        {r.agent_pitch_label || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => copy(r.code)}
                          className="px-2.5 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 mr-1"
                          title="Copy code"
                        >
                          📋
                        </button>
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleRevoke(r.id, r.code)}
                            className="px-2.5 py-1 text-xs rounded-md bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/30"
                            title="Revoke code"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hint */}
      <p className="text-slate-500 text-xs">
        Share the code with the agent. They give it to the school to enter at signup
        (or send a direct link <code className="text-slate-400">montree.xyz/montree/try?ref=CODE</code>).
        Once redeemed the school is permanently linked to the agent.
      </p>
    </div>
  );
}
