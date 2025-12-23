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

type TabType = 'online' | 'logs' | 'messages';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('online');
  
  // Online users state
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Login logs state
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  
  // Admin message state
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

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

  // Initial load
  useEffect(() => {
    const init = async () => {
      const valid = await verifySession();
      if (valid) {
        await Promise.all([loadOnlineUsers(), loadLoginLogs(), loadMessages()]);
      }
      setIsLoading(false);
    };
    init();
  }, [verifySession, loadOnlineUsers, loadLoginLogs, loadMessages]);

  // Refresh online users every 5 seconds
  useEffect(() => {
    if (activeTab === 'online') {
      const interval = setInterval(loadOnlineUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadOnlineUsers]);

  // Reload messages when showExpired changes
  useEffect(() => {
    if (activeTab === 'messages') {
      loadMessages();
    }
  }, [showExpired, activeTab, loadMessages]);

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

  const handleLogout = () => {
    sessionStorage.removeItem('story_admin_session');
    router.push('/story/admin');
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSecondsAgo = (seconds: number) => {
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '💬';
      case 'image': return '📷';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      default: return '📎';
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'text': return 'bg-blue-100 text-blue-700';
      case 'image': return 'bg-green-100 text-green-700';
      case 'video': return 'bg-purple-100 text-purple-700';
      case 'audio': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Classroom Manager</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Send Note Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-700">Send Teacher Note</h2>
          <p className="text-sm text-gray-500 mb-3">
            This note will appear when parents view the weekly activities.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Type your note for parents..."
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              disabled={sendingMessage}
              onKeyPress={(e) => e.key === 'Enter' && sendAdminMessage()}
            />
            <button
              onClick={sendAdminMessage}
              disabled={sendingMessage || !adminMessage.trim()}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              {sendingMessage ? 'Sending...' : 'Send'}
            </button>
          </div>
          {messageSent && (
            <p className="mt-2 text-sm text-green-600">✓ Note sent successfully!</p>
          )}
          {messageError && (
            <p className="mt-2 text-sm text-red-600">✗ {messageError}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="flex border-b">
            {(['online', 'logs', 'messages'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'online' && `Active Users (${onlineCount})`}
                {tab === 'logs' && 'Activity Logs'}
                {tab === 'messages' && 'Note History'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Online Users Tab */}
            {activeTab === 'online' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">
                    {onlineCount} of {totalUsers} users active (last 10 minutes)
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm text-gray-500">Auto-refreshing</span>
                  </div>
                </div>

                {onlineUsers.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No users currently active</p>
                ) : (
                  <div className="space-y-3">
                    {onlineUsers.map((user) => (
                      <div
                        key={user.username}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.username[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{user.username}</p>
                            <p className="text-sm text-gray-500">
                              Last active: {formatSecondsAgo(user.secondsAgo)}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Login Logs Tab */}
            {activeTab === 'logs' && (
              <div>
                <p className="text-sm text-gray-500 mb-4">Recent user activity</p>
                
                {loginLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No activity logs yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 border-b">
                          <th className="pb-3">User</th>
                          <th className="pb-3">Time</th>
                          <th className="pb-3">IP Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginLogs.map((log) => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-3 font-medium">{log.username}</td>
                            <td className="py-3 text-gray-600">{formatTime(log.login_time)}</td>
                            <td className="py-3 text-gray-500 font-mono text-sm">
                              {log.ip_address || 'Unknown'}
                            </td>
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
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    {statistics.map((stat) => (
                      <span key={stat.message_type} className="text-sm text-gray-500 flex items-center gap-1">
                        {getTypeIcon(stat.message_type)} {stat.message_type}: <strong>{stat.count}</strong>
                      </span>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showExpired}
                      onChange={(e) => setShowExpired(e.target.checked)}
                      className="rounded"
                    />
                    Show expired
                  </label>
                </div>

                {messages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No notes yet</p>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border ${
                          msg.is_expired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-800">{msg.author}</span>
                              <span className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${getTypeBadgeClass(msg.message_type)}`}>
                                {getTypeIcon(msg.message_type)} {msg.message_type}
                              </span>
                              {msg.is_expired && (
                                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                  Expired
                                </span>
                              )}
                            </div>
                            
                            {msg.message_type === 'text' && (
                              <p className="text-gray-700">{msg.message_content}</p>
                            )}
                            
                            {msg.message_type === 'image' && msg.media_url && (
                              <img
                                src={msg.media_url}
                                alt="Shared"
                                className="max-w-xs rounded mt-2"
                              />
                            )}
                            
                            {msg.message_type === 'video' && msg.media_url && (
                              <video
                                src={msg.media_url}
                                controls
                                className="max-w-xs rounded mt-2"
                              />
                            )}

                            {msg.message_type === 'audio' && msg.media_url && (
                              <div className="mt-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 max-w-md">
                                <p className="text-sm text-gray-600 mb-2">
                                  🎵 {msg.media_filename || 'Audio file'}
                                </p>
                                <audio
                                  src={msg.media_url}
                                  controls
                                  className="w-full h-10"
                                  preload="metadata"
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right text-sm text-gray-500">
                            <p>{formatTime(msg.created_at)}</p>
                            <p className="text-xs">Week: {msg.week_start_date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
