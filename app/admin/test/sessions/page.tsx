// app/admin/test/sessions/page.tsx
// All assessment sessions list with filters

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, Filter, Trash2 } from 'lucide-react';

interface Session {
  id: string;
  child_id: string;
  child_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  overall_percentage: number | null;
  overall_level: string | null;
  total_score: number;
  total_possible: number;
}

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/assessment/sessions?limit=100');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this test session?')) return;
    
    try {
      await fetch(`/api/assessment/sessions/${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'proficient': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'developing': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'emerging': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredSessions = sessions
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => s.child_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🐋</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link 
            href="/admin/test"
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">All Test Sessions</h1>
            <p className="text-gray-400 text-sm">{sessions.length} total sessions</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex gap-2">
            {(['all', 'completed', 'in_progress'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === f 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'completed' ? '✅ Completed' : '⏳ In Progress'}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-750 border-b border-gray-700">
              <tr>
                <th className="text-left p-4 font-medium text-gray-400">Child</th>
                <th className="text-left p-4 font-medium text-gray-400">Date</th>
                <th className="text-left p-4 font-medium text-gray-400">Status</th>
                <th className="text-left p-4 font-medium text-gray-400">Score</th>
                <th className="text-left p-4 font-medium text-gray-400">Level</th>
                <th className="text-right p-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-750 transition-colors">
                    <td className="p-4">
                      <Link 
                        href={`/admin/test/sessions/${session.id}`}
                        className="font-medium hover:text-blue-400 transition-colors"
                      >
                        {session.child_name}
                      </Link>
                    </td>
                    <td className="p-4 text-gray-400">
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        session.status === 'completed' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {session.status === 'completed' ? '✅' : '⏳'} {session.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {session.status === 'completed' ? (
                        <span className="font-mono">
                          {session.total_score}/{session.total_possible}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {session.overall_level ? (
                        <span className={`px-2 py-1 rounded-full text-sm border ${getLevelColor(session.overall_level)}`}>
                          {session.overall_percentage}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/test/sessions/${session.id}`}
                          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    <div className="text-4xl mb-2">📝</div>
                    <p>No sessions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
