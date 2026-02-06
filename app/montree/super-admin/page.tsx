// /montree/super-admin/page.tsx
// Secure Super Admin Dashboard - Simplified
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  owner_name: string | null;
  subscription_status: string;
  subscription_tier: string;
  plan_type: string;
  account_type?: string;
  is_active: boolean;
  created_at: string;
  trial_ends_at: string | null;
  classroom_count?: number;
  teacher_count?: number;
  student_count?: number;
}

interface Feedback {
  id: string;
  school_id: string | null;
  user_type: string;
  user_id: string | null;
  user_name: string | null;
  page_url: string | null;
  feedback_type: string;
  message: string;
  screenshot_url: string | null;
  is_read: boolean;
  created_at: string;
  school?: { id: string; name: string } | null;
}

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  school_name: string | null;
  role: string | null;
  interest_type: 'try' | 'info';
  message: string | null;
  status: string;
  notes: string | null;
  provisioned_school_id: string | null;
  created_at: string;
  updated_at: string;
}

type TabType = 'schools' | 'feedback' | 'leads';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SuperAdminPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionWarning, setSessionWarning] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('schools');

  // Feedback state
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // DM state
  const [dmOpenFor, setDmOpenFor] = useState<string | null>(null);
  const [dmLeadName, setDmLeadName] = useState<string>('');
  const [dmLeadEmail, setDmLeadEmail] = useState<string>('');
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmNewMsg, setDmNewMsg] = useState('');
  const [dmSending, setDmSending] = useState(false);

  // DM unread notifications
  const [dmUnreadTotal, setDmUnreadTotal] = useState(0);
  const [dmUnreadPerConvo, setDmUnreadPerConvo] = useState<Record<string, { count: number; sender_name: string }>>({});

  // School being edited
  const [editingSchool, setEditingSchool] = useState<string | null>(null);

  // Simple audit logging
  const logAction = useCallback(async (action: string, details?: any) => {
    try {
      await fetch('/api/montree/super-admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  }, []);

  // Session timeout
  useEffect(() => {
    if (!authenticated) return;

    const checkSession = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed > SESSION_TIMEOUT_MS) {
        logAction('session_timeout');
        setAuthenticated(false);
        setSessionWarning(false);
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

  const handleLogin = async () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === '870602') {
      setAuthenticated(true);
      setLastActivity(Date.now());
      await logAction('login_success');
      fetchSchools();
      fetchFeedback();
      fetchLeads();
    } else {
      await logAction('login_failed', { attempted: true });
      setError('Invalid password');
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/schools');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSchools(data.schools || []);
      await logAction('view_schools', { count: data.schools?.length || 0 });
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/montree/feedback', {
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeedback(data.feedback || []);
      setUnreadCount((data.feedback || []).filter((f: Feedback) => !f.is_read).length);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/montree/leads', {
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLeads(data.leads || []);
      setNewLeadCount(data.new_count || 0);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  };

  // Fetch global unread DM count for admin
  const dmFetchingRef = useRef(false);
  const fetchDmUnread = useCallback(async () => {
    if (!password || dmFetchingRef.current) return; // Guard: skip if no password or already fetching
    dmFetchingRef.current = true;
    try {
      const res = await fetch('/api/montree/dm?reader_type=admin', {
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) return; // Non-200 — skip silently
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) return; // Not JSON — skip
      const data = await res.json();
      setDmUnreadTotal(data.total_unread || 0);
      setDmUnreadPerConvo(data.per_conversation || {});
    } catch (err) {
      // Silently handle polling errors — not user-facing
    } finally {
      dmFetchingRef.current = false;
    }
  }, [password]);

  // Poll for unread DMs every 30s when authenticated
  useEffect(() => {
    if (!authenticated) return;
    fetchDmUnread();
    const interval = setInterval(fetchDmUnread, 30000);
    return () => clearInterval(interval);
  }, [authenticated, fetchDmUnread]);

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-password': password
        },
        body: JSON.stringify({ lead_id: leadId, status: newStatus })
      });
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, status: newStatus } : l
      ));
      if (newStatus !== 'new') {
        setNewLeadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
    }
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(`Delete ${lead.name || 'this lead'}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/montree/leads?lead_id=${lead.id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) throw new Error('Failed');
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      if (lead.status === 'new') setNewLeadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete lead:', err);
      alert('Failed to delete lead');
    }
  };

  const saveLeadNotes = async (leadId: string) => {
    try {
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-password': password
        },
        body: JSON.stringify({ lead_id: leadId, notes: notesText })
      });
      setLeads(prev => prev.map(l =>
        l.id === leadId ? { ...l, notes: notesText } : l
      ));
      setEditingNotes(null);
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const provisionSchool = async (lead: Lead) => {
    const schoolName = lead.school_name || `${lead.name}'s School`;
    const email = lead.email || (lead.name ? `${lead.name.toLowerCase().replace(/\s/g, '')}-${Date.now()}@montree.app` : `lead-${Date.now()}@montree.app`);

    if (!confirm(`Create trial school "${schoolName}" for ${lead.name}?\n\nThis will:\n• Create a new school\n• Create a principal account with email: ${email}\n• You'll get a password to share with them`)) {
      return;
    }

    const tempPassword = Math.random().toString(36).slice(-8);

    try {
      const res = await fetch('/api/montree/principal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          principalName: lead.name || 'Principal',
          email,
          password: tempPassword
        })
      });

      if (!res.ok) {
        const data = await res.json();
        alert('Failed: ' + (data.error || 'Unknown error'));
        return;
      }

      const data = await res.json();
      const principalId = data.principal?.id;

      // Update lead status
      await fetch('/api/montree/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-password': password
        },
        body: JSON.stringify({
          lead_id: lead.id,
          status: 'onboarded',
          provisioned_school_id: data.school?.id,
          notes: `${lead.notes ? lead.notes + '\n' : ''}Provisioned: ${new Date().toLocaleDateString()}\nEmail: ${email}\nTemp password: ${tempPassword}${principalId ? '\nPrincipal ID: ' + principalId : ''}`
        })
      });

      // Bridge DM conversation if we have principal ID
      if (principalId) {
        try {
          await fetch('/api/montree/dm', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-super-admin-password': password
            },
            body: JSON.stringify({
              action: 'bridge',
              old_conversation_id: lead.id,
              new_conversation_id: principalId
            })
          });
        } catch (bridgeErr) {
          console.warn('Failed to bridge DM conversation:', bridgeErr);
        }
      }

      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, status: 'onboarded', provisioned_school_id: data.school?.id, notes: `${l.notes ? l.notes + '\n' : ''}Provisioned: ${new Date().toLocaleDateString()}\nEmail: ${email}\nTemp password: ${tempPassword}${principalId ? '\nPrincipal ID: ' + principalId : ''}` } : l
      ));
      setNewLeadCount(prev => Math.max(0, prev - 1));

      const bridgeNote = principalId ? '\n\n✓ DM conversation bridged to principal account' : '';
      alert(`✅ School created!\n\nSchool: ${schoolName}\nLogin email: ${email}\nPassword: ${tempPassword}\n\nShare these with ${lead.name} so they can log in at /montree/principal/login${bridgeNote}`);

    } catch (err) {
      console.error('Provision failed:', err);
      alert('Failed to provision school');
    }
  };

  const getLeadStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'contacted': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'onboarded': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'declined': return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getLeadStatusEmoji = (status: string) => {
    switch (status) {
      case 'new': return '🆕';
      case 'contacted': return '📞';
      case 'onboarded': return '✅';
      case 'declined': return '❌';
      default: return '❓';
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
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) return;
      const data = await res.json();
      setDmMessages(data.messages || []);
      // Mark as read on server
      await fetch('/api/montree/dm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-password': password
        },
        body: JSON.stringify({ conversation_id: conversationId, reader_type: 'admin' })
      });
      // Update local unread counts via functional setState (avoids stale closure)
      setDmUnreadPerConvo(prev => {
        const convoUnread = prev[conversationId]?.count || 0;
        if (convoUnread > 0) {
          setDmUnreadTotal(t => Math.max(0, t - convoUnread));
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to open DM:', err);
    }
  }, [password]);

  const sendDm = async () => {
    if (!dmOpenFor || !dmNewMsg.trim() || dmSending) return;
    setDmSending(true);
    try {
      const res = await fetch('/api/montree/dm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-password': password
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
          'x-super-admin-password': password
        },
        body: JSON.stringify({ feedback_id: feedbackId, is_read: true })
      });
      setFeedback(prev => prev.map(f =>
        f.id === feedbackId ? { ...f, is_read: true } : f
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark feedback read:', err);
    }
  };

  // Update school subscription status
  const updateSchoolStatus = async (schoolId: string, newTier: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          subscription_tier: newTier,
          subscription_status: newTier === 'free' ? 'active' : (newTier === 'paid' ? 'active' : 'trialing'),
          password: '870602'
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      // Update local state
      setSchools(prev => prev.map(s =>
        s.id === schoolId
          ? { ...s, subscription_tier: newTier, subscription_status: newTier === 'free' ? 'active' : (newTier === 'paid' ? 'active' : 'trialing') }
          : s
      ));
      setEditingSchool(null);
      await logAction('update_school_status', { schoolId, newTier });
    } catch (err) {
      console.error('Failed to update school:', err);
      alert('Failed to update school status');
    }
  };

  const getFeedbackEmoji = (type: string) => {
    switch (type) {
      case 'bug': return '🐛';
      case 'idea': return '💡';
      case 'help': return '❓';
      case 'praise': return '👍';
      default: return '💬';
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'teacher': return 'bg-blue-500/20 text-blue-400';
      case 'principal': return 'bg-purple-500/20 text-purple-400';
      case 'parent': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      default: return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    }
  };

  const deleteSchool = async (school: School) => {
    const confirmMsg = `🚨 DELETE "${school.name}"?\n\nThis will permanently delete:\n• ${school.classroom_count || 0} classrooms\n• ${school.teacher_count || 0} teachers\n• ${school.student_count || 0} students\n• All curriculum and progress data\n\nType "DELETE" to confirm:`;

    const input = prompt(confirmMsg);
    if (input !== 'DELETE') {
      alert('Cancelled - you must type DELETE to confirm');
      return;
    }

    try {
      const res = await fetch(`/api/montree/super-admin/schools?schoolId=${school.id}&password=870602`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      setSchools(prev => prev.filter(s => s.id !== school.id));
      alert(`✅ "${school.name}" deleted successfully`);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete school: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const loginAsSchool = async (schoolId: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, superAdminPassword: '870602' }),
      });

      if (!res.ok) throw new Error('Failed to login');

      const data = await res.json();

      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));

      if (data.needsSetup) {
        router.push('/montree/principal/setup');
      } else {
        router.push('/montree/admin');
      }
    } catch (err) {
      console.error('Login as failed:', err);
      alert('Failed to login as principal');
    }
  };

  // Stats
  const trialSchools = schools.filter(s => s.subscription_tier === 'trial' || s.subscription_status === 'trialing');
  const freeSchools = schools.filter(s => s.subscription_tier === 'free');
  const paidSchools = schools.filter(s => s.subscription_tier === 'paid');

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">🔐</span>
            <h1 className="text-xl font-bold text-white">Master Admin</h1>
            <p className="text-slate-400 text-sm">Enter password to continue</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-emerald-500 outline-none"
            autoFocus
          />

          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>🌳</span> Montree Admin
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {schools.length} schools • {trialSchools.length} trial • {freeSchools.length} free • {paidSchools.length} paid
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/montree/teacher/register"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
            >
              Teacher Trial →
            </Link>
            <Link
              href="/montree/onboarding"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm"
            >
              + Register School
            </Link>
          </div>
        </div>

        {/* Session Warning */}
        {sessionWarning && (
          <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-400 text-sm">
            ⚠️ Session expiring soon. Move mouse to stay logged in.
          </div>
        )}

        {/* Tabs - Simplified */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'schools'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🏫 Schools
          </button>
          <button
            onClick={() => { setActiveTab('leads'); if (leads.length === 0) fetchLeads(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            👋 Leads
            {newLeadCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full animate-pulse">
                {newLeadCount}
              </span>
            )}
            {dmUnreadTotal > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                ✉ {dmUnreadTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('feedback'); if (feedback.length === 0) fetchFeedback(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'feedback'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            💬 Feedback
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Schools Tab */}
        {activeTab === 'schools' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-slate-400 text-sm">Total Schools</p>
                <p className="text-2xl font-bold text-white">{schools.length}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-amber-400 text-sm">Trial</p>
                <p className="text-2xl font-bold text-amber-400">{trialSchools.length}</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-400 text-sm">Free (NPO)</p>
                <p className="text-2xl font-bold text-purple-400">{freeSchools.length}</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-emerald-400 text-sm">Paid</p>
                <p className="text-2xl font-bold text-emerald-400">{paidSchools.length}</p>
              </div>
            </div>

            {/* Schools Table */}
            {loading ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <div className="animate-pulse">
                  <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
                  <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
                </div>
              </div>
            ) : schools.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <span className="text-5xl block mb-4">📭</span>
                <h2 className="text-xl font-semibold text-white mb-2">No schools registered yet</h2>
                <p className="text-slate-400 mb-6">Be the first to register a school!</p>
                <Link
                  href="/montree/onboarding"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
                >
                  Register First School
                </Link>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left p-4 text-slate-400 font-medium text-sm">School</th>
                      <th className="text-left p-4 text-slate-400 font-medium text-sm">Owner</th>
                      <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                      <th className="text-left p-4 text-slate-400 font-medium text-sm">Stats</th>
                      <th className="text-right p-4 text-slate-400 font-medium text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {schools.map((school) => (
                      <tr key={school.id} className="hover:bg-slate-800/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {school.subscription_tier === 'free' ? '🌍' :
                               school.subscription_tier === 'paid' ? '⭐' : '🎓'}
                            </span>
                            <div>
                              <p className="font-medium text-white">{school.name}</p>
                              <p className="text-slate-500 text-sm">{school.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-white">{school.owner_name || '-'}</p>
                          <p className="text-slate-400 text-sm">{school.owner_email}</p>
                        </td>
                        <td className="p-4">
                          {editingSchool === school.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateSchoolStatus(school.id, 'trial')}
                                className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                              >
                                Trial
                              </button>
                              <button
                                onClick={() => updateSchoolStatus(school.id, 'free')}
                                className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                              >
                                Free
                              </button>
                              <button
                                onClick={() => updateSchoolStatus(school.id, 'paid')}
                                className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                              >
                                Paid
                              </button>
                              <button
                                onClick={() => setEditingSchool(null)}
                                className="px-2 py-1 text-xs rounded bg-slate-700 text-slate-400"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingSchool(school.id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border ${getTierColor(school.subscription_tier || 'trial')} hover:opacity-80`}
                            >
                              {school.subscription_tier === 'free' ? '🌍 Free (NPO)' :
                               school.subscription_tier === 'paid' ? '⭐ Paid' :
                               '🎓 Trial'}
                              <span className="ml-1 opacity-50">✎</span>
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-slate-300">
                            {school.classroom_count || 0} classrooms • {school.student_count || 0} students
                          </div>
                          <div className="text-xs text-slate-500">
                            Created {new Date(school.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => loginAsSchool(school.id)}
                              className="px-3 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm font-medium transition-colors"
                            >
                              Login As →
                            </button>
                            <button
                              onClick={() => deleteSchool(school)}
                              className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Leads Tab */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Leads Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">People interested in Montree</h2>
              <button onClick={fetchLeads} className="text-sm text-slate-400 hover:text-white">
                ↻ Refresh
              </button>
            </div>

            {/* Lead Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-emerald-400 text-xs">New</p>
                <p className="text-xl font-bold text-emerald-400">{leads.filter(l => l.status === 'new').length}</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                <p className="text-amber-400 text-xs">Contacted</p>
                <p className="text-xl font-bold text-amber-400">{leads.filter(l => l.status === 'contacted').length}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                <p className="text-blue-400 text-xs">Onboarded</p>
                <p className="text-xl font-bold text-blue-400">{leads.filter(l => l.status === 'onboarded').length}</p>
              </div>
              <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-3">
                <p className="text-slate-400 text-xs">Total</p>
                <p className="text-xl font-bold text-slate-300">{leads.length}</p>
              </div>
            </div>

            {loadingLeads ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <div className="animate-pulse text-4xl">👋</div>
                <p className="text-slate-400 mt-2">Loading leads...</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
                <span className="text-5xl block mb-4">🌱</span>
                <h3 className="text-xl font-semibold text-white mb-2">No leads yet</h3>
                <p className="text-slate-400">When someone visits /montree and clicks &ldquo;I want to try&rdquo;, they&apos;ll show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => {
                  // Compute DM target once per lead (teacher/principal ID from notes, or lead ID)
                  const userIdMatch = lead.notes?.match(/(Teacher|Principal) ID: ([a-fA-F0-9-]+)/);
                  const dmTarget = userIdMatch ? userIdMatch[2] : lead.id;
                  // Check both principal ID and lead ID for unread (handles pre/post-bridge)
                  const leadUnreadCount = dmUnreadPerConvo[dmTarget]?.count
                    || (userIdMatch ? dmUnreadPerConvo[lead.id]?.count : 0)
                    || 0;

                  return (
                  <div
                    key={lead.id}
                    className={`bg-slate-800/50 border rounded-xl p-4 transition-all ${
                      lead.status === 'new' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Interest type icon */}
                      <div className="text-2xl mt-1">
                        {lead.interest_type === 'try' ? '🚀' : '💬'}
                      </div>

                      {/* Lead info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-white text-lg">
                            {lead.name || 'Anonymous'}
                          </span>
                          {lead.role && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                              {lead.role === 'teacher' ? '👩‍🏫' : lead.role === 'principal' ? '👔' : '🤔'} {lead.role}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getLeadStatusColor(lead.status)}`}>
                            {getLeadStatusEmoji(lead.status)} {lead.status}
                          </span>
                          <span className="text-slate-500 text-sm ml-auto">
                            {new Date(lead.created_at).toLocaleString()}
                          </span>
                        </div>

                        {lead.email && (
                          <p className="text-slate-300 text-sm">
                            📧 <a href={`mailto:${lead.email}`} className="hover:text-emerald-400 transition-colors">{lead.email}</a>
                          </p>
                        )}
                        {lead.school_name && (
                          <p className="text-slate-400 text-sm">🏫 {lead.school_name}</p>
                        )}
                        {lead.message && (
                          <p className="text-slate-300 mt-2 text-sm bg-slate-900/50 p-3 rounded-lg">
                            &ldquo;{lead.message}&rdquo;
                          </p>
                        )}
                        {lead.interest_type === 'try' && (
                          <p className="text-emerald-400/60 text-xs mt-1">Wants to try Montree</p>
                        )}
                        {lead.interest_type === 'info' && (
                          <p className="text-blue-400/60 text-xs mt-1">Wants more information</p>
                        )}

                        {/* Notes */}
                        {editingNotes === lead.id ? (
                          <div className="mt-3">
                            <textarea
                              value={notesText}
                              onChange={(e) => setNotesText(e.target.value)}
                              placeholder="Your notes about this lead..."
                              rows={2}
                              className="w-full p-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-emerald-500 outline-none resize-none"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={() => saveLeadNotes(lead.id)}
                                className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNotes(null)}
                                className="px-3 py-1 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : lead.notes ? (
                          <button
                            onClick={() => { setEditingNotes(lead.id); setNotesText(lead.notes || ''); }}
                            className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            📝 {lead.notes}
                          </button>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {lead.status === 'new' && (
                          <>
                            <button
                              onClick={() => updateLeadStatus(lead.id, 'contacted')}
                              className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg font-medium whitespace-nowrap"
                            >
                              📞 Contacted
                            </button>
                            <button
                              onClick={() => provisionSchool(lead)}
                              className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-medium whitespace-nowrap"
                            >
                              🏫 Provision
                            </button>
                          </>
                        )}
                        {lead.status === 'contacted' && (
                          <>
                            <button
                              onClick={() => provisionSchool(lead)}
                              className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-medium whitespace-nowrap"
                            >
                              🏫 Provision
                            </button>
                            <button
                              onClick={() => updateLeadStatus(lead.id, 'declined')}
                              className="px-3 py-1.5 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg font-medium whitespace-nowrap"
                            >
                              ❌ Decline
                            </button>
                          </>
                        )}
                        {lead.status === 'onboarded' && lead.provisioned_school_id && (
                          <button
                            onClick={() => loginAsSchool(lead.provisioned_school_id as string)}
                            className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg font-medium whitespace-nowrap"
                          >
                            Login As →
                          </button>
                        )}
                        <button
                          onClick={() => openDm(dmTarget, lead.name || 'Anonymous', lead.email || '')}
                          className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium whitespace-nowrap relative"
                        >
                          💬 Message
                          {leadUnreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                              {leadUnreadCount}
                            </span>
                          )}
                        </button>
                        {!editingNotes && (
                          <button
                            onClick={() => { setEditingNotes(lead.id); setNotesText(lead.notes || ''); }}
                            className="px-3 py-1.5 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg font-medium whitespace-nowrap"
                          >
                            📝 Notes
                          </button>
                        )}
                        <button
                          onClick={() => deleteLead(lead)}
                          className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg font-medium whitespace-nowrap"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">User Feedback</h2>
              <button onClick={fetchFeedback} className="text-sm text-slate-400 hover:text-white">
                ↻ Refresh
              </button>
            </div>

            {loadingFeedback ? (
              <div className="p-12 text-center">
                <div className="animate-pulse text-4xl">💬</div>
                <p className="text-slate-400 mt-2">Loading feedback...</p>
              </div>
            ) : feedback.length === 0 ? (
              <div className="p-12 text-center">
                <span className="text-5xl block mb-4">📭</span>
                <h3 className="text-xl font-semibold text-white mb-2">No feedback yet</h3>
                <p className="text-slate-400">Feedback from teachers, principals, and parents will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {feedback.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-slate-800/50 transition-colors ${
                      !item.is_read ? 'bg-emerald-500/5 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-2xl">{getFeedbackEmoji(item.feedback_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUserTypeColor(item.user_type)}`}>
                            {item.user_type}
                          </span>
                          {item.user_name && (
                            <span className="text-white font-medium">{item.user_name}</span>
                          )}
                          {item.school?.name && (
                            <span className="text-slate-500 text-sm">@ {item.school.name}</span>
                          )}
                          <span className="text-slate-500 text-sm ml-auto">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-white whitespace-pre-wrap">{item.message}</p>
                        {item.screenshot_url && (
                          <div className="mt-3">
                            <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer" className="block">
                              <img
                                src={item.screenshot_url}
                                alt="Screenshot"
                                className="max-w-md max-h-48 rounded-lg border border-slate-600 hover:border-emerald-500 transition-colors cursor-pointer"
                              />
                            </a>
                          </div>
                        )}
                        {item.page_url && (
                          <p className="text-slate-500 text-sm mt-2">📍 {item.page_url}</p>
                        )}
                      </div>
                      {!item.is_read && (
                        <button
                          onClick={() => markFeedbackRead(item.id)}
                          className="px-3 py-1 text-sm bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg"
                        >
                          ✓ Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DM Slide-out Panel */}
      {dmOpenFor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDmOpenFor(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">
                  💬 {dmLeadName}
                </h2>
                {dmLeadEmail && (
                  <p className="text-slate-400 text-xs">{dmLeadEmail}</p>
                )}
              </div>
              <button onClick={() => setDmOpenFor(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dmMessages.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl block mb-3">💬</span>
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-500 text-xs mt-1">Send the first message</p>
                </div>
              ) : (
                dmMessages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.sender_type === 'admin'
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-slate-800 text-white rounded-bl-md'
                    }`}>
                      {msg.sender_type === 'user' && (
                        <p className="text-blue-400 text-xs font-medium mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-emerald-200/50' : 'text-slate-500'}`}>
                        {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dmNewMsg}
                  onChange={(e) => setDmNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendDm()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
                  autoFocus
                />
                <button
                  onClick={sendDm}
                  disabled={dmSending || !dmNewMsg.trim()}
                  className="px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors font-medium"
                >
                  {dmSending ? '...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
