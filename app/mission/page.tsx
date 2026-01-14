'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Streaks {
  current_session_streak: number;
  longest_session_streak: number;
  total_sessions: number;
  total_wins: number;
  high_energy_count: number;
  medium_energy_count: number;
  low_energy_count: number;
  project_counts: Record<string, number>;
  current_season_name: string;
  current_season_project: string;
  consecutive_low_energy: number;
}

interface Session {
  id: string;
  session_date: string;
  energy_level: string;
  project: string;
  first_action: string;
  mission_connection: string;
  session_anchor: string | null;
  created_at: string;
}

interface Win {
  id: string;
  win_text: string;
  project: string | null;
  created_at: string;
}

type ViewMode = 'dashboard' | 'briefing' | 'win' | 'anchor';

export default function MissionPage() {
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [todaySession, setTodaySession] = useState<Session | null>(null);
  const [recentWins, setRecentWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  
  // Form states
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low'>('medium');
  const [project, setProject] = useState('whale');
  const [firstAction, setFirstAction] = useState('');
  const [missionConnection, setMissionConnection] = useState('');
  const [winText, setWinText] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/mission/status');
      const data = await res.json();
      setStreaks(data.streaks);
      setTodaySession(data.today_session);
      setRecentWins(data.recent_wins || []);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBriefing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstAction || !missionConnection) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/mission/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          energy_level: energy,
          project,
          first_action: firstAction,
          mission_connection: missionConnection,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ ' + data.message);
        setTodaySession(data.session);
        setFirstAction('');
        setMissionConnection('');
        setTimeout(() => {
          setViewMode('dashboard');
          setMessage('');
        }, 2000);
      } else {
        setMessage('❌ ' + (data.error || 'Failed'));
      }
    } catch (error) {
      setMessage('❌ Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winText) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/mission/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ win_text: winText, project }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('🏆 ' + data.message);
        setRecentWins([data.win, ...recentWins]);
        setWinText('');
        setTimeout(() => {
          setViewMode('dashboard');
          setMessage('');
        }, 2000);
      } else {
        setMessage('❌ ' + (data.error || 'Failed'));
      }
    } catch (error) {
      setMessage('❌ Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnchor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anchorText) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/mission/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: todaySession?.id,
          session_anchor: anchorText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('⚓ ' + data.message);
        setTodaySession(data.session);
        setAnchorText('');
        fetchStatus(); // Refresh streaks
        setTimeout(() => {
          setViewMode('dashboard');
          setMessage('');
        }, 2000);
      } else {
        setMessage('❌ ' + (data.error || 'Failed'));
      }
    } catch (error) {
      setMessage('❌ Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
            <span className="text-3xl animate-pulse">🎯</span>
          </div>
          <p className="text-white/70">Loading Mission Protocol...</p>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (viewMode === 'dashboard') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <span>🎯</span> Mission Protocol
          </h1>
          <p className="text-purple-300 text-sm mt-1">
            {streaks?.current_season_name || 'Build the Future'}
          </p>
        </div>

        {/* Streak Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-200 text-xs uppercase tracking-wide">Current Streak</p>
              <p className="text-3xl font-bold text-white">{streaks?.current_session_streak || 0} 🔥</p>
            </div>
            <div className="text-right">
              <p className="text-amber-200 text-xs">Best: {streaks?.longest_session_streak || 0}</p>
              <p className="text-amber-200 text-xs">Total: {streaks?.total_sessions || 0} sessions</p>
            </div>
          </div>
        </div>

        {/* Today's Session Status */}
        {todaySession && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-400 text-sm font-medium">Today's Session</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                todaySession.energy_level === 'high' ? 'bg-green-500/30 text-green-300' :
                todaySession.energy_level === 'medium' ? 'bg-yellow-500/30 text-yellow-300' :
                'bg-red-500/30 text-red-300'
              }`}>
                {todaySession.energy_level.toUpperCase()}
              </span>
            </div>
            <p className="text-white font-medium">{todaySession.project.toUpperCase()}</p>
            <p className="text-white/60 text-sm mt-1">{todaySession.first_action}</p>
            {todaySession.session_anchor ? (
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-purple-300 text-xs">⚓ Anchor:</p>
                <p className="text-white/80 text-sm">{todaySession.session_anchor}</p>
              </div>
            ) : (
              <button
                onClick={() => setViewMode('anchor')}
                className="mt-3 text-purple-400 text-sm underline"
              >
                Complete session anchor →
              </button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => setViewMode('briefing')}
            className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-4 text-center shadow-lg"
          >
            <span className="text-2xl">🌅</span>
            <p className="text-white text-xs font-medium mt-1">Briefing</p>
          </button>
          <button
            onClick={() => setViewMode('win')}
            className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-center shadow-lg"
          >
            <span className="text-2xl">🏆</span>
            <p className="text-white text-xs font-medium mt-1">Log Win</p>
          </button>
          <button
            onClick={() => setViewMode('anchor')}
            className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl p-4 text-center shadow-lg"
          >
            <span className="text-2xl">⚓</span>
            <p className="text-white text-xs font-medium mt-1">End Session</p>
          </button>
        </div>

        {/* Energy Pattern */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <h3 className="text-white/70 text-sm mb-3">Energy Pattern</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-green-500/30 rounded-lg p-2 text-center">
              <p className="text-green-300 text-lg font-bold">{streaks?.high_energy_count || 0}</p>
              <p className="text-green-300/70 text-xs">High</p>
            </div>
            <div className="flex-1 bg-yellow-500/30 rounded-lg p-2 text-center">
              <p className="text-yellow-300 text-lg font-bold">{streaks?.medium_energy_count || 0}</p>
              <p className="text-yellow-300/70 text-xs">Medium</p>
            </div>
            <div className="flex-1 bg-red-500/30 rounded-lg p-2 text-center">
              <p className="text-red-300 text-lg font-bold">{streaks?.low_energy_count || 0}</p>
              <p className="text-red-300/70 text-xs">Low</p>
            </div>
          </div>
        </div>

        {/* Project Focus */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <h3 className="text-white/70 text-sm mb-3">Project Sessions</h3>
          <div className="space-y-2">
            {Object.entries(streaks?.project_counts || {}).map(([proj, count]) => (
              <div key={proj} className="flex items-center justify-between">
                <span className="text-white/80 capitalize">{proj}</span>
                <span className="text-white font-medium">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Wins */}
        {recentWins.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-4">
            <h3 className="text-white/70 text-sm mb-3">Recent Wins 🏆</h3>
            <div className="space-y-2">
              {recentWins.slice(0, 5).map((win) => (
                <div key={win.id} className="text-white/80 text-sm py-1 border-b border-white/5 last:border-0">
                  {win.win_text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mission Reminder (fixed bottom) */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 to-transparent p-4 pt-8">
          <p className="text-center text-white/40 text-xs">
            Commerce → Schools → Land + House + Production → Freedom
          </p>
        </div>

        {/* Home Link */}
        <div className="fixed top-4 left-4">
          <Link href="/" className="text-white/50 hover:text-white/80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // Briefing Form View
  if (viewMode === 'briefing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <button onClick={() => setViewMode('dashboard')} className="text-white/50 mb-4">
          ← Back
        </button>
        
        <div className="text-center mb-6">
          <span className="text-4xl">🌅</span>
          <h1 className="text-xl font-bold text-white mt-2">Mission Briefing</h1>
        </div>

        {message && (
          <div className="bg-white/10 rounded-xl p-4 mb-4 text-center text-white">
            {message}
          </div>
        )}

        <form onSubmit={handleBriefing} className="space-y-4">
          {/* Energy Level */}
          <div>
            <label className="block text-white/70 text-sm mb-2">Energy Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEnergy(level)}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    energy === level
                      ? level === 'high' ? 'bg-green-500 text-white' :
                        level === 'medium' ? 'bg-yellow-500 text-white' :
                        'bg-red-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <div>
            <label className="block text-white/70 text-sm mb-2">Project Focus</label>
            <div className="grid grid-cols-2 gap-2">
              {['whale', 'jeffy', 'sentinel', 'guardian'].map((proj) => (
                <button
                  key={proj}
                  type="button"
                  onClick={() => setProject(proj)}
                  className={`py-3 rounded-xl font-medium transition-all ${
                    project === proj
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {proj === 'whale' ? '🐋' : proj === 'jeffy' ? '🛒' : proj === 'sentinel' ? '🛡️' : '🚨'} {proj.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* First Action */}
          <div>
            <label className="block text-white/70 text-sm mb-2">
              When I sit down, the FIRST thing I'll do is...
            </label>
            <input
              type="text"
              value={firstAction}
              onChange={(e) => setFirstAction(e.target.value)}
              placeholder="Test the login flow on mobile"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
            />
          </div>

          {/* Mission Connection */}
          <div>
            <label className="block text-white/70 text-sm mb-2">
              This matters because...
            </label>
            <textarea
              value={missionConnection}
              onChange={(e) => setMissionConnection(e.target.value)}
              placeholder="Teachers need a system that works in their hands"
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !firstAction || !missionConnection}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {submitting ? 'Starting...' : '🚀 Start Session'}
          </button>
        </form>
      </div>
    );
  }

  // Log Win View
  if (viewMode === 'win') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-slate-900 p-4">
        <button onClick={() => setViewMode('dashboard')} className="text-white/50 mb-4">
          ← Back
        </button>
        
        <div className="text-center mb-6">
          <span className="text-4xl">🏆</span>
          <h1 className="text-xl font-bold text-white mt-2">Log a Win</h1>
        </div>

        {message && (
          <div className="bg-white/10 rounded-xl p-4 mb-4 text-center text-white">
            {message}
          </div>
        )}

        <form onSubmit={handleWin} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">What did you accomplish?</label>
            <textarea
              value={winText}
              onChange={(e) => setWinText(e.target.value)}
              placeholder="Completed the teacher dashboard"
              rows={3}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Project (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              {['whale', 'jeffy', 'sentinel', 'guardian'].map((proj) => (
                <button
                  key={proj}
                  type="button"
                  onClick={() => setProject(proj)}
                  className={`py-2 rounded-xl text-sm transition-all ${
                    project === proj
                      ? 'bg-amber-500 text-white'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {proj.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !winText}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {submitting ? 'Logging...' : '🏆 Log Win'}
          </button>
        </form>
      </div>
    );
  }

  // Session Anchor View
  if (viewMode === 'anchor') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <button onClick={() => setViewMode('dashboard')} className="text-white/50 mb-4">
          ← Back
        </button>
        
        <div className="text-center mb-6">
          <span className="text-4xl">⚓</span>
          <h1 className="text-xl font-bold text-white mt-2">Session Anchor</h1>
          <p className="text-purple-300 text-sm mt-1">End your session with intention</p>
        </div>

        {message && (
          <div className="bg-white/10 rounded-xl p-4 mb-4 text-center text-white">
            {message}
          </div>
        )}

        <form onSubmit={handleAnchor} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">
              The ONE thing I accomplished that moves the mission forward:
            </label>
            <textarea
              value={anchorText}
              onChange={(e) => setAnchorText(e.target.value)}
              placeholder="Built the mission protocol PWA"
              rows={4}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !anchorText}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold disabled:opacity-50"
          >
            {submitting ? 'Completing...' : '⚓ Complete Session'}
          </button>
        </form>

        {/* Mission Reminder */}
        <div className="mt-8 p-4 bg-white/5 rounded-xl">
          <p className="text-white/40 text-xs text-center italic">
            "Commerce funds FREE SCHOOLS. Graduates get: land, house, production facility, skills. Self-sufficient communities."
          </p>
        </div>
      </div>
    );
  }

  return null;
}
