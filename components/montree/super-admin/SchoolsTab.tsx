'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { School } from './types';
import { getCountryFlag } from '@/lib/ip-geolocation';

const SchoolFeaturesModal = dynamic(() => import('./SchoolFeaturesModal'), { ssr: false });
const PrincipalsModal = dynamic(() => import('./PrincipalsModal'), { ssr: false });
const BillingOverrideModal = dynamic(() => import('./BillingOverrideModal'), { ssr: false });
const PaymentConfigModal = dynamic(() => import('./PaymentConfigModal'), { ssr: false });
const RecordIncomingWireModal = dynamic(() => import('./RecordIncomingWireModal'), { ssr: false });

// Platform default per-student rate. Mirrors PRICE_PER_STUDENT_USD in
// lib/montree/billing.ts. If that changes, change this too.
const PLATFORM_DEFAULT_PRICE_USD = 7;

interface SchoolsTabProps {
  schools: School[];
  loading: boolean;
  editingSchool: string | null;
  setEditingSchool: (id: string | null) => void;
  onUpdateStatus: (schoolId: string, tier: string) => void;
  onDeleteSchool: (school: School) => void;
  onBatchDelete: (schoolIds: string[]) => void;
  onLoginAs: (schoolId: string) => void;
  trialSchools: School[];
  freeSchools: School[];
  paidSchools: School[];
  batchDeleting: boolean;
  batchDeleteProgress: { completed: number; total: number; results: Array<{ name: string; success: boolean }> } | null;
  onClearBatchProgress: () => void;
  sessionToken?: string;
}

type SortField = 'name' | 'students' | 'last_active' | 'cost' | 'created';
type SortDir = 'asc' | 'desc';

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'free': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    default: return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
  }
};

function getActivityBadge(lastActiveAt: string | null): { color: string; label: string; dot: string } {
  if (!lastActiveAt) return { color: 'text-red-400', label: 'Never', dot: 'bg-red-500' };

  const hoursAgo = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo <= 24) return { color: 'text-emerald-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-emerald-500' };
  if (hoursAgo <= 168) return { color: 'text-amber-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-amber-500' };
  if (hoursAgo <= 720) return { color: 'text-slate-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-slate-500' };
  return { color: 'text-red-400', label: formatTimeAgo(lastActiveAt), dot: 'bg-red-500' };
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function SchoolsTab({
  schools,
  loading,
  editingSchool,
  setEditingSchool,
  onUpdateStatus,
  onDeleteSchool,
  onBatchDelete,
  onLoginAs,
  trialSchools,
  freeSchools,
  paidSchools,
  batchDeleting,
  batchDeleteProgress,
  onClearBatchProgress,
  sessionToken,
}: SchoolsTabProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [featuresSchool, setFeaturesSchool] = useState<{ id: string; name: string } | null>(null);
  const [principalsSchool, setPrincipalsSchool] = useState<{ id: string; name: string } | null>(null);
  const [overrideSchool, setOverrideSchool] = useState<{ id: string; name: string; current: number | string | null | undefined; note: string | null | undefined } | null>(null);
  const [paymentConfigSchool, setPaymentConfigSchool] = useState<{ id: string; name: string } | null>(null);
  const [togglingAi, setTogglingAi] = useState<Set<string>>(new Set());
  const [tierOverrides, setTierOverrides] = useState<Record<string, 'free' | 'premium'>>({});
  // Local override updates for optimistic display after the modal saves. Keyed
  // by schoolId. `null` here means "cleared". Mirrors the pattern used for AI
  // tier (tierOverrides above) — avoids a full schools refetch.
  const [billingOverrideUpdates, setBillingOverrideUpdates] = useState<
    Record<string, { override: number | null; note: string | null }>
  >({});
  // Phase A inbound payments — optimistic display updates for payment-method
  // and billing-cadence after PaymentConfigModal saves. Same pattern as
  // billingOverrideUpdates / tierOverrides. Refresh on next page load pulls
  // canonical values via SELECT * from /api/montree/super-admin/schools.
  const [paymentMethodUpdates, setPaymentMethodUpdates] = useState<
    Record<string, { method: 'stripe_subscription' | 'alipay_invoice' | 'manual_invoice'; cadence: 'monthly' | 'annual' }>
  >({});
  // Phase C inbound payments — ⚡ Record incoming wire modal state. Only
  // opened from manual_invoice schools (separate state from paymentConfigSchool
  // so opening the wire-record modal doesn't conflict with editing the rail).
  const [recordWireSchool, setRecordWireSchool] = useState<{ id: string; name: string } | null>(null);

  const getEffectiveOverride = (school: School): number | null => {
    if (school.id in billingOverrideUpdates) {
      return billingOverrideUpdates[school.id].override;
    }
    const raw = school.billing_override_usd;
    if (raw === null || raw === undefined) return null;
    return typeof raw === 'string' ? Number(raw) : raw;
  };

  // AI tier change handler (free / premium)
  const handleTierChange = useCallback(async (school: School, newTier: 'free' | 'premium') => {
    if (!sessionToken) return;
    const currentTier = tierOverrides[school.id] ?? school.ai_tier ?? 'free';
    if (newTier === currentTier) return;

    // Optimistic update
    setTierOverrides(prev => ({ ...prev, [school.id]: newTier }));
    setTogglingAi(prev => new Set([...prev, school.id]));
    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({ schoolId: school.id, ai_tier: newTier }),
      });
      if (!res.ok) {
        // Revert on failure
        setTierOverrides(prev => { const next = { ...prev }; delete next[school.id]; return next; });
        throw new Error('Failed');
      }
    } catch (err) {
      console.error('AI tier change failed:', err);
    } finally {
      setTogglingAi(prev => { const next = new Set(prev); next.delete(school.id); return next; });
    }
  }, [sessionToken, tierOverrides]);

  // Filter + sort
  const filteredSchools = useMemo(() => {
    let result = schools;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.owner_name || '').toLowerCase().includes(q) ||
        (s.owner_email || '').toLowerCase().includes(q) ||
        (s.slug || '').toLowerCase().includes(q) ||
        (s.login_codes || []).some(code => code.toLowerCase().includes(q))
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'students':
          cmp = (a.student_count || 0) - (b.student_count || 0);
          break;
        case 'last_active':
          cmp = (a.last_active_at || '').localeCompare(b.last_active_at || '');
          break;
        case 'cost':
          cmp = (a.api_spent_this_month || 0) - (b.api_spent_this_month || 0);
          break;
        case 'created':
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [schools, search, sortField, sortDir]);

  const emptySchools = useMemo(() => schools.filter(s => (s.student_count || 0) === 0), [schools]);
  const inactiveSchools = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return schools.filter(s => !s.last_active_at || s.last_active_at < thirtyDaysAgo);
  }, [schools]);
  const agentReferredSchools = useMemo(() => schools.filter(s => Boolean(s.agent)), [schools]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filteredSchools.map(s => s.id)));
  const selectNone = () => setSelected(new Set());
  const selectEmpty = () => setSelected(new Set(emptySchools.map(s => s.id)));
  const selectInactive = () => setSelected(new Set(inactiveSchools.map(s => s.id)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  };

  const handleBatchDelete = () => {
    if (selected.size === 0) return;
    setShowConfirm(true);
    setConfirmText('');
  };

  const confirmBatchDelete = () => {
    if (confirmText !== 'DELETE') return;
    setShowConfirm(false);
    setConfirmText('');
    onBatchDelete(Array.from(selected));
    setSelected(new Set());
  };

  const selectedSchools = schools.filter(s => selected.has(s.id));
  const totalStudentsSelected = selectedSchools.reduce((sum, s) => sum + (s.student_count || 0), 0);

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">Empty (0 students)</p>
          <p className="text-2xl font-bold text-red-400">{emptySchools.length}</p>
        </div>
      </div>

      {/* Search + Quick Select + Batch Delete */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search schools, owners, login codes..."
          className="flex-1 min-w-[200px] px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
        />
        <div className="flex gap-1">
          <button onClick={selectAll} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600">All</button>
          <button onClick={selectNone} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600">None</button>
          <button onClick={selectEmpty} className="px-3 py-1.5 bg-red-900/40 text-red-400 rounded-lg text-xs hover:bg-red-900/60 border border-red-800/50">
            Empty ({emptySchools.length})
          </button>
          <button onClick={selectInactive} className="px-3 py-1.5 bg-amber-900/40 text-amber-400 rounded-lg text-xs hover:bg-amber-900/60 border border-amber-800/50">
            Inactive 30d+ ({inactiveSchools.length})
          </button>
          {agentReferredSchools.length > 0 && (
            <button
              onClick={() => setSelected(new Set(agentReferredSchools.map(s => s.id)))}
              className="px-3 py-1.5 bg-amber-900/30 text-amber-300 rounded-lg text-xs hover:bg-amber-900/50 border border-amber-700/40"
              title="Schools referred by an agent"
            >
              🤝 Agent-referred ({agentReferredSchools.length})
            </button>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={handleBatchDelete}
            disabled={batchDeleting}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {batchDeleting ? 'Deleting...' : `Delete Selected (${selected.size})`}
          </button>
        )}
      </div>

      {/* Batch Delete Progress */}
      {batchDeleteProgress && (
        <div className="mb-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm font-medium">
              {batchDeleteProgress.completed < batchDeleteProgress.total
                ? `Deleting ${batchDeleteProgress.completed}/${batchDeleteProgress.total}...`
                : `Done — ${batchDeleteProgress.results.filter(r => r.success).length} deleted`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">
                {Math.round((batchDeleteProgress.completed / batchDeleteProgress.total) * 100)}%
              </span>
              {batchDeleteProgress.completed >= batchDeleteProgress.total && (
                <button onClick={onClearBatchProgress} className="text-slate-400 hover:text-white text-xs">✕</button>
              )}
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(batchDeleteProgress.completed / batchDeleteProgress.total) * 100}%` }}
            />
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {batchDeleteProgress.results.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span>{r.success ? '✅' : '❌'}</span>
                <span className={r.success ? 'text-slate-400' : 'text-red-400'}>{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-red-500/50 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-red-400 mb-4">
              Delete {selected.size} School{selected.size > 1 ? 's' : ''}?
            </h3>
            <div className="mb-4 space-y-1 max-h-48 overflow-y-auto">
              {selectedSchools.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm py-1 px-2 bg-slate-700/50 rounded">
                  <span className="text-white">{s.name}</span>
                  <span className="text-slate-400">{s.student_count || 0} students</span>
                </div>
              ))}
            </div>
            <p className="text-red-300 text-sm mb-4">
              This will permanently delete {totalStudentsSelected} students, all classrooms, teachers, progress data, photos, and AI interactions.
            </p>
            <div className="mb-4">
              <label className="text-slate-400 text-xs block mb-1">Type DELETE to confirm</label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-red-500 outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && confirmBatchDelete()}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(''); }}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={confirmText !== 'DELETE'}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
              >
                Delete {selected.size} Schools
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schools Table */}
      {loading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
            <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
          </div>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          {search ? (
            <>
              <span className="text-5xl block mb-4">🔍</span>
              <h2 className="text-xl font-semibold text-white mb-2">No schools match &ldquo;{search}&rdquo;</h2>
              <button onClick={() => setSearch('')} className="text-emerald-400 hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <span className="text-5xl block mb-4">📭</span>
              <h2 className="text-xl font-semibold text-white mb-2">No schools registered yet</h2>
              <Link
                href="/montree/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
              >
                Register First School
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={filteredSchools.length > 0 && filteredSchools.every(s => selected.has(s.id))}
                      onChange={e => {
                        if (e.target.checked) setSelected(new Set([...selected, ...filteredSchools.map(s => s.id)]));
                        else setSelected(new Set([...selected].filter(id => !filteredSchools.find(s => s.id === id))));
                      }}
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500"
                    />
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('name')}>
                    School {sortIcon('name')}
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm">Location</th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-center p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('students')}>
                    Students {sortIcon('students')}
                  </th>
                  <th className="text-left p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('last_active')}>
                    Last Active {sortIcon('last_active')}
                  </th>
                  <th className="text-center p-3 text-slate-400 font-medium text-sm cursor-pointer select-none" onClick={() => handleSort('cost')}>
                    AI {sortIcon('cost')}
                  </th>
                  <th className="text-right p-3 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredSchools.map((school) => {
                  const activity = getActivityBadge(school.last_active_at || null);
                  const isSelected = selected.has(school.id);

                  return (
                    <tr key={school.id} className={`hover:bg-slate-800/50 ${isSelected ? 'bg-red-500/5' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(school.id)}
                          className="w-4 h-4 rounded bg-slate-600 border-slate-500"
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {school.subscription_tier === 'free' ? '🌍' :
                             school.subscription_tier === 'paid' ? '⭐' : '🎓'}
                          </span>
                          <div className="space-y-0.5">
                            <p className="font-medium text-white text-sm">{school.name}</p>
                            {school.owner_name && (
                              <p className="text-slate-300 text-xs flex items-center gap-1.5">
                                <span aria-hidden>👤</span>
                                <span>{school.owner_name}</span>
                              </p>
                            )}
                            {school.owner_email && (
                              <p className="text-xs flex items-center gap-1.5">
                                <span aria-hidden>📧</span>
                                <a
                                  href={`mailto:${school.owner_email}`}
                                  className="text-slate-400 hover:text-emerald-400 transition-colors break-all"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {school.owner_email}
                                </a>
                              </p>
                            )}
                            {!school.owner_name && !school.owner_email && (
                              <p className="text-slate-600 text-xs italic">no contact info</p>
                            )}
                            {/* Agent attribution — who referred this school. */}
                            {school.agent && (
                              <p className="text-xs flex items-center gap-1.5">
                                <span aria-hidden>🤝</span>
                                <span className="text-amber-300/90">
                                  Agent · {school.agent.name || school.agent.email || 'unknown'}
                                  {!school.agent.is_agent && (
                                    <span className="text-slate-600 ml-1.5 italic">(not flagged is_agent)</span>
                                  )}
                                </span>
                              </p>
                            )}
                            {/* Phase 4 — Stripe billing indicator. Only rendered
                                when there's something to say (school has a Stripe
                                subscription_id or status is meaningful). */}
                            {(school.stripe_subscription_id || (school.subscription_status && ['active', 'trialing', 'past_due', 'canceled'].includes(school.subscription_status))) && (
                              <p className="text-xs flex items-center gap-1.5">
                                <span aria-hidden>💳</span>
                                {school.stripe_customer_id ? (
                                  <a
                                    href={`https://dashboard.stripe.com/customers/${school.stripe_customer_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open this customer in the Stripe Dashboard"
                                    className={`hover:underline ${
                                      school.subscription_status === 'active' ? 'text-emerald-400 hover:text-emerald-300' :
                                      school.subscription_status === 'trialing' ? 'text-amber-300 hover:text-amber-200' :
                                      school.subscription_status === 'past_due' ? 'text-red-400 hover:text-red-300' :
                                      school.subscription_status === 'canceled' ? 'text-slate-500 hover:text-slate-400' :
                                      'text-slate-400 hover:text-slate-300'
                                    }`}
                                  >
                                    {school.subscription_status === 'active' ? 'Stripe — active' :
                                     school.subscription_status === 'trialing' ? 'Stripe — trial' :
                                     school.subscription_status === 'past_due' ? 'Stripe — past due' :
                                     school.subscription_status === 'canceled' ? 'Stripe — canceled' :
                                     'Stripe — pending'}
                                    {school.billing_quantity !== null && school.billing_quantity !== undefined && (
                                      <span className="text-slate-500"> · qty {school.billing_quantity}</span>
                                    )}
                                    {' 🔗'}
                                  </a>
                                ) : (
                                  <span className={
                                    school.subscription_status === 'active' ? 'text-emerald-400' :
                                    school.subscription_status === 'trialing' ? 'text-amber-300' :
                                    school.subscription_status === 'past_due' ? 'text-red-400' :
                                    school.subscription_status === 'canceled' ? 'text-slate-500' :
                                    'text-slate-400'
                                  }>
                                    {school.subscription_status === 'active' ? 'Stripe — active' :
                                     school.subscription_status === 'trialing' ? 'Stripe — trial' :
                                     school.subscription_status === 'past_due' ? 'Stripe — past due' :
                                     school.subscription_status === 'canceled' ? 'Stripe — canceled' :
                                     'Stripe — pending'}
                                    {school.billing_quantity !== null && school.billing_quantity !== undefined && (
                                      <span className="text-slate-500"> · qty {school.billing_quantity}</span>
                                    )}
                                  </span>
                                )}
                              </p>
                            )}
                            {(school.login_codes_labelled && school.login_codes_labelled.length > 0) ? (
                              <div className="text-xs flex items-start gap-1.5">
                                <span aria-hidden className="text-slate-500 mt-0.5">🔑</span>
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {school.login_codes_labelled.map((entry) => {
                                    const roleLabel =
                                      entry.role === 'agent'
                                        ? 'Agent'
                                        : entry.role === 'principal'
                                          ? 'Principal'
                                          : entry.role === 'lead_teacher'
                                            ? 'Lead'
                                            : entry.role === 'assistant_teacher'
                                              ? 'Assistant'
                                              : 'Teacher';
                                    const roleColor =
                                      entry.role === 'agent'
                                        ? 'text-amber-300'
                                        : entry.role === 'principal'
                                          ? 'text-amber-400'
                                          : entry.role === 'lead_teacher'
                                            ? 'text-emerald-400'
                                            : entry.role === 'assistant_teacher'
                                              ? 'text-slate-400'
                                              : 'text-slate-300';
                                    // Agent chips get a subtle amber border so they
                                    // visually anchor as "the founder" alongside the
                                    // principal/teacher chips.
                                    const chipChrome =
                                      entry.role === 'agent'
                                        ? 'border-amber-700/40 bg-amber-900/15'
                                        : 'border-slate-700/50 bg-slate-800/40';
                                    return (
                                      <span
                                        key={`${entry.code}-${entry.role}-${entry.name}`}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${chipChrome}`}
                                        title={`${roleLabel}: ${entry.name}${entry.pct != null ? ` · ${entry.pct}%` : ''}${entry.active ? '' : ' (inactive)'}`}
                                      >
                                        <span className={`font-medium ${roleColor}`}>{roleLabel}</span>
                                        <span className="text-slate-500">·</span>
                                        <span className="text-slate-300 max-w-[140px] truncate">{entry.name}</span>
                                        <span className="text-slate-500">·</span>
                                        <span className="font-mono text-slate-400">{entry.code}</span>
                                        {entry.role === 'agent' && entry.pct != null && (
                                          <>
                                            <span className="text-slate-500">·</span>
                                            <span className="text-amber-400 font-medium">{entry.pct}%</span>
                                          </>
                                        )}
                                        {!entry.active && (
                                          <span className="text-slate-600 text-[10px] uppercase tracking-wide">inactive</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (school.login_codes || []).length > 0 ? (
                              // Backward-compat: if labelled list isn't available, fall back to flat list
                              <p className="text-slate-600 text-xs font-mono flex items-center gap-1.5">
                                <span aria-hidden>🔑</span>
                                <span>{(school.login_codes || []).join(', ')}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">
                            {getCountryFlag(school.signup_country_code || null)}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {school.signup_city || school.signup_country || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        {editingSchool === school.id ? (
                          <div className="flex gap-1">
                            {['trial', 'free', 'paid'].map(tier => (
                              <button
                                key={tier}
                                onClick={() => onUpdateStatus(school.id, tier)}
                                className={`px-2 py-0.5 text-xs rounded ${getTierColor(tier)} hover:opacity-80`}
                              >
                                {tier === 'free' ? 'Free' : tier === 'paid' ? 'Paid' : 'Trial'}
                              </button>
                            ))}
                            <button onClick={() => setEditingSchool(null)} className="px-1.5 py-0.5 text-xs rounded bg-slate-700 text-slate-400">✕</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingSchool(school.id)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(school.subscription_tier || 'trial')} hover:opacity-80`}
                          >
                            {school.subscription_tier === 'free' ? 'Free' :
                             school.subscription_tier === 'paid' ? 'Paid' : 'Trial'}
                            <span className="ml-1 opacity-50">✎</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-medium ${(school.student_count || 0) === 0 ? 'text-red-400' : 'text-white'}`}>
                          {school.student_count || 0}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">
                          ({school.classroom_count || 0}c / {school.teacher_count || 0}t)
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${activity.dot}`} />
                          <span className={`text-xs ${activity.color}`}>{activity.label}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {(() => {
                          const tier = tierOverrides[school.id] ?? school.ai_tier ?? 'free';
                          const spent = school.api_spent_this_month || 0;
                          const calls = school.api_calls_this_month || 0;
                          const toggling = togglingAi.has(school.id);
                          const tiers: Array<{ key: 'free' | 'premium'; label: string; color: string; activeColor: string }> = [
                            { key: 'free', label: 'Free', color: 'text-slate-500', activeColor: 'bg-slate-600 text-white' },
                            { key: 'premium', label: 'Pro', color: 'text-violet-400', activeColor: 'bg-violet-600 text-white' },
                          ];
                          return (
                            <div className="flex flex-col items-center gap-1">
                              <div className={`inline-flex rounded-full border border-slate-700 overflow-hidden ${toggling ? 'opacity-50 pointer-events-none' : ''}`}>
                                {tiers.map(t => (
                                  <button
                                    key={t.key}
                                    onClick={() => handleTierChange(school, t.key)}
                                    className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${tier === t.key ? t.activeColor : `${t.color} hover:bg-slate-700/50`}`}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                              {/* Always render spend so $0 schools are visibly tracked,
                                  not invisibly tracked. Previously this gated on spent>0
                                  which made the column look broken for new schools and
                                  for the first day of a new calendar month. */}
                              <span
                                title="API spend this month (resets the 1st of each month)"
                                className={`text-xs font-mono ${spent > 5 ? 'text-red-400' : spent > 1 ? 'text-amber-400' : spent > 0 ? 'text-slate-300' : 'text-slate-500'}`}
                              >
                                ${spent < 0.01 && spent > 0 ? spent.toFixed(4) : spent.toFixed(2)}
                              </span>
                              <span className="text-slate-500 text-[10px]">{calls} {calls === 1 ? 'call' : 'calls'}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPrincipalsSchool({ id: school.id, name: school.name })}
                            className="px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-xs font-medium"
                            title="Manage principals"
                          >
                            👤
                          </button>
                          <button
                            onClick={() => setFeaturesSchool({ id: school.id, name: school.name })}
                            className="px-2 py-1 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded text-xs font-medium"
                            title="Feature flags"
                          >
                            ⚙️
                          </button>
                          {(() => {
                            const effOverride = getEffectiveOverride(school);
                            const hasOverride = effOverride !== null;
                            return (
                              <button
                                onClick={() => setOverrideSchool({
                                  id: school.id,
                                  name: school.name,
                                  current: effOverride,
                                  note: (school.id in billingOverrideUpdates ? billingOverrideUpdates[school.id].note : school.billing_override_note) ?? null,
                                })}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  hasOverride
                                    ? 'bg-amber-500/30 text-amber-300 hover:bg-amber-500/40'
                                    : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60'
                                }`}
                                title={hasOverride
                                  ? `Billing override: $${Number(effOverride).toFixed(2)}/student/month`
                                  : 'Set per-school billing override'}
                              >
                                💲{hasOverride && (
                                  <span className="ml-1 tabular-nums">${Number(effOverride).toFixed(2)}</span>
                                )}
                              </button>
                            );
                          })()}
                          {/* Phase A inbound payments — payment-method config.
                              Click opens PaymentConfigModal where super-admin
                              can flip the rail (stripe_subscription /
                              alipay_invoice / manual_invoice) + cadence
                              (monthly / annual). Color hint:
                                stripe_subscription → indigo (Western default)
                                alipay_invoice      → red    (China rail)
                                manual_invoice      → amber  (manual wire)
                              Phase C: for manual_invoice schools, a second
                              ⚡ button surfaces to record an incoming wire. */}
                          {(() => {
                            const effMethod =
                              paymentMethodUpdates[school.id]?.method ||
                              school.payment_method ||
                              'stripe_subscription';
                            const effCadence =
                              paymentMethodUpdates[school.id]?.cadence ||
                              school.billing_cadence ||
                              'monthly';
                            const chrome =
                              effMethod === 'alipay_invoice'
                                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                : effMethod === 'manual_invoice'
                                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                  : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30';
                            const railLabel =
                              effMethod === 'alipay_invoice'
                                ? 'Alipay'
                                : effMethod === 'manual_invoice'
                                  ? 'Manual'
                                  : 'Stripe';
                            const isManual = effMethod === 'manual_invoice';
                            return (
                              <>
                                <button
                                  onClick={() => setPaymentConfigSchool({ id: school.id, name: school.name })}
                                  className={`px-2 py-1 rounded text-xs font-medium ${chrome}`}
                                  title={`Payment rail: ${railLabel} · ${effCadence === 'annual' ? 'Annual' : 'Monthly'}`}
                                >
                                  💳<span className="ml-1 text-[10px] uppercase tracking-wide">{railLabel}</span>
                                  {effCadence === 'annual' && (
                                    <span className="ml-1 text-[10px] opacity-70">·Yr</span>
                                  )}
                                </button>
                                {isManual && (
                                  <button
                                    onClick={() => setRecordWireSchool({ id: school.id, name: school.name })}
                                    className="px-2 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded text-xs font-medium"
                                    title="Record incoming SWIFT wire from this school"
                                  >
                                    ⚡<span className="ml-1 text-[10px] uppercase tracking-wide">Wire</span>
                                  </button>
                                )}
                              </>
                            );
                          })()}
                          <button
                            onClick={() => onLoginAs(school.id)}
                            className="px-2 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded text-xs font-medium"
                          >
                            Login →
                          </button>
                          <button
                            onClick={() => onDeleteSchool(school)}
                            className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Feature toggles modal */}
      {featuresSchool && sessionToken && (
        <SchoolFeaturesModal
          schoolId={featuresSchool.id}
          schoolName={featuresSchool.name}
          sessionToken={sessionToken}
          onClose={() => setFeaturesSchool(null)}
        />
      )}

      {/* Principals management modal */}
      {principalsSchool && sessionToken && (
        <PrincipalsModal
          schoolId={principalsSchool.id}
          schoolName={principalsSchool.name}
          sessionToken={sessionToken}
          onClose={() => setPrincipalsSchool(null)}
        />
      )}

      {/* Per-school billing override modal (migration 202). Sets the rate
          for this specific school, overriding the platform default. */}
      {overrideSchool && sessionToken && (
        <BillingOverrideModal
          schoolId={overrideSchool.id}
          schoolName={overrideSchool.name}
          currentOverrideUsd={overrideSchool.current}
          currentNote={overrideSchool.note}
          defaultPriceUsd={PLATFORM_DEFAULT_PRICE_USD}
          sessionToken={sessionToken}
          onClose={() => setOverrideSchool(null)}
          onSaved={(override, note) => {
            // Optimistic local update so the row reflects the new override
            // immediately (matches the tierOverrides pattern above). Next
            // page reload pulls canonical values from the API.
            if (overrideSchool) {
              setBillingOverrideUpdates(prev => ({
                ...prev,
                [overrideSchool.id]: { override, note },
              }));
            }
          }}
        />
      )}

      {/* Phase A inbound payments — payment-method + cadence config (migration 209).
          Super-admin flips the rail (Stripe / Alipay / Manual) and cadence
          (monthly / annual). PATCH route refuses silent flip away from active
          stripe_subscription; modal surfaces the warning and a force-confirm. */}
      {paymentConfigSchool && sessionToken && (
        <PaymentConfigModal
          schoolId={paymentConfigSchool.id}
          schoolName={paymentConfigSchool.name}
          sessionToken={sessionToken}
          onClose={() => setPaymentConfigSchool(null)}
          onSaved={(method, cadence) => {
            if (paymentConfigSchool) {
              setPaymentMethodUpdates(prev => ({
                ...prev,
                [paymentConfigSchool.id]: { method, cadence },
              }));
            }
          }}
        />
      )}

      {/* Phase C inbound payments — ⚡ Record incoming wire (manual_invoice rail).
          Captures wire_ref + amount + FX + paid_at + notes, calls record-incoming-wire
          route which: writes income row(s) to montree_finance_transactions
          (12 monthly rows for annual cadence per rule #86), flips subscription_status
          to active, bumps current_period_end forward, flips AI tier to premium.
          Idempotent on wire_ref via source_ref='inbound_wire:<ref>'. */}
      {recordWireSchool && sessionToken && (
        <RecordIncomingWireModal
          schoolId={recordWireSchool.id}
          schoolName={recordWireSchool.name}
          token={sessionToken}
          onClose={() => setRecordWireSchool(null)}
          onRecorded={() => {
            // Modal close handles itself. The row's status/period will reflect
            // canonical state on next page load. Optimistic update not needed
            // here since the change is bookkeeping, not visible identity.
            setRecordWireSchool(null);
          }}
        />
      )}
    </>
  );
}
