// components/teacher/StudentGameProgress.tsx
// Shows game activity and progress for a student

'use client';

import { useState, useEffect } from 'react';

interface GameProgress {
  id: string;
  game_id: string;
  game_name: string;
  total_sessions: number;
  total_time_seconds: number;
  highest_level: number;
  items_mastered: string[];
  last_played_at: string | null;
}

interface GameSession {
  id: string;
  game_id: string;
  game_name: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  items_completed: number;
  items_total: number;
}

interface ProgressSummary {
  totalTimeSeconds: number;
  totalTimeMinutes: number;
  totalSessions: number;
  gamesPlayed: number;
}

interface StudentGameProgressProps {
  childId: string;
  childName?: string;
}

export default function StudentGameProgress({ childId, childName }: StudentGameProgressProps) {
  const [progress, setProgress] = useState<GameProgress[]>([]);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  const fetchProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/progress?child_id=${childId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProgress(data.progress || []);
      setRecentSessions(data.recentSessions || []);
      setSummary(data.summary || null);
    } catch (e) {
      setError('Failed to load game progress');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hours}h ${remainMins}m` : `${hours}h`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    }
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 mt-2">Loading game progress...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{error}</p>
        <button onClick={fetchProgress} className="mt-2 text-sm text-blue-500 hover:underline">Try again</button>
      </div>
    );
  }

  if (progress.length === 0 && recentSessions.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-xl">
        <div className="text-4xl mb-2">🎮</div>
        <p className="text-gray-600 font-medium">No game activity yet</p>
        <p className="text-gray-400 text-sm mt-1 mb-3">
          {childName ? `${childName} hasn't` : "This student hasn't"} played any learning games yet
        </p>
        <a 
          href="/games" 
          target="_blank"
          className="inline-flex items-center gap-1 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
        >
          View Games →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      {childName && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🎮</span>
          <h3 className="text-lg font-bold text-gray-800">{childName}'s Game Activity</h3>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{summary.totalSessions}</div>
            <div className="text-xs text-purple-500">Sessions</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{formatDuration(summary.totalTimeSeconds)}</div>
            <div className="text-xs text-blue-500">Play Time</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{summary.gamesPlayed}</div>
            <div className="text-xs text-green-500">Games</div>
          </div>
        </div>
      )}

      {/* Game Progress */}
      {progress.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Progress by Game</h4>
          <div className="space-y-2">
            {progress.map((p) => (
              <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                    {p.game_id === 'number-tracer' ? '🔢' : 
                     p.game_id === 'capital-letter-tracer' ? '🔠' : 
                     p.game_id === 'letter-tracer' ? '✏️' : '🎮'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{p.game_name}</div>
                    <div className="text-xs text-gray-500">
                      {p.total_sessions} sessions • {formatDuration(p.total_time_seconds)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    {p.items_mastered?.length || 0} mastered
                  </div>
                  {p.last_played_at && (
                    <div className="text-xs text-gray-400">{formatDate(p.last_played_at)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {recentSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="bg-gray-50 rounded-lg p-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {session.game_id === 'number-tracer' ? '🔢' : 
                     session.game_id === 'capital-letter-tracer' ? '🔠' : 
                     session.game_id === 'letter-tracer' ? '✏️' : '🎮'}
                  </span>
                  <span className="text-gray-700">{session.game_name}</span>
                </div>
                <div className="text-right text-gray-500">
                  {session.duration_seconds ? formatDuration(session.duration_seconds) : 'In progress'}
                  <span className="mx-1">•</span>
                  {formatDate(session.started_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
