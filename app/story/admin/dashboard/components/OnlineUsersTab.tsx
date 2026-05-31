'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnlineUser } from '../types';
import { formatSecondsAgo } from '../utils';

interface OnlineUsersTabProps {
  onlineUsers: OnlineUser[];
  // Returns the admin Bearer token, or null when the session is gone.
  getSession: () => string | null;
}

export function OnlineUsersTab({ onlineUsers, getSession }: OnlineUsersTabProps) {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [callingUser, setCallingUser] = useState<string | null>(null);

  // Pull the full Story roster once. The Call button is shown for EVERY
  // user — online detection is a flaky heartbeat, so it's an indicator,
  // never a gate on whether the admin can place a call.
  const loadAllUsers = useCallback(async () => {
    const session = getSession();
    if (!session) return;
    try {
      const res = await fetch('/api/story/admin/users', {
        headers: { Authorization: `Bearer ${session}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch {
      /* non-critical — fall back to whoever's online */
    }
  }, [getSession]);

  useEffect(() => {
    // loadAllUsers fetches the roster and setStates only after the network
    // round-trip resolves — async, not a synchronous render cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAllUsers();
  }, [loadAllUsers]);

  const startCall = async (username: string, mode: 'voice' | 'video') => {
    const session = getSession();
    if (!session) {
      router.push('/story/admin');
      return;
    }
    setCallingUser(username);
    try {
      const res = await fetch('/api/story/admin/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session}`,
        },
        body: JSON.stringify({ username, mode }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || 'Could not start the call.';
        alert(j?.detail ? `${msg}\n\n${j.detail}` : msg);
        setCallingUser(null);
        return;
      }
      const { callId } = await res.json();
      router.push(`/story/call?call=${encodeURIComponent(callId)}&as=admin`);
    } catch {
      alert('Could not start the call.');
      setCallingUser(null);
    }
  };

  // Online lookup, and the merged roster: every known user + anyone online
  // who somehow isn't in story_users yet.
  const onlineMap = new Map(onlineUsers.map((u) => [u.username, u]));
  const roster = [...allUsers];
  for (const u of onlineUsers) {
    if (!roster.includes(u.username)) roster.push(u.username);
  }
  roster.sort((a, b) => a.localeCompare(b));

  return (
    <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
      <h2 className="text-lg font-bold text-white/90 mb-1">👥 Students</h2>
      <p className="text-xs text-white/50 mb-4">
        Tap Call to ring a student. They&apos;ll see it if their Story page is open.
      </p>
      {roster.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <div className="text-4xl mb-2">👤</div>
          <p>No students yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {roster.map((username) => {
            const online = onlineMap.get(username);
            return (
              <div
                key={username}
                className={`p-4 rounded-lg border ${
                  online
                    ? 'bg-[rgba(52,211,153,0.10)] border-[rgba(52,211,153,0.30)]'
                    : 'bg-black/20 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-[#0a1a0f] font-bold text-sm flex-shrink-0">
                      {username[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white/90 truncate">{username}</p>
                      <p className="text-xs text-white/60">
                        {online
                          ? `Online · last active ${formatSecondsAgo(online.secondsAgo)} ago`
                          : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startCall(username, 'voice')}
                      disabled={callingUser !== null}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/15 disabled:text-white/40 text-[#0a1a0f] text-xs font-semibold rounded-full transition-colors"
                    >
                      📞 {callingUser === username ? '…' : 'Voice'}
                    </button>
                    <button
                      onClick={() => startCall(username, 'video')}
                      disabled={callingUser !== null}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[rgba(52,211,153,0.15)] border border-[rgba(52,211,153,0.30)] hover:bg-[rgba(52,211,153,0.25)] disabled:bg-white/10 disabled:text-white/40 disabled:border-white/10 text-emerald-300 text-xs font-semibold rounded-full transition-colors"
                    >
                      📹 {callingUser === username ? '…' : 'Video'}
                    </button>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                        online ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          online ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'
                        }`}
                      ></span>
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
