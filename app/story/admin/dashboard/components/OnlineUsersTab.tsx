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

  const startCall = async (username: string) => {
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
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Could not start the call.');
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">👥 Students</h2>
      <p className="text-xs text-gray-500 mb-4">
        Tap Call to ring a student. They&apos;ll see it if their Story page is open.
      </p>
      {roster.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
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
                    ? 'bg-gradient-to-r from-green-50 to-blue-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {username[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{username}</p>
                      <p className="text-xs text-gray-600">
                        {online
                          ? `Online · last active ${formatSecondsAgo(online.secondsAgo)} ago`
                          : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startCall(username)}
                      disabled={callingUser !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xs font-semibold rounded-full transition-colors"
                    >
                      📞 {callingUser === username ? 'Calling…' : 'Call'}
                    </button>
                    <span
                      className={`hidden sm:inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
                        online ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          online ? 'bg-green-600 animate-pulse' : 'bg-gray-400'
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
