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

type ConnectStatus = 'pending' | 'onboarding' | 'verified' | 'restricted' | 'disabled' | null;

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
  agent_stripe_connect_account_id: string | null;
  agent_stripe_connect_status: ConnectStatus;
  // Phase 7a — agent-dashboard flags. Populated when migration 188 has run;
  // safe defaults otherwise (the GET enrichment falls back gracefully).
  agent_is_agent: boolean;
  agent_login_set_at: string | null;
  agent_login_last_used_at: string | null;
  agent_default_share_pct: number | null;
  agent_suspended_at: string | null;
}

interface AgentAuditEvent {
  id: string;
  agent_id: string | null;
  agent_display_name: string | null;
  agent_email: string | null;
  event_type: string;
  actor_role: 'super_admin' | 'agent' | 'system';
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
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

const CONNECT_PILL: Record<Exclude<ConnectStatus, null>, { label: string; cls: string; tip: string }> = {
  pending: { label: 'Not started', cls: 'bg-slate-700 text-slate-300 border-slate-600', tip: 'Stripe account created. Send onboarding link.' },
  onboarding: { label: 'In progress', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40', tip: 'Agent has started but not finished onboarding.' },
  verified: { label: 'Verified', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', tip: 'Ready for automated payouts.' },
  restricted: { label: 'Restricted', cls: 'bg-red-500/15 text-red-300 border-red-500/40', tip: 'Stripe needs more info. Agent should check their email.' },
  disabled: { label: 'Disabled', cls: 'bg-red-500/30 text-red-200 border-red-500/60', tip: 'Account disabled. Cannot receive payouts.' },
};

// Instant-tooltip style. Native HTML `title` has a ~1500ms delay and was
// invisible to Tredoux in practice — he hovered the action icons, saw
// nothing, asked "where is her login?". React-state-driven custom tooltip
// matches Session 89's canonical pattern (originally in
// app/montree/dashboard/photo-audit/page.tsx iconTooltipStyle).
const iconTooltipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 6px)',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(7,18,12,0.96)',
  color: 'rgba(255,255,255,0.95)',
  padding: '4px 9px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 50,
  border: '1px solid rgba(52,211,153,0.30)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.40)',
  fontFamily: "'Inter', -apple-system, sans-serif",
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

  // Stripe Connect onboarding link banner.
  const [connectLink, setConnectLink] = useState<{ url: string; agent: string; expiresAt: number } | null>(null);
  const [connectLinkCopied, setConnectLinkCopied] = useState(false);
  const [connectLoadingAgentId, setConnectLoadingAgentId] = useState<string | null>(null);

  // Phase 7a — agent login modals + state.
  const [agentLoginModal, setAgentLoginModal] = useState<
    | null
    | {
        agentId: string;
        agentName: string;
        isReset: boolean;
        currentDefaultPct: number | null;
      }
  >(null);
  const [agentLoginPct, setAgentLoginPct] = useState<string>('50');
  const [agentLoginLoading, setAgentLoginLoading] = useState(false);
  const [agentLoginRevealed, setAgentLoginRevealed] = useState<{ code: string; agent: string } | null>(null);
  const [agentLoginCopied, setAgentLoginCopied] = useState(false);

  const [editPctModal, setEditPctModal] = useState<
    | null
    | { agentId: string; agentName: string; currentPct: number | null }
  >(null);
  const [editPctValue, setEditPctValue] = useState<string>('');
  const [editPctLoading, setEditPctLoading] = useState(false);

  const [agentToggleLoadingId, setAgentToggleLoadingId] = useState<string | null>(null);

  // Session 103: super-admin "Log in as agent" loading state.
  const [loginAsLoadingId, setLoginAsLoadingId] = useState<string | null>(null);

  // Instant tooltip hover state. Keyed by `${referralId}:${action}` so each
  // row's icons are independent. Session 89 pattern.
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Recent activity panel.
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityEvents, setActivityEvents] = useState<AgentAuditEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityMigrationPending, setActivityMigrationPending] = useState(false);

  // Filters.
  const [statusFilter, setStatusFilter] = useState<'all' | Referral['status']>('all');

  // Phase 3 (agent system fix plan): when an agent application is accepted
  // from AgentApplicationAlert, super-admin lands here with prefill query
  // params. We open the issue-code form pre-filled, and after the code is
  // created we mark the application 'sent' so it falls out of the pending
  // alert banner.
  const [fromApplicationId, setFromApplicationId] = useState<string | null>(null);

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

  // Phase 3: read prefill from URL on mount (set by AgentApplicationAlert
  // "Accept" button). Open the issue-code form pre-filled with applicant
  // details. We strip the params from the URL after reading so a manual
  // refresh doesn't re-open the form.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const prefillName = sp.get('prefill_name');
    const prefillEmail = sp.get('prefill_email');
    const appId = sp.get('from_application');
    if (prefillName || prefillEmail || appId) {
      if (prefillName) setAgentName(prefillName);
      if (prefillEmail) setAgentEmail(prefillEmail);
      if (appId) setFromApplicationId(appId);
      setShowForm(true);
      // Strip the params so a refresh doesn't loop. Preserve tab=agents.
      const cleaned = new URL(window.location.href);
      cleaned.searchParams.delete('prefill_name');
      cleaned.searchParams.delete('prefill_email');
      cleaned.searchParams.delete('from_application');
      window.history.replaceState(null, '', cleaned.toString());
    }
  }, []);

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
        // Surface DB / Stripe / underlying error detail when present so we can
        // debug schema mismatches without grepping Railway logs.
        const msg = data.error || 'Could not create code.';
        const detail = data.detail ? ` — ${data.detail}` : '';
        const hint = data.hint ? ` (${data.hint})` : '';
        setError(msg + detail + hint);
        return;
      }
      setRevealed({ code: data.code, agent: data.referral.agent_display_name });
      setCopied(false);
      // Phase 3: if this code was issued in response to an agent application,
      // mark the application 'sent' so it drops out of the pending alert.
      // Fire-and-forget — failure here doesn't undo the code creation.
      if (fromApplicationId) {
        void fetch('/api/montree/super-admin/agent-applications', {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ id: fromApplicationId, status: 'sent' }),
        }).catch((err) =>
          console.error('[ReferralsTab] failed to mark application sent:', err)
        );
        setFromApplicationId(null);
      }
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

  const handleGenerateConnectLink = async (agentId: string, agentName: string) => {
    if (!agentId) {
      setError('This referral predates agent linkage; cannot generate a Stripe link. Re-issue the code.');
      return;
    }
    setConnectLoadingAgentId(agentId);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/agents/${encodeURIComponent(agentId)}/connect-onboard`, {
        method: 'POST',
        headers: headers(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Could not generate onboarding link.');
        return;
      }
      setConnectLink({
        url: data.onboarding_url,
        agent: agentName,
        expiresAt: data.onboarding_expires_at,
      });
      setConnectLinkCopied(false);
      // Refresh table so the Stripe status pill updates if a new account was created.
      await load();
    } catch (err) {
      console.error('[ReferralsTab] connect-onboard error:', err);
      setError('Network error generating Stripe onboarding link.');
    } finally {
      setConnectLoadingAgentId(null);
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

  // ── Phase 7a handlers ─────────────────────────────────────────────────────
  // Generic clipboard helper that drives a passed-in setter so we can re-use
  // for the agent-login reveal banner.
  const copyTo = (value: string, setFlag: (v: boolean) => void) => {
    try {
      navigator.clipboard.writeText(value);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
      setFlag(true);
      setTimeout(() => setFlag(false), 2000);
    }
  };

  const openAgentLoginModal = (r: Referral) => {
    if (!r.agent_id) {
      setError('This referral predates agent linkage; cannot issue an agent login. Re-issue the code first.');
      return;
    }
    const isReset = r.agent_is_agent;
    setAgentLoginPct(
      r.agent_default_share_pct !== null
        ? String(r.agent_default_share_pct)
        : String(r.revenue_share_pct ?? 50)
    );
    setAgentLoginModal({
      agentId: r.agent_id,
      agentName: r.agent_display_name,
      isReset,
      currentDefaultPct: r.agent_default_share_pct,
    });
    setError(null);
  };

  const submitAgentLoginModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentLoginModal) return;
    const pctNum = Number(agentLoginPct);
    if (Number.isNaN(pctNum) || pctNum < 0 || pctNum > 100) {
      setError('Default % must be between 0 and 100.');
      return;
    }
    setAgentLoginLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/montree/super-admin/agents/${encodeURIComponent(agentLoginModal.agentId)}/login`,
        {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ default_share_pct: pctNum }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Could not issue agent login.');
        return;
      }
      setAgentLoginRevealed({
        code: data.code,
        agent: agentLoginModal.agentName,
      });
      setAgentLoginCopied(false);
      setAgentLoginModal(null);
      await load();
    } catch (err) {
      console.error('[ReferralsTab] agent-login error:', err);
      setError('Network error issuing agent login.');
    } finally {
      setAgentLoginLoading(false);
    }
  };

  const toggleSuspendAgent = async (
    agentId: string,
    agentName: string,
    isSuspended: boolean
  ) => {
    const action = isSuspended ? 'reactivate' : 'suspend';
    if (action === 'suspend') {
      const ok = confirm(
        `Suspend ${agentName}'s login?\n\nThey will not be able to access the agent dashboard or generate new codes. Their existing pending payouts on referred schools will still pay out — that's earned money.\n\nUse Reactivate to restore access.`
      );
      if (!ok) return;
    }
    setAgentToggleLoadingId(agentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/montree/super-admin/agents/${encodeURIComponent(agentId)}/login`,
        {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || `Could not ${action} agent.`);
        return;
      }
      await load();
      if (activityOpen) await loadActivity();
    } catch (err) {
      console.error('[ReferralsTab] suspend/reactivate error:', err);
      setError(`Network error trying to ${action} agent.`);
    } finally {
      setAgentToggleLoadingId(null);
    }
  };

  // Session 103: super-admin impersonates the agent. Mints a real agent JWT
  // cookie and redirects to /montree/agent/dashboard. Audit-logged server-side.
  // Whatever super-admin session existed in localStorage is preserved (the
  // x-super-admin-token header still works), but the montree-auth cookie now
  // points at the agent.
  const loginAsAgent = async (agentId: string, agentName: string) => {
    const ok = confirm(
      `Log in as ${agentName}?\n\nYou will be redirected to their agent dashboard. The super-admin session in this tab is preserved — open Referrals in a new tab to come back.\n\nThe impersonation is logged in agent audit.`
    );
    if (!ok) return;
    setLoginAsLoadingId(agentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/montree/super-admin/agents/${encodeURIComponent(agentId)}/login-as`,
        {
          method: 'POST',
          headers: headers(),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.detail || data.error || `Could not log in as ${agentName}.`);
        return;
      }
      // Cookie is set on the response. Navigate. Use window.location so a
      // fresh request fires and verifySchoolRequest reads the new cookie.
      window.location.href = data.redirect || '/montree/agent/dashboard';
    } catch (err) {
      console.error('[ReferralsTab] login-as error:', err);
      setError(`Network error trying to log in as ${agentName}.`);
    } finally {
      setLoginAsLoadingId(null);
    }
  };

  const openEditPctModal = (r: Referral) => {
    if (!r.agent_id) return;
    setEditPctValue(r.agent_default_share_pct !== null ? String(r.agent_default_share_pct) : '');
    setEditPctModal({
      agentId: r.agent_id,
      agentName: r.agent_display_name,
      currentPct: r.agent_default_share_pct,
    });
    setError(null);
  };

  const submitEditPctModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPctModal) return;
    const trimmed = editPctValue.trim();
    let next: number | null;
    if (trimmed === '') {
      next = null;
    } else {
      const n = Number(trimmed);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        setError('Default % must be empty (no self-service) or between 0 and 100.');
        return;
      }
      next = n;
    }
    setEditPctLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/montree/super-admin/agents/${encodeURIComponent(editPctModal.agentId)}/login`,
        {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify({ action: 'set_default_pct', default_pct: next }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || 'Could not update default %.');
        return;
      }
      setEditPctModal(null);
      await load();
      if (activityOpen) await loadActivity();
    } catch (err) {
      console.error('[ReferralsTab] edit-pct error:', err);
      setError('Network error updating default %.');
    } finally {
      setEditPctLoading(false);
    }
  };

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const res = await fetch('/api/montree/super-admin/agent-audit?limit=50', {
        headers: { 'x-super-admin-token': saToken },
      });
      const data = await res.json();
      if (!res.ok) {
        setActivityEvents([]);
        setActivityMigrationPending(false);
        return;
      }
      setActivityEvents(data.events || []);
      setActivityMigrationPending(Boolean(data.migration_pending));
    } catch (err) {
      console.error('[ReferralsTab] activity load error:', err);
      setActivityEvents([]);
    } finally {
      setActivityLoading(false);
    }
  }, [saToken]);

  const toggleActivity = async () => {
    const next = !activityOpen;
    setActivityOpen(next);
    if (next) {
      await loadActivity();
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

      {/* Agent login reveal banner (shown once after issuing/resetting an agent code) */}
      {agentLoginRevealed && (
        <div className="bg-amber-500/15 border-2 border-amber-500/50 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-amber-200 text-xs uppercase tracking-wider font-semibold mb-1">
                🔑 Agent login code — copy it now
              </p>
              <p className="text-white text-sm mb-2">
                For <span className="font-semibold">{agentLoginRevealed.agent}</span>. This is the
                only time the code is shown — the database stores only a hash. Send it to the agent
                so they can log in at <code className="text-amber-300">montree.xyz</code>.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <code className="px-4 py-2.5 bg-black/40 border border-amber-500/40 rounded-lg text-amber-300 font-mono text-lg tracking-wider">
                  {agentLoginRevealed.code}
                </code>
                <button
                  onClick={() => copyTo(agentLoginRevealed.code, setAgentLoginCopied)}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {agentLoginCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => { setAgentLoginRevealed(null); setAgentLoginCopied(false); }}
              className="text-slate-400 hover:text-white text-sm self-start"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stripe Connect onboarding link banner */}
      {connectLink && (
        <div className="bg-indigo-500/10 border border-indigo-500/40 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-indigo-200 text-xs uppercase tracking-wider font-semibold mb-1">
                Stripe onboarding link for {connectLink.agent}
              </p>
              <p className="text-white text-sm mb-3">
                Send this URL to the agent. They&apos;ll complete payout setup on
                Stripe&apos;s hosted form. Link expires in ~5 minutes — generate a
                fresh one if it times out.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="flex-1 min-w-0 px-3 py-2 bg-black/40 border border-indigo-500/30 rounded-lg text-indigo-200 font-mono text-xs break-all">
                  {connectLink.url}
                </code>
                <button
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(connectLink.url);
                      setConnectLinkCopied(true);
                      setTimeout(() => setConnectLinkCopied(false), 2000);
                    } catch { /* */ }
                  }}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {connectLinkCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <button
              onClick={() => { setConnectLink(null); setConnectLinkCopied(false); }}
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
                  <th className="px-3 py-3 text-left">Stripe</th>
                  <th className="px-3 py-3 text-left">School</th>
                  <th className="px-3 py-3 text-left">Pitch</th>
                  <th className="px-3 py-3 text-left">Created</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filtered.map(r => {
                  const pill = STATUS_PILL[r.status];
                  const connect = r.agent_stripe_connect_status
                    ? CONNECT_PILL[r.agent_stripe_connect_status as Exclude<ConnectStatus, null>]
                    : null;
                  const isLoadingConnect = connectLoadingAgentId === r.agent_id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-700/20">
                      <td className="px-3 py-3 font-mono text-emerald-300">{r.code}</td>
                      <td className="px-3 py-3 text-white">
                        <div>{r.agent_display_name}</div>
                        <div className="text-slate-400 text-xs">{r.agent_email}</div>
                        {r.agent_is_agent && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {r.agent_suspended_at ? (
                              <span className="inline-block px-1.5 py-0.5 rounded-full border border-orange-500/40 bg-orange-500/15 text-orange-300 text-[10px] font-medium">
                                Suspended
                              </span>
                            ) : (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 text-[10px] font-medium"
                                title={r.agent_login_last_used_at
                                  ? `Last login ${fmtDate(r.agent_login_last_used_at)}`
                                  : 'Login issued, never used'}
                              >
                                {r.agent_login_last_used_at ? 'Active' : 'Login issued'}
                              </span>
                            )}
                            {r.agent_default_share_pct !== null && (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded-full border border-slate-600 bg-slate-700/60 text-slate-300 text-[10px] font-medium"
                                title="Default share % when this agent self-generates a code"
                              >
                                Default {r.agent_default_share_pct}%
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-white tabular-nums">
                        {Number(r.revenue_share_pct).toFixed(0)}%
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${pill.cls}`}>
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {connect ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full border text-xs font-medium ${connect.cls}`}
                            title={connect.tip}
                          >
                            {connect.label}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Not setup</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {r.redeemed_by_school_name || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs max-w-[200px] truncate">
                        {r.agent_pitch_label || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-400 text-xs">{fmtDate(r.created_at)}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {/* Copy code (📋) */}
                        <span
                          style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                          onMouseEnter={() => setHoveredAction(`${r.id}:copy`)}
                          onMouseLeave={() => setHoveredAction(null)}
                        >
                          <button
                            onClick={() => copy(r.code)}
                            className="px-2.5 py-1 text-xs rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200"
                            aria-label="Copy code"
                          >
                            📋
                          </button>
                          {hoveredAction === `${r.id}:copy` && (
                            <span style={iconTooltipStyle}>Copy referral code</span>
                          )}
                        </span>
                        {/* Stripe Connect (💳) */}
                        {r.agent_id && r.agent_stripe_connect_status !== 'verified' && (
                          <span
                            style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                            onMouseEnter={() => setHoveredAction(`${r.id}:stripe`)}
                            onMouseLeave={() => setHoveredAction(null)}
                          >
                            <button
                              onClick={() => handleGenerateConnectLink(r.agent_id as string, r.agent_display_name)}
                              disabled={isLoadingConnect}
                              className="px-2.5 py-1 text-xs rounded-md bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 border border-indigo-500/30 disabled:opacity-50"
                              aria-label={connect?.label === 'In progress' ? 'Resume Stripe onboarding' : 'Send Stripe onboarding link'}
                            >
                              {isLoadingConnect ? '…' : '💳'}
                            </button>
                            {hoveredAction === `${r.id}:stripe` && (
                              <span style={iconTooltipStyle}>
                                {connect?.label === 'In progress' ? 'Resume Stripe onboarding' : 'Send Stripe onboarding link'}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Agent login (🔑) */}
                        {r.agent_id && (
                          <span
                            style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                            onMouseEnter={() => setHoveredAction(`${r.id}:login`)}
                            onMouseLeave={() => setHoveredAction(null)}
                          >
                            <button
                              onClick={() => openAgentLoginModal(r)}
                              className={`px-2.5 py-1 text-xs rounded-md border ${
                                r.agent_is_agent
                                  ? 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border-emerald-500/30'
                              }`}
                              aria-label={r.agent_is_agent ? 'Reset agent login' : 'Issue agent login'}
                            >
                              {r.agent_is_agent ? '🔑↻' : '🔑'}
                            </button>
                            {hoveredAction === `${r.id}:login` && (
                              <span style={iconTooltipStyle}>
                                {r.agent_is_agent ? 'Reset agent login code' : 'Issue agent login code'}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Edit default % (✏️) */}
                        {r.agent_id && r.agent_is_agent && (
                          <span
                            style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                            onMouseEnter={() => setHoveredAction(`${r.id}:editpct`)}
                            onMouseLeave={() => setHoveredAction(null)}
                          >
                            <button
                              onClick={() => openEditPctModal(r)}
                              className="px-2.5 py-1 text-xs rounded-md bg-slate-700/60 hover:bg-slate-600 text-slate-200 border border-slate-600"
                              aria-label={`Edit default % (currently ${r.agent_default_share_pct ?? '—'}%)`}
                            >
                              ✏️
                            </button>
                            {hoveredAction === `${r.id}:editpct` && (
                              <span style={iconTooltipStyle}>
                                {`Edit default % (now ${r.agent_default_share_pct ?? '—'}%)`}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Log in as agent (🔓) — Session 103 */}
                        {r.agent_id && r.agent_is_agent && (
                          <span
                            style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                            onMouseEnter={() => setHoveredAction(`${r.id}:loginas`)}
                            onMouseLeave={() => setHoveredAction(null)}
                          >
                            <button
                              onClick={() => loginAsAgent(
                                r.agent_id as string,
                                r.agent_display_name
                              )}
                              disabled={loginAsLoadingId === r.agent_id}
                              className="px-2.5 py-1 text-xs rounded-md bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 disabled:opacity-50"
                              aria-label={`Log in as ${r.agent_display_name}`}
                            >
                              {loginAsLoadingId === r.agent_id ? '…' : '🔓'}
                            </button>
                            {hoveredAction === `${r.id}:loginas` && (
                              <span style={iconTooltipStyle}>
                                {`Log in as ${r.agent_display_name}`}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Suspend / reactivate (⏸ / ▶) */}
                        {r.agent_id && r.agent_is_agent && (
                          <span
                            style={{ position: 'relative', display: 'inline-block', marginRight: 4 }}
                            onMouseEnter={() => setHoveredAction(`${r.id}:suspend`)}
                            onMouseLeave={() => setHoveredAction(null)}
                          >
                            <button
                              onClick={() => toggleSuspendAgent(
                                r.agent_id as string,
                                r.agent_display_name,
                                Boolean(r.agent_suspended_at)
                              )}
                              disabled={agentToggleLoadingId === r.agent_id}
                              className={`px-2.5 py-1 text-xs rounded-md border disabled:opacity-50 ${
                                r.agent_suspended_at
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border-emerald-500/30'
                                  : 'bg-orange-500/15 hover:bg-orange-500/30 text-orange-300 border-orange-500/30'
                              }`}
                              aria-label={r.agent_suspended_at ? 'Reactivate agent' : 'Suspend agent'}
                            >
                              {agentToggleLoadingId === r.agent_id ? '…' : (r.agent_suspended_at ? '▶' : '⏸')}
                            </button>
                            {hoveredAction === `${r.id}:suspend` && (
                              <span style={iconTooltipStyle}>
                                {r.agent_suspended_at ? 'Reactivate agent' : 'Suspend agent login'}
                              </span>
                            )}
                          </span>
                        )}
                        {/* Revoke (text — no tooltip needed) */}
                        {r.status === 'pending' && (
                          <button
                            onClick={() => handleRevoke(r.id, r.code)}
                            className="px-2.5 py-1 text-xs rounded-md bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/30"
                            aria-label="Revoke code"
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

      {/* ── Phase 7a — Recent agent activity panel ─────────────────────────── */}
      <div className="mt-6 bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        <button
          onClick={toggleActivity}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
        >
          <div>
            <h3 className="text-white font-semibold text-sm">📋 Recent agent activity</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Login issues, suspends, default % changes. Future phases will log self-service code generation here too.
            </p>
          </div>
          <span className="text-slate-400 text-xs">
            {activityOpen ? '▾ Hide' : '▸ Show'}
          </span>
        </button>
        {activityOpen && (
          <div className="border-t border-slate-700">
            {activityMigrationPending ? (
              <div className="px-4 py-6 text-amber-300 text-sm text-center">
                Run migration <code className="bg-black/40 px-1.5 py-0.5 rounded">188_agent_dashboard.sql</code> in Supabase SQL Editor to enable agent activity logging.
              </div>
            ) : activityLoading ? (
              <div className="px-4 py-6 text-slate-400 text-sm text-center">Loading…</div>
            ) : activityEvents.length === 0 ? (
              <div className="px-4 py-6 text-slate-500 text-sm text-center">
                No agent activity yet. Issue an agent login above to start the trail.
              </div>
            ) : (
              <ul className="divide-y divide-slate-700/60">
                {activityEvents.map(ev => (
                  <li key={ev.id} className="px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="text-white">
                          <span className="font-mono text-xs text-slate-400 mr-2">
                            {new Date(ev.created_at).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="font-medium">{describeAuditEvent(ev)}</span>
                        </div>
                        {ev.agent_display_name && (
                          <div className="text-slate-400 text-xs mt-0.5">
                            Agent: {ev.agent_display_name}
                            {ev.agent_email ? ` (${ev.agent_email})` : ''}
                          </div>
                        )}
                      </div>
                      <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                        ev.actor_role === 'super_admin'
                          ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                          : ev.actor_role === 'agent'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-slate-700 border-slate-600 text-slate-300'
                      }`}>
                        {ev.actor_role}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Phase 7a — Issue / reset agent login modal ──────────────────────── */}
      {agentLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitAgentLoginModal}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6"
          >
            <h3 className="text-white text-lg font-bold">
              {agentLoginModal.isReset ? '🔑 Reset agent login' : '🔑 Issue agent login'}
            </h3>
            <p className="text-slate-300 text-sm mt-2">
              For <span className="font-semibold text-white">{agentLoginModal.agentName}</span>.
              {agentLoginModal.isReset ? (
                <>
                  {' '}A fresh code will be generated. Their <strong>previous code stops working
                  immediately</strong>. They keep all their schools, codes, and earnings.
                </>
              ) : (
                <>
                  {' '}A 6-character code will be generated. They&apos;ll enter it at <code className="text-emerald-300">montree.xyz</code> to reach their dashboard.
                </>
              )}
            </p>

            <div className="mt-4">
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                Default revenue share %
              </label>
              <input
                type="number"
                value={agentLoginPct}
                onChange={(e) => setAgentLoginPct(e.target.value)}
                min="0"
                max="100"
                step="1"
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                Locked when they self-generate codes. They cannot raise this themselves —
                you can adjust later via the ✏️ button. Existing codes keep their per-pitch %.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAgentLoginModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={agentLoginLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {agentLoginLoading
                  ? 'Generating…'
                  : (agentLoginModal.isReset ? 'Generate new code' : 'Issue agent login')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Phase 7a — Edit default % modal ─────────────────────────────────── */}
      {editPctModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={submitEditPctModal}
            className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6"
          >
            <h3 className="text-white text-lg font-bold">✏️ Edit default share %</h3>
            <p className="text-slate-300 text-sm mt-2">
              For <span className="font-semibold text-white">{editPctModal.agentName}</span>.
              Currently <span className="text-emerald-300 font-mono">{editPctModal.currentPct === null ? '—' : `${editPctModal.currentPct}%`}</span>.
              Changes only affect FUTURE codes the agent self-generates. Existing redeemed
              schools keep their locked-in revenue share.
            </p>

            <div className="mt-4">
              <label className="block text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                New default %
              </label>
              <input
                type="number"
                value={editPctValue}
                onChange={(e) => setEditPctValue(e.target.value)}
                min="0"
                max="100"
                step="1"
                placeholder="50"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none"
              />
              <p className="text-slate-500 text-xs mt-1">
                Leave empty to disable self-service code generation entirely.
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEditPctModal(null)}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editPctLoading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {editPctLoading ? 'Saving…' : 'Save default %'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Audit event renderers ─────────────────────────────────────────────────
function describeAuditEvent(ev: AgentAuditEvent): string {
  const d = (ev.details || {}) as Record<string, unknown>;
  switch (ev.event_type) {
    case 'agent_login_issued':
      return d.reset ? 'Agent login reset (new code generated)' : 'Agent login issued';
    case 'agent_suspended':
      return 'Agent suspended';
    case 'agent_reactivated':
      return 'Agent reactivated';
    case 'agent_default_pct_changed': {
      const from = d.from === null || d.from === undefined ? '—' : `${d.from}%`;
      const to = d.to === null || d.to === undefined ? '—' : `${d.to}%`;
      return `Default % changed: ${from} → ${to}`;
    }
    case 'agent_login_succeeded':
      return 'Agent logged in';
    case 'agent_login_failed':
      return 'Failed agent login attempt';
    case 'agent_code_generated':
      return d.code ? `Agent generated code ${d.code}` : 'Agent generated a code';
    case 'agent_code_revoked':
      return d.code ? `Agent revoked code ${d.code}` : 'Agent revoked a code';
    case 'agent_stripe_link_generated':
      return 'Agent generated Stripe onboarding link';
    case 'agent_profile_changed':
      return 'Agent profile changed';
    default:
      return ev.event_type.replace(/_/g, ' ');
  }
}
