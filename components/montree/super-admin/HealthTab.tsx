'use client';

// components/montree/super-admin/HealthTab.tsx
// Super-admin system health snapshot. Read-only.
//
// Surfaces the 6 steps from /api/montree/super-admin/health as cards:
//   - DB ping
//   - Stripe webhook deliveries (last 7d)
//   - AI cost (last 30d)
//   - Web Vitals p75 LCP for /montree/dashboard (last 7d)
//   - Most recent payout calculator runs
//   - Active schools (trialing + active count)
//
// Plus a "🔄 Run check" button that re-fires the health endpoint.

import { useCallback, useEffect, useState } from 'react';

interface HealthStep {
  name: string;
  ok: boolean;
  ms: number;
  detail?: unknown;
}

interface HealthResponse {
  ok: boolean;
  generated_at: string;
  steps: HealthStep[];
}

interface HealthTabProps {
  sessionToken: string;
}

function fmtUsd(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HealthTab({ sessionToken }: HealthTabProps) {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/health', {
        headers: { 'x-super-admin-token': sessionToken },
      });
      const j = await res.json();
      setData(j as HealthResponse);
      if (!res.ok) setError(`Some checks failed (HTTP ${res.status})`);
    } catch (err) {
      console.error('[HealthTab] fetch', err);
      setError('Health check failed');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const stepByName = (n: string) => data?.steps.find((s) => s.name === n);

  const dbPing = stepByName('db_ping');
  const stripeStep = stepByName('stripe_webhook_7d');
  const aiStep = stepByName('ai_cost_30d');
  const vitalsStep = stepByName('web_vitals_p75_lcp');
  const payoutStep = stepByName('payout_runs');
  const schoolsStep = stepByName('active_schools');

  const stripeDetail = (stripeStep?.detail as { rows_last_7d?: number } | undefined) || undefined;
  const aiDetail = (aiStep?.detail as { total_usd?: number; rows?: number; schools_active?: number; most_recent?: string } | undefined) || undefined;
  const vitalsDetail = (vitalsStep?.detail as { p75_ms?: number | null; sample_size?: number } | undefined) || undefined;
  const payoutDetail = (payoutStep?.detail as { most_recent_calc?: string; recent_periods?: Array<{ period_month: string; row_count: number; total_usd: number; latest_calc: string }> } | undefined) || undefined;
  const schoolDetail = (schoolsStep?.detail as { total?: number; trialing?: number; active?: number } | undefined) || undefined;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System health</h2>
          <p className="text-xs text-slate-400">
            {data?.generated_at && `Last check: ${fmtDate(data.generated_at)}`}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? '⏳' : '🔄'} Run check
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Top-level status banner */}
      {data && (
        <div
          className={`p-4 rounded-xl border ${
            data.ok
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <p className="text-sm font-semibold">
            {data.ok ? (
              <span className="text-emerald-300">✓ All systems operational</span>
            ) : (
              <span className="text-amber-300">⚠ One or more checks failed — see below</span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* DB */}
        <HealthCard
          icon="💾"
          title="Database"
          status={dbPing?.ok ? 'ok' : dbPing?.ok === false ? 'fail' : 'loading'}
          metric={dbPing ? `${dbPing.ms}ms` : '—'}
          subtitle="Round-trip to Supabase"
          error={dbPing?.ok === false ? String(dbPing?.detail || '') : null}
        />

        {/* Stripe webhook */}
        <HealthCard
          icon="💳"
          title="Stripe webhooks"
          status={stripeStep?.ok ? (stripeDetail?.rows_last_7d ? 'ok' : 'idle') : 'fail'}
          metric={`${stripeDetail?.rows_last_7d ?? '—'} rows`}
          subtitle="Last 7 days"
          error={stripeStep?.ok === false ? String(stripeStep?.detail || '') : null}
        />

        {/* AI cost */}
        <HealthCard
          icon="🧠"
          title="AI usage cost"
          status={aiStep?.ok ? 'ok' : 'fail'}
          metric={fmtUsd(aiDetail?.total_usd)}
          subtitle={`${aiDetail?.rows ?? 0} calls · ${aiDetail?.schools_active ?? 0} schools · last 30d`}
          error={aiStep?.ok === false ? String(aiStep?.detail || '') : null}
        />

        {/* Web Vitals */}
        <HealthCard
          icon="⚡"
          title="LCP (dashboard)"
          status={
            !vitalsStep?.ok
              ? 'fail'
              : !vitalsDetail?.p75_ms
                ? 'idle'
                : vitalsDetail.p75_ms <= 2500
                  ? 'ok'
                  : 'warn'
          }
          metric={vitalsDetail?.p75_ms ? `${vitalsDetail.p75_ms}ms` : '—'}
          subtitle={`p75 · ${vitalsDetail?.sample_size ?? 0} samples · last 7d`}
          error={vitalsStep?.ok === false ? String(vitalsStep?.detail || '') : null}
        />

        {/* Payout calc */}
        <HealthCard
          icon="💸"
          title="Last payout calc"
          status={payoutStep?.ok ? (payoutDetail?.most_recent_calc ? 'ok' : 'idle') : 'fail'}
          metric={payoutDetail?.most_recent_calc ? fmtDate(payoutDetail.most_recent_calc) : 'Never'}
          subtitle={payoutDetail?.recent_periods?.[0] ? `Latest: ${payoutDetail.recent_periods[0].period_month}` : ''}
          error={payoutStep?.ok === false ? String(payoutStep?.detail || '') : null}
        />

        {/* Schools */}
        <HealthCard
          icon="🏫"
          title="Schools"
          status={schoolsStep?.ok ? 'ok' : 'fail'}
          metric={`${schoolDetail?.total ?? 0} total`}
          subtitle={`${schoolDetail?.trialing ?? 0} trialing · ${schoolDetail?.active ?? 0} active`}
          error={schoolsStep?.ok === false ? String(schoolsStep?.detail || '') : null}
        />
      </div>

      {/* Manual cron triggers — useful before Railway crons are configured */}
      <CronTriggers sessionToken={sessionToken} onComplete={fetchHealth} />

      {/* Recent payout periods table */}
      {payoutDetail?.recent_periods && payoutDetail.recent_periods.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/55 border border-slate-800">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Recent payout periods</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-2">Period</th>
                <th className="py-2">Rows</th>
                <th className="py-2">Total</th>
                <th className="py-2">Last calc</th>
              </tr>
            </thead>
            <tbody>
              {payoutDetail.recent_periods.map((p) => (
                <tr key={p.period_month} className="border-t border-slate-800">
                  <td className="py-2 text-white font-mono">{p.period_month}</td>
                  <td className="py-2 text-slate-300">{p.row_count}</td>
                  <td className="py-2 text-emerald-400 font-mono">{fmtUsd(p.total_usd)}</td>
                  <td className="py-2 text-slate-500 text-xs">{fmtDate(p.latest_calc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Cron triggers ──────────────────────────────────────────────────────────
// Manual fire buttons for each cron-endpoint. Useful when Railway crons aren't
// configured yet — Tredoux can hit them himself with one click.
function CronTriggers({ sessionToken, onComplete }: { sessionToken: string; onComplete: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ name: string; ok: boolean; detail: string } | null>(null);

  const fire = async (name: string, url: string, method: 'GET' | 'POST', body?: Record<string, unknown>) => {
    setBusy(name);
    setLastResult(null);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      setLastResult({
        name,
        ok: res.ok,
        detail: JSON.stringify(j, null, 2).slice(0, 800),
      });
      if (res.ok) onComplete();
    } catch (err) {
      setLastResult({
        name,
        ok: false,
        detail: err instanceof Error ? err.message : 'unknown',
      });
    } finally {
      setBusy(null);
    }
  };

  const triggers: Array<{ id: string; label: string; icon: string; fire: () => Promise<void> }> = [
    {
      id: 'payouts',
      label: 'Monthly payout calc',
      icon: '💸',
      fire: () => fire('payouts', '/api/montree/super-admin/payouts/calculate', 'POST', {}),
    },
    {
      id: 'recurring',
      label: 'Recurring op-expense run',
      icon: '🔁',
      fire: () => fire('recurring', '/api/montree/super-admin/finance/recurring/run', 'POST'),
    },
    {
      id: 'trial-drip',
      label: 'Trial drip campaign',
      icon: '📧',
      fire: () => fire('trial-drip', '/api/montree/super-admin/trial-drip', 'POST'),
    },
    {
      id: 'warm',
      label: 'Warm pre-ping',
      icon: '🔥',
      fire: () => fire('warm', '/api/warm', 'GET'),
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-slate-900/55 border border-slate-800">
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Manual cron triggers</p>
      <p className="text-xs text-slate-400 mb-3">
        Fire each cron endpoint now — useful before Railway crons are configured.
        All are idempotent so retries are safe.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {triggers.map((t) => (
          <button
            key={t.id}
            onClick={t.fire}
            disabled={busy !== null}
            className="px-3 py-2 bg-slate-800/60 hover:bg-emerald-500/15 hover:border-emerald-500/30 border border-slate-700 text-slate-300 hover:text-emerald-300 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
          >
            {busy === t.id ? '⏳' : t.icon} {t.label}
          </button>
        ))}
      </div>
      {lastResult && (
        <div
          className={`mt-3 p-3 rounded-lg border text-xs ${
            lastResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <p className="font-semibold mb-1">
            {lastResult.ok ? '✓' : '✕'} {lastResult.name} — {lastResult.ok ? 'success' : 'failed'}
          </p>
          <pre className="text-[10px] text-slate-300 overflow-x-auto max-h-[20vh] mt-2">
            {lastResult.detail}
          </pre>
        </div>
      )}
    </div>
  );
}

function HealthCard({
  icon,
  title,
  status,
  metric,
  subtitle,
  error,
}: {
  icon: string;
  title: string;
  status: 'ok' | 'warn' | 'fail' | 'idle' | 'loading';
  metric: string;
  subtitle?: string;
  error?: string | null;
}) {
  const statusColor =
    status === 'ok'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : status === 'warn'
        ? 'border-amber-500/30 bg-amber-500/5'
        : status === 'fail'
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-slate-800 bg-slate-900/40';
  const statusDot =
    status === 'ok' ? 'bg-emerald-400' : status === 'warn' ? 'bg-amber-400' : status === 'fail' ? 'bg-red-400' : 'bg-slate-500';
  return (
    <div className={`p-4 rounded-xl border ${statusColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-base">
          {icon} <span className="text-xs uppercase tracking-wider text-slate-400 ml-1">{title}</span>
        </span>
        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
      </div>
      <p className="text-xl font-bold text-white">{metric}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      {error && <p className="text-xs text-red-300 mt-2 truncate" title={error}>{error}</p>}
    </div>
  );
}
