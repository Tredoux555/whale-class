'use client';

// Super-admin — Lyf Coach dashboard. Custom overview (signups, visits, activity,
// MRR, coach usage) + subscriber roster + VAT/tax. BILLING & USAGE METADATA ONLY —
// never coach conversation content (privacy boundary, rule #319). Token via
// sessionStorage 'sa_session'; backing APIs enforce verifySuperAdminAuth.

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

interface Subscriber { space: string; label: string; plan: string | null; status: string | null; current_period_end: string | null }
interface Summary { active: number; trialing: number; past_due: number; canceled: number; other: number }
interface Jurisdiction { country: string; collected: number; remitted: number; owed: number }
interface Registration { id: string; scheme: string; covers_country: string | null; registration_number: string | null; filing_frequency: string; next_filing_due: string | null; status: string }
interface Overview {
  month: string;
  members: number;
  viewers: number;
  signups: { new_members_7d: number; new_members_30d: number; new_viewers_7d: number };
  subscriptions: Summary & { est_mrr_usd: number };
  visits: { total: number; last_7d: number };
  online_now: number;
  coach_usage_this_month: number;
  recent_signups: Array<{ space: string; label: string; status: string | null; created_at: string | null }>;
  recent_visits: Array<{ username: string; visited_at: string; duration_seconds: number }>;
}

type Tab = 'overview' | 'subscribers' | 'billing';

const BG = '#0a1a0f';
const EMERALD = '#34d399';
const GOLD = '#E8C96A';
const DANGER = '#f87171';
const OWNER_SPACE = 'tredoux'; // owner's own sanctuary — never offer cancel/delete
const usd = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');
const fmtDuration = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`);

export default function LyfCoachAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

  const [overview, setOverview] = useState<Overview | null>(null);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mrr, setMrr] = useState(0);

  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [taxTotals, setTaxTotals] = useState<{ collected: number; remitted: number; owed: number } | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  // Member management (cancel / delete) modal.
  const [modal, setModal] = useState<{ kind: 'cancel' | 'delete'; space: string; label: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const headers = useCallback((t: string) => ({ 'x-super-admin-token': t, 'Content-Type': 'application/json' }), []);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [oRes, sRes, tRes] = await Promise.all([
        fetch('/api/montree/super-admin/lyf-coach/overview', { headers: { 'x-super-admin-token': t } }),
        fetch('/api/montree/super-admin/lyf-coach/subscribers', { headers: { 'x-super-admin-token': t } }),
        fetch('/api/montree/super-admin/lyf-coach/tax', { headers: { 'x-super-admin-token': t } }),
      ]);
      if (oRes.status === 401 || sRes.status === 401 || tRes.status === 401) {
        sessionStorage.removeItem('sa_session');
        router.replace('/montree/super-admin');
        return;
      }
      const o = await oRes.json().catch(() => null);
      const s = await sRes.json().catch(() => null);
      const tx = await tRes.json().catch(() => null);
      if (s?.migration_pending || tx?.migration_pending) setPending(true);
      if (o && !o.error) setOverview(o as Overview);
      if (s) { setSubs(s.subscribers || []); setSummary(s.summary || null); setMrr(s.est_mrr_usd || 0); }
      if (tx) { setJurisdictions(tx.jurisdictions || []); setTaxTotals(tx.totals || null); setRegs(tx.registrations || []); }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? sessionStorage.getItem('sa_session') : null;
    if (!t) { router.replace('/montree/super-admin'); return; }
    setToken(t);
    void load(t);
  }, [load, router]);

  async function recordRemittance(country: string) {
    if (!token) return;
    const amountStr = window.prompt(`Record VAT remittance to ${country} (USD amount filed):`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount <= 0) { setMsg('Enter a positive amount.'); return; }
    const filingPeriod = window.prompt('Filing period label (e.g. 2026-Q2):', '') || undefined;
    const res = await fetch('/api/montree/super-admin/lyf-coach/tax/remit', {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({ country, usd_amount: amount, filing_period: filingPeriod }),
    });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? `Recorded ${usd(amount)} remitted to ${country}.` : (d?.error || 'Failed.'));
    if (res.ok) void load(token);
  }

  async function addRegistration() {
    if (!token) return;
    const scheme = window.prompt('Scheme (e.g. eu_oss, uk_vat, au_gst):');
    if (!scheme) return;
    const covers = window.prompt('Country it covers (ISO2, blank for multi-country like eu_oss):', '') || undefined;
    const regNum = window.prompt('Registration number (optional):', '') || undefined;
    const due = window.prompt('Next filing due (YYYY-MM-DD, optional):', '') || undefined;
    const res = await fetch('/api/montree/super-admin/lyf-coach/tax/register', {
      method: 'POST', headers: headers(token),
      body: JSON.stringify({ scheme, covers_country: covers, registration_number: regNum, next_filing_due: due }),
    });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? `Added ${scheme}.` : (d?.error || 'Failed.'));
    if (res.ok) void load(token);
  }

  function openCancel(space: string, label: string) { setMsg(null); setConfirmText(''); setModal({ kind: 'cancel', space, label }); }
  function openDelete(space: string, label: string) { setMsg(null); setConfirmText(''); setModal({ kind: 'delete', space, label }); }

  async function runMemberAction() {
    if (!modal || !token) return;
    if (modal.kind === 'delete' && confirmText !== modal.label) return;
    setBusy(true);
    try {
      const res = await fetch('/api/montree/super-admin/lyf-coach/member', {
        method: modal.kind === 'delete' ? 'DELETE' : 'PATCH',
        headers: headers(token),
        body: JSON.stringify({ space: modal.space }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) {
        setMsg(modal.kind === 'delete'
          ? `Deleted ${modal.label} — every trace scrubbed.`
          : `Cancelled ${modal.label}'s subscription.`);
        setModal(null);
        setConfirmText('');
        void load(token);
      } else {
        setMsg(d?.error || 'Action failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  const card: CSSProperties = { background: 'rgba(8,20,12,0.55)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: 18, marginBottom: 18 };
  const dangerBtn: CSSProperties = { fontSize: 12, padding: '4px 10px', borderRadius: 8, border: `1px solid ${DANGER}66`, background: 'transparent', color: DANGER, cursor: 'pointer' };
  const cancelBtn: CSSProperties = { fontSize: 12, padding: '4px 10px', borderRadius: 8, border: `1px solid ${GOLD}66`, background: 'transparent', color: GOLD, cursor: 'pointer', marginRight: 8 };
  const actionTd: CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', whiteSpace: 'nowrap' };
  const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#9fc7b0', borderBottom: '1px solid rgba(255,255,255,0.08)' };
  const td: CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)' };
  const tileStyle: CSSProperties = { flex: '1 1 140px', minWidth: 140, background: 'rgba(8,20,12,0.55)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '16px 18px' };

  const Tile = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) => (
    <div style={tileStyle}>
      <div style={{ fontSize: 12, color: '#9fc7b0', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || '#fff', fontFamily: 'Lora, Georgia, serif' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const TabBtn = ({ id, children }: { id: Tab; children: React.ReactNode }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: '10px 4px', fontSize: 14,
        color: tab === id ? '#fff' : '#9fc7b0', fontWeight: tab === id ? 700 : 500,
        borderBottom: tab === id ? `2px solid ${EMERALD}` : '2px solid transparent',
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#e8f0ea', padding: '28px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <button onClick={() => router.push('/montree/super-admin')}
          style={{ background: 'transparent', border: 'none', color: '#9fc7b0', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 10 }}>
          ← Montree Admin
        </button>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 28, margin: '0 0 4px', color: '#fff' }}>🌿 Lyf Coach Admin</h1>
        <p style={{ opacity: 0.6, margin: '0 0 18px', fontSize: 13 }}>
          {overview
            ? `${overview.members} members · ${overview.subscriptions.active} active · ${overview.subscriptions.trialing} trial · ${usd(overview.subscriptions.est_mrr_usd)} MRR`
            : 'Billing & usage metadata only. No coach conversation content is shown here.'}
        </p>

        {pending && (
          <div style={{ ...card, borderColor: GOLD, color: GOLD }}>⚠ Run migration 269 in Supabase — billing columns/tables aren&apos;t live yet.</div>
        )}
        {msg && <div style={{ ...card, borderColor: EMERALD }}>{msg}</div>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
          <TabBtn id="overview">Overview</TabBtn>
          <TabBtn id="subscribers">Subscribers</TabBtn>
          <TabBtn id="billing">Billing &amp; Tax</TabBtn>
        </div>

        {loading && <div style={{ opacity: 0.6 }}>Loading…</div>}

        {/* OVERVIEW TAB */}
        {!loading && tab === 'overview' && (
          <>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
              <Tile label="Members" value={overview?.members ?? 0} sub={`+${overview?.signups.new_members_7d ?? 0} this week`} />
              <Tile label="Active subscribers" value={overview?.subscriptions.active ?? 0} accent={EMERALD} />
              <Tile label="Trialing" value={overview?.subscriptions.trialing ?? 0} accent={GOLD} />
              <Tile label="Est. MRR" value={usd(overview?.subscriptions.est_mrr_usd ?? 0)} accent={EMERALD} />
              <Tile label="Visits (7d)" value={overview?.visits.last_7d ?? 0} sub={`${overview?.visits.total ?? 0} all-time`} />
              <Tile label="Online now" value={overview?.online_now ?? 0} />
              <Tile label="Coach msgs (mo)" value={overview?.coach_usage_this_month ?? 0} sub={overview?.month} />
              <Tile label="Viewers" value={overview?.viewers ?? 0} sub={`+${overview?.signups.new_viewers_7d ?? 0} this week`} />
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Recent signups</h2>
              {(!overview || overview.recent_signups.length === 0) ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>No signups yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Member</th><th style={th}>Status</th><th style={th}>Joined</th><th style={th}></th></tr></thead>
                  <tbody>
                    {overview.recent_signups.map((r) => (
                      <tr key={r.space}>
                        <td style={td}>{r.label}</td>
                        <td style={td}>{r.status || '—'}</td>
                        <td style={td}>{fmtDate(r.created_at)}</td>
                        <td style={actionTd}>
                          {r.space === OWNER_SPACE
                            ? <span style={{ opacity: 0.4, fontSize: 12 }}>owner</span>
                            : <button style={dangerBtn} onClick={() => openDelete(r.space, r.label)}>Delete</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={card}>
              <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Recent visits</h2>
              {(!overview || overview.recent_visits.length === 0) ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>No visits recorded yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Who</th><th style={th}>When</th><th style={th}>On page</th></tr></thead>
                  <tbody>
                    {overview.recent_visits.map((v, i) => (
                      <tr key={`${v.username}-${v.visited_at}-${i}`}>
                        <td style={td}>{v.username}</td>
                        <td style={td}>{new Date(v.visited_at).toLocaleString()}</td>
                        <td style={td}>{fmtDuration(v.duration_seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* SUBSCRIBERS TAB */}
        {!loading && tab === 'subscribers' && (
          <div style={card}>
            <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>Subscribers</h2>
            {summary && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {(['active', 'trialing', 'past_due', 'canceled'] as const).map((k) => (
                  <span key={k} style={{ fontSize: 13, padding: '6px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.05)' }}>
                    {k}: <b>{summary[k]}</b>
                  </span>
                ))}
                <span style={{ fontSize: 13, padding: '6px 12px', borderRadius: 9, background: 'rgba(52,211,153,0.15)', color: EMERALD }}>
                  est. MRR: <b>{usd(mrr)}</b>
                </span>
              </div>
            )}
            {subs.length === 0 ? (
              <p style={{ opacity: 0.6, fontSize: 13 }}>No subscribers yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={th}>Member</th><th style={th}>Plan</th><th style={th}>Status</th><th style={th}>Renews / ends</th><th style={th}></th></tr></thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.space}>
                      <td style={td}>{s.label}</td>
                      <td style={td}>{s.plan || '—'}</td>
                      <td style={td}>{s.status}</td>
                      <td style={td}>{fmtDate(s.current_period_end)}</td>
                      <td style={actionTd}>
                        {s.space === OWNER_SPACE ? (
                          <span style={{ opacity: 0.4, fontSize: 12 }}>owner</span>
                        ) : (
                          <>
                            {s.status !== 'canceled' && (
                              <button style={cancelBtn} onClick={() => openCancel(s.space, s.label)}>Cancel</button>
                            )}
                            <button style={dangerBtn} onClick={() => openDelete(s.space, s.label)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* BILLING & TAX TAB */}
        {!loading && tab === 'billing' && (
          <>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>VAT liability</h2>
                {taxTotals && (
                  <span style={{ fontSize: 13, color: GOLD }}>owed: <b>{usd(taxTotals.owed)}</b></span>
                )}
              </div>
              {jurisdictions.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>No VAT collected yet.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Country</th><th style={th}>Collected</th><th style={th}>Remitted</th><th style={th}>Owed</th><th style={th}></th></tr></thead>
                  <tbody>
                    {jurisdictions.map((j) => (
                      <tr key={j.country}>
                        <td style={td}>{j.country}</td>
                        <td style={td}>{usd(j.collected)}</td>
                        <td style={td}>{usd(j.remitted)}</td>
                        <td style={{ ...td, color: j.owed > 0 ? GOLD : '#9fc7b0' }}>{usd(j.owed)}</td>
                        <td style={td}>
                          {j.owed > 0 && (
                            <button onClick={() => recordRemittance(j.country)}
                              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: `1px solid ${EMERALD}`, background: 'transparent', color: EMERALD, cursor: 'pointer' }}>
                              Record remittance
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>Tax register</h2>
                <button onClick={addRegistration}
                  style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${EMERALD}, #1D6B48)`, color: '#06140c', fontWeight: 700, cursor: 'pointer' }}>
                  + Add registration
                </button>
              </div>
              {regs.length === 0 ? (
                <p style={{ opacity: 0.6, fontSize: 13 }}>Not registered anywhere yet. Register EU OSS once for all 27 EU countries when your first EU customer is imminent.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={th}>Scheme</th><th style={th}>Covers</th><th style={th}>Reg #</th><th style={th}>Frequency</th><th style={th}>Next due</th><th style={th}>Status</th></tr></thead>
                  <tbody>
                    {regs.map((r) => (
                      <tr key={r.id}>
                        <td style={td}>{r.scheme}</td>
                        <td style={td}>{r.covers_country || 'multi'}</td>
                        <td style={td}>{r.registration_number || '—'}</td>
                        <td style={td}>{r.filing_frequency}</td>
                        <td style={td}>{fmtDate(r.next_filing_due)}</td>
                        <td style={td}>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* Member action confirmation */}
        {modal && (
          <div onClick={() => { if (!busy) { setModal(null); setConfirmText(''); } }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
            <div onClick={(e) => e.stopPropagation()}
              style={{ background: '#0c1f13', border: `1px solid ${modal.kind === 'delete' ? `${DANGER}66` : `${GOLD}66`}`, borderRadius: 16, padding: 22, maxWidth: 460, width: '100%' }}>
              {modal.kind === 'delete' ? (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, color: DANGER, fontFamily: 'Lora, Georgia, serif' }}>Delete {modal.label}?</h3>
                  <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 14px', lineHeight: 1.55 }}>
                    Permanently removes the account, cancels any active subscription, and erases <b>every trace</b> — Coach history, diary, planner, projects, visits and login records. This cannot be undone.
                  </p>
                  <label style={{ fontSize: 12, opacity: 0.7 }}>Type <b style={{ color: '#fff' }}>{modal.label}</b> to confirm</label>
                  <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: 6, marginBottom: 16, padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14 }} />
                </>
              ) : (
                <>
                  <h3 style={{ margin: '0 0 8px', fontSize: 18, color: GOLD, fontFamily: 'Lora, Georgia, serif' }}>Cancel {modal.label}&apos;s subscription?</h3>
                  <p style={{ fontSize: 13, opacity: 0.85, margin: '0 0 16px', lineHeight: 1.55 }}>
                    Billing stops and the status moves to <b>canceled</b>. The account and all their data stay intact — they can re-subscribe later.
                  </p>
                </>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => { setModal(null); setConfirmText(''); }} disabled={busy}
                  style={{ fontSize: 13, padding: '9px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#cfe', cursor: busy ? 'default' : 'pointer' }}>
                  Keep
                </button>
                <button onClick={runMemberAction}
                  disabled={busy || (modal.kind === 'delete' && confirmText !== modal.label)}
                  style={{
                    fontSize: 13, padding: '9px 16px', borderRadius: 9, border: 'none', fontWeight: 700, color: '#06140c',
                    background: modal.kind === 'delete' ? DANGER : GOLD,
                    cursor: busy || (modal.kind === 'delete' && confirmText !== modal.label) ? 'default' : 'pointer',
                    opacity: busy || (modal.kind === 'delete' && confirmText !== modal.label) ? 0.5 : 1,
                  }}>
                  {busy ? 'Working…' : modal.kind === 'delete' ? 'Delete permanently' : 'Cancel subscription'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
