'use client';

import { OnlineUser } from '../types';
import { formatSecondsAgo } from '../utils';

interface OnlineUsersTabProps {
  onlineUsers: OnlineUser[];
}

export function OnlineUsersTab({ onlineUsers }: OnlineUsersTabProps) {
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{user.username}</p>
                    <p className="text-xs text-gray-600">Last active: {formatSecondsAgo(user.secondsAgo)} ago</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 text-xs font-semibold rounded-full">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
