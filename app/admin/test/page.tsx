// app/admin/test/page.tsx
// Assessment Admin Dashboard - Overview with stats and quick actions

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Users, ClipboardList, TrendingUp, Clock } from 'lucide-react';

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  inProgressSessions: number;
  totalChildren: number;
  childrenTested: number;
  avgPercentage: number;
  recentSessions: any[];
}

export default function AssessmentAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load sessions
      const sessionsRes = await fetch('/api/assessment/sessions?limit=100');
      const sessionsData = await sessionsRes.json();
      
      // Load children
      const childrenRes = await fetch('/api/assessment/children');
      const childrenData = await childrenRes.json();

      const sessions = sessionsData.sessions || [];
      const children = childrenData.children || [];
      
      const completed = sessions.filter((s: any) => s.status === 'completed');
      const inProgress = sessions.filter((s: any) => s.status === 'in_progress');
      const childrenWithTests = children.filter((c: any) => c.assessment_count > 0);
      
      const avgPercentage = completed.length > 0
        ? completed.reduce((sum: number, s: any) => sum + (s.overall_percentage || 0), 0) / completed.length
        : 0;

      setStats({
        totalSessions: sessions.length,
        completedSessions: completed.length,
        inProgressSessions: inProgress.length,
        totalChildren: children.length,
        childrenTested: childrenWithTests.length,
        avgPercentage: Math.round(avgPercentage),
        recentSessions: sessions.slice(0, 5)
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'proficient': return 'bg-green-100 text-green-800';
      case 'developing': return 'bg-yellow-100 text-yellow-800';
      case 'emerging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelEmoji = (level: string) => {
    switch (level) {
      case 'proficient': return '🌟';
      case 'developing': return '📈';
      case 'emerging': return '🌱';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🌳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin"
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">🌳 Whale Test</h1>
              <p className="text-gray-400 text-sm">English Readiness Assessment</p>
            </div>
          </div>
          <Link
            href="/assessment"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            Start New Test
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ClipboardList className="text-blue-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Total Tests</span>
            </div>
            <p className="text-3xl font-bold">{stats?.totalSessions || 0}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="text-green-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Completed</span>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats?.completedSessions || 0}</p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="text-purple-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Children Tested</span>
            </div>
            <p className="text-3xl font-bold">{stats?.childrenTested || 0}<span className="text-lg text-gray-500">/{stats?.totalChildren || 0}</span></p>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="text-yellow-400" size={20} />
              </div>
              <span className="text-gray-400 text-sm">Avg Score</span>
            </div>
            <p className="text-3xl font-bold">{stats?.avgPercentage || 0}%</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Link 
            href="/admin/test/sessions"
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">All Sessions</h3>
                <p className="text-gray-400">View and manage test sessions</p>
              </div>
            </div>
          </Link>

          <Link 
            href="/admin/test/children"
            className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-6 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="text-4xl">👶</div>
              <div>
                <h3 className="text-xl font-bold group-hover:text-blue-400 transition-colors">Children Scores</h3>
                <p className="text-gray-400">View scores by child</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Sessions */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Tests</h2>
            <Link href="/admin/test/sessions" className="text-blue-400 hover:text-blue-300 text-sm">
              View all →
            </Link>
          </div>
          
          {stats?.recentSessions && stats.recentSessions.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {stats.recentSessions.map((session: any) => (
                <Link
                  key={session.id}
                  href={`/admin/test/sessions/${session.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {session.status === 'completed' ? '✅' : '⏳'}
                    </div>
                    <div>
                      <p className="font-medium">{session.child_name}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(session.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {session.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-sm ${getLevelColor(session.overall_level)}`}>
                        {getLevelEmoji(session.overall_level)} {session.overall_percentage}%
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>No tests yet</p>
              <Link href="/assessment" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
                Start the first test →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
