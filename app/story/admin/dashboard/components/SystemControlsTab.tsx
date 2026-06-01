'use client';

import { SystemStats } from '../types';

interface SystemControlsTabProps {
  systemStats: SystemStats;
  controlsMessage: { type: 'success' | 'error'; text: string } | null;
  controlsLoading: boolean;
  onExecuteAction: (action: string, confirmMessage: string) => void;
  nukeCode: string;
  onNukeCodeChange: (v: string) => void;
  scorchAdmins: boolean;
  onScorchAdminsChange: (v: boolean) => void;
  onExecuteNuke: () => void;
}

export function SystemControlsTab({
  systemStats,
  controlsMessage,
  controlsLoading,
  onExecuteAction,
  nukeCode,
  onNukeCodeChange,
  scorchAdmins,
  onScorchAdminsChange,
  onExecuteNuke
}: SystemControlsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white/90 mb-4">📊 System Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{systemStats.messages}</div>
            <div className="text-sm text-white/60">Messages</div>
          </div>
          <div className="bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{systemStats.users}</div>
            <div className="text-sm text-white/60">Users</div>
          </div>
          <div className="bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-[#E8C96A]">{systemStats.loginLogs}</div>
            <div className="text-sm text-white/60">Login Logs</div>
          </div>
          <div className="bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-[#E8C96A]">{systemStats.vaultFiles}</div>
            <div className="text-sm text-white/60">Vault Files</div>
          </div>
        </div>
      </div>

      {controlsMessage && (
        <div
          className={`p-4 rounded-lg ${
            controlsMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/30 text-red-300'
          }`}
        >
          {controlsMessage.type === 'success' ? '✓' : '✗'} {controlsMessage.text}
        </div>
      )}

      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white/90 mb-4">💬 Message Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() =>
              onExecuteAction('clear_expired_messages', 'Clear all EXPIRED messages only?')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-left hover:bg-amber-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-amber-300">🧹 Clear Expired Messages</div>
            <div className="text-sm text-amber-200/70">Remove only messages that have expired</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction(
                'clear_messages',
                'DELETE ALL MESSAGES? This will remove all message history!'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left hover:bg-red-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-300">🗑️ Clear All Messages</div>
            <div className="text-sm text-red-200/70">Permanently delete all message history</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction(
                'clear_all_media',
                'Remove all media (images/videos) from messages but keep text?'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-left hover:bg-amber-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-amber-300">🖼️ Clear Media Only</div>
            <div className="text-sm text-amber-200/70">Remove images and videos, keep text messages</div>
          </button>
        </div>
      </div>

      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white/90 mb-4">👥 User Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() => onExecuteAction('clear_login_logs', 'Clear all login history?')}
            disabled={controlsLoading}
            className="w-full p-4 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg text-left hover:bg-[rgba(52,211,153,0.14)] disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-emerald-300">📋 Clear Login Logs</div>
            <div className="text-sm text-white/60">Remove all login history records</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction('reset_user_sessions', 'Reset all user sessions? Users will appear offline.')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-left hover:bg-amber-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-amber-300">🔄 Reset User Sessions</div>
            <div className="text-sm text-amber-200/70">Mark all users as offline</div>
          </button>
          <button
            onClick={() =>
              onExecuteAction('delete_all_users', 'DELETE ALL USERS? This removes all student accounts!')
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left hover:bg-red-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-300">🚫 Delete All Users</div>
            <div className="text-sm text-red-200/70">Permanently delete all student accounts</div>
          </button>
        </div>
      </div>

      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white/90 mb-4">🔒 Vault Controls</h2>
        <div className="space-y-3">
          <button
            onClick={() =>
              onExecuteAction(
                'clear_vault',
                'DELETE ALL VAULT FILES? This removes all saved photos and videos!'
              )
            }
            disabled={controlsLoading}
            className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left hover:bg-red-500/15 disabled:opacity-50 transition-colors"
          >
            <div className="font-semibold text-red-300">🗑️ Clear Vault</div>
            <div className="text-sm text-red-200/70">Permanently delete all vault files</div>
          </button>
        </div>
      </div>

      <div className="bg-red-950/60 border border-red-500/40 rounded-lg shadow-sm p-6 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-4">⚠️ Danger Zone</h2>
        <p className="text-red-200/80 text-sm mb-4">These actions will permanently delete ALL data and cannot be undone.</p>
        <button
          onClick={() =>
            onExecuteAction(
              'factory_reset',
              'FACTORY RESET - DELETE EVERYTHING?\n\nThis will delete:\n• All messages\n• All users\n• All login logs\n• All vault files\n\nThis CANNOT be undone!'
            )
          }
          disabled={controlsLoading}
          className="w-full p-4 bg-red-600 border-2 border-red-400 rounded-lg text-left hover:bg-red-500 disabled:opacity-50 transition-colors"
        >
          <div className="font-bold text-white">💥 Factory Reset</div>
          <div className="text-sm text-red-100/80">Delete ALL data (audit logs preserved)</div>
        </button>
      </div>

      <div className="bg-black border-2 border-red-500/70 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold text-red-400 mb-2">☢️ NUKE — total destruction</h2>
        <p className="text-red-200/80 text-sm mb-1">
          Destroys <strong>everything</strong>: every message, photo, video, vault file, login
          record, AND all stored files in every bucket. The hidden messages themselves and the
          media blobs that Factory Reset leaves behind are wiped too. Nothing recoverable remains.
        </p>
        <p className="text-amber-200/70 text-xs mb-4">
          Note: this cannot un-do an attacker who already copied the data, and it does not erase
          Supabase&apos;s own backups — handle backup retention separately.
        </p>
        <label className="block text-sm text-red-200/80 mb-1">Nuke code</label>
        <input
          type="password"
          value={nukeCode}
          onChange={(e) => onNukeCodeChange(e.target.value)}
          placeholder="Enter the secret nuke code"
          autoComplete="off"
          className="w-full mb-3 px-3 py-2 rounded-lg bg-black/60 border border-red-500/40 text-white text-base focus:outline-none focus:border-red-400"
        />
        <label className="flex items-center gap-2 mb-4 text-sm text-red-200/80 cursor-pointer">
          <input
            type="checkbox"
            checked={scorchAdmins}
            onChange={(e) => onScorchAdminsChange(e.target.checked)}
          />
          Also delete admin logins (full scorched earth — you will be locked out)
        </label>
        <button
          onClick={onExecuteNuke}
          disabled={controlsLoading || !nukeCode.trim()}
          className="w-full p-4 bg-red-700 border-2 border-red-400 rounded-lg text-center hover:bg-red-600 disabled:opacity-40 transition-colors"
        >
          <div className="font-bold text-white tracking-wide">☢️ NUKE EVERYTHING</div>
          <div className="text-sm text-red-100/80">Irreversible — only the current data exists to destroy</div>
        </button>
      </div>

      {controlsLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0e2218] border border-[rgba(52,211,153,0.25)] rounded-lg p-6 text-center">
            <div className="text-4xl mb-2 animate-spin">⚙️</div>
            <p className="font-semibold text-white/90">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
