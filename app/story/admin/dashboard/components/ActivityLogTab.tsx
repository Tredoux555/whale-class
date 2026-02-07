'use client';

import { LoginLog } from '../types';
import { formatTime } from '../utils';

interface ActivityLogTabProps {
  loginLogs: LoginLog[];
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
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loginLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{log.username}</td>
                  <td className="px-4 py-3 text-gray-600">{formatTime(log.login_time)}</td>
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
