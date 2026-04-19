'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Contact {
  id: string;
  org_name: string;
  contact_person: string | null;
  email: string | null;
  status: string;
  contact_type: string;
  priority: string;
  email_status: string | null;
  source: string | null;
  notes: string | null;
  sent_date: string | null;
  reply_date: string | null;
  draft_date: string | null;
  follow_up_count: number;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardData {
  stats: Record<string, number>;
  drafted: Contact[];
  needsFollowUp: Contact[];
  queue: Contact[];
  queueTotal: number;
  recentActivity: Contact[];
  replies: Contact[];
}

export default function CampaignManagerPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'drafted' | 'queue' | 'sent' | 'replies'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch('/api/montree/super-admin/campaign-manager', {
        headers: { 'x-super-admin-password': pwd },
      });
      if (!res.ok) { setAuthed(false); return; }
      const d = await res.json();
      setData(d);
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

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const pwd = sessionStorage.getItem('sa_pwd') || password;
    await fetch('/api/montree/super-admin/campaign-manager', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-password': pwd },
      body: JSON.stringify({ id, status }),
    });
    await fetchData();
    setUpdating(null);
  }

  async function bulkUpdateStatus(ids: string[], status: string) {
    setUpdating('bulk');
    const pwd = sessionStorage.getItem('sa_pwd') || password;
    await fetch('/api/montree/super-admin/campaign-manager', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-super-admin-password': pwd },
      body: JSON.stringify({ ids, status }),
    });
    await fetchData();
    setUpdating(null);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem('sa_pwd', password);
    fetchData();
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function statusColor(s: string) {
    const colors: Record<string, string> = {
      new: 'bg-slate-100 text-slate-600',
      drafted: 'bg-blue-100 text-blue-700',
      sent: 'bg-emerald-100 text-emerald-700',
      replied: 'bg-purple-100 text-purple-700',
      bounced: 'bg-red-100 text-red-700',
      dead: 'bg-gray-200 text-gray-500',
      converted: 'bg-amber-100 text-amber-700',
      follow_up: 'bg-orange-100 text-orange-700',
      demo_requested: 'bg-pink-100 text-pink-700',
      contacted: 'bg-teal-100 text-teal-700',
      not_interested: 'bg-gray-100 text-gray-500',
    };
    return colors[s] || 'bg-gray-100 text-gray-600';
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-800 mb-4">Campaign Manager</h1>
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

  if (!data) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;

  const s = data.stats;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/montree/super-admin/marketing" className="text-sm text-gray-400 hover:text-gray-600 mb-1 block">
              ← Marketing Hub
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              📮 Campaign Manager
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              You review & send · Claude drafts · No automation
            </p>
          </div>
          <button onClick={fetchData} disabled={loading} className="px-4 py-2 bg-white border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: s.total, color: 'bg-white border' },
            { label: 'Queue', value: s.new, color: 'bg-slate-50 border border-slate-200' },
            { label: 'Drafted', value: s.drafted, color: 'bg-blue-50 border border-blue-200' },
            { label: 'Sent', value: s.sent, color: 'bg-emerald-50 border border-emerald-200' },
            { label: 'Replied', value: s.replied, color: 'bg-purple-50 border border-purple-200' },
            { label: 'Demo Reqs', value: s.demo_requested, color: 'bg-pink-50 border border-pink-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
              <div className="text-xl font-bold text-gray-800">{value || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border">
          {(['overview', 'drafted', 'queue', 'sent', 'replies'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t === 'overview' ? '📊 Overview' :
               t === 'drafted' ? `✉️ Ready (${data.drafted.length})` :
               t === 'queue' ? `📋 Queue (${data.queueTotal})` :
               t === 'sent' ? `✓ Sent (${s.sent || 0})` :
               `💬 Replies (${data.replies.length})`}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Drafted — ready to send */}
            {data.drafted.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wider">
                    ✉️ Ready to Send ({data.drafted.length})
                  </h2>
                  {data.drafted.length > 1 && (
                    <button
                      onClick={() => bulkUpdateStatus(data.drafted.map(c => c.id), 'sent')}
                      disabled={updating === 'bulk'}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
                    >
                      {updating === 'bulk' ? '...' : 'Mark All Sent'}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {data.drafted.map(c => (
                    <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} />
                  ))}
                </div>
              </div>
            )}

            {/* Needs follow-up */}
            {data.needsFollowUp.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-3">
                  🔔 Needs Follow-up ({data.needsFollowUp.length})
                </h2>
                <div className="space-y-2">
                  {data.needsFollowUp.map(c => (
                    <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} />
                  ))}
                </div>
              </div>
            )}

            {/* Demo Requests */}
            {(s.demo_requested || 0) > 0 && (
              <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                <h2 className="text-sm font-bold text-pink-700 mb-1">🎯 {s.demo_requested} demo request{s.demo_requested > 1 ? 's' : ''} pending</h2>
                <p className="text-xs text-pink-600">
                  <Link href="/montree/super-admin/marketing/demo-requests" className="underline hover:text-pink-800">
                    View in Demo Requests →
                  </Link>
                </p>
              </div>
            )}

            {/* Replies */}
            {data.replies.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-purple-700 uppercase tracking-wider mb-3">
                  💬 Replies ({data.replies.length})
                </h2>
                <div className="space-y-2">
                  {data.replies.map(c => (
                    <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} />
                  ))}
                </div>
              </div>
            )}

            {/* All quiet */}
            {data.drafted.length === 0 && data.needsFollowUp.length === 0 && data.replies.length === 0 && (
              <div className="bg-white rounded-xl p-8 text-center border">
                <div className="text-3xl mb-3">📮</div>
                <div className="text-gray-500 mb-1">Nothing pending right now</div>
                <div className="text-gray-400 text-sm">{data.queueTotal} contacts in the queue ready for next batch</div>
              </div>
            )}

            {/* Recent activity */}
            {data.recentActivity.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Recent Activity
                </h2>
                <div className="space-y-1">
                  {data.recentActivity.map(c => (
                    <div key={c.id} className="bg-white rounded-lg px-4 py-2.5 border flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                          {c.status}
                        </span>
                        <span className="truncate text-gray-600">{c.org_name}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{timeAgo(c.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Drafted Tab */}
        {tab === 'drafted' && (
          <div>
            {data.drafted.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border">
                <div className="text-3xl mb-3">✓</div>
                <div className="text-gray-500">No drafts waiting. Ask Claude to draft the next batch.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.drafted.map(c => (
                  <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} expanded />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Queue Tab */}
        {tab === 'queue' && (
          <div>
            <div className="bg-white rounded-xl p-4 border mb-4">
              <p className="text-sm text-gray-600">
                <strong>{data.queueTotal}</strong> contacts ready for outreach. Ask Claude to draft the next batch —
                &quot;draft the next 10 emails&quot; and they&apos;ll appear in your Gmail Drafts.
              </p>
            </div>
            <div className="space-y-2">
              {data.queue.map(c => (
                <div key={c.id} className="bg-white rounded-lg px-4 py-3 border flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.priority === 'warm' ? 'bg-amber-100 text-amber-700' :
                      c.priority === 'tier1' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.priority}</span>
                    <div className="min-w-0">
                      <span className="font-medium text-gray-700 truncate block">{c.org_name}</span>
                      {c.email && <span className="text-xs text-gray-400">{c.email}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{c.contact_type}</span>
                </div>
              ))}
              {data.queueTotal > data.queue.length && (
                <div className="text-center text-sm text-gray-400 py-2">
                  + {data.queueTotal - data.queue.length} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sent Tab */}
        {tab === 'sent' && (
          <div>
            {data.recentActivity.filter(c => c.status === 'sent').length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border">
                <div className="text-3xl mb-3">📬</div>
                <div className="text-gray-500">No emails sent yet. Time to start!</div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentActivity.filter(c => c.status === 'sent').map(c => (
                  <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Replies Tab */}
        {tab === 'replies' && (
          <div>
            {data.replies.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border">
                <div className="text-3xl mb-3">💬</div>
                <div className="text-gray-500">No replies yet. They&apos;ll show up here when contacts respond.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.replies.map(c => (
                  <ContactCard key={c.id} contact={c} updating={updating} onStatus={updateStatus} timeAgo={timeAgo} statusColor={statusColor} expanded />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workflow hint */}
        <div className="mt-8 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-600 mb-2">📮 How this works</h3>
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>1.</strong> Tell Claude &quot;draft the next 10 emails&quot; → drafts appear in Gmail</p>
            <p><strong>2.</strong> Review each draft in Gmail, hit Send when happy</p>
            <p><strong>3.</strong> Come back here, mark them as Sent</p>
            <p><strong>4.</strong> When someone replies, mark as Replied</p>
            <p><strong>5.</strong> Claude handles follow-ups when you ask</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactCard({
  contact: c,
  updating,
  onStatus,
  timeAgo,
  statusColor,
  expanded = false,
}: {
  contact: Contact;
  updating: string | null;
  onStatus: (id: string, status: string) => void;
  timeAgo: (d: string | null) => string;
  statusColor: (s: string) => string;
  expanded?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 truncate">{c.org_name}</span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
              {c.status.replace('_', ' ')}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-0.5">
            {c.contact_person && <span>{c.contact_person} · </span>}
            {c.email && (
              <a href={`mailto:${c.email}`} className="text-emerald-600 hover:underline">{c.email}</a>
            )}
          </div>
          {expanded && c.notes && (
            <div className="text-xs text-gray-400 mt-2 italic">{c.notes}</div>
          )}
          <div className="text-xs text-gray-400 mt-1">
            {c.sent_date && <span>Sent {timeAgo(c.sent_date)} · </span>}
            {c.reply_date && <span>Replied {timeAgo(c.reply_date)} · </span>}
            {c.next_follow_up && <span>Follow-up {new Date(c.next_follow_up).toLocaleDateString()} · </span>}
            {c.source && <span>{c.source}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {c.status === 'drafted' && (
            <button
              onClick={() => onStatus(c.id, 'sent')}
              disabled={updating === c.id}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"
            >
              {updating === c.id ? '...' : 'Mark Sent'}
            </button>
          )}
          {c.status === 'sent' && (
            <>
              <button
                onClick={() => onStatus(c.id, 'replied')}
                disabled={updating === c.id}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700"
              >
                {updating === c.id ? '...' : 'Got Reply'}
              </button>
              <button
                onClick={() => onStatus(c.id, 'bounced')}
                disabled={updating === c.id}
                className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-200"
              >
                Bounced
              </button>
            </>
          )}
          {c.status === 'new' && (
            <button
              onClick={() => onStatus(c.id, 'dead')}
              disabled={updating === c.id}
              className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-200"
            >
              Skip
            </button>
          )}
          {c.status === 'replied' && (
            <button
              onClick={() => onStatus(c.id, 'converted')}
              disabled={updating === c.id}
              className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600"
            >
              {updating === c.id ? '...' : 'Converted!'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
