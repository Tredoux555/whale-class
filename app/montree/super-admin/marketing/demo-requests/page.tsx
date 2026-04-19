'use client';

import { useState, useEffect, useCallback } from 'react';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-4">Demo Requests</h1>
          <input
            type="password" placeholder="Super admin password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg text-sm mb-3"
          />
          <button type="submit" className="w-full py-3 bg-emerald-700 text-white rounded-lg font-semibold text-sm">
            Log in
          </button>
        </form>
      </div>
    );
  }

  const pending = requests.filter(r => r.status === 'demo_requested');
  const handled = requests.filter(r => r.status !== 'demo_requested');

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Demo Requests</h1>
            <p className="text-sm text-gray-500">From montree.xyz landing page</p>
          </div>
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-white border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 text-center border">
            <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            <div className="text-xs text-amber-600 uppercase tracking-wider">Action needed</div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <div className="text-2xl font-bold text-emerald-700">{stats.contacted}</div>
            <div className="text-xs text-emerald-600 uppercase tracking-wider">Contacted</div>
          </div>
        </div>

        {/* Pending — Action List */}
        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-3">
              Action Required ({pending.length})
            </h2>
            <div className="space-y-2">
              {pending.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {r.org_name !== 'Unknown School' ? r.org_name : r.email}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {r.contact_person && <span>{r.contact_person} · </span>}
                        <a href={`mailto:${r.email}`} className="text-emerald-600 hover:underline">{r.email}</a>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{timeAgo(r.created_at)}</div>
                      {r.notes && <div className="text-xs text-gray-500 mt-1 italic">{r.notes}</div>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleStatusChange(r.id, 'contacted')}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                      >
                        Mark Contacted
                      </button>
                      <button
                        onClick={() => handleStatusChange(r.id, 'not_interested')}
                        className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {pending.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center border mb-8">
            <div className="text-3xl mb-3">✓</div>
            <div className="text-gray-500">No pending demo requests. All caught up!</div>
          </div>
        )}

        {/* Handled */}
        {handled.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
              History ({handled.length})
            </h2>
            <div className="space-y-1">
              {handled.map((r) => (
                <div key={r.id} className="bg-white rounded-lg px-4 py-3 border flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${r.status === 'contacted' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="truncate text-gray-600">
                      {r.org_name !== 'Unknown School' ? r.org_name : r.email}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(r.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
