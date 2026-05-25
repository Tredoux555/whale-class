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
}

export function MessagesTab({
  messages,
  showExpired,
  onShowExpiredChange,
  savingToVault,
  savedToVault,
  onSaveToVault
}: MessagesTabProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">💬 Message History</h2>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => onShowExpiredChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          Show expired messages
        </label>
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">💭</div>
          <p>No messages sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-lg border ${
                msg.is_expired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                    {msg.author}
                  </span>
                  <span className="text-lg">{getTypeIcon(msg.message_type)}</span>
                  {msg.is_expired && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Expired</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  <div>{formatTime(msg.created_at)}</div>
                </div>
              </div>

              {msg.message_type === 'text' && (
                <p className="text-gray-800">{msg.message_content}</p>
              )}

              {msg.message_type === 'image' && msg.media_url && (
                <div className="mt-2">
                  <img src={msg.media_url} alt="Message" className="max-w-xs rounded-lg" />
                  <button
                    onClick={() => onSaveToVault(msg.id, msg.media_url!, msg.media_filename)}
                    disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                    className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                    className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-2xl">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-800 truncate">{msg.media_filename || 'Document'}</p>
                      <p className="text-xs text-blue-600">Click to open / download</p>
                    </div>
                  </a>
                  {msg.message_content && (
                    <p className="mt-2 text-gray-700 text-sm">{msg.message_content}</p>
                  )}
                </div>
              )}

              {msg.message_type === 'audio' && msg.media_url && (
                <div className="mt-2">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-2xl">🎵</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800">{msg.media_filename || 'Audio'}</p>
                      <audio src={msg.media_url} controls className="w-full mt-1" />
                    </div>
                  </div>
                  {msg.message_content && (
                    <p className="mt-2 text-gray-700 text-sm">{msg.message_content}</p>
                  )}
                  <button
                    onClick={() => onSaveToVault(msg.id, msg.media_url!, msg.media_filename)}
                    disabled={savingToVault === msg.id || savedToVault.has(msg.id)}
                    className="mt-2 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                <div className="mt-3 pt-2 border-t border-blue-100">
                  {msg.read_by && msg.read_by.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
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
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
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
