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
// Super-admin Guru was retired this session; Tracy on the principal portal
// does the equivalent, school-scoped, and cross-school queries weren't used.
const AgentsTab = dynamic(() => import('@/components/montree/super-admin/ReferralsTab'), { ssr: false });
// Phase 6 — Money tab. Payouts list + Calculate trigger + state transitions.
const MoneyTab = dynamic(() => import('@/components/montree/super-admin/MoneyTab'), { ssr: false });
const HealthTab = dynamic(() => import('@/components/montree/super-admin/HealthTab'), { ssr: false });
const WebhookDLQTab = dynamic(() => import('@/components/montree/super-admin/WebhookDLQTab'), { ssr: false });
const ServerErrorsTab = dynamic(() => import('@/components/montree/super-admin/ServerErrorsTab'), { ssr: false });


interface DmMessage {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  message: string;
  created_at: string;
}

type TabType = 'schools' | 'feedback' | 'leads' | 'visitors' | 'agents' | 'money' | 'health' | 'dlq' | 'errors';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

type DemoLead = { id: string; org_name: string; contact_person: string | null; email: string; created_at: string; status: string };

function DemoRequestAlert({ saToken }: { saToken: string }) {
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [dismissing, setDismissing] = useState<string | null>(null);

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
        }
      })
      .catch(err => console.error('[SuperAdmin] Failed to load demo leads:', err));
  }, [saToken]);

  useEffect(() => { load(); }, [load]);

  const markContacted = async (id: string) => {
    setDismissing(id);
    await fetch('/api/montree/super-admin/demo-requests', {
      method: 'PATCH',
      headers: { 'x-super-admin-token': saToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'contacted' }),
    }).catch(err => console.error('[SuperAdmin] Failed to mark lead contacted:', err));
    setLeads(prev => prev.filter(l => l.id !== id));
    setDismissing(null);
  };

  if (leads.length === 0) return null;

  return (
    <div className="mb-4 p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-emerald-400 text-lg">🎯</span>
        <span className="text-emerald-300 font-semibold text-sm">
          {leads.length} new demo request{leads.length > 1 ? 's' : ''} from the landing page
        </span>
      </div>
      <div className="space-y-2">
        {leads.map(lead => (
          <div key={lead.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2 gap-3">
            <div className="min-w-0">
              <span className="text-white text-sm font-medium">{lead.org_name}</span>
              {lead.contact_person && <span className="text-emerald-300/70 text-xs ml-2">— {lead.contact_person}</span>}
              <div>
                <a href={`mailto:${lead.email}`} className="text-emerald-400 text-xs hover:text-emerald-300 underline">
                  {lead.email}
                </a>
              </div>
            </div>
            <button
              onClick={() => markContacted(lead.id)}
              disabled={dismissing === lead.id}
              className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 transition-colors disabled:opacity-50"
            >
              {dismissing === lead.id ? '...' : 'Mark contacted'}
            </button>
          </div>
        ))}
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
        if (elapsed < SESSION_TIMEOUT_MS) {
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
  const [editingSchool, setEditingSchool] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [dmOpenFor, setDmOpenFor] = useState<string | null>(null);
  const [dmLeadName, setDmLeadName] = useState<string>('');
  const [dmLeadEmail, setDmLeadEmail] = useState<string>('');
  const [dmMessages, setDmMessages] = useState<DmMessage[]>([]);
  const [dmNewMsg, setDmNewMsg] = useState('');
  const [dmSending, setDmSending] = useState(false);

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
    } catch (e) {
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
      if (elapsed > SESSION_TIMEOUT_MS) {
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
  }, [authenticated, lastActivity, logAction]);

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
            <h1 className="text-xl font-medium text-white" style={{ fontFamily: '"Lora", Georgia, serif' }}>
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
              style={{ fontFamily: '"Lora", Georgia, serif', letterSpacing: '-0.4px' }}
            >
              <span>🌳</span> Montree Admin
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {adminData.schools.length} schools · {trialSchools.length} trial · {freeSchools.length} free · {paidSchools.length} paid
            </p>
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

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 overflow-x-auto pb-1"
          style={{ borderBottom: '1px solid rgba(52,211,153,0.18)' }}
        >
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
          <SuperAdminTab active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} icon="📍" label="Visitors" />
          <SuperAdminTab active={activeTab === 'agents'} onClick={() => setActiveTab('agents')} icon="🤝" label="Agents" />
          <SuperAdminTab active={activeTab === 'money'} onClick={() => setActiveTab('money')} icon="💰" label="Money" />
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

        {activeTab === 'money' && (
          <MoneyTab sessionToken={saToken} />
        )}

        {activeTab === 'health' && (
          <HealthTab sessionToken={saToken} />
        )}

        {activeTab === 'dlq' && (
          <WebhookDLQTab sessionToken={saToken} />
        )}

        {activeTab === 'errors' && (
          <ServerErrorsTab sessionToken={saToken} />
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&display=swap');
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
