'use client';
// @ts-nocheck
// Super-Admin API Usage Dashboard
// Per-school AI cost breakdown, budget management, daily trends.
// Session 97 — converted from legacy white theme to dark forest, matching
// the rest of /montree/super-admin/* surfaces.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function ApiUsageDashboard() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSchool, setExpandedSchool] = useState(null);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        sessionStorage.setItem('sa_pwd', password);
      } else {
        alert('Wrong password');
      }
    } catch {
      alert('Auth failed');
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('sa_pwd');
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch(`/api/montree/super-admin/schools?password=${encodeURIComponent(pwd)}`);
      if (!res.ok) throw new Error('Failed to fetch schools');
      const data = await res.json();
      const schoolList = data.schools || [];

      const usagePromises = schoolList.slice(0, 50).map(async (school) => {
        try {
          const usageRes = await fetch(`/api/montree/admin/ai-budget?school_id=${school.id}`, {
            headers: { 'x-school-id': school.id },
          });
          if (!usageRes.ok) return { ...school, usage: null };
          const usageData = await usageRes.json();
          return { ...school, usage: usageData };
        } catch {
          return { ...school, usage: null };
        }
      });

      const results = await Promise.all(usagePromises);
      results.sort((a, b) => (b.usage?.summary?.spent || 0) - (a.usage?.summary?.spent || 0));
      setSchools(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, password]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl shadow-lg p-8 max-w-sm w-full backdrop-blur">
          <h1 className="text-xl font-semibold text-white mb-4">API Usage Dashboard</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Super admin password"
            className="w-full p-3 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-lg mb-4 focus:border-emerald-500 outline-none"
            autoFocus
          />
          <button
            onClick={handleLogin}
            className="w-full bg-emerald-500 text-slate-900 py-3 rounded-lg font-semibold hover:bg-emerald-400 transition"
          >
            Access dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalSpend = schools.reduce((sum, s) => sum + (s.usage?.summary?.spent || 0), 0);
  const totalRequests = schools.reduce((sum, s) => sum + (s.usage?.summary?.request_count || 0), 0);
  const activeSchools = schools.filter((s) => (s.usage?.summary?.request_count || 0) > 0).length;

  const getBarColor = (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-orange-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (pct) => {
    if (pct >= 100) return 'text-red-400 font-semibold';
    if (pct >= 80) return 'text-orange-400 font-semibold';
    return 'text-slate-200';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/montree/super-admin"
              className="text-emerald-400 text-sm hover:text-emerald-300 transition mb-2 inline-block"
            >
              ← Back to super admin
            </Link>
            <h1 className="text-3xl font-light tracking-tight text-white" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              API Usage &amp; Budgets
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Per-school AI spend this month. Click any row for the breakdown.
            </p>
          </div>
          <button
            onClick={fetchUsage}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 hover:border-emerald-500/40 hover:text-emerald-300 transition"
          >
            Refresh
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatTile label="Total spend (this month)" value={`$${totalSpend.toFixed(2)}`} accent="text-emerald-400" />
          <StatTile label="Total API calls" value={totalRequests.toLocaleString()} accent="text-slate-100" />
          <StatTile label="Active schools" value={String(activeSchools)} accent="text-amber-300" />
        </div>

        {loading && <p className="text-center text-slate-400 py-8">Loading usage data…</p>}
        {error && <p className="text-center text-red-400 py-8">{error}</p>}

        {/* School table */}
        {!loading && (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden backdrop-blur">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 border-b border-slate-700">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-400">School</th>
                  <th className="text-right p-4 font-medium text-slate-400">Spend</th>
                  <th className="text-right p-4 font-medium text-slate-400">Budget</th>
                  <th className="text-center p-4 font-medium text-slate-400">Usage</th>
                  <th className="text-center p-4 font-medium text-slate-400">Action</th>
                  <th className="text-right p-4 font-medium text-slate-400">Requests</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => {
                  const usage = school.usage?.summary || {};
                  const pct = Number(usage.percentage) || 0;
                  const isExpanded = expandedSchool === school.id;
                  return (
                    <tr
                      key={school.id}
                      className="border-b border-slate-700/40 hover:bg-slate-800/40 cursor-pointer transition"
                      onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                    >
                      <td className="p-4">
                        <p className="font-medium text-slate-100">{school.name || 'Unnamed school'}</p>
                        <p className="text-xs text-slate-500">{school.id?.slice(0, 8)}</p>
                      </td>
                      <td className={`p-4 text-right ${getTextColor(pct)}`}>
                        ${(Number(usage.spent) || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        ${(Number(usage.budget) || 50).toFixed(0)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-700/50 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getBarColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs w-12 text-right ${getTextColor(pct)}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            usage.action === 'hard_limit'
                              ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                              : usage.action === 'soft_limit'
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                                : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                          }`}
                        >
                          {usage.action || 'warn'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-400">
                        {(Number(usage.request_count) || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {schools.length === 0 && !loading && (
              <p className="text-center text-slate-500 py-12">No schools found</p>
            )}
          </div>
        )}

        {/* Expanded classroom breakdown */}
        {expandedSchool &&
          (() => {
            const school = schools.find((s) => s.id === expandedSchool);
            const classrooms = school?.usage?.classrooms || [];
            const daily = school?.usage?.daily || [];
            return (
              <div className="mt-4 bg-slate-800/40 border border-slate-700/60 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-medium text-white mb-4" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
                  {school?.name} — classroom breakdown
                </h3>

                {classrooms.length === 0 ? (
                  <p className="text-slate-500 text-sm">No usage data yet</p>
                ) : (
                  <div className="space-y-3">
                    {classrooms.map((c, i) => (
                      <div key={i} className="border border-slate-700/40 rounded-lg p-4 bg-slate-900/40">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-slate-200">{c.classroom_name || 'Unknown classroom'}</span>
                          <span className="font-semibold text-emerald-300">${Number(c.spent).toFixed(4)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(c.by_endpoint || []).map((ep, j) => (
                            <span
                              key={j}
                              className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-400"
                            >
                              {ep.endpoint}: {ep.count} calls (${Number(ep.cost).toFixed(4)})
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {daily.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">
                      Daily spend — last 30 days
                    </h4>
                    <div className="flex items-end gap-1 h-24">
                      {daily.map((d, i) => {
                        const maxCost = Math.max(...daily.map((x) => x.cost), 0.01);
                        const height = Math.max((d.cost / maxCost) * 100, 2);
                        return (
                          <div key={i} className="flex-1 group relative">
                            <div
                              className="bg-emerald-500/70 rounded-t hover:bg-emerald-400 transition"
                              style={{ height: `${height}%` }}
                              title={`${d.date}: $${d.cost.toFixed(4)} (${d.count} calls)`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">{label}</p>
      <p className={`text-3xl font-light ${accent}`} style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
        {value}
      </p>
    </div>
  );
}
