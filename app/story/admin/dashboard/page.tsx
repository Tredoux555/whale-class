'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface OnlineUser {
  username: string;
  lastLogin: string;
  secondsAgo: number;
}

interface LoginLog {
  id: number;
  username: string;
  login_time: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface Message {
  id: number;
  week_start_date: string;
  message_type: 'text' | 'image' | 'video' | 'audio';
  message_content: string | null;
  media_url: string | null;
  media_filename: string | null;
  author: string;
  created_at: string;
  is_expired: boolean;
}

interface Statistics {
  message_type: string;
  count: string;
}

interface VaultFile {
  id: number;
  filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

type TabType = 'online' | 'logs' | 'messages' | 'vault';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('online');
  
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
  const [uploadingVault, setUploadingVault] = useState(false);
  const [vaultError, setVaultError] = useState('');

  const getSession = useCallback(() => {
    return sessionStorage.getItem('story_admin_session');
  }, []);

  const verifySession = useCallback(async () => {
    const session = getSession();
    if (!session) {
      router.push('/story/admin');
      return false;
    }
    try {
      const res = await fetch('/api/story/admin/auth', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (!res.ok) {
        sessionStorage.removeItem('story_admin_session');
        router.push('/story/admin');
        return false;
      }
      return true;
    } catch {
      router.push('/story/admin');
      return false;
    }
  }, [router, getSession]);

  const loadOnlineUsers = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/online-users', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers || []);
        setOnlineCount(data.onlineCount || 0);
        setTotalUsers(data.totalUsers || 0);
      }
    } catch {
      // Handle silently
    }
  }, [getSession]);

  const loadLoginLogs = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/login-logs?limit=50', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs || []);
      }
    } catch {
      // Handle silently
    }
  }, [getSession]);

  const loadMessages = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch(`/api/story/admin/message-history?limit=50&showExpired=${showExpired}`, {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setStatistics(data.statistics || []);
      }
    } catch {
      // Handle silently
    }
  }, [getSession, showExpired]);

  const loadVaultFiles = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/vault/list', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVaultFiles(data.files || []);
      }
    } catch {
      console.error('Failed to load vault files');
    }
  }, [getSession]);

  useEffect(() => {
    const init = async () => {
      const valid = await verifySession();
      if (valid) {
        await Promise.all([loadOnlineUsers(), loadLoginLogs(), loadMessages(), loadVaultFiles()]);
      }
      setIsLoading(false);
    };
    init();
  }, [verifySession, loadOnlineUsers, loadLoginLogs, loadMessages, loadVaultFiles]);

  useEffect(() => {
    if (activeTab === 'online') {
      const interval = setInterval(loadOnlineUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadOnlineUsers]);

  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages();
    }
  }, [showExpired, activeTab, loadMessages]);

  useEffect(() => {
    if (activeTab === 'vault' && vaultUnlocked) {
      loadVaultFiles();
    }
  }, [activeTab, vaultUnlocked, loadVaultFiles]);

  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) return;
    setSendingMessage(true);
    setMessageSent(false);
    setMessageError('');
    try {
      const session = getSession();
      const res = await fetch('/api/story/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ message: adminMessage.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminMessage('');
        setMessageSent(true);
        await loadMessages();
        setTimeout(() => setMessageSent(false), 3000);
      } else {
        setMessageError(data.error || 'Failed to send');
      }
    } catch {
      setMessageError('Connection error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleVaultUnlock = async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/vault/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ password: vaultPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setVaultUnlocked(true);
        setVaultPassword('');
        await loadVaultFiles();
      } else {
        setVaultError('Invalid password');
      }
    } catch {
      setVaultError('Error unlocking vault');
    }
  };

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingVault(true);
    setVaultError('');
    
    try {
      const session = getSession();
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/story/admin/vault/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session}` },
        body: formData
      });
      
      const data = await res.json();
      if (res.ok) {
        await loadVaultFiles();
      } else {
        setVaultError(data.error || 'Upload failed');
      }
    } catch {
      setVaultError('Upload failed');
    } finally {
      setUploadingVault(false);
    }
  };

  const handleVaultDownload = async (fileId: number, filename: string) => {
    try {
      const session = getSession();
      const res = await fetch(`/api/story/admin/vault/download/${fileId}`, {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Download failed');
    }
  };

  const handleVaultDelete = async (fileId: number) => {
    if (!confirm('Delete this file?')) return;
    
    const session = getSession();
    try {
      const res = await fetch(`/api/story/admin/vault/delete/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        await loadVaultFiles();
      }
    } catch {
      setVaultError('Delete failed');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('story_admin_session');
    router.push('/story/admin');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSecondsAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'video': return '▶️';
      case 'audio': return '🔊';
      default: return '📎';
    }
  };

  const getVaultFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return '▶️';
    return '📄';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-400 font-mono flex items-center justify-center">
        <div className="text-lg opacity-70">
          <span className="animate-pulse">▌</span> initializing...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-mono overflow-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
          <span className="text-sm text-emerald-400 font-bold">STORY_MANAGER</span>
          <span className="text-xs text-slate-500 ml-2">/story/admin/dashboard</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-1 text-xs bg-slate-800 text-red-400 border border-red-900 rounded hover:bg-red-900 hover:text-red-200 transition-colors"
        >
          exit
        </button>
      </div>

      <div className="flex h-[calc(100vh-50px)]">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-1">
            <div className="text-xs text-slate-500 uppercase tracking-wider px-3 py-2 font-bold">
              Views
            </div>
            {(['online', 'logs', 'messages', 'vault'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-emerald-900 text-emerald-300 border-l-2 border-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="mr-2">{'>'}</span>
                {tab === 'online' && `users (${onlineCount})`}
                {tab === 'logs' && 'activity'}
                {tab === 'messages' && 'history'}
                {tab === 'vault' && '🔒 vault'}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-700 mt-6 pt-4 px-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">
              Statistics
            </div>
            <div className="space-y-1 text-xs text-slate-400">
              <div>total_users: <span className="text-cyan-400">{totalUsers}</span></div>
              <div>active: <span className="text-emerald-400">{onlineCount}</span></div>
              <div>messages: <span className="text-blue-400">{messages.length}</span></div>
              <div>vault_files: <span className="text-yellow-400">{vaultFiles.length}</span></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950">
          <div className="p-8">
            {/* Message Input Panel */}
            {activeTab !== 'vault' && (
              <div className="mb-8 bg-slate-900 border border-slate-700 rounded p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-emerald-400 text-sm font-bold">{'>'}</span>
                  <span className="text-emerald-400 text-sm">send_teacher_note</span>
                </div>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="message content..."
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded font-mono text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      disabled={sendingMessage}
                      onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={sendAdminMessage}
                      disabled={sendingMessage || !adminMessage.trim()}
                      className="px-4 py-2 text-xs bg-emerald-700 text-emerald-100 border border-emerald-600 rounded hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-600 disabled:border-slate-600 transition-colors font-bold"
                    >
                      {sendingMessage ? '⟳ sending...' : '▶ send'}
                    </button>
                    <button
                      onClick={() => { setAdminMessage(''); setMessageError(''); }}
                      className="px-4 py-2 text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 hover:text-slate-300 transition-colors"
                    >
                      clear
                    </button>
                  </div>
                  {messageSent && (
                    <div className="text-xs text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-2 rounded">
                      ✓ note sent successfully
                    </div>
                  )}
                  {messageError && (
                    <div className="text-xs text-red-400 bg-red-950 border border-red-800 px-3 py-2 rounded">
                      ✗ {messageError}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vault Panel */}
            {activeTab === 'vault' && (
              <div className="space-y-4">
                {!vaultUnlocked ? (
                  <div className="bg-slate-900 border border-slate-700 rounded p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-yellow-400 text-sm font-bold">🔒</span>
                      <span className="text-yellow-400 text-sm">secure_vault</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4">This folder is password protected. Enter password to access.</p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        placeholder="enter password..."
                        className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 rounded font-mono text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                        onKeyPress={(e) => e.key === 'Enter' && handleVaultUnlock()}
                      />
                      <button
                        onClick={handleVaultUnlock}
                        className="px-4 py-2 text-xs bg-yellow-700 text-yellow-100 border border-yellow-600 rounded hover:bg-yellow-600 transition-colors font-bold"
                      >
                        unlock
                      </button>
                    </div>
                    {vaultError && (
                      <div className="text-xs text-red-400 bg-red-950 border border-red-800 px-3 py-2 rounded mt-3">
                        ✗ {vaultError}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-sm font-bold">🔓</span>
                        <span className="text-yellow-400 text-sm">vault_unlocked</span>
                      </div>
                      <button
                        onClick={() => { setVaultUnlocked(false); setVaultPassword(''); }}
                        className="px-3 py-1 text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded hover:bg-slate-700 transition-colors"
                      >
                        lock
                      </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-700 rounded p-6">
                      <div className="mb-4">
                        <label className="block text-xs text-slate-400 mb-2">upload_file</label>
                        <input
                          type="file"
                          onChange={handleVaultUpload}
                          disabled={uploadingVault}
                          accept="image/*,video/*"
                          className={`block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-950 file:text-yellow-400 hover:file:bg-yellow-900 disabled:opacity-50`}
                        />
                        <p className="mt-1 text-xs text-slate-500">supports: images and videos</p>
                      </div>
                      {uploadingVault && <p className="text-xs text-yellow-400">⟳ uploading...</p>}
                      {vaultError && (
                        <div className="text-xs text-red-400 bg-red-950 border border-red-800 px-3 py-2 rounded">
                          ✗ {vaultError}
                        </div>
                      )}
                    </div>

                    {vaultFiles.length === 0 ? (
                      <div className="text-slate-500 text-sm py-8 text-center bg-slate-900 border border-slate-700 rounded">
                        vault is empty
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vaultFiles.map((file) => (
                          <div key={file.id} className="bg-slate-900 border border-slate-700 rounded p-4 hover:border-slate-600 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-lg">{getVaultFileIcon(file.filename)}</span>
                                <div className="flex-1">
                                  <p className="text-sm text-slate-300">{file.filename}</p>
                                  <p className="text-xs text-slate-500">{formatTime(file.uploaded_at)}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleVaultDownload(file.id, file.filename)}
                                  className="px-3 py-1 text-xs bg-slate-800 text-cyan-400 border border-cyan-900 rounded hover:bg-cyan-900 transition-colors"
                                >
                                  ⬇
                                </button>
                                <button
                                  onClick={() => handleVaultDelete(file.id)}
                                  className="px-3 py-1 text-xs bg-slate-800 text-red-400 border border-red-900 rounded hover:bg-red-900 transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Online Users Tab */}
            {activeTab === 'online' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-slate-400">
                    <span className="text-emerald-400">{onlineCount}</span> / <span className="text-cyan-400">{totalUsers}</span> users active
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    live
                  </div>
                </div>
                {onlineUsers.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center bg-slate-900 border border-slate-700 rounded">
                    no active users
                  </div>
                ) : (
                  <div className="space-y-2">
                    {onlineUsers.map((user) => (
                      <div
                        key={user.username}
                        className="bg-slate-900 border border-slate-700 rounded p-4 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded flex items-center justify-center text-slate-950 font-bold text-sm">
                              {user.username[0]}
                            </div>
                            <div>
                              <p className="text-sm text-emerald-300 font-semibold">{user.username}</p>
                              <p className="text-xs text-slate-500">last_active: {formatSecondsAgo(user.secondsAgo)} ago</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-emerald-950 text-emerald-400 text-xs rounded border border-emerald-800">
                            active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Login Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div className="text-xs text-slate-400 mb-4">recent activity ({loginLogs.length} entries)</div>
                {loginLogs.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center bg-slate-900 border border-slate-700 rounded">
                    no login activity
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-800 border-b border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-cyan-400 font-semibold">user</th>
                          <th className="px-4 py-3 text-left text-cyan-400 font-semibold">timestamp</th>
                          <th className="px-4 py-3 text-left text-cyan-400 font-semibold">ip_addr</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {loginLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800 transition-colors">
                            <td className="px-4 py-3 text-emerald-400">{log.username}</td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{formatTime(log.login_time)}</td>
                            <td className="px-4 py-3 text-cyan-400 text-xs font-mono">{log.ip_address || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4 text-xs text-slate-400">
                    {statistics.map((stat) => (
                      <span key={stat.message_type} className="flex items-center gap-2">
                        <span className="text-blue-400">{getTypeIcon(stat.message_type)}</span>
                        <span className="text-slate-500">{stat.message_type}:</span>
                        <span className="text-cyan-400 font-semibold">{stat.count}</span>
                      </span>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300">
                    <input
                      type="checkbox"
                      checked={showExpired}
                      onChange={(e) => setShowExpired(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                    />
                    show_expired
                  </label>
                </div>
                {messages.length === 0 ? (
                  <div className="text-slate-500 text-sm py-8 text-center bg-slate-900 border border-slate-700 rounded">
                    no message history
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded border p-4 transition-colors ${
                          msg.is_expired
                            ? 'bg-slate-900 border-slate-800 opacity-50'
                            : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded font-semibold">
                              {msg.author}
                            </span>
                            <span className="text-xs px-2 py-1 rounded bg-blue-950 text-blue-400 border border-blue-800">
                              {getTypeIcon(msg.message_type)} {msg.message_type}
                            </span>
                            {msg.is_expired && (
                              <span className="text-xs px-2 py-1 rounded bg-red-950 text-red-400 border border-red-800">
                                expired
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            <div>{formatTime(msg.created_at)}</div>
                            <div className="text-slate-600">week: {msg.week_start_date}</div>
                          </div>
                        </div>

                        {msg.message_type === 'text' && (
                          <p className="text-sm text-slate-300 font-mono">{msg.message_content}</p>
                        )}

                        {msg.message_type === 'image' && msg.media_url && (
                          <img
                            src={msg.media_url}
                            alt="shared"
                            className="max-w-xs rounded border border-slate-700 mt-2"
                          />
                        )}

                        {msg.message_type === 'video' && msg.media_url && (
                          <video
                            src={msg.media_url}
                            controls
                            className="max-w-xs rounded border border-slate-700 mt-2"
                          />
                        )}

                        {msg.message_type === 'audio' && msg.media_url && (
                          <div className="mt-2 bg-slate-800 rounded border border-slate-700 p-3 max-w-md">
                            <p className="text-xs text-slate-400 mb-2">
                              {msg.media_filename || 'audio file'}
                            </p>
                            <audio
                              src={msg.media_url}
                              controls
                              className="w-full h-8"
                              preload="metadata"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.7);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.9);
        }
      `}</style>
    </div>
  );
}
