'use client';
// Outreach Hub — Real-time CRM for Montree multiplier + school outreach
// DB-backed via montree_outreach_contacts + montree_outreach_log
import { useState, useEffect, useCallback } from 'react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  drafted: 'bg-blue-100 text-blue-700',
  sent: 'bg-indigo-100 text-indigo-700',
  bounced: 'bg-red-100 text-red-700',
  replied: 'bg-emerald-100 text-emerald-700',
  follow_up: 'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-800',
  dead: 'bg-gray-200 text-gray-500',
};

const TYPE_LABELS: Record<string, string> = {
  multiplier_association: '🏛 Association',
  multiplier_training: '🎓 Training Center',
  multiplier_franchise: '🏢 Franchise',
  multiplier_consultant: '💼 Consultant',
  individual_school: '🏫 School',
  competitor_intel: '🔍 Competitor',
};

const PRIORITY_LABELS: Record<string, string> = {
  warm: '🔥 Warm',
  tier1: '⭐ Tier 1',
  tier2: '◻️ Tier 2',
  tier3: '◇ Tier 3',
};

interface Stats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  with_email: number;
  bounced: number;
  reply_rate: number;
}

interface Contact {
  id: string;
  org_name: string;
  contact_person: string | null;
  email: string | null;
  contact_type: string;
  priority: string;
  status: string;
  country: string | null;
  est_schools_reached: number;
  follow_up_count: number;
  next_follow_up: string | null;
  draft_date: string | null;
  sent_date: string | null;
  reply_date: string | null;
  notes: string | null;
  reply_summary: string | null;
  updated_at: string;
}

interface LogEntry {
  id: string;
  action: string;
  details: any;
  created_at: string;
  montree_outreach_contacts?: { org_name: string; email: string } | null;
}

export default function OutreachHubPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<'pipeline' | 'contacts' | 'log'>('pipeline');
  const [stats, setStats] = useState<Stats | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [needsFollowUp, setNeedsFollowUp] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auth — reuse sa_pwd pattern
  useEffect(() => {
    const saved = sessionStorage.getItem('sa_pwd');
    if (saved) { setToken(saved); setAuthed(true); }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) { setError('Wrong password'); return; }
      const data = await res.json();
      const t = data.token || password;
      sessionStorage.setItem('sa_pwd', t);
      setToken(t);
      setAuthed(true);
    } catch { setError('Auth failed'); }
  };

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-super-admin-password': token,
  }), [token]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/montree/super-admin/outreach?view=stats', { headers: headers() });
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data.stats);
      setLog(data.recent_log || []);
      setNeedsFollowUp(data.needs_follow_up || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token, headers]);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = '/api/montree/super-admin/outreach?view=contacts&limit=200';
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&type=${typeFilter}`;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) throw new Error('Failed to load contacts');
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token, headers, statusFilter, typeFilter]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'pipeline') fetchStats();
    if (tab === 'contacts') fetchContacts();
    if (tab === 'log') fetchStats(); // log comes with stats
  }, [authed, tab, fetchStats, fetchContacts]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 w-80">
          <h2 className="text-lg font-semibold mb-4">🎯 Outreach Hub</h2>
          <input
            type="password"
            placeholder="Super admin password"
            className="w-full border rounded px-3 py-2 mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-emerald-600 text-white rounded py-2 font-medium hover:bg-emerald-700"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  const s = stats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎯 Outreach Hub</h1>
            <p className="text-emerald-100 text-sm mt-1">
              Montree partnership & school outreach CRM
            </p>
          </div>
          <div className="text-right text-sm text-emerald-100">
            {s && (
              <>
                <div className="text-xl font-bold text-white">{s.total} contacts</div>
                <div>{s.with_email} with email · {s.reply_rate.toFixed(1)}% reply rate</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 mt-4">
        <div className="flex gap-2 mb-4">
          {(['pipeline', 'contacts', 'log'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                tab === t
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t === 'pipeline' ? '📊 Pipeline' : t === 'contacts' ? '📋 Contacts' : '📝 Activity Log'}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-8 text-gray-500">Loading...</div>}

        {/* PIPELINE TAB */}
        {tab === 'pipeline' && s && !loading && (
          <div className="space-y-6">
            {/* Funnel cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {['new', 'drafted', 'sent', 'follow_up', 'replied', 'meeting_booked', 'converted', 'bounced'].map(
                (st) => (
                  <button
                    key={st}
                    onClick={() => { setStatusFilter(st); setTab('contacts'); }}
                    className={`rounded-xl p-3 text-center cursor-pointer hover:ring-2 ring-emerald-300 transition ${STATUS_COLORS[st]}`}
                  >
                    <div className="text-2xl font-bold">{s.by_status[st] || 0}</div>
                    <div className="text-xs font-medium capitalize">{st.replace('_', ' ')}</div>
                  </button>
                )
              )}
            </div>

            {/* Type breakdown */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">By Type</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(s.by_type).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => { setTypeFilter(type); setTab('contacts'); }}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 cursor-pointer"
                  >
                    <span className="text-sm">{TYPE_LABELS[type] || type}</span>
                    <span className="font-bold text-emerald-700">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Needs follow-up */}
            {needsFollowUp.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-semibold text-amber-800 mb-3">
                  ⏰ Needs Follow-up ({needsFollowUp.length})
                </h3>
                <div className="space-y-2">
                  {needsFollowUp.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <span className="font-medium">{c.org_name}</span>
                        <span className="text-gray-500 text-sm ml-2">{c.email}</span>
                      </div>
                      <span className="text-xs text-amber-600">
                        Follow-up #{(c.follow_up_count || 0) + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">Recent Activity</h3>
              {log.length === 0 ? (
                <p className="text-gray-400 text-sm">No activity yet. Run the daily outreach task to get started.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {log.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 text-sm py-1 border-b border-gray-50">
                      <span className="text-gray-400 text-xs w-32 shrink-0">
                        {new Date(entry.created_at).toLocaleDateString()} {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                      {entry.montree_outreach_contacts && (
                        <span className="text-gray-500">{entry.montree_outreach_contacts.org_name}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTACTS TAB */}
        {tab === 'contacts' && !loading && (
          <div>
            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {Object.keys(STATUS_COLORS).map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-1.5 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All types</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
                className="text-sm text-gray-500 hover:text-gray-700 px-2"
              >
                Clear filters
              </button>
              <span className="text-sm text-gray-400 ml-auto">{contacts.length} contacts</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Organization</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Priority</th>
                    <th className="text-left px-4 py-3 font-medium">Reach</th>
                    <th className="text-left px-4 py-3 font-medium">Country</th>
                    <th className="text-left px-4 py-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.org_name}</div>
                        {c.contact_person && (
                          <div className="text-gray-400 text-xs">{c.contact_person}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {TYPE_LABELS[c.contact_type] || c.contact_type}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {PRIORITY_LABELS[c.priority] || c.priority}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {c.est_schools_reached > 1 ? `~${c.est_schools_reached} schools` : '1'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">{c.country || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-400">
                        No contacts found. Run the seed task to import from spreadsheets.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOG TAB */}
        {tab === 'log' && !loading && (
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-4">Activity Log</h3>
            {log.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">
                No activity yet. The daily outreach task will log all actions here.
              </p>
            ) : (
              <div className="space-y-3">
                {log.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-3">
                    <span className="text-gray-400 text-xs w-36 shrink-0 pt-0.5">
                      {new Date(entry.created_at).toLocaleDateString()}{' '}
                      {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      <span className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</span>
                      {entry.montree_outreach_contacts && (
                        <span className="text-gray-500 ml-2">
                          → {entry.montree_outreach_contacts.org_name}
                        </span>
                      )}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {JSON.stringify(entry.details)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
