// components/montree/super-admin/CommandTab.tsx
//
// 🧭 Command — the one-glance business tab (Jul 17 2026).
//
// Tredoux's ask (Operator Mandate, MASTER_OUTREACH_RUNBOOK §5½): ONE super-admin
// button that shows the whole business at a glance. This tab READS existing
// super-admin endpoints only (zero API changes, zero new tables) and fans them
// out in parallel — every section fails in isolation with its own error text,
// so a single dead endpoint can never blank the tab.
//
// Endpoints consumed (all GET, all authed via x-super-admin-token):
//   /api/montree/super-admin/schools                       → { schools }
//   /api/montree/super-admin/founding                      → { config, admitted, rows }
//   /api/montree/super-admin/global-outreach?view=by_country → { countries, grand }
//   /api/montree/super-admin/global-outreach?view=contacts&status=replied
//   /api/montree/super-admin/global-outreach?view=contacts&status=dead
//
// Styling mirrors FoundingTab (dark forest / slate cards, inline
// React.CSSProperties, hardcoded English, no <style jsx>, no gold box-shadow).

'use client';

import { useCallback, useEffect, useState } from 'react';

// The four tabs the footer can jump to. Kept as a narrow union so the parent's
// setActiveTab (which owns the full TabType) accepts it without a cast.
type NavTarget = 'founding' | 'global-outreach' | 'money' | 'schools';

interface CommandTabProps {
  sessionToken: string;
  onNavigate?: (tab: NavTarget) => void;
}

// ── Loose shapes for the endpoints we read (only the fields we use). ──
interface SchoolRow {
  id: string;
  name?: string | null;
  created_at?: string | null;
  subscription_tier?: string | null; // 'trial' | 'free' | 'paid'
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  billing_override_usd?: number | null;
  founding_member?: boolean | null;
  student_count?: number | null;
}

interface FoundingRow {
  id: string;
  school_name?: string | null;
  contact_name?: string | null;
  country?: string | null;
  status?: string | null; // 'waitlisted' | 'admitted' | 'declined'
  redeemed_by_school_id?: string | null;
  redeemed_at?: string | null;
}

interface ContactRow {
  id: string;
  org_name?: string | null;
  country?: string | null;
  status?: string | null;
  notes?: string | null;
  updated_at?: string | null;
}

interface OutreachGrand {
  total: number;
  replied: number;
  dead: number;
}

// Premium list price per student — used for the MRR ESTIMATE only, where a
// school carries no explicit per-student billing override. This is a rough
// derived figure (the truth lives in the 💰 Money tab); it's labelled as an
// estimate wherever shown.
const PREMIUM_PER_STUDENT = 7;

// Honest fallback for the Rejected column when the outreach `notes` don't
// surface an explicit decline reason. These are the rejections recorded in the
// runbook / CLAUDE brain by name.
const KNOWN_REJECTIONS = ['Wheatley School', 'Ardtona House', 'Montessori Aotearoa'];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Shared card style (FoundingTab register). Module-scope so the child
// presentational components below are defined once, not per-render (the
// react-hooks/static-components rule). ──
const CARD: React.CSSProperties = {
  background: '#0f172a',
  border: '1px solid rgba(148,163,184,0.14)',
  borderRadius: 14,
  padding: 20,
};
const LABEL: React.CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#64748b',
  fontWeight: 700,
};

function PipelineColumn({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ...CARD, flex: '1 1 240px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...LABEL, color: accent }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>{text}</div>;
}

export default function CommandTab({ sessionToken, onNavigate }: CommandTabProps) {
  const [schools, setSchools] = useState<SchoolRow[] | null>(null);
  const [schoolsErr, setSchoolsErr] = useState<string | null>(null);

  const [founding, setFounding] = useState<FoundingRow[] | null>(null);
  const [foundingErr, setFoundingErr] = useState<string | null>(null);

  const [grand, setGrand] = useState<OutreachGrand | null>(null);
  const [replied, setReplied] = useState<ContactRow[] | null>(null);
  const [dead, setDead] = useState<ContactRow[] | null>(null);
  const [outreachErr, setOutreachErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  // Current time captured off the render path (react-hooks/purity — Date.now()
  // in render is flagged as impure). Set on mount; 0 until then (harmless — the
  // "≤7d" count reads 0 for the first paint tick, then corrects).
  const [nowTs, setNowTs] = useState(0);

  const load = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setNowTs(Date.now()); // captured off the render path (purity rule)
    const headers = { 'x-super-admin-token': sessionToken };

    // Fan out. Each branch resolves/rejects independently so one dead endpoint
    // only blanks its own section — never the whole tab.
    const getJson = async (url: string) => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };

    const [schoolsR, foundingR, byCountryR, repliedR, deadR] = await Promise.allSettled([
      getJson('/api/montree/super-admin/schools'),
      getJson('/api/montree/super-admin/founding'),
      getJson('/api/montree/super-admin/global-outreach?view=by_country'),
      getJson('/api/montree/super-admin/global-outreach?view=contacts&status=replied&limit=100'),
      getJson('/api/montree/super-admin/global-outreach?view=contacts&status=dead&limit=200'),
    ]);

    // Schools
    if (schoolsR.status === 'fulfilled') {
      setSchools((schoolsR.value?.schools as SchoolRow[]) || []);
      setSchoolsErr(null);
    } else {
      setSchools(null);
      setSchoolsErr('Could not load schools.');
    }

    // Founding
    if (foundingR.status === 'fulfilled') {
      setFounding((foundingR.value?.rows as FoundingRow[]) || []);
      setFoundingErr(null);
    } else {
      setFounding(null);
      setFoundingErr('Could not load Foundation waitlist.');
    }

    // Outreach — by_country grand (counts) + replied names + dead names. The
    // three outreach reads share one error line since they hit the same route.
    let anyOutreachOk = false;
    if (byCountryR.status === 'fulfilled') {
      setGrand((byCountryR.value?.grand as OutreachGrand) || null);
      anyOutreachOk = true;
    } else {
      setGrand(null);
    }
    if (repliedR.status === 'fulfilled') {
      setReplied((repliedR.value?.contacts as ContactRow[]) || []);
      anyOutreachOk = true;
    } else {
      setReplied(null);
    }
    if (deadR.status === 'fulfilled') {
      setDead((deadR.value?.contacts as ContactRow[]) || []);
      anyOutreachOk = true;
    } else {
      setDead(null);
    }
    setOutreachErr(anyOutreachOk ? null : 'Could not load outreach pipeline.');

    setLoading(false);
  }, [sessionToken]);

  useEffect(() => { load(); }, [load]);

  // ── Derivations (all null-safe against a failed section). ──
  const list = schools || [];
  const isTrial = (s: SchoolRow) =>
    s.subscription_tier === 'trial' || s.subscription_status === 'trialing';
  const isPaid = (s: SchoolRow) => s.subscription_tier === 'paid';
  const isFree = (s: SchoolRow) => s.subscription_tier === 'free';
  const isFoundation = (s: SchoolRow) =>
    s.founding_member === true || s.billing_override_usd === 0;

  const trialSchools = list.filter(isTrial);
  const paidSchools = list.filter(isPaid);
  const freeSchools = list.filter(isFree);
  const foundationCount = list.filter(isFoundation).length;

  // Trials ending within 7 days (in the future, ≤7d out).
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const trialsEndingSoon = nowTs === 0 ? 0 : trialSchools.filter((s) => {
    if (!s.trial_ends_at) return false;
    const t = new Date(s.trial_ends_at).getTime();
    return !isNaN(t) && t >= nowTs && t - nowTs <= sevenDays;
  }).length;

  // MRR estimate: sum over paid schools of (per-student override, else the
  // premium list price) × student count. A rough figure — clearly labelled.
  let mrrEstimate = 0;
  for (const s of paidSchools) {
    const rate =
      typeof s.billing_override_usd === 'number' && s.billing_override_usd > 0
        ? s.billing_override_usd
        : PREMIUM_PER_STUDENT;
    mrrEstimate += rate * (s.student_count || 0);
  }
  const showMrr = paidSchools.length > 0 && mrrEstimate > 0;

  // Foundation / free pipeline rows: admitted or redeemed waitlist rows.
  const foundationRows = (founding || []).filter(
    (r) => r.status === 'admitted' || r.redeemed_by_school_id
  );

  // Rejected: dead outreach contacts whose notes read as an explicit decline.
  const declineRe = /(declin|not interested|no thank|hard no|\bno\b)/i;
  const rejectedContacts = (dead || []).filter((c) => c.notes && declineRe.test(c.notes));

  // ── Component-local styles (CARD/LABEL are module-scope above). ──
  const card = CARD;
  const label = LABEL;
  const statCard: React.CSSProperties = {
    ...card,
    padding: 16,
    minWidth: 150,
    flex: '1 1 150px',
  };
  const statNum: React.CSSProperties = { fontSize: 30, fontWeight: 800, color: '#e2e8f0', lineHeight: 1.1 };
  const statSub: React.CSSProperties = { fontSize: 12, color: '#94a3b8', marginTop: 6 };
  const rowText: React.CSSProperties = { fontSize: 13, color: '#cbd5e1' };
  const rowMeta: React.CSSProperties = { fontSize: 11, color: '#64748b' };
  const sectionErr: React.CSSProperties = {
    ...card,
    borderColor: 'rgba(248,113,113,0.3)',
    color: '#fca5a5',
    fontSize: 13,
  };
  const navBtn: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#34d399',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'underline',
  };

  return (
    <div style={{ color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>🧭 Command</h2>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>
        The whole business at a glance — schools, pipeline, and money in one view.{' '}
        <button style={{ ...navBtn, textDecoration: 'none' }} onClick={() => load()} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </p>

      {/* ── 1. Business strip ── */}
      <div style={{ ...label, marginBottom: 8 }}>Business</div>
      {schoolsErr ? (
        <div style={{ ...sectionErr, marginBottom: 24 }}>{schoolsErr}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={statCard}>
            <div style={label}>Schools</div>
            <div style={statNum}>{loading && !schools ? '—' : list.length}</div>
          </div>
          <div style={statCard}>
            <div style={label}>Paying</div>
            <div style={{ ...statNum, color: '#34d399' }}>{loading && !schools ? '—' : paidSchools.length}</div>
          </div>
          <div style={statCard}>
            <div style={label}>Trialing</div>
            <div style={{ ...statNum, color: '#fbbf24' }}>{loading && !schools ? '—' : trialSchools.length}</div>
            <div style={statSub}>trials ending ≤7d: {trialsEndingSoon}</div>
          </div>
          <div style={statCard}>
            <div style={label}>Free / Foundation</div>
            <div style={{ ...statNum, color: '#a5b4fc' }}>{loading && !schools ? '—' : freeSchools.length}</div>
            <div style={statSub}>Foundation grants: {foundationCount}</div>
          </div>
          {showMrr && (
            <div style={statCard}>
              <div style={label}>MRR (est.)</div>
              <div style={{ ...statNum, color: '#34d399' }}>${mrrEstimate.toLocaleString()}</div>
              <div style={statSub}>≈ paid schools × per-student rate</div>
            </div>
          )}
        </div>
      )}

      {/* ── 2. Pipeline ── */}
      <div style={{ ...label, marginBottom: 8 }}>Pipeline</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        {/* Spoken to (outreach replied) */}
        <PipelineColumn title={`Spoken to${replied ? ` · ${replied.length}` : ''}`} accent="#60a5fa">
          {outreachErr && !replied ? (
            <Empty text={outreachErr} />
          ) : !replied || replied.length === 0 ? (
            <Empty text="No replies logged." />
          ) : (
            replied.map((c) => (
              <div key={c.id}>
                <div style={rowText}>{c.org_name || '—'}</div>
                <div style={rowMeta}>
                  {[c.country, fmtDate(c.updated_at)].filter(Boolean).join(' · ')}
                </div>
              </div>
            ))
          )}
        </PipelineColumn>

        {/* Signed — trial */}
        <PipelineColumn title={`Signed · trial${schools ? ` · ${trialSchools.length}` : ''}`} accent="#fbbf24">
          {schoolsErr ? (
            <Empty text="—" />
          ) : trialSchools.length === 0 ? (
            <Empty text="No trials." />
          ) : (
            [...trialSchools]
              .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
              .map((s) => (
                <div key={s.id}>
                  <div style={rowText}>{s.name || 'Unnamed school'}</div>
                  <div style={rowMeta}>{fmtDate(s.created_at)}</div>
                </div>
              ))
          )}
        </PipelineColumn>

        {/* Signed — paying */}
        <PipelineColumn title={`Signed · paying${schools ? ` · ${paidSchools.length}` : ''}`} accent="#34d399">
          {schoolsErr ? (
            <Empty text="—" />
          ) : paidSchools.length === 0 ? (
            <Empty text="No paying schools yet." />
          ) : (
            [...paidSchools]
              .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
              .map((s) => (
                <div key={s.id}>
                  <div style={rowText}>{s.name || 'Unnamed school'}</div>
                  <div style={rowMeta}>{[fmtDate(s.created_at), `${s.student_count || 0} students`].filter(Boolean).join(' · ')}</div>
                </div>
              ))
          )}
        </PipelineColumn>

        {/* Foundation / free */}
        <PipelineColumn title={`Foundation / free${founding ? ` · ${foundationRows.length}` : ''}`} accent="#a5b4fc">
          {foundingErr ? (
            <Empty text={foundingErr} />
          ) : foundationRows.length === 0 ? (
            <Empty text="No Foundation grants." />
          ) : (
            foundationRows.map((r) => (
              <div key={r.id}>
                <div style={rowText}>{r.school_name || r.contact_name || '—'}</div>
                <div style={rowMeta}>
                  {r.redeemed_by_school_id ? '✓ redeemed' : 'admitted'}
                  {r.country ? ` · ${r.country}` : ''}
                </div>
              </div>
            ))
          )}
        </PipelineColumn>

        {/* Rejected */}
        <PipelineColumn
          title={`Rejected${grand ? ` · ${grand.dead} dead` : ''}`}
          accent="#f87171"
        >
          {outreachErr && !dead ? (
            <Empty text={outreachErr} />
          ) : rejectedContacts.length > 0 ? (
            rejectedContacts.map((c) => (
              <div key={c.id}>
                <div style={rowText}>{c.org_name || '—'}</div>
                <div style={rowMeta}>{[c.country, (c.notes || '').slice(0, 60)].filter(Boolean).join(' · ')}</div>
              </div>
            ))
          ) : (
            <>
              <div style={{ ...rowMeta, marginBottom: 2 }}>Recorded rejections</div>
              {KNOWN_REJECTIONS.map((name) => (
                <div key={name} style={rowText}>{name}</div>
              ))}
            </>
          )}
        </PipelineColumn>
      </div>

      {/* ── 3. Demos & meetings ── */}
      <div style={{ ...label, marginBottom: 8 }}>Demos &amp; meetings</div>
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#cbd5e1' }}>
          Demos are captured in the daily brief. Dedicated tracker: next build.
        </div>
      </div>

      {/* ── 4. Today ── */}
      <div style={{ ...label, marginBottom: 8 }}>Today</div>
      <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
        {onNavigate ? (
          <>
            <button style={navBtn} onClick={() => onNavigate('founding')}>🌱 Foundation</button>
            <button style={navBtn} onClick={() => onNavigate('global-outreach')}>🌍 Global Outreach</button>
            <button style={navBtn} onClick={() => onNavigate('money')}>💰 Money</button>
            <button style={navBtn} onClick={() => onNavigate('schools')}>🏫 Schools</button>
          </>
        ) : (
          <span style={{ fontSize: 13, color: '#64748b' }}>
            See Foundation / Global Outreach / Money / Schools tabs for detail.
          </span>
        )}
      </div>
    </div>
  );
}
