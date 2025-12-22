'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OnlineUser {
  username: string;
  lastSeen: string;
  isOnline: boolean;
}

interface LoginLog {
  id: number;
  username: string;
  ipAddress: string;
  userAgent: string;
  loginAt: string;
  logoutAt: string | null;
}

interface Message {
  id: number;
  author: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  isFromAdmin: boolean;
}

interface Statistics {
  totalMessages: number;
  totalMedia: number;
  thisWeekMessages: number;
  thisWeekMedia: number;
}

export default function StoryAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'readers' | 'activity' | 'notes'>('readers');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);

  // Admin message state
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Authentication check
  useEffect(() => {
    const session = sessionStorage.getItem('story_admin_session');
    if (!session) {
      router.push('/story/admin');
      return;
    }

    verifySession(session);
  }, [router]);

  const verifySession = async (session: string) => {
    try {
      const res = await fetch('/api/story/admin/auth', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        setIsAuthenticated(true);
        loadAllData();
      } else {
        sessionStorage.removeItem('story_admin_session');
        router.push('/story/admin');
      }
    } catch {
      router.push('/story/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${sessionStorage.getItem('story_admin_session')}`
  });

  const loadAllData = async () => {
    await Promise.all([
      loadOnlineUsers(),
      loadLoginLogs(),
      loadMessages()
    ]);
  };

  const loadOnlineUsers = async () => {
    try {
      const res = await fetch('/api/story/admin/online-users', {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error loading online users:', err);
    }
  };

  const loadLoginLogs = async () => {
    try {
      const res = await fetch('/api/story/admin/login-logs', {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error loading login logs:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/story/admin/message-history', {
        headers: getAuthHeader()
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setStatistics(data.statistics || null);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Auto-refresh online users
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(loadOnlineUsers, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) return;

    setSendingMessage(true);
    try {
      const res = await fetch('/api/story/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ message: adminMessage.trim() })
      });

      if (res.ok) {
        setAdminMessage('');
        setMessageSent(true);
        setTimeout(() => setMessageSent(false), 3000);
        await loadMessages();
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Delete media/message from admin
  const deleteMessage = async (messageId: number) => {
    if (!confirm('Delete this item permanently?')) return;

    setDeletingId(messageId);
    try {
      const res = await fetch(`/api/story/admin/delete-media?id=${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });

      if (res.ok) {
        await loadMessages();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('story_admin_session');
    sessionStorage.removeItem('story_admin_username');
    router.push('/story/admin');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const onlineCount = onlineUsers.filter(u => u.isOnline).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <h1 className="text-lg font-semibold text-slate-700">Reading Progress</h1>
              <p className="text-sm text-slate-400">Curriculum Overview</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-400">Active Readers</p>
            <p className="text-2xl font-semibold text-slate-700">{onlineCount}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-400">This Week</p>
            <p className="text-2xl font-semibold text-slate-700">{statistics?.thisWeekMessages || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-400">Total Notes</p>
            <p className="text-2xl font-semibold text-slate-700">{statistics?.totalMessages || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-400">Media Items</p>
            <p className="text-2xl font-semibold text-slate-700">{statistics?.totalMedia || 0}</p>
          </div>
        </div>

        {/* Quick Note Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendAdminMessage()}
              placeholder="Add a reading note for students..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-300 focus:border-transparent outline-none text-slate-700"
              disabled={sendingMessage}
            />
            <button
              onClick={sendAdminMessage}
              disabled={sendingMessage || !adminMessage.trim()}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
            >
              {sendingMessage ? '...' : 'Post'}
            </button>
          </div>
          {messageSent && (
            <p className="text-sm text-green-600 mt-2">Note posted successfully</p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('readers')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'readers'
                  ? 'text-slate-700 border-b-2 border-slate-700 bg-slate-50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Readers {onlineCount > 0 && <span className="ml-1 text-green-500">●</span>}
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-slate-700 border-b-2 border-slate-700 bg-slate-50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Activity Log
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'notes'
                  ? 'text-slate-700 border-b-2 border-slate-700 bg-slate-50'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Notes & Media
            </button>
          </div>

          <div className="p-4">
            {/* Readers Tab */}
            {activeTab === 'readers' && (
              <div className="space-y-2">
                {onlineUsers.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No reader activity yet</p>
                ) : (
                  onlineUsers.map((user, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <span className="text-slate-700 font-medium">{user.username}</span>
                      </div>
                      <span className="text-sm text-slate-400">
                        {user.isOnline ? 'Reading now' : formatTimeAgo(user.lastSeen)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {loginLogs.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No activity recorded</p>
                ) : (
                  loginLogs.slice(0, 50).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="text-slate-700 font-medium">{log.username}</span>
                        <span className="text-slate-400 ml-2">opened story</span>
                      </div>
                      <span className="text-slate-400">{formatDate(log.loginAt)}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Notes & Media Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No notes yet</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg relative group ${msg.isFromAdmin ? 'bg-slate-100' : 'bg-slate-50'}`}
                    >
                      {/* Delete button */}
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete"
                      >
                        {deletingId === msg.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>

                      {msg.content && (
                        <p className="text-slate-700 pr-8">{msg.content}</p>
                      )}
                      {msg.mediaUrl && (
                        <div className="mt-2">
                          {msg.mediaType?.startsWith('image') ? (
                            <img
                              src={msg.mediaUrl}
                              alt=""
                              className="max-w-xs rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => window.open(msg.mediaUrl!, '_blank')}
                            />
                          ) : msg.mediaType?.startsWith('video') ? (
                            <video
                              src={msg.mediaUrl}
                              controls
                              className="max-w-xs rounded-lg"
                            />
                          ) : (
                            <a
                              href={msg.mediaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View attachment
                            </a>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
