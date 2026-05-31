'use client';

import { Visit } from '../types';
import { formatTime } from '../utils';

interface ActivityLogTabProps {
  visits: Visit[];
  error?: string | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 30) return 'just opened';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

function timeAgo(dateString: string): string {
  const ms = Date.now() - new Date(dateString).getTime();
  if (ms < 0) return 'just now';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isToday(dateString: string): boolean {
  const d = new Date(dateString);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function ActivityLogTab({ visits, error }: ActivityLogTabProps) {
  const todayVisits = visits.filter(v => isToday(v.visited_at));
  const olderVisits = visits.filter(v => !isToday(v.visited_at));

  return (
    <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
      <h2 className="text-lg font-bold text-white/90 mb-1">👀 Page Visits</h2>
      <p className="text-xs text-white/50 mb-4">Every time she opens or returns to the Story page</p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
          Failed to load visits: {error}
        </div>
      )}

      {visits.length === 0 && !error ? (
        <div className="text-center py-8 text-white/50">No visits recorded yet</div>
      ) : (
        <>
          {/* Today's visits — prominent */}
          {todayVisits.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-emerald-300">Today</span>
                <span className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  {todayVisits.length} visit{todayVisits.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {todayVisits.map(visit => (
                  <div key={visit.id} className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] rounded-lg border border-[rgba(52,211,153,0.18)]">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white/90 text-sm">{visit.username}</span>
                        <span className="text-xs text-white/50">{timeAgo(visit.visited_at)}</span>
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">
                        {formatTime(visit.visited_at)}
                        {visit.duration_seconds > 0 && (
                          <span className="ml-2 text-emerald-300 font-medium">
                            stayed {formatDuration(visit.duration_seconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Older visits — compact table */}
          {olderVisits.length > 0 && (
            <div>
              {todayVisits.length > 0 && (
                <div className="text-sm font-semibold text-white/60 mb-3">Earlier</div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-black/20 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-white/70">User</th>
                      <th className="px-4 py-2 text-left font-semibold text-white/70">Visited</th>
                      <th className="px-4 py-2 text-left font-semibold text-white/70">Stayed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {olderVisits.map(visit => (
                      <tr key={visit.id} className="hover:bg-white/5">
                        <td className="px-4 py-2 font-medium text-white/90">{visit.username}</td>
                        <td className="px-4 py-2 text-white/60">{formatTime(visit.visited_at)}</td>
                        <td className="px-4 py-2 text-white/60">
                          {visit.duration_seconds > 0 ? formatDuration(visit.duration_seconds) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
