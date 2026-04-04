'use client';

import { LoginLog } from '../types';
import { formatTime } from '../utils';

interface ActivityLogTabProps {
  loginLogs: LoginLog[];
}

function formatDuration(loginAt: string, logoutAt: string): string {
  const ms = new Date(logoutAt).getTime() - new Date(loginAt).getTime();
  if (ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}

export function ActivityLogTab({ loginLogs }: ActivityLogTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📋 Activity Log</h2>
      {loginLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No activity recorded</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Login Time</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Duration</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loginLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{log.username}</td>
                  <td className="px-4 py-3 text-gray-600">{formatTime(log.login_at)}</td>
                  <td className="px-4 py-3">
                    {log.logout_at ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        ⚪ Logged out
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        🟢 Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.logout_at ? formatDuration(log.login_at, log.logout_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
