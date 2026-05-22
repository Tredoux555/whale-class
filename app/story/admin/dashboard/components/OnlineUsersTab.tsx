'use client';

import { useState } from 'react';
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
  const [callingUser, setCallingUser] = useState<string | null>(null);

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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Active Students</h2>
      {onlineUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">😴</div>
          <p>No students are currently online</p>
        </div>
      ) : (
        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div key={user.username} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{user.username}</p>
                    <p className="text-xs text-gray-600">Last active: {formatSecondsAgo(user.secondsAgo)} ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => startCall(user.username)}
                    disabled={callingUser !== null}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-xs font-semibold rounded-full transition-colors"
                  >
                    📞 {callingUser === user.username ? 'Calling…' : 'Call'}
                  </button>
                  <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                    <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                    Online
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
