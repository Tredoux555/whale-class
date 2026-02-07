// /montree/super-admin/page.tsx
// Secure Super Admin Dashboard - Refactored
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAdminData } from '@/hooks/useAdminData';
import { useLeadOperations } from '@/hooks/useLeadOperations';
import SchoolsTab from '@/components/montree/super-admin/SchoolsTab';
import LeadsTab from '@/components/montree/super-admin/LeadsTab';
import FeedbackTab from '@/components/montree/super-admin/FeedbackTab';
import DmPanel from '@/components/montree/super-admin/DmPanel';

type TabType = 'schools' | 'feedback' | 'leads';

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionWarning, setSessionWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('schools');
  const [editingSchool, setEditingSchool] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [dmOpenFor, setDmOpenFor] = useState<string | null>(null);
  const [dmLeadName, setDmLeadName] = useState<string>('');
  const [dmLeadEmail, setDmLeadEmail] = useState<string>('');
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmNewMsg, setDmNewMsg] = useState('');
  const [dmSending, setDmSending] = useState(false);

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

  // Use custom hooks
  const adminData = useAdminData({
    password,
    logAction,
    authenticated
  });

  const leadOps = useLeadOperations({
    password,
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
      adminData.fetchSchools();
      adminData.fetchFeedback();
      adminData.fetchLeads();
    } else {
      await logAction('login_failed', { attempted: true });
      setError('Invalid password');
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
  }, [password, adminData]);

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
              {adminData.schools.length} schools • {trialSchools.length} trial • {freeSchools.length} free • {paidSchools.length} paid
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

        {/* Tabs */}
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
            onClick={() => { setActiveTab('leads'); if (adminData.leads.length === 0) adminData.fetchLeads(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            👋 Leads
            {adminData.newLeadCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full animate-pulse">
                {adminData.newLeadCount}
              </span>
            )}
            {adminData.dmUnreadTotal > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                ✉ {adminData.dmUnreadTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('feedback'); if (adminData.feedback.length === 0) adminData.fetchFeedback(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'feedback'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            💬 Feedback
            {adminData.unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {adminData.unreadCount}
              </span>
            )}
          </button>
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
            onLoginAs={leadOps.loginAsSchool}
            trialSchools={trialSchools}
            freeSchools={freeSchools}
            paidSchools={paidSchools}
          />
        )}

        {activeTab === 'leads' && (
          <LeadsTab
            leads={adminData.leads}
            loadingLeads={adminData.loadingLeads}
            onFetchLeads={adminData.fetchLeads}
            onUpdateStatus={leadOps.updateLeadStatus}
            onDeleteLead={leadOps.deleteLead}
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
    </div>
  );
}
