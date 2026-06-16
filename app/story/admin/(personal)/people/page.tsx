'use client';

// People — owner-only member management for the sanctuary.
// Lists every member (each = a sealed sanctuary + a board member) and lets the
// owner (Tredoux) create a new one. The page is gated server-side: a non-owner
// gets a gentle "owner only" message; the create API refuses anyone but the owner.

import { useEffect, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

interface Member {
  username: string;
  space: string;
  created_at: string;
  last_login: string | null;
}

function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export default function PeoplePage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loadErr, setLoadErr] = useState('');

  // create form
  const [username, setUsername] = useState('');
  const [space, setSpace] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    const token = getStoryAdminToken();
    if (!token) { setAllowed(false); return; }
    try {
      const res = await fetch('/api/story/admin/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setAllowed(false); return; }
      if (!res.ok) { setAllowed(true); setLoadErr('Could not load members.'); return; }
      const data = await res.json();
      setAllowed(true);
      setMembers(data.members || []);
    } catch {
      setAllowed(true);
      setLoadErr('Could not load members.');
    }
  }

  useEffect(() => { void load(); }, []);

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    setBusy(true);
    try {
      const token = getStoryAdminToken();
      const res = await fetch('/api/story/admin/members', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, space: space || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg({ kind: 'err', text: data.error || 'Could not create member.' });
        return;
      }
      setFormMsg({ kind: 'ok', text: `Created ${titleCase(data.space)} — they can sign in with "${data.username}".` });
      setUsername(''); setSpace(''); setPassword('');
      void load();
    } catch {
      setFormMsg({ kind: 'err', text: 'Could not create member.' });
    } finally {
      setBusy(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, color: T.textMid, marginBottom: 6, fontWeight: 500,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11,
    background: 'rgba(8,20,12,0.6)', border: `1px solid ${T.border}`, color: T.text,
    fontFamily: T.sans, fontSize: 15, outline: 'none',
  };

  if (allowed === false) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 16px', color: T.textMid, fontFamily: T.sans }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
        <p style={{ fontSize: 15 }}>This area is for the owner.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.text, margin: '0 0 4px' }}>
        People
      </h1>
      <p style={{ color: T.textMid, fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
        Everyone with their own private sanctuary. Each person gets their own Coach and Planner,
        sealed from the others, and shares the emergency board with you.
      </p>

      {/* Member list */}
      {members === null && !loadErr ? (
        <p style={{ color: T.textDim, fontSize: 14 }}>Loading…</p>
      ) : loadErr ? (
        <p style={{ color: '#f2a3a3', fontSize: 14 }}>{loadErr}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 30 }}>
          {(members || []).map((m) => (
            <div
              key={m.space}
              style={{
                display: 'flex', alignItems: 'center', gap: 13,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '13px 15px',
              }}
            >
              <div
                style={{
                  width: 40, height: 40, borderRadius: 11, flex: '0 0 40px',
                  background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: T.serif, fontWeight: 700, fontSize: 18, color: '#06140c',
                }}
              >
                {titleCase(m.space).charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.text }}>
                  {titleCase(m.space)}
                </div>
                <div style={{ fontSize: 12.5, color: T.textDim }}>
                  signs in as “{m.username}”
                  {m.last_login ? ` · last in ${new Date(m.last_login).toLocaleDateString()}` : ' · never signed in'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20 }}>
        <h2 style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.text, margin: '0 0 16px' }}>
          Add someone
        </h2>
        <form onSubmit={createMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Their login name</label>
            <input
              style={inputStyle} value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. bayan" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
          </div>
          <div>
            <label style={labelStyle}>Space label <span style={{ color: T.textDim }}>(optional — defaults to the login name)</span></label>
            <input
              style={inputStyle} value={space}
              onChange={(e) => setSpace(e.target.value)}
              placeholder="e.g. bayan" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            />
          </div>
          <div>
            <label style={labelStyle}>Temporary password <span style={{ color: T.textDim }}>(8+ characters — they can change it later)</span></label>
            <input
              style={inputStyle} value={password} type="text"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="something they can remember"
            />
          </div>

          {formMsg && (
            <div
              style={{
                fontSize: 13.5, padding: '10px 13px', borderRadius: 10,
                background: formMsg.kind === 'ok' ? 'rgba(52,211,153,0.12)' : 'rgba(242,120,120,0.12)',
                border: `1px solid ${formMsg.kind === 'ok' ? T.border : 'rgba(242,120,120,0.3)'}`,
                color: formMsg.kind === 'ok' ? T.text : '#f2a3a3',
              }}
            >
              {formMsg.text}
            </div>
          )}

          <button
            type="submit" disabled={busy}
            style={{
              appearance: 'none', border: 'none', cursor: busy ? 'default' : 'pointer',
              background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
              color: '#06140c', fontFamily: T.sans, fontSize: 15, fontWeight: 600,
              padding: '12px 16px', borderRadius: 12, opacity: busy ? 0.6 : 1,
              boxShadow: '0 0 18px rgba(52,211,153,0.25)',
            }}
          >
            {busy ? 'Creating…' : 'Create sanctuary'}
          </button>
        </form>
        <p style={{ color: T.textDim, fontSize: 12, margin: '14px 0 0', lineHeight: 1.5 }}>
          Their Coach won’t know them yet — it’ll start with a gentle first chat to get to know
          them. You can add a written brief about them later.
        </p>
      </div>
    </div>
  );
}
