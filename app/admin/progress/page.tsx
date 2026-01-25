'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
}

interface ProgressStats {
  completed: number;
  inProgress: number;
  totalWorks: number;
  percentComplete: number;
  areaProgress: {
    name: string;
    color: string;
    completed: number;
    total: number;
    percent: number;
  }[];
}

export default function ProgressDashboard() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [view, setView] = useState<'overview' | 'montree' | 'curriculum'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchStats(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/whale/children');
      
      if (!res.ok) throw new Error('Failed to fetch children');
      
      const data = await res.json();
      const childrenList = data.children || data.data || [];
      setChildren(childrenList);
      
      if (childrenList[0]) {
        setSelectedChild(childrenList[0].id);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (childId: string) => {
    try {
      setStatsLoading(true);
      const res = await fetch(`/api/whale/children/${childId}/progress`);
      
      if (!res.ok) throw new Error('Failed to fetch progress');
      
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      
    >
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">📊 Progress Tracking</h1>
            </div>
            
            {/* Child Selector */}
            {children.length > 0 && (
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="border rounded-lg px-4 py-2"
              >
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { key: 'overview', label: '📋 Overview' },
              { key: 'montree', label: '🌳 Montree View' },
              { key: 'curriculum', label: '📚 Curriculum' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key as any)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  view === tab.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
            <button onClick={fetchChildren} className="ml-4 underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" />
          </div>
        ) : children.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-xl font-bold mb-2">No Children Found</h2>
            <p className="text-gray-500 mb-4">Add children first to track progress</p>
            <Link href="/admin/children" className="text-emerald-600 underline">
              Go to Children Page
            </Link>
          </div>
        ) : (
          <>
            {view === 'overview' && (
              <OverviewTab stats={stats} loading={statsLoading} />
            )}
            {view === 'montree' && selectedChild && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">🌳 Montree Progress View</h2>
                <Link 
                  href={`/admin/montree-progress?child=${selectedChild}`}
                  className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  Open Full Montree View →
                </Link>
              </div>
            )}
            {view === 'curriculum' && selectedChild && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">📚 Curriculum Progress</h2>
                <Link 
                  href={`/admin/child-progress/${selectedChild}`}
                  className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  Open Detailed Progress View →
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function OverviewTab({ stats, loading }: { stats: ProgressStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        No progress data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-gray-500">Completed Works</div>
        </div>
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔄</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
          <div className="text-gray-500">In Progress</div>
        </div>
        <div className="bg-white rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">📈</div>
          <div className="text-3xl font-bold text-blue-600">{stats.percentComplete}%</div>
          <div className="text-gray-500">Overall Progress</div>
        </div>
      </div>

      {/* Area Progress */}
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Progress by Area</h3>
        <div className="space-y-3">
          {stats.areaProgress.map((area) => (
            <div key={area.name}>
              <div className="flex justify-between text-sm mb-1">
                <span>{area.name}</span>
                <span>{area.completed}/{area.total} ({area.percent}%)</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${area.percent}%`,
                    backgroundColor: area.color 
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
