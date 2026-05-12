'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, RefreshCw, Mail, Lock } from 'lucide-react';

interface DemoRequest {
  id: string;
  org_name: string;
  contact_person: string | null;
  email: string;
  status: string;
  notes: string | null;
  created_at: string;
  country: string | null;
  website: string | null;
}

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.20)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function DemoRequestsPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, contacted: 0 });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch('/api/montree/super-admin/demo-requests', {
        headers: { 'x-super-admin-password': pwd },
      });
      if (!res.ok) { setAuthed(false); return; }
      const data = await res.json();
      setRequests(data.requests || []);
      setStats({ total: data.total, pending: data.pending, contacted: data.contacted });
      setAuthed(true);
    } catch { /* */ }
    setLoading(false);
  }, [password]);

  useEffect(() => {
    const saved = sessionStorage.getItem('sa_pwd');
    if (saved) { setPassword(saved); }
  }, []);

  useEffect(() => {
    if (password) fetchData();
  }, [password, fetchData]);

  async function handleStatusChange(id: string, newStatus: string) {
    const pwd = sessionStorage.getItem('sa_pwd') || password;
    await fetch('/api/montree/super-admin/demo-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-password': pwd },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchData();
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('sa_pwd', password);
    fetchData();
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.sans,
      }}>
        <form
          onSubmit={handleLogin}
          style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: 18,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            padding: 32,
            width: '100%',
            maxWidth: 380,
            boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            color: T.textPrimary,
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 12,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.40)',
            color: T.emerald,
            marginBottom: 14,
          }}>
            <Lock size={18} strokeWidth={1.75} />
          </div>
          <h1 style={{
            margin: '0 0 16px',
            fontFamily: T.serif,
            fontSize: 22,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.3,
          }}>
            Demo Requests
          </h1>
          <input
            type="password"
            placeholder="Super admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 12,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              outline: 'none',
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, #34d399, #10b981)',
              border: '1px solid rgba(52,211,153,0.55)',
              color: '#06281a',
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.30)',
            }}
          >
            Log in
          </button>
        </form>
      </div>
    );
  }

  const pending = requests.filter(r => r.status === 'demo_requested');
  const handled = requests.filter(r => r.status !== 'demo_requested');

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      padding: 16,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <div style={{ maxWidth: 768, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 26,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.4,
            }}>
              Demo Requests
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
            }}>
              From montree.xyz landing page
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.55 : 1,
            }}
          >
            <RefreshCw size={12} strokeWidth={1.75} style={loading ? { animation: 'dr-spin 0.9s linear infinite' } : {}} />
            {loading ? '...' : 'Refresh'}
          </button>
          <style>{`@keyframes dr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: T.card,
            border: T.cardBorder,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 500, color: T.textPrimary }}>{stats.total}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>Total</div>
          </div>
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: T.amberStrong,
            border: `1px solid ${T.amberBorder}`,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 500, color: T.amber }}>{stats.pending}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.amber, textTransform: 'uppercase', letterSpacing: 0.6 }}>Action needed</div>
          </div>
          <div style={{
            padding: 16,
            borderRadius: 14,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.40)',
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 500, color: T.emerald }}>{stats.contacted}</div>
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 700, color: T.emerald, textTransform: 'uppercase', letterSpacing: 0.6 }}>Contacted</div>
          </div>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              margin: '0 0 12px',
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.amber,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}>
              Action Required ({pending.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: T.card,
                    border: `1px solid ${T.amberBorder}`,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: T.sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: T.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {r.org_name !== 'Unknown School' ? r.org_name : r.email}
                      </div>
                      <div style={{
                        marginTop: 3,
                        fontFamily: T.sans,
                        fontSize: 13,
                        color: T.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexWrap: 'wrap',
                      }}>
                        {r.contact_person && <span>{r.contact_person} ·</span>}
                        <a href={`mailto:${r.email}`} style={{ color: T.emerald, textDecoration: 'none' }}>
                          <Mail size={11} strokeWidth={1.75} style={{ display: 'inline', marginRight: 4 }} />
                          {r.email}
                        </a>
                      </div>
                      <div style={{ marginTop: 4, fontFamily: T.sans, fontSize: 11, color: T.textMuted }}>
                        {timeAgo(r.created_at)}
                      </div>
                      {r.notes && (
                        <div style={{
                          marginTop: 4,
                          fontFamily: T.sans,
                          fontSize: 11,
                          color: T.textMuted,
                          fontStyle: 'italic',
                        }}>
                          {r.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => handleStatusChange(r.id, 'contacted')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'linear-gradient(180deg, #34d399, #10b981)',
                          border: '1px solid rgba(52,211,153,0.55)',
                          color: '#06281a',
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={11} strokeWidth={2.5} />
                        Mark Contacted
                      </button>
                      <button
                        onClick={() => handleStatusChange(r.id, 'not_interested')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 12px',
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.10)',
                          color: T.textSecondary,
                          fontFamily: T.sans,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <X size={11} strokeWidth={2.5} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty */}
        {pending.length === 0 && (
          <div style={{
            padding: 32,
            textAlign: 'center',
            background: T.card,
            border: T.cardBorder,
            borderRadius: 14,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            marginBottom: 32,
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              color: T.emerald,
              marginBottom: 12,
            }}>
              <Check size={20} strokeWidth={2.5} />
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textSecondary }}>
              No pending demo requests. All caught up!
            </div>
          </div>
        )}

        {/* Handled */}
        {handled.length > 0 && (
          <div>
            <h2 style={{
              margin: '0 0 12px',
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
            }}>
              History ({handled.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {handled.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: T.card,
                    border: T.cardBorder,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: r.status === 'contacted' ? T.emerald : 'rgba(255,255,255,0.30)',
                    }} />
                    <span style={{
                      color: T.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {r.org_name !== 'Unknown School' ? r.org_name : r.email}
                    </span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: 11, color: T.textMuted }}>
                    {timeAgo(r.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
