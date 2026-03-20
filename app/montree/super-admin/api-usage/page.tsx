'use client';
// @ts-nocheck
// Super-Admin API Usage Dashboard
// Shows per-school AI cost breakdown, budget management, daily trends

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function ApiUsageDashboard() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSchool, setExpandedSchool] = useState(null);
  const [editingBudget, setEditingBudget] = useState(null);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  // Auth gate
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
    } catch { alert('Auth failed'); }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('sa_pwd');
    if (saved) { setPassword(saved); setAuthenticated(true); }
  }, []);

  // Fetch all schools' usage
  const fetchUsage = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch(`/api/montree/super-admin/schools?password=${encodeURIComponent(pwd)}`);
      if (!res.ok) throw new Error('Failed to fetch schools');
      const data = await res.json();
      const schoolList = data.schools || [];

      // Fetch usage for each school (parallel, max 10)
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
      // Sort by spend descending
      results.sort((a, b) => (b.usage?.summary?.spent || 0) - (a.usage?.summary?.spent || 0));
      setSchools(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, password]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4">API Usage Dashboard</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Super admin password" className="w-full p-3 border rounded-lg mb-4" autoFocus />
          <button onClick={handleLogin} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700">
            Access Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalSpend = schools.reduce((sum, s) => sum + (s.usage?.summary?.spent || 0), 0);
  const totalRequests = schools.reduce((sum, s) => sum + (s.usage?.summary?.request_count || 0), 0);

  const getBarColor = (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-orange-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (pct) => {
    if (pct >= 100) return 'text-red-600 font-bold';
    if (pct >= 80) return 'text-orange-600 font-semibold';
    return 'text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/montree/super-admin" className="text-indigo-600 text-sm hover:underline mb-1 block">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-900">API Usage & Budgets</h1>
          </div>
          <button onClick={fetchUsage} className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Total Spend (This Month)</p>
            <p className="text-3xl font-bold text-gray-900">${totalSpend.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Total API Calls</p>
            <p className="text-3xl font-bold text-gray-900">{totalRequests.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Active Schools</p>
            <p className="text-3xl font-bold text-gray-900">{schools.filter(s => (s.usage?.summary?.request_count || 0) > 0).length}</p>
          </div>
        </div>

        {loading && <p className="text-center text-gray-500 py-8">Loading usage data...</p>}
        {error && <p className="text-center text-red-500 py-8">{error}</p>}

        {/* School Table */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">School</th>
                  <th className="text-right p-4 font-semibold">Spend</th>
                  <th className="text-right p-4 font-semibold">Budget</th>
                  <th className="text-center p-4 font-semibold">Usage</th>
                  <th className="text-center p-4 font-semibold">Action</th>
                  <th className="text-right p-4 font-semibold">Requests</th>
                </tr>
              </thead>
              <tbody>
                {schools.map(school => {
                  const usage = school.usage?.summary || {};
                  const pct = Number(usage.percentage) || 0;
                  const isExpanded = expandedSchool === school.id;

                  return (
                    <tr key={school.id} className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedSchool(isExpanded ? null : school.id)}>
                      <td className="p-4">
                        <p className="font-medium text-gray-900">{school.name || 'Unnamed School'}</p>
                        <p className="text-xs text-gray-400">{school.id?.slice(0, 8)}</p>
                      </td>
                      <td className={`p-4 text-right ${getTextColor(pct)}`}>
                        ${(Number(usage.spent) || 0).toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-gray-600">
                        ${(Number(usage.budget) || 50).toFixed(0)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                            <div className={`h-2.5 rounded-full ${getBarColor(pct)}`}
                              style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-xs w-12 text-right ${getTextColor(pct)}`}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          usage.action === 'hard_limit' ? 'bg-red-100 text-red-700' :
                          usage.action === 'soft_limit' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {usage.action || 'warn'}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-600">
                        {(Number(usage.request_count) || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {schools.length === 0 && !loading && (
              <p className="text-center text-gray-400 py-12">No schools found</p>
            )}
          </div>
        )}

        {/* Expanded classroom breakdown */}
        {expandedSchool && (() => {
          const school = schools.find(s => s.id === expandedSchool);
          const classrooms = school?.usage?.classrooms || [];
          const daily = school?.usage?.daily || [];
          return (
            <div className="mt-4 bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">
                {school?.name} — Classroom Breakdown
              </h3>

              {classrooms.length === 0 ? (
                <p className="text-gray-400 text-sm">No usage data yet</p>
              ) : (
                <div className="space-y-3">
                  {classrooms.map((c, i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{c.classroom_name || 'Unknown Classroom'}</span>
                        <span className="font-semibold text-gray-900">${Number(c.spent).toFixed(4)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(c.by_endpoint || []).map((ep, j) => (
                          <span key={j} className="text-xs bg-gray-100 px-2 py-1 rounded">
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
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Daily Spend (Last 30 Days)</h4>
                  <div className="flex items-end gap-1 h-24">
                    {daily.map((d, i) => {
                      const maxCost = Math.max(...daily.map(x => x.cost), 0.01);
                      const height = Math.max((d.cost / maxCost) * 100, 2);
                      return (
                        <div key={i} className="flex-1 group relative">
                          <div className="bg-indigo-400 rounded-t" style={{ height: `${height}%` }}
                            title={`${d.date}: $${d.cost.toFixed(4)} (${d.count} calls)`} />
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
