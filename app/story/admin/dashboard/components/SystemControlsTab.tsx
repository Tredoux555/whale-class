'use client';

import { SystemStats } from '../types';

interface SystemControlsTabProps {
  systemStats: SystemStats;
  controlsMessage: { type: 'success' | 'error'; text: string } | null;
  controlsLoading: boolean;
  onExecuteAction: (action: string, confirmMessage: string) => void;
}

export function SystemControlsTab({
  systemStats,
  controlsMessage,
  controlsLoading,
  onExecuteAction
}: SystemControlsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">📊 System Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{systemStats.messages}</div>
            <div className="text-sm text-gray-600">Messages</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{systemStats.users}</div>
            <div className="text-sm text-gray-600">Users</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{systemStats.loginLogs}</div>
            <div className="text-sm text-gray-600">Login Logs</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-orange-600">{systemStats.vaultFiles}</div>
            <div className="text-sm text-gray-600">Vault Files</div>
          </div>
        </div>
      </div>

      {controlsMessage && (
        <div
          className={`p-4 rounded-lg ${
            controlsMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {controlsMessage.type === 'success' ? '✓' : '✗'} {controlsMessage.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">💬 Message Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() =>
              onExecuteAction('clear_expired_messages', 'Clear all EXPIRED messages only?')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left hover:bg-yellow-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-yellow-800">🧹 Clear Expired Messages</div>
            <div className="text-sm text-yellow-600">Remove only messages that have expired</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction(
                'clear_messages',
                'DELETE ALL MESSAGES? This will remove all message history!'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-800">🗑️ Clear All Messages</div>
            <div className="text-sm text-red-600">Permanently delete all message history</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction(
                'clear_all_media',
                'Remove all media (images/videos) from messages but keep text?'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-orange-50 border border-orange-200 rounded-lg text-left hover:bg-orange-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-orange-800">🖼️ Clear Media Only</div>
            <div className="text-sm text-orange-600">Remove images and videos, keep text messages</div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">👥 User Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() => onExecuteAction('clear_login_logs', 'Clear all login history?')}
            disabled={controlsLoading}
            className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-blue-800">📋 Clear Login Logs</div>
            <div className="text-sm text-blue-600">Remove all login history records</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction('reset_user_sessions', 'Reset all user sessions? Users will appear offline.')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-purple-50 border border-purple-200 rounded-lg text-left hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-purple-800">🔄 Reset User Sessions</div>
            <div className="text-sm text-purple-600">Mark all users as offline</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction('delete_all_users', 'DELETE ALL USERS? This removes all student accounts!')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-800">🚫 Delete All Users</div>
            <div className="text-sm text-red-600">Permanently delete all student accounts</div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔒 Vault Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() =>
              onExecuteAction(
                'clear_vault',
                'DELETE ALL VAULT FILES? This removes all saved photos and videos!'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-800">🗑️ Clear Vault</div>
            <div className="text-sm text-red-600">Permanently delete all vault files</div>
          </button>
        </div>
      </div>

      <div className="bg-red-900 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-white mb-4">⚠️ Danger Zone</h2>
        <p className="text-red-200 text-sm mb-4">These actions will permanently delete ALL data and cannot be undone.</p>
        <button
          onClick={() =>
            onExecuteAction(
              'factory_reset',
              'FACTORY RESET - DELETE EVERYTHING?\n\nThis will delete:\n• All messages\n• All users\n• All login logs\n• All vault files\n\nThis CANNOT be undone!'
            )
          }
          disabled={controlsLoading}
          className="w-full p-4 bg-red-700 border-2 border-red-500 rounded-lg text-left hover:bg-red-600 disabled:opacity-50 transition-colors"
        >
          <div className="font-bold text-white">💥 Factory Reset</div>
          <div className="text-sm text-red-200">Delete ALL data and start fresh</div>
        </button>
      </div>

      {controlsLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-4xl mb-2 animate-spin">⚙️</div>
            <p className="font-semibold">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
