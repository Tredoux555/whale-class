'use client';

// app/montree/agent/codes/page.tsx
//
// Phase 7c — Agent's referral codes — full management. Self-service "Generate
// new code" requires a pitch label, generates at the agent's locked default %
// (not editable client-side). Pending codes can be revoked. Redeemed codes
// are locked.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Code {
  id: string;
  code: string;
  agent_pitch_label: string | null;
  revenue_share_pct: number;
  status: 'pending' | 'redeemed' | 'revoked' | 'expired';
  redeemed_by_school_id: string | null;
  redeemed_by_school_name: string | null;
  redeemed_at: string | null;
  created_at: string;
}

interface MeResponse {
  agent: { agent_default_share_pct: number | null };
}

const fmtDate = (d: string | null): string => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function AgentCodesPage() {
  const [codes, setCodes] = useState<Code[] | null>(null);
  const [defaultPct, setDefaultPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | Code['status']>('all');

  const [pitchLabel, setPitchLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [revealed, setRevealed] = useState<{ code: string; pitch: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [codesRes, meRes] = await Promise.all([
        fetch('/api/montree/agent/codes'),
        fetch('/api/montree/agent/me'),
      ]);
      if (!codesRes.ok) {
        if (codesRes.status === 401) {
          window.location.href = '/montree/login-select';
          return;
        }
        const t = await codesRes.text();
        setError(t.slice(0, 200));
        return;
      }
      const data = await codesRes.json();
      setCodes(data.codes || []);
      if (meRes.ok) {
        const meData: MeResponse = await meRes.json();
        setDefaultPct(meData.agent?.agent_default_share_pct ?? null);
      }
    } catch (e) {
      console.error('[codes] load error:', e);
      setError('Could not load codes.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!codes) return [];
    if (statusFilter === 'all') return codes;
    return codes.filter(c => c.status === statusFilter);
  }, [codes, statusFilter]);

  const counts = useMemo(() => ({
    pending: codes?.filter(c => c.status === 'pending').length || 0,
    redeemed: codes?.filter(c => c.status === 'redeemed').length || 0,
  }), [codes]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pitchLabel.trim() || pitchLabel.trim().length < 3) {
      setError('Add a short pitch label so you remember which school this is for.');
      return;
    }
    if (defaultPct === null) {
      setError('Self-service code generation is currently disabled. Reach out to Tredoux.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_pitch_label: pitchLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Could not generate code.');
        return;
      }
      setRevealed({ code: data.code, pitch: pitchLabel.trim() });
      setCopied(false);
      setPitchLabel('');
      await load();
    } catch (err) {
      console.error('[codes] generate error:', err);
      setError('Network error.');
    } finally {
      setGenerating(false);
    }
  };

  const revoke = async (id: string, code: string) => {
    if (!confirm(`Revoke ${code}? This cannot be undone — the code will stop working immediately.`)) return;
    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/montree/agent/codes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not revoke.');
        return;
      }
      await load();
    } catch (err) {
      console.error('[codes] revoke error:', err);
      setError('Network error.');
    } finally {
      setRevokingId(null);
    }
  };

  const copy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link href="/montree/agent/dashboard" className="text-emerald-300/70 hover:text-emerald-200 text-xs">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-3xl sm:text-4xl font-light text-white tracking-tight">Codes</h1>
      <p className="mt-2 text-emerald-200/60 text-sm">
        Each code is one pitch. Once a school redeems it, the link is permanent and you earn share on their subscription for as long as they pay.
      </p>

      {/* Reveal banner */}
      {revealed && (
        <div className="mt-6 bg-emerald-500/15 border-2 border-emerald-500/50 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="text-emerald-200 text-xs uppercase tracking-wider font-semibold mb-1">
                New code created
              </p>
              <p className="text-white text-sm">
                For: <span className="font-medium">{revealed.pitch}</span>
              </p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <code className="px-4 py-2.5 bg-black/40 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono text-lg tracking-wider">
                  {revealed.code}
                </code>
                <button
                  onClick={() => copy(revealed.code)}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => copy(`Try Montree free for a month: https://montree.xyz/montree/try?ref=${revealed.code}`)}
                  className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  Copy share link
                </button>
              </div>
              <p className="mt-2 text-white/50 text-xs">
                Share with the school. They enter the code at <code className="text-emerald-300/80">montree.xyz</code> or use the share link to skip straight to signup.
              </p>
            </div>
            <button
              onClick={() => setRevealed(null)}
              className="text-slate-400 hover:text-white text-sm"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Self-service form */}
      <section className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-white text-lg font-light">Generate a new code</h2>
        <p className="mt-1 text-emerald-200/60 text-xs">
          {defaultPct === null ? (
            <>Self-service code generation is currently disabled. Reach out to Tredoux to get this turned on.</>
          ) : (
            <>Codes are generated at your locked share of <span className="text-amber-300 font-medium">{defaultPct}%</span>. To negotiate a different rate for a particular school, ask Tredoux to issue that one specially.</>
          )}
        </p>

        <form onSubmit={generate} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={pitchLabel}
            onChange={(e) => setPitchLabel(e.target.value)}
            placeholder="e.g. Greenfield Montessori — May 2026"
            disabled={defaultPct === null}
            maxLength={200}
            className="flex-1 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:border-emerald-500 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={generating || defaultPct === null || pitchLabel.trim().length < 3}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {generating ? 'Generating…' : 'Generate code'}
          </button>
        </form>
      </section>

      {error && (
        <div className="mt-4 bg-red-500/15 border border-red-500/40 rounded-lg px-4 py-3 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="mt-6 flex gap-2 flex-wrap">
        {(['all', 'pending', 'redeemed', 'revoked', 'expired'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {s === 'all' ? `All (${codes?.length || 0})` : s === 'pending' ? `Pending (${counts.pending})` : s === 'redeemed' ? `Redeemed (${counts.redeemed})` : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Codes list */}
      {codes === null ? (
        <p className="mt-6 text-emerald-200/60 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-8 text-center text-emerald-200/60 text-sm">
          {codes.length === 0
            ? 'No codes yet. Generate your first one above.'
            : `No codes with status "${statusFilter}".`}
        </div>
      ) : (
        <ul className="mt-6 bg-white/5 border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
          {filtered.map(c => (
            <li key={c.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-emerald-300">{c.code}</code>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                    c.status === 'pending' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : c.status === 'redeemed' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-700 border-slate-600 text-slate-300'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-white/40 text-[10px] tabular-nums">{c.revenue_share_pct}%</span>
                </div>
                <p className="mt-1 text-white/60 text-xs">
                  {c.agent_pitch_label || (c.redeemed_by_school_name ? `→ ${c.redeemed_by_school_name}` : 'No pitch label')}
                </p>
                <p className="mt-0.5 text-white/40 text-[10px]">
                  Created {fmtDate(c.created_at)}
                  {c.redeemed_at && ` · Redeemed ${fmtDate(c.redeemed_at)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => copy(c.code)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 text-xs rounded-lg border border-white/10"
                  title="Copy code"
                >
                  📋 Copy
                </button>
                {c.redeemed_by_school_id && (
                  <Link
                    href={`/montree/agent/schools/${c.redeemed_by_school_id}`}
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs rounded-lg border border-emerald-500/30"
                  >
                    School →
                  </Link>
                )}
                {c.status === 'pending' && (
                  <button
                    onClick={() => revoke(c.id, c.code)}
                    disabled={revokingId === c.id}
                    className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs rounded-lg border border-red-500/30 disabled:opacity-50"
                  >
                    {revokingId === c.id ? '…' : 'Revoke'}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
