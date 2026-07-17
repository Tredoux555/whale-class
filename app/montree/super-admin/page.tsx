// /montree/super-admin/page.tsx
// Secure Super Admin Dashboard - Refactored
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAdminData } from '@/hooks/useAdminData';
import { useLeadOperations } from '@/hooks/useLeadOperations';

// Tier 6 perf: only one tab renders at a time — defer the other ~2.1k lines.
const SchoolsTab = dynamic(() => import('@/components/montree/super-admin/SchoolsTab'), { ssr: false });
const LeadsTab = dynamic(() => import('@/components/montree/super-admin/LeadsTab'), { ssr: false });
const FeedbackTab = dynamic(() => import('@/components/montree/super-admin/FeedbackTab'), { ssr: false });
const DmPanel = dynamic(() => import('@/components/montree/super-admin/DmPanel'), { ssr: false });
const VisitorsTab = dynamic(() => import('@/components/montree/super-admin/VisitorsTab'), { ssr: false });
// Renamed surface label from "Referrals" → "Agents". Component file stays as
// ReferralsTab for now — phase 2 will refactor internals to be agent-centric
// (list of people → drill into one → see their codes + schools + earnings).
// Super-admin Guru was retired this session; Astra on the principal portal
// does the equivalent, school-scoped, and cross-school queries weren't used.
const AgentsTab = dynamic(() => import('@/components/montree/super-admin/ReferralsTab'), { ssr: false });
// Phase 6 — Money tab. Payouts list + Calculate trigger + state transitions.
const MoneyTab = dynamic(() => import('@/components/montree/super-admin/MoneyTab'), { ssr: false });
const HealthTab = dynamic(() => import('@/components/montree/super-admin/HealthTab'), { ssr: false });
const WebhookDLQTab = dynamic(() => import('@/components/montree/super-admin/WebhookDLQTab'), { ssr: false });
const OutreachCodesTab = dynamic(() => import('@/components/montree/super-admin/OutreachCodesTab'), { ssr: false });
const ServerErrorsTab = dynamic(() => import('@/components/montree/super-admin/ServerErrorsTab'), { ssr: false });
const AgentApplicationAlert = dynamic(() => import('@/components/montree/super-admin/AgentApplicationAlert'), { ssr: false });
const AgentInboxTab = dynamic(() => import('@/components/montree/super-admin/AgentInboxTab'), { ssr: false });
const CampaignTab = dynamic(() => import('@/components/montree/super-admin/CampaignTab'), { ssr: false });
const PlaybookTab = dynamic(() => import('@/components/montree/super-admin/PlaybookTab'), { ssr: false });
const FoundingTab = dynamic(() => import('@/components/montree/super-admin/FoundingTab'), { ssr: false });
const GlobalOutreachTab = dynamic(() => import('@/components/montree/super-admin/GlobalOutreachTab'), { ssr: false });


interface DmMessage {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  message: string;
  created_at: string;
}

type TabType = 'schools' | 'feedback' | 'leads' | 'visitors' | 'agents' | 'agent-inbox' | 'money' | 'campaign' | 'playbook' | 'health' | 'dlq' | 'errors' | 'outreach' | 'founding' | 'global-outreach';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

// Read the `exp` (ms since epoch) from a JWT WITHOUT verifying the signature.
// Used ONLY to proactively force a clean re-login the moment the super-admin
// token dies — otherwise the panel keeps looking authenticated (activity keeps
// the sliding 15-min timer fresh) while every API call 401s and forms fail
// silently. Returns null if it can't be parsed (→ fall back to idle-only logic).
function readJwtExpMs(token: string): number | null {
  try {
    const seg = token.split('.')[1];
    if (!seg) return null;
    const json = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

type DemoLead = {
  id: string;
  org_name: string;
  contact_person: string | null;
  email: string;
  created_at: string;
  status: string;
  drips_sent?: string[]; // e.g., ['day3', 'day7']
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function DemoRequestAlert({ saToken }: { saToken: string }) {
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  // Selection set for bulk-reply. Cleared whenever leads reload so a stale
  // checked-state can't leak across refresh cycles.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Bulk-reply in flight. Server processes serially so this can take several
  // seconds with 10+ leads. Buttons disabled while true.
  const [bulkSending, setBulkSending] = useState(false);
  // Surface server-returned bulk outcomes as a transient banner after each run.
  const [lastBulk, setLastBulk] = useState<{ sent: number; failed: number; skipped: number } | null>(null);

  const load = useCallback(() => {
    if (!saToken) return;
    fetch('/api/montree/super-admin/demo-requests', {
      headers: { 'x-super-admin-token': saToken },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.requests) {
          // Only show truly new/pending leads
          setLeads(d.requests.filter((r: DemoLead) => r.status === 'demo_requested'));
          setSelected(new Set()); // refresh-side reset so stale checks can't leak
        }
      })
      .catch(err => console.error('[SuperAdmin] Failed to load demo leads:', err));
  }, [saToken]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: 'contacted' | 'not_interested') => {
    setBusy(id);
    await fetch('/api/montree/super-admin/demo-requests', {
      method: 'PATCH',
      headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(err => console.error('[SuperAdmin] Failed to update lead status:', err));
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelected(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBusy(null);
  };

  /** Toggle one lead in/out of the bulk selection. */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** POST the bulk-reply endpoint with either an explicit lead_ids list or
   *  all_stale=true. Refreshes the list afterwards (server already marked
   *  successful leads as 'contacted' so they drop from the demo_requested
   *  filter naturally). */
  const bulkReply = async (payload: { lead_ids?: string[]; all_stale?: boolean }) => {
    setBulkSending(true);
    setLastBulk(null);
    try {
      const res = await fetch('/api/montree/super-admin/demo-requests/bulk-reply', {
        method: 'POST',
        headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[SuperAdmin] bulk-reply failed:', data);
        setLastBulk({ sent: 0, failed: 0, skipped: 0 });
        return;
      }
      const data = await res.json();
      setLastBulk({
        sent: data.sent || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
      });
      load(); // refresh — successful sends are now status='contacted' and drop out
    } catch (err) {
      console.error('[SuperAdmin] bulk-reply error:', err);
    } finally {
      setBulkSending(false);
    }
  };

  const staleCount = leads.filter(l => daysSince(l.created_at) > 14).length;
  const selectedCount = selected.size;

  /** Open the default mail client with a pre-written warm reply containing
   *  the trial signup link. Marks the lead as 'contacted' in the same click
   *  to stop the drip. The user can edit the email before sending. */
  const replyWithTrialLink = (lead: DemoLead) => {
    const firstName = (lead.contact_person || '').split(/\s+/)[0] || 'there';
    const trialUrl = 'https://montree.xyz/montree/try';
    const subject = `Re: Montree — for ${lead.org_name}`;
    const body =
      `Hi ${firstName},\n\n` +
      `Thanks for reaching out about Montree.\n\n` +
      `The fastest way to see it in action is to get started today — full Montree, one classroom, your first month is on us while you set up. ` +
      `Card on file at signup, no charge for the first 30 days. You can try every AI feature at your own pace and we can chat afterwards.\n\n` +
      `Get started here: ${trialUrl}\n\n` +
      `Or if you'd prefer a 20-minute walkthrough on a call first, reply with a few times that work for you this week and I'll send a calendar invite.\n\n` +
      `Kind regards,\nTredoux\nmontree.xyz`;
    const mailto = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Open the mail client via window.open (a fresh tab — closes itself
    // immediately after handing off the mailto). Avoids leaving the
    // super-admin page. Parallel setStatus stops the drip the moment
    // status flips.
    const w = window.open(mailto, '_blank');
    // Some browsers leave the blank tab open after handing off. Close it.
    if (w) setTimeout(() => { try { w.close(); } catch { /* */ } }, 500);
    setStatus(lead.id, 'contacted');
  };

  if (leads.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-emerald-400 text-lg">🎯</span>
        <span className="text-emerald-300 font-semibold text-sm">
          {leads.length} new demo request{leads.length > 1 ? 's' : ''} from the landing page
        </span>
        {staleCount > 0 && (
          <span className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Bulk-reply actions. Header surface so the principal sees the
                affordance without scrolling. Server-side batch sends the same
                personalised "trial link" email as the per-row mailto button,
                marks each lead as 'contacted', and stops the drip. */}
            {selectedCount > 0 && (
              <button
                onClick={() => bulkReply({ lead_ids: Array.from(selected) })}
                disabled={bulkSending}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 border border-amber-500/50 font-medium transition-colors disabled:opacity-50"
                title="Send the trial-link reply email to all selected leads. Each one is marked as contacted and dropped from the drip."
              >
                {bulkSending ? 'Sending…' : `📧 Reply to ${selectedCount} selected`}
              </button>
            )}
            <button
              onClick={() => {
                if (!confirm(`Send the trial-link reply email to all ${staleCount} stale lead${staleCount > 1 ? 's' : ''} (>14 days)? Each will be marked as contacted.`)) return;
                bulkReply({ all_stale: true });
              }}
              disabled={bulkSending}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-colors disabled:opacity-50"
              title={`${staleCount} lead${staleCount > 1 ? 's are' : ' is'} older than 14 days. One click sends them all the trial-link email.`}
            >
              {bulkSending ? 'Sending…' : `📨 Reply to all stale (${staleCount})`}
            </button>
          </span>
        )}
      </div>

      {lastBulk && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200">
          Bulk reply: {lastBulk.sent} sent
          {lastBulk.failed > 0 && <span className="text-red-300">, {lastBulk.failed} failed</span>}
          {lastBulk.skipped > 0 && <span className="text-amber-300">, {lastBulk.skipped} skipped</span>}
        </div>
      )}

      <div className="space-y-2">
        {leads.map(lead => {
          const age = daysSince(lead.created_at);
          const dripsSent = lead.drips_sent || [];
          const stale = age > 14;
          const isChecked = selected.has(lead.id);
          return (
            <div
              key={lead.id}
              className={`flex items-start justify-between rounded-lg px-3 py-2 gap-3 ${
                stale ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-black/20'
              }`}
            >
              {/* Bulk-select checkbox. Sits inline at the start of the row,
                  large hit-target (28x28) so it's tappable on mobile. */}
              <label className="flex items-center shrink-0 cursor-pointer mt-0.5" title="Select for bulk reply">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelect(lead.id)}
                  disabled={bulkSending}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:opacity-50"
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{lead.org_name}</span>
                  {lead.contact_person && (
                    <span className="text-emerald-300/70 text-xs">— {lead.contact_person}</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    stale
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                      : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                  }`}>
                    {age === 0 ? 'today' : age === 1 ? '1 day ago' : `${age} days ago`}
                  </span>
                  {dripsSent.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      📧 drips: {dripsSent.sort().map(d => d.replace('day', 'd')).join(', ')}
                    </span>
                  )}
                </div>
                <a
                  href={`mailto:${lead.email}`}
                  className="text-emerald-400 text-xs hover:text-emerald-300 underline mt-1 inline-block"
                >
                  {lead.email}
                </a>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => replyWithTrialLink(lead)}
                  disabled={busy === lead.id}
                  className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 text-amber-200 border border-amber-500/40 transition-colors disabled:opacity-50"
                  title="Opens your mail client with a pre-written reply containing the trial signup link. Also marks the lead as contacted (stops drip)."
                >
                  📧 Reply with trial link
                </button>
                <button
                  onClick={() => setStatus(lead.id, 'contacted')}
                  disabled={busy === lead.id}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50"
                  title="Stops the drip and marks the lead as contacted"
                >
                  {busy === lead.id ? '...' : '✓ Contacted'}
                </button>
                <button
                  onClick={() => setStatus(lead.id, 'not_interested')}
                  disabled={busy === lead.id}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/40 hover:bg-slate-700/60 text-slate-400 border border-slate-700 transition-colors disabled:opacity-50"
                  title="Mark as not interested. Drip stops."
                >
                  Not interested
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [saToken, setSaToken] = useState('');
  const [error, setError] = useState('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Restore session from sessionStorage on mount (JWT token, not password)
  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem('sa_session');
      const savedTs = sessionStorage.getItem('sa_session_ts');
      if (savedToken && savedTs) {
        const elapsed = Date.now() - parseInt(savedTs, 10);
        // Don't restore a token that's already expired server-side (or within
        // 5s of it) — that would render an authenticated-looking panel whose
        // every API call 401s. null exp = unparseable → keep old idle-only rule.
        const expMs = readJwtExpMs(savedToken);
        const tokenLive = expMs === null || expMs - Date.now() > 5000;
        if (elapsed < SESSION_TIMEOUT_MS && tokenLive) {
          setSaToken(savedToken);
          setAuthenticated(true);
          setLastActivity(Date.now());
        } else {
          sessionStorage.removeItem('sa_session');
          sessionStorage.removeItem('sa_session_ts');
        }
      }
    } catch {
      // sessionStorage not available
    }
  }, []);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('schools');

  // Phase 3 (agent system fix plan): read `?tab=...` on mount so external
  // links (e.g. AgentApplicationAlert "Accept" button) can deep-link to a
  // specific tab. We don't strip the param here — ReferralsTab reads its
  // own prefill params and strips them after consuming.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const tab = sp.get('tab');
    const valid: TabType[] = ['schools', 'feedback', 'leads', 'visitors', 'agents', 'agent-inbox', 'money', 'campaign', 'playbook', 'health', 'dlq', 'errors', 'outreach', 'founding', 'global-outreach'];
    if (tab && (valid as string[]).includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, []);
  const [editingSchool, setEditingSchool] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [dmOpenFor, setDmOpenFor] = useState<string | null>(null);
  const [dmLeadName, setDmLeadName] = useState<string>('');
  const [dmLeadEmail, setDmLeadEmail] = useState<string>('');
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [dmNewMsg, setDmNewMsg] = useState('');
  const [dmSending, setDmSending] = useState(false);
  // Migration 292 — unread founder messages (principal_super_admin threads),
  // surfaced as a badge on the 🚀 Founding 100 tab.
  const [foundingUnread, setFoundingUnread] = useState(0);

  // Simple audit logging
  const logAction = useCallback(async (action: string, details?: Record<string, unknown>) => {
    try {
      await fetch('/api/montree/super-admin/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(saToken ? { 'x-super-admin-token': saToken } : {}),
        },
        body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
      });
    } catch {
      // Audit log failed
    }
  }, [saToken]);

  // Use custom hooks — pass JWT token (not password)
  const adminData = useAdminData({
    password: saToken,
    logAction,
    authenticated
  });

  const leadOps = useLeadOperations({
    password: saToken,
    leads: adminData.leads,
    setLeads: adminData.setLeads,
    schools: adminData.schools,
    setSchools: adminData.setSchools,
    logAction,
    setNewLeadCount: adminData.setNewLeadCount,
    setDmUnreadTotal: adminData.setDmUnreadTotal,
    setDmUnreadPerConvo: adminData.setDmUnreadPerConvo
  });

  // Session timeout
  useEffect(() => {
    if (!authenticated) return;

    const checkSession = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      // Also force a clean re-login the moment the JWT itself expires — an
      // active session (mouse/key events keep `elapsed` low) can otherwise
      // outlive the token, leaving the panel authenticated-looking while every
      // API call 401s and forms fail silently. null exp → idle-only fallback.
      const expMs = readJwtExpMs(saToken);
      const tokenDead = expMs !== null && expMs - Date.now() <= 5000;
      if (elapsed > SESSION_TIMEOUT_MS || tokenDead) {
        logAction('session_timeout');
        setAuthenticated(false);
        setSessionWarning(false);
        try { sessionStorage.removeItem('sa_session'); sessionStorage.removeItem('sa_session_ts'); } catch { /* */ }
        alert('Session expired for security. Please login again.');
      } else if (elapsed > SESSION_TIMEOUT_MS - 60000) {
        setSessionWarning(true);
      }
    }, 10000);

    return () => clearInterval(checkSession);
  }, [authenticated, lastActivity, logAction, saToken]);

  // Track activity
  const trackActivity = useCallback(() => {
    setLastActivity(Date.now());
    setSessionWarning(false);
    try { sessionStorage.setItem('sa_session_ts', Date.now().toString()); } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('keydown', trackActivity);
    return () => {
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('keydown', trackActivity);
    };
  }, [authenticated, trackActivity]);

  // Fetch data when authenticated (covers both login and session restore)
  useEffect(() => {
    if (!authenticated || !saToken) return;
    adminData.fetchSchools();
    adminData.fetchFeedback();
    adminData.fetchLeads();
    // Migration 292 — lightweight founder-message unread count for the tab badge.
    fetch('/api/montree/super-admin/founding-messages/threads', {
      headers: { 'x-super-admin-token': saToken },
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setFoundingUnread(d.unread || 0); })
      .catch((err) => console.error('[super-admin] founding unread fetch:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const handleLogin = async () => {
    try {
      // Phase 5: Server-side authentication (replaces client-side NEXT_PUBLIC_ADMIN_PASSWORD check)
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.token || '';
        setSaToken(token);
        setAuthenticated(true);
        setLastActivity(Date.now());
        setPassword(''); // Clear password from memory
        try {
          sessionStorage.setItem('sa_session', token);
          sessionStorage.setItem('sa_session_ts', Date.now().toString());
        } catch { /* sessionStorage not available */ }
        // Note: logAction and fetch calls will pick up saToken via hooks on next render
      } else if (res.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        await logAction('login_failed', { attempted: true });
        setError('Invalid password');
      }
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  // DM functions
  const openDm = useCallback(async (conversationId: string, leadName?: string, leadEmail?: string) => {
    setDmOpenFor(conversationId);
    setDmLeadName(leadName || 'Message');
    setDmLeadEmail(leadEmail || '');
    setDmNewMsg('');
    try {
      const res = await fetch(`/api/montree/dm?conversation_id=${conversationId}&reader_type=admin`, {
        headers: { 'x-super-admin-token': saToken }
      });
      if (!res.ok) return;
      const data = await res.json();
      setDmMessages(data.messages || []);
      // Mark as read on server
      await fetch('/api/montree/dm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': saToken
        },
        body: JSON.stringify({ conversation_id: conversationId, reader_type: 'admin' })
      });
      // Update local unread counts
      adminData.setDmUnreadPerConvo(prev => {
        const convoUnread = prev[conversationId]?.count || 0;
        if (convoUnread > 0) {
          adminData.setDmUnreadTotal(t => Math.max(0, t - convoUnread));
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to open DM:', err);
    }
  }, [saToken, adminData]);

  const sendDm = async () => {
    if (!dmOpenFor || !dmNewMsg.trim() || dmSending) return;
    setDmSending(true);
    try {
      const res = await fetch('/api/montree/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': saToken
        },
        body: JSON.stringify({
          conversation_id: dmOpenFor,
          sender_type: 'admin',
          sender_name: 'Tredoux',
          message: dmNewMsg.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDmMessages(prev => [...prev, data.message]);
        setDmNewMsg('');
      }
    } catch (err) {
      console.error('Failed to send DM:', err);
    } finally {
      setDmSending(false);
    }
  };

  const markFeedbackRead = async (feedbackId: string) => {
    try {
      await fetch('/api/montree/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': saToken
        },
        body: JSON.stringify({ feedback_id: feedbackId, is_read: true })
      });
      adminData.setFeedback(prev => prev.map(f =>
        f.id === feedbackId ? { ...f, is_read: true } : f
      ));
      adminData.setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark feedback read:', err);
    }
  };

  // Stats
  const trialSchools = adminData.schools.filter(s => s.subscription_tier === 'trial' || s.subscription_status === 'trialing');
  const freeSchools = adminData.schools.filter(s => s.subscription_tier === 'free');
  const paidSchools = adminData.schools.filter(s => s.subscription_tier === 'paid');

  if (!authenticated) {
    return (
      <div className="min-h-screen relative flex items-center justify-center p-4" style={{ background: '#0a1a0f' }}>
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 1100px 900px at 50% 30%, rgba(39,129,90,0.32), transparent 60%)' }}
        />
        <div
          className="relative rounded-2xl p-8 max-w-md w-full backdrop-blur"
          style={{
            background: 'rgba(8,20,12,0.55)',
            border: '1px solid rgba(52,211,153,0.18)',
          }}
        >
          <div className="text-center mb-6">
            <span className="text-4xl block mb-3">🔐</span>
            <h1 className="text-xl font-medium text-white" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              Master Admin
            </h1>
            <p className="text-slate-400 text-sm mt-1">Enter password to continue</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full p-4 rounded-xl text-white placeholder-slate-500 outline-none transition"
            style={{
              background: 'rgba(0,0,0,0.30)',
              border: '1px solid rgba(52,211,153,0.25)',
            }}
            autoFocus
          />

          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 font-semibold rounded-xl transition-colors"
            style={{ background: '#34d399', color: '#0a1a0f' }}
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: '#0a1a0f' }}>
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), transparent 60%)',
          zIndex: 0,
        }}
      />
      <div className="relative max-w-6xl mx-auto p-6" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1
              className="text-3xl font-medium text-white flex items-center gap-3"
              style={{ fontFamily: 'var(--font-lora), Georgia, serif', letterSpacing: '-0.4px' }}
            >
              <span>🌳</span> Montree Admin
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {adminData.schools.length} schools · {trialSchools.length} trial · {freeSchools.length} free · {paidSchools.length} paid
            </p>
            <Link
              href="/montree/super-admin/lyf-coach"
              className="inline-flex items-center gap-1 mt-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'rgba(8,20,12,0.55)',
                border: '1px solid rgba(52,211,153,0.35)',
                color: '#34d399',
              }}
              title="Lyf Coach — signups, visits, subscribers, billing & tax"
            >
              🌿 Lyf Coach Admin →
            </Link>
          </div>
          {/* Cleaned up Session 90: kept the three actively-used links
              (Community Library, API Usage, Register School). Stale routes
              are still on disk (Marketing Hub, Master Campaign, Social
              Manager, Job Tracker, Content Studio, Teacher Trial) — just
              no longer surfaced from the header. URL-bookmarkable as before. */}
          <div className="flex gap-2 flex-wrap">
            <Link
              href="/montree/super-admin/api-usage"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                background: 'rgba(8,20,12,0.55)',
                border: '1px solid rgba(52,211,153,0.18)',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              📊 API Usage
            </Link>
            <Link
              href="/montree/super-admin/community"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                background: 'rgba(8,20,12,0.55)',
                border: '1px solid rgba(52,211,153,0.18)',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              📚 Community
            </Link>
            <Link
              href="/montree/super-admin/all-logins"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                background: 'rgba(8,20,12,0.55)',
                border: '1px solid rgba(232,201,106,0.32)',
                color: 'rgba(232,201,106,0.95)',
              }}
              title="Every login code in the system — principals, teachers, agents"
            >
              🔑 All logins
            </Link>
            <Link
              href="/montree/super-admin/phonics-videos"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{
                background: 'rgba(8,20,12,0.55)',
                border: '1px solid rgba(52,211,153,0.18)',
                color: 'rgba(255,255,255,0.75)',
              }}
              title="Upload Dark Phonics song videos to the public songs page"
            >
              🎬 Phonics Videos
            </Link>
            <Link
              href="/montree/onboarding"
              className="px-3 py-2 rounded-lg font-medium text-sm transition-colors"
              style={{ background: '#34d399', color: '#0a1a0f' }}
            >
              + Register school
            </Link>
          </div>
        </div>

        {/* Session Warning */}
        {sessionWarning && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 text-sm">
            ⚠️ Session expiring soon. Move mouse to stay logged in.
          </div>
        )}

        {/* Demo Request Alert */}
        <DemoRequestAlert saToken={saToken} />

        {/* Agent Application Alert */}
        <AgentApplicationAlert saToken={saToken} />

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 overflow-x-auto pb-1"
          style={{ borderBottom: '1px solid rgba(52,211,153,0.18)' }}
        >
          {/* Launch reorder (Jul 6 2026): 🚀 Founding 100 leads the strip —
              minting founding links is the #1 admin action during launch.
              Then the daily drivers (Schools, Leads, Feedback, Money), then
              the rest by frequency. Plumbing/diagnostics (Health, DLQ,
              Errors) sit at the end. */}
          <SuperAdminTab
            active={activeTab === 'founding'}
            onClick={() => setActiveTab('founding')}
            icon="🌱"
            label="Foundation"
            badge={foundingUnread > 0 ? { text: `✉ ${foundingUnread}`, color: 'red' } : null}
          />
          <SuperAdminTab active={activeTab === 'global-outreach'} onClick={() => setActiveTab('global-outreach')} icon="🌍" label="Global Outreach" />
          <SuperAdminTab active={activeTab === 'schools'} onClick={() => setActiveTab('schools')} icon="🏫" label="Schools" />
          <SuperAdminTab
            active={activeTab === 'leads'}
            onClick={() => {
              setActiveTab('leads');
              if (adminData.leads.length === 0) adminData.fetchLeads();
            }}
            icon="👋"
            label="Leads"
            badge={adminData.newLeadCount > 0 ? { text: String(adminData.newLeadCount), color: 'emerald' } : null}
            badge2={adminData.dmUnreadTotal > 0 ? { text: `✉ ${adminData.dmUnreadTotal}`, color: 'red' } : null}
          />
          <SuperAdminTab
            active={activeTab === 'feedback'}
            onClick={() => {
              setActiveTab('feedback');
              if (adminData.feedback.length === 0) adminData.fetchFeedback();
            }}
            icon="💬"
            label="Feedback"
            badge={adminData.unreadCount > 0 ? { text: String(adminData.unreadCount), color: 'red' } : null}
          />
          <SuperAdminTab active={activeTab === 'money'} onClick={() => setActiveTab('money')} icon="💰" label="Money" />
          <SuperAdminTab active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} icon="📍" label="Visitors" />
          <SuperAdminTab active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} icon="🤝" label="Agents" />
          <SuperAdminTab active={activeTab === 'agent-inbox'} onClick={() => setActiveTab('agent-inbox')} icon="📬" label="Agent Inbox" />
          <SuperAdminTab active={activeTab === 'campaign'} onClick={() => setActiveTab('campaign')} icon="📣" label="Campaign" />
          <SuperAdminTab active={activeTab === 'outreach'} onClick={() => setActiveTab('outreach')} icon="🎯" label="Outreach" />
          <SuperAdminTab active={activeTab === 'playbook'} onClick={() => setActiveTab('playbook')} icon="🎬" label="Playbook" />
          <SuperAdminTab active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon="🩺" label="Health" />
          <SuperAdminTab active={activeTab === 'dlq'} onClick={() => setActiveTab('dlq')} icon="⚠️" label="DLQ" />
          <SuperAdminTab active={activeTab === 'errors'} onClick={() => setActiveTab('errors')} icon="🐛" label="Errors" />
        </div>

        {/* Tab Content */}
        {activeTab === 'schools' && (
          <SchoolsTab
            schools={adminData.schools}
            loading={adminData.loading}
            editingSchool={editingSchool}
            setEditingSchool={setEditingSchool}
            onUpdateStatus={leadOps.updateSchoolStatus}
            onDeleteSchool={leadOps.deleteSchool}
            onBatchDelete={leadOps.batchDeleteSchools}
            onLoginAs={leadOps.loginAsSchool}
            trialSchools={trialSchools}
            freeSchools={freeSchools}
            paidSchools={paidSchools}
            batchDeleting={leadOps.batchDeleting}
            batchDeleteProgress={leadOps.batchDeleteProgress}
            onClearBatchProgress={leadOps.clearBatchDeleteProgress}
            sessionToken={saToken}
          />
        )}

        {activeTab === 'leads' && (
          <LeadsTab
            leads={adminData.leads}
            loadingLeads={adminData.loadingLeads}
            onFetchLeads={adminData.fetchLeads}
            onUpdateStatus={leadOps.updateLeadStatus}
            onDeleteLead={leadOps.deleteLead}
            onBulkDeleteByIds={leadOps.bulkDeleteLeadsByIds}
            onBulkDeleteByStatus={leadOps.bulkDeleteLeadsByStatus}
            onProvision={leadOps.provisionSchool}
            onOpenDm={openDm}
            onLoginAs={leadOps.loginAsSchool}
            editingNotes={editingNotes}
            setEditingNotes={setEditingNotes}
            notesText={notesText}
            setNotesText={setNotesText}
            onSaveNotes={(leadId) => {
              leadOps.saveLeadNotes(leadId, notesText);
              setEditingNotes(null);
            }}
            dmUnreadPerConvo={adminData.dmUnreadPerConvo}
            dmUnreadTotal={adminData.dmUnreadTotal}
            newLeadCount={adminData.newLeadCount}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackTab
            feedback={adminData.feedback}
            loadingFeedback={adminData.loadingFeedback}
            onFetchFeedback={adminData.fetchFeedback}
            onMarkRead={markFeedbackRead}
          />
        )}

        {activeTab === 'visitors' && (
          <VisitorsTab saToken={saToken} />
        )}

        {activeTab === 'agents' && (
          <AgentsTab saToken={saToken} />
        )}

        {activeTab === 'agent-inbox' && (
          <AgentInboxTab saToken={saToken} />
        )}

        {activeTab === 'money' && (
          <MoneyTab sessionToken={saToken} />
        )}

        {activeTab === 'campaign' && (
          <CampaignTab sessionToken={saToken} />
        )}

        {activeTab === 'playbook' && (
          <PlaybookTab />
        )}

        {activeTab === 'health' && (
          <HealthTab sessionToken={saToken} />
        )}

        {activeTab === 'dlq' && (
          <WebhookDLQTab sessionToken={saToken} />
        )}

        {activeTab === 'outreach' && (
          <OutreachCodesTab sessionToken={saToken} />
        )}

        {activeTab === 'errors' && (
          <ServerErrorsTab sessionToken={saToken} />
        )}

        {activeTab === 'founding' && (
          <FoundingTab sessionToken={saToken} />
        )}

        {activeTab === 'global-outreach' && (
          <GlobalOutreachTab sessionToken={saToken} />
        )}

      </div>

      {/* DM Panel */}
      <DmPanel
        isOpen={dmOpenFor !== null}
        onClose={() => setDmOpenFor(null)}
        leadName={dmLeadName}
        leadEmail={dmLeadEmail}
        messages={dmMessages}
        newMsg={dmNewMsg}
        setNewMsg={setDmNewMsg}
        onSend={sendDm}
        sending={dmSending}
      />

      {/* Load Lora serif so the canonical headings render correctly. Mirrors
          the same import in /montree/admin/layout.tsx — this page is its own
          shell (no layout file under /super-admin) so we load fonts inline. */}
      <style jsx global>{`
`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tab pill — canonical dark forest token style. Active state uses an
// emerald underline + emerald text; inactive uses muted slate. Badges sit
// inside the pill (one or two), each color-coded by urgency.
// ─────────────────────────────────────────────────────────────────

interface SuperAdminTabProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: { text: string; color: 'emerald' | 'red' | 'amber' } | null;
  badge2?: { text: string; color: 'emerald' | 'red' | 'amber' } | null;
}

function SuperAdminTab({ active, onClick, icon, label, badge, badge2 }: SuperAdminTabProps) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap"
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #34d399' : '2px solid transparent',
        color: active ? '#34d399' : 'rgba(255,255,255,0.62)',
        marginBottom: -1, // pull underline flush with the parent border-bottom
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {badge && <SuperAdminBadge color={badge.color} text={badge.text} />}
      {badge2 && <SuperAdminBadge color={badge2.color} text={badge2.text} />}
    </button>
  );
}

function SuperAdminBadge({ color, text }: { color: 'emerald' | 'red' | 'amber'; text: string }) {
  const bg =
    color === 'emerald'
      ? 'rgba(52,211,153,0.20)'
      : color === 'red'
        ? 'rgba(248,113,113,0.20)'
        : 'rgba(232,201,106,0.20)';
  const fg =
    color === 'emerald'
      ? '#34d399'
      : color === 'red'
        ? '#f87171'
        : '#E8C96A';
  return (
    <span
      className="px-2 py-0.5 text-xs rounded-full font-semibold"
      style={{ background: bg, color: fg }}
    >
      {text}
    </span>
  );
}
