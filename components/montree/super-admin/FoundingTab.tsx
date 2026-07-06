'use client';

import { useCallback, useEffect, useState } from 'react';

// Super-admin "Founding 100" control panel.
// Full manual control, no SQL: see every signup, admit/decline with a button,
// edit the cap + wave, and open/close the offer with a toggle.

interface Row {
  id: string;
  school_name: string;
  contact_name: string | null;
  email: string;
  country: string | null;
  student_count: number | null;
  status: 'waitlisted' | 'admitted' | 'declined';
  admitted_at: string | null;
  created_at: string;
  source: string | null;
  // Migration 286 — founding signup code + redemption.
  signup_code: string | null;
  code_generated_at: string | null;
  redeemed_by_school_id: string | null;
  redeemed_at: string | null;
}

interface Config {
  cap: number;
  wave: number;
  is_closed: boolean;
}

const STATUS_STYLE: Record<Row['status'], { bg: string; fg: string; label: string }> = {
  admitted: { bg: 'rgba(52,211,153,0.15)', fg: '#34d399', label: 'Admitted' },
  waitlisted: { bg: 'rgba(148,163,184,0.15)', fg: '#94a3b8', label: 'Waitlisted' },
  declined: { bg: 'rgba(248,113,113,0.12)', fg: '#f87171', label: 'Declined' },
};

export default function FoundingTab({ sessionToken }: { sessionToken: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [config, setConfig] = useState<Config>({ cap: 100, wave: 1, is_closed: false });
  const [admitted, setAdmitted] = useState(0);
  const [remaining, setRemaining] = useState(100);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'waitlisted' | 'admitted' | 'declined'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Local editable copies of cap/wave so typing doesn't fight the fetch.
  const [capInput, setCapInput] = useState('100');
  const [waveInput, setWaveInput] = useState('1');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/super-admin/founding', {
        headers: { 'x-super-admin-token': sessionToken },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.rows || []);
      setConfig(data.config);
      setAdmitted(data.admitted);
      setRemaining(data.remaining);
      setTotal(data.total);
      setCapInput(String(data.config.cap));
      setWaveInput(String(data.config.wave));
      setError(null);
    } catch {
      setError('Could not load the Founding 100 data. If you have not run migration 285 yet, do that first.');
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/montree/super-admin/founding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }, [sessionToken]);

  const setStatus = async (id: string, status: Row['status']) => {
    setBusyId(id);
    try {
      await patch({ action: 'set_status', id, status });
      await load();
    } catch {
      setError('Could not update that school. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  // Mint (or reveal the existing) FND- signup code for an admitted row, then
  // reload so the copyable link shows. Idempotent server-side — safe to click
  // again (it returns the same code, never rotates).
  const generateCode = async (id: string) => {
    setBusyId(id);
    try {
      await patch({ action: 'generate_code', id });
      await load();
    } catch {
      setError('Could not generate a signup code. Try again.');
    } finally {
      setBusyId(null);
    }
  };

  const copyLink = async (code: string) => {
    const link = `https://montree.xyz/montree/try?founding=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 2000);
    } catch {
      setError('Could not copy the link. You can select it manually.');
    }
  };

  // One-shot mint (Jul 6 launch): school name + email → admitted row + FND-
  // code + shareable link, in a single click. This is the primary founding
  // workflow — schools apply BY EMAIL, so there's rarely a waitlist row to
  // admit first. Duplicate email that's already admitted+coded returns the
  // existing code (idempotent); other duplicates get a clear 409 message.
  const [mintSchool, setMintSchool] = useState('');
  const [mintEmail, setMintEmail] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<{ code: string; already: boolean } | null>(null);

  const mintLink = async () => {
    if (!mintSchool.trim() || !mintEmail.trim()) {
      setError('School name and email are both needed to mint a link.');
      return;
    }
    setMinting(true);
    setMinted(null);
    try {
      const res = await fetch('/api/montree/super-admin/founding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
        body: JSON.stringify({ action: 'create_admitted', school_name: mintSchool.trim(), email: mintEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not mint a founding link. Try again.');
        return;
      }
      setMinted({ code: data.signup_code, already: !!data.already_existed });
      setMintSchool('');
      setMintEmail('');
      setError(null);
      await load();
    } catch {
      setError('Could not mint a founding link. Try again.');
    } finally {
      setMinting(false);
    }
  };

  const saveConfig = async (override?: Partial<Config>) => {
    setSavingConfig(true);
    try {
      await patch({
        action: 'update_config',
        cap: Number(capInput),
        wave: Number(waveInput),
        is_closed: override?.is_closed ?? config.is_closed,
      });
      await load();
    } catch {
      setError('Could not save the configuration. Try again.');
    } finally {
      setSavingConfig(false);
    }
  };

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const card: React.CSSProperties = {
    background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: 14, padding: 20,
  };
  const label: React.CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 700 };
  const input: React.CSSProperties = {
    background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)', color: '#e2e8f0',
    borderRadius: 8, padding: '10px 12px', fontSize: 16, width: 90,
  };
  const btn = (bg: string, fg: string): React.CSSProperties => ({
    background: bg, color: fg, border: 'none', borderRadius: 8,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    minHeight: 40,
  });

  return (
    <div style={{ color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🚀 Founding 100</h2>
        <span style={{ fontSize: 13, color: '#64748b' }}>
          {loading ? 'Loading…' : `${remaining} of ${config.cap} spots remaining`}
        </span>
      </div>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
        The public counter shows spots remaining based on schools <strong style={{ color: '#94a3b8' }}>you admit here</strong> — not raw signups.
        Admitting a school does not charge it $3; set that school&apos;s per-school billing override to lock the price when you&apos;re ready.
      </p>

      {error && (
        <div style={{ ...card, borderColor: 'rgba(248,113,113,0.3)', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Mint a founding link (one shot) ──
          The headline action: type the school + email from their application
          email, click Mint → admitted row + FND- code + shareable link. */}
      <div style={{ ...card, borderColor: 'rgba(232,201,106,0.4)', marginBottom: 16 }}>
        <div style={{ ...label, color: '#E8C96A', marginBottom: 10 }}>🚀 Mint a founding link</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ ...input, width: 220 }}
            placeholder="School name"
            value={mintSchool}
            onChange={(e) => setMintSchool(e.target.value)}
          />
          <input
            style={{ ...input, width: 240 }}
            placeholder="Their email"
            type="email"
            value={mintEmail}
            onChange={(e) => setMintEmail(e.target.value)}
          />
          <button
            style={btn('#E8C96A', '#1a1208')}
            disabled={minting}
            onClick={mintLink}
          >
            {minting ? 'Minting…' : 'Mint link'}
          </button>
        </div>
        {minted && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <code style={{ background: 'rgba(232,201,106,0.12)', color: '#E8C96A', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              https://montree.xyz/montree/try?founding={minted.code}
            </code>
            <button style={btn('#334155', '#e2e8f0')} onClick={() => copyLink(minted.code)}>
              {copiedCode === minted.code ? '✓ Copied' : 'Copy link'}
            </button>
            {minted.already && (
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Email already admitted — this is their existing link.</span>
            )}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0 0' }}>
          The link gives the school 1 month of Premium free, then Premium locked at $3/student for life. Single use.
        </p>
      </div>

      {/* ── Config + stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={card}>
          <div style={label}>Admitted</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#34d399' }}>{admitted}</div>
        </div>
        <div style={card}>
          <div style={label}>Remaining</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{remaining}</div>
        </div>
        <div style={card}>
          <div style={label}>Total signups</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>{total}</div>
        </div>
        <div style={card}>
          <div style={label}>Offer status</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: config.is_closed ? '#f87171' : '#34d399', marginTop: 6 }}>
            {config.is_closed ? 'CLOSED' : 'OPEN'}
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Cap</div>
          <input style={input} type="number" value={capInput} onChange={(e) => setCapInput(e.target.value)} />
        </div>
        <div>
          <div style={{ ...label, marginBottom: 6 }}>Wave</div>
          <input style={input} type="number" value={waveInput} onChange={(e) => setWaveInput(e.target.value)} />
        </div>
        <button style={btn('#334155', '#e2e8f0')} disabled={savingConfig} onClick={() => saveConfig()}>
          {savingConfig ? 'Saving…' : 'Save cap + wave'}
        </button>
        <button
          style={btn(config.is_closed ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)', config.is_closed ? '#34d399' : '#f87171')}
          disabled={savingConfig}
          onClick={() => saveConfig({ is_closed: !config.is_closed })}
        >
          {config.is_closed ? '↺ Re-open the offer' : '■ Close the offer now'}
        </button>
      </div>

      {/* ── Filter pills ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', 'waitlisted', 'admitted', 'declined'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? '#334155' : 'transparent',
              color: filter === f ? '#e2e8f0' : '#64748b',
              border: '1px solid rgba(148,163,184,0.2)', borderRadius: 999,
              padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Rows ── */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {visible.length === 0 && !loading && (
          <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontSize: 14 }}>No signups yet.</div>
        )}
        {visible.map((r, i) => {
          const s = STATUS_STYLE[r.status];
          const link = r.signup_code ? `https://montree.xyz/montree/try?founding=${r.signup_code}` : '';
          return (
            <div key={r.id} style={{
              padding: '14px 18px', borderTop: i === 0 ? 'none' : '1px solid rgba(148,163,184,0.1)',
            }}>
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{r.school_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {r.contact_name ? `${r.contact_name} · ` : ''}{r.email}
                    {r.country ? ` · ${r.country}` : ''}
                    {r.student_count != null ? ` · ~${r.student_count} students` : ''}
                  </div>
                </div>
                <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  {s.label}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {r.status !== 'admitted' && (
                    <button style={btn('rgba(52,211,153,0.15)', '#34d399')} disabled={busyId === r.id} onClick={() => setStatus(r.id, 'admitted')}>
                      {busyId === r.id ? '…' : '✓ Admit'}
                    </button>
                  )}
                  {r.status !== 'declined' && (
                    <button style={btn('rgba(248,113,113,0.12)', '#f87171')} disabled={busyId === r.id} onClick={() => setStatus(r.id, 'declined')}>
                      Decline
                    </button>
                  )}
                  {r.status !== 'waitlisted' && (
                    <button style={btn('transparent', '#64748b')} disabled={busyId === r.id} onClick={() => setStatus(r.id, 'waitlisted')}>
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Founding signup code (admitted rows only). Generate a one-time
                  FND- link, copy it, share it. Redeemed rows show ✓ redeemed. */}
              {r.status === 'admitted' && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  {r.redeemed_at ? (
                    <span style={{
                      background: 'rgba(52,211,153,0.12)', color: '#34d399',
                      borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    }}>
                      ✓ Redeemed{r.redeemed_by_school_id ? ` · school ${r.redeemed_by_school_id}` : ''}
                      {r.redeemed_at ? ` · ${new Date(r.redeemed_at).toLocaleDateString()}` : ''}
                    </span>
                  ) : r.signup_code ? (
                    <>
                      <code style={{
                        background: '#0b1220', border: '1px solid rgba(148,163,184,0.18)',
                        color: '#e2e8f0', borderRadius: 8, padding: '6px 10px',
                        fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        maxWidth: 420, overflowX: 'auto', whiteSpace: 'nowrap',
                      }}>{link}</code>
                      <button style={btn('#334155', '#e2e8f0')} onClick={() => copyLink(r.signup_code!)}>
                        {copiedCode === r.signup_code ? '✓ Copied' : '📋 Copy link'}
                      </button>
                    </>
                  ) : (
                    <button
                      style={btn('rgba(232,201,106,0.15)', '#E8C96A')}
                      disabled={busyId === r.id}
                      onClick={() => generateCode(r.id)}
                    >
                      {busyId === r.id ? '…' : '🔗 Generate link'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
