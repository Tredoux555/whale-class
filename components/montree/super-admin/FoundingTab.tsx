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
  // Migration 290 — grant type. 'partner_free_life' = Partner Program (Premium
  // FREE for life); anything else / absent = Founding 100 ($3 for life).
  grant_type?: string | null;
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

// ── Referral QR card helpers (client-only canvas compositing) ──
// Load an <img> as a promise so we can await it before drawing to canvas.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${src}`));
    img.src = src;
  });
}

// Draw centered text with manual letter-spacing (robust across browsers that
// lack ctx.letterSpacing, and avoids the un-typed property).
function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, y: number, spacing: number,
) {
  const chars = Array.from(text);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  let x = cx - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + spacing;
  }
  ctx.textAlign = prevAlign;
}

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

  // ── Partner Program mint (one shot) ──
  // Partner name + email + school + share % → signup link (Premium FREE for
  // life) + referral code/link (revenue share) + agent dashboard login, all in
  // one submission. Idempotent on email server-side. The agent login code is
  // shown ONCE and cannot be recovered.
  interface PartnerResult {
    signup_code: string;
    signup_link: string;
    referral_code: string;
    referral_link: string;
    agent_id: string | null;
    agent_login_code: string | null;
    login_url: string;
    revenue_share_pct: number;
    already_existed?: boolean;
    note?: string | null;
  }
  const [pName, setPName] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pSchool, setPSchool] = useState('');
  const [pShare, setPShare] = useState('20');
  const [pMinting, setPMinting] = useState(false);
  const [partnerResult, setPartnerResult] = useState<PartnerResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');

  const copyText = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 2000);
    } catch {
      setError('Could not copy. Select the text manually.');
    }
  };

  const mintPartner = async () => {
    if (!pName.trim() || !pEmail.trim() || !pSchool.trim()) {
      setError('Partner name, email, and school name are all needed to mint a partner package.');
      return;
    }
    const share = Number(pShare);
    if (Number.isNaN(share) || share < 0 || share > 100) {
      setError('Revenue share % must be between 0 and 100.');
      return;
    }
    setPMinting(true);
    setPartnerResult(null);
    try {
      const res = await fetch('/api/montree/super-admin/founding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-super-admin-token': sessionToken },
        body: JSON.stringify({
          action: 'create_partner',
          partner_name: pName.trim(),
          email: pEmail.trim(),
          school_name: pSchool.trim(),
          revenue_share_pct: share,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not mint the partner package. Try again.');
        return;
      }
      setPartnerResult(data as PartnerResult);
      setPName('');
      setPEmail('');
      setPSchool('');
      setPShare('20');
      setError(null);
      await load();
    } catch {
      setError('Could not mint the partner package. Try again.');
    } finally {
      setPMinting(false);
    }
  };

  // ── Branded referral QR card ──
  // Stamps the referral QR onto a designer-made 1080×1920 template
  // (public/brand/referral-card-template.png — background, glowing M tile,
  // "Welcome to Montree" headline, empty cream QR card + footer are all baked
  // in) and downloads the PNG. Entirely client-side; no network, no backend.
  const generateReferralQr = async () => {
    if (!partnerResult) return;
    const { referral_link, referral_code } = partnerResult;
    setQrStatus('working');
    try {
      // Dynamic import keeps qrcode off the initial bundle.
      const QRCode = (await import('qrcode')).default;

      const W = 1080, H = 1920;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      // 1 — full-bleed designer template.
      const template = await loadImage('/brand/referral-card-template.png');
      ctx.drawImage(template, 0, 0, W, H);

      // 2 — QR, stamped into the template's empty cream card.
      const qrDataUrl = await QRCode.toDataURL(referral_link, {
        width: 456,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#0A1A0F', light: '#F5EDD8' },
      });
      const qrImg = await loadImage(qrDataUrl);
      ctx.drawImage(qrImg, 312, 912, 456, 456);

      // 3 — referral code caption (letter-spaced gold). This is the only text
      //     we draw — the headline + footer are part of the template now, so we
      //     only need Lora ready for the caption.
      try {
        await document.fonts.load('30px Lora');
        await document.fonts.ready;
      } catch {
        /* Georgia/serif fallback is fine if font loading is unavailable. */
      }
      ctx.fillStyle = 'rgba(232,201,106,0.85)';
      ctx.font = '30px Lora, Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      drawSpacedText(ctx, referral_code, 540, 1495, 8);

      // Download via blob → object URL → synthetic <a> (same pattern as
      // app/admin/qr-generator/page.tsx).
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
          'image/png',
        );
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `montree-referral-${referral_code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setQrStatus('done');
      setTimeout(() => setQrStatus((s) => (s === 'done' ? 'idle' : s)), 2000);
    } catch {
      setQrStatus('error');
      setTimeout(() => setQrStatus((s) => (s === 'error' ? 'idle' : s)), 2500);
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

      {/* ── Mint a PARTNER package (one shot) ──
          Underprivileged-school partner: Premium FREE for life + a referral
          code (revenue share) + an agent dashboard login, all in one click. */}
      <div style={{ ...card, borderColor: 'rgba(129,140,248,0.4)', marginBottom: 16 }}>
        <div style={{ ...label, color: '#a5b4fc', marginBottom: 4 }}>🤝 Mint a partner package</div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
          One submission → a signup link (Premium <strong style={{ color: '#a5b4fc' }}>free for life</strong>), a referral code + promo link (revenue share), and an agent dashboard login.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            style={{ ...input, width: 200 }}
            placeholder="Partner name"
            value={pName}
            onChange={(e) => setPName(e.target.value)}
          />
          <input
            style={{ ...input, width: 240 }}
            placeholder="Their email"
            type="email"
            value={pEmail}
            onChange={(e) => setPEmail(e.target.value)}
          />
          <input
            style={{ ...input, width: 220 }}
            placeholder="School name"
            value={pSchool}
            onChange={(e) => setPSchool(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              style={{ ...input, width: 70 }}
              type="number"
              min={0}
              max={100}
              value={pShare}
              onChange={(e) => setPShare(e.target.value)}
            />
            <span style={{ fontSize: 13, color: '#64748b' }}>% share</span>
          </div>
          <button
            style={btn('#818cf8', '#0b1020')}
            disabled={pMinting}
            onClick={mintPartner}
          >
            {pMinting ? 'Minting…' : 'Mint package'}
          </button>
        </div>

        {partnerResult && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Signup link — Premium free for life */}
            <div>
              <div style={{ ...label, marginBottom: 4 }}>Signup link · Premium free for life</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <code style={{ background: 'rgba(129,140,248,0.12)', color: '#a5b4fc', padding: '8px 12px', borderRadius: 8, fontSize: 12, maxWidth: 460, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {partnerResult.signup_link}
                </code>
                <button style={btn('#334155', '#e2e8f0')} onClick={() => copyText(partnerResult.signup_link, 'p-signup')}>
                  {copiedField === 'p-signup' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Referral link — revenue share */}
            <div>
              <div style={{ ...label, marginBottom: 4 }}>Referral link · {partnerResult.referral_code} · {partnerResult.revenue_share_pct}% share</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <code style={{ background: 'rgba(52,211,153,0.10)', color: '#34d399', padding: '8px 12px', borderRadius: 8, fontSize: 12, maxWidth: 460, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                  {partnerResult.referral_link}
                </code>
                <button style={btn('#334155', '#e2e8f0')} onClick={() => copyText(partnerResult.referral_link, 'p-ref')}>
                  {copiedField === 'p-ref' ? '✓ Copied' : 'Copy'}
                </button>
                <button
                  style={{ ...btn('rgba(232,201,106,0.15)', '#E8C96A'), opacity: qrStatus === 'working' ? 0.7 : 1 }}
                  onClick={generateReferralQr}
                  disabled={qrStatus === 'working'}
                >
                  {qrStatus === 'working'
                    ? 'Generating…'
                    : qrStatus === 'done'
                    ? '✓ Downloaded'
                    : qrStatus === 'error'
                    ? 'Failed — retry'
                    : 'Generate QR code'}
                </button>
              </div>
            </div>

            {/* Agent login */}
            <div>
              <div style={{ ...label, marginBottom: 4 }}>Agent dashboard login</div>
              {partnerResult.agent_login_code ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <code style={{ background: 'rgba(232,201,106,0.12)', color: '#E8C96A', padding: '8px 12px', borderRadius: 8, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
                    {partnerResult.agent_login_code}
                  </code>
                  <button style={btn('#334155', '#e2e8f0')} onClick={() => copyText(partnerResult.agent_login_code!, 'p-code')}>
                    {copiedField === 'p-code' ? '✓ Copied' : 'Copy code'}
                  </button>
                  <code style={{ background: '#0b1220', border: '1px solid rgba(148,163,184,0.18)', color: '#94a3b8', padding: '8px 10px', borderRadius: 8, fontSize: 11, maxWidth: 380, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                    {partnerResult.login_url}
                  </code>
                  <button style={btn('#334155', '#e2e8f0')} onClick={() => copyText(partnerResult.login_url, 'p-loginurl')}>
                    {copiedField === 'p-loginurl' ? '✓ Copied' : 'Copy URL'}
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No new login code issued.</div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 8, padding: '8px 12px' }}>
                ⚠️ The agent login code is shown ONCE and cannot be recovered — copy it now.
                {partnerResult.already_existed ? ' This partner already existed; the signup + referral links are their existing ones.' : ''}
                {partnerResult.note ? ` ${partnerResult.note}` : ''}
              </div>
            </div>
          </div>
        )}
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
                {r.grant_type === 'partner_free_life' && (
                  <span style={{ background: 'rgba(129,140,248,0.15)', color: '#a5b4fc', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                    🤝 FREE FOR LIFE
                  </span>
                )}
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
