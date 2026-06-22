'use client';

// Super-admin — Lyf Coach billing & tax. Subscribers (BILLING METADATA ONLY —
// never coach content, rule #319) + VAT liability per jurisdiction with a
// record-remittance action + the tax register. Token via sessionStorage
// 'super-admin-token'; backing APIs enforce verifySuperAdminAuth.

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

interface Subscriber { space: string; label: string; plan: string | null; status: string | null; current_period_end: string | null }
interface Summary { active: number; trialing: number; past_due: number; canceled: number; other: number }
interface Jurisdiction { country: string; collected: number; remitted: number; owed: number }
interface Registration { id: string; scheme: string; covers_country: string | null; registration_number: string | null; filing_frequency: string; next_filing_due: string | null; status: string }

const BG = '#0a1a0f';
const EMERALD = '#34d399';
const GOLD = '#E8C96A';
const usd = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

export default function LyfCoachAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [mrr, setMrr] = useState(0);

  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [taxTotals, setTaxTotals] = useState<{ collected: number; remitted: number; owed: number } | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const headers = useCallback((t: string) => ({ 'x-super-admin-token': t, 'Content-Type': 'application/json' }), []);

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [sRes, tRes] = await Promise.all([
        fetch('/api/montree/super-admin/lyf-coach/subscribers', { headers: { 'x-super-admin-token': t } }),
        fetch('/api/montree/super-admin/lyf-coach/tax', { headers: { 'x-super-admin-token': t } }),
      ]);
      if (sRes.status === 401 || tRes.status === 401) {
        sessionStorage.removeItem('super-admin-token');
        router.replace('/montree/super-admin');
        return;
      }
      const s = await sRes.json().catch(() => null);
      const tx = await tRes.json().catch(() => null);
      if (s?.migration_pending || tx?.migration_pending) setPending(true);
      if (s) { setSubs(s.subscribers || []); setSummary(s.summary || null); setMrr(s.est_mrr_usd || 0); }
      if (tx) { setJurisdictions(tx.jurisdictions || []); setTaxTotals(tx.totals || null); setRegs(tx.registrations || []); }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const t = typeof window !== 'undefined' ? sessionStorage.getItem('super-admin-token') : null;
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

  const card: CSSProperties = { background: 'rgba(8,20,12,0.55)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: 18, marginBottom: 18 };
  const th: CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: '#9fc7b0', borderBottom: '1px solid rgba(255,255,255,0.08)' };
  const td: CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)' };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#e8f0ea', padding: '28px 20px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 28, margin: '0 0 4px', color: '#fff' }}>Lyf Coach — billing &amp; tax</h1>
        <p style={{ opacity: 0.6, margin: '0 0 20px', fontSize: 13 }}>Billing metadata only. No coach conversation content is shown here.</p>

        {pending && (
          <div style={{ ...card, borderColor: GOLD, color: GOLD }}>⚠ Run migration 269 in Supabase — billing columns/tables aren&apos;t live yet.</div>
        )}
        {msg && <div style={{ ...card, borderColor: EMERALD }}>{msg}</div>}
        {loading && <div style={{ opacity: 0.6 }}>Loading…</div>}

        {!loading && (
          <>
            {/* Subscribers */}
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
                  <thead><tr><th style={th}>Member</th><th style={th}>Plan</th><th style={th}>Status</th><th style={th}>Renews / ends</th></tr></thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.space}>
                        <td style={td}>{s.label}</td>
                        <td style={td}>{s.plan || '—'}</td>
                        <td style={td}>{s.status}</td>
                        <td style={td}>{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Tax */}
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

            {/* Register */}
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
                        <td style={td}>{r.next_filing_due ? new Date(r.next_filing_due).toLocaleDateString() : '—'}</td>
                        <td style={td}>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
