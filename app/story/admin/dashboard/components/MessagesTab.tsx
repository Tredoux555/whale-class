'use client';

import { Message } from '../types';
import { formatTime, getTypeIcon } from '../utils';

// Human-friendly relative time for read receipts — "just now", "2 hours ago",
// "yesterday". Plain words, not a raw timestamp.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

interface MessagesTabProps {
  messages: Message[];
  showExpired: boolean;
  onShowExpiredChange: (show: boolean) => void;
  savingToVault: number | null;
  savedToVault: Set<number>;
  onSaveToVault: (messageId: number, mediaUrl: string, filename: string | null) => void;
  // Inline error from the vault save flow. iOS Home-Screen PWAs swallow
  // window.alert(); without an inline error the user sees the button
  // toggle on/off with no feedback. Rendered as a red pill below the row
  // when the messageId matches.
  vaultSaveError?: { messageId: number; message: string } | null;
  onClearVaultSaveError?: () => void;
}

export function MessagesTab({
  messages,
  showExpired,
  onShowExpiredChange,
  savingToVault,
  savedToVault,
  onSaveToVault,
  vaultSaveError,
  onClearVaultSaveError,
}: MessagesTabProps) {
  return (
    <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white/90">💬 Latest Messages</h2>
        <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => onShowExpiredChange(e.target.checked)}
            className="w-4 h-4 rounded border-white/30 accent-emerald-500"
          />
          Include expired
        </label>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 text-white/50">
          <div className="text-4xl mb-2">💭</div>
          <p>No message currently out — send one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border ${
                msg.is_expired ? 'bg-black/20 border-white/10 opacity-60' : 'bg-[rgba(52,211,153,0.08)] border-[rgba(52,211,153,0.18)]'
              }`}
            >
              {/* Vault-save error pill — shown when the save for THIS
                  message failed. Inline, mobile-friendly, dismissible.
                  Replaces the suppressed window.alert() on iOS PWAs. */}
              {vaultSaveError && vaultSaveError.messageId === msg.id && (
                <div className="mb-3 flex items-start justify-between gap-2 bg-red-500/10 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded">
                  <span className="leading-snug">
                    <strong>Save failed:</strong> {vaultSaveError.message}
                  </span>
                  {onClearVaultSaveError && (
                    <button
                      onClick={onClearVaultSaveError}
                      aria-label="Dismiss"
                      className="text-red-300 hover:text-red-200 font-bold leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 bg-white/10 text-white/70 text-xs font-semibold rounded">
                    {msg.author}
                  </span>
                  <span className="text-lg">{getTypeIcon(msg.message_type)}</span>
                  {msg.is_expired && (
                    <span className="text-xs bg-red-500/15 text-red-300 px-2 py-1 rounded">Expired</span>
                  )}
                </div>
                <div className="text-xs text-white/50">
                  <div>{formatTime(msg.created_at)}</div>
                </div>
              </div>

              {msg.message_type === 'text' && (
                <p className="text-white/90">{msg.message_content}</p>
              )}

              {msg.message_type === 'image' && msg.media_url && (
                <div className="mt-2">
                  <img src={msg.media_url} alt="Message" className="max-w-xs rounded-lg" />
                  <button
                    onClick={() => onSaveToVault(msg.id, msg.media_url!, msg.media_filename)}
                    disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                    className="mt-2 px-3 py-1 text-xs bg-[rgba(52,211,153,0.12)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded hover:bg-[rgba(52,211,153,0.20)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savedToVault.has(msg.id)
                      ? '✓ Saved to Vault'
                      : savingToVault === msg.id
                      ? '⏳ Saving...'
                      : '🔒 Save to Vault'}
                  </button>
                </div>
              )}

              {msg.message_type === 'video' && msg.media_url && (
                <div className="mt-2">
                  <video src={msg.media_url} controls playsInline preload="metadata" className="max-w-xs rounded-lg" />
                  <button
                    onClick={() => onSaveToVault(msg.id, msg.media_url!, msg.media_filename)}
                    disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                    className="mt-2 px-3 py-1 text-xs bg-[rgba(52,211,153,0.12)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded hover:bg-[rgba(52,211,153,0.20)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savedToVault.has(msg.id)
                      ? '✓ Saved to Vault'
                      : savingToVault === msg.id
                      ? '⏳ Saving...'
                      : '🔒 Save to Vault'}
                  </button>
                </div>
              )}

              {msg.message_type === 'document' && msg.media_url && (
                <div className="mt-2">
                  <a
                    href={msg.media_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg hover:bg-[rgba(52,211,153,0.14)] transition-colors"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/90 truncate">{msg.media_filename || 'Document'}</p>
                      <p className="text-xs text-emerald-300">Click to open / download</p>
                    </div>
                  </a>
                  {msg.message_content && (
                    <p className="mt-2 text-white/70 text-sm">{msg.message_content}</p>
                  )}
                </div>
              )}

              {msg.message_type === 'audio' && msg.media_url && (
                <div className="mt-2">
                  <div className="flex items-center gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.18)] rounded-lg">
                    <span className="text-2xl">🎵</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/90">{msg.media_filename || 'Audio'}</p>
                      <audio src={msg.media_url} controls className="w-full mt-1" />
                    </div>
                  </div>
                  {msg.message_content && (
                    <p className="mt-2 text-white/70 text-sm">{msg.message_content}</p>
                  )}
                  <button
                    onClick={() => onSaveToVault(msg.id, msg.media_url!, msg.media_filename)}
                    disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                    className="mt-2 px-3 py-1 text-xs bg-[rgba(52,211,153,0.12)] text-emerald-300 border border-[rgba(52,211,153,0.25)] rounded hover:bg-[rgba(52,211,153,0.20)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {savedToVault.has(msg.id)
                      ? '✓ Saved to Vault'
                      : savingToVault === msg.id
                      ? '⏳ Saving...'
                      : '🔒 Save to Vault'}
                  </button>
                </div>
              )}

              {/* Read receipt — admin-side only. Shows whether the user has
                  actually opened the message yet, in plain words. */}
              {msg.is_from_admin && (
                <div className="mt-3 pt-2 border-t border-white/10">
                  {msg.read_by && msg.read_by.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                      <span>✓</span>
                      <span>
                        Opened by {msg.read_by.map(r => r.username).join(' & ')}
                        {' · '}
                        {timeAgo(
                          [...msg.read_by].sort((a, b) => b.read_at.localeCompare(a.read_at))[0].read_at,
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <span>🕓</span>
                      <span>Not opened yet</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
