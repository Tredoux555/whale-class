'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface OnlineUser {
  username: string;
  last_seen_at: string;
  session_started: string;
}

interface LoginLog {
  id: number;
  username: string;
  ip_address: string;
  user_agent: string;
  login_at: string;
  logout_at: string | null;
}

interface Message {
  id: number;
  weekStartDate: string;
  author: string;
  type: 'text' | 'image' | 'video';
  content: string | null;
  mediaUrl: string | null;
  mediaFilename: string | null;
  isFromAdmin: boolean;
  isExpired: boolean;
  createdAt: string;
}

interface Stats {
  total_messages: string;
  text_count: string;
  image_count: string;
  video_count: string;
  unique_authors: string;
}

type Tab = 'online' | 'logs' | 'messages';

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('online');
  
  // Online users
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Login logs
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loginStats, setLoginStats] = useState<any>(null);
  
  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageStats, setMessageStats] = useState<Stats | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  
  // Admin message
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const adminSession = sessionStorage.getItem('story_admin_session');
    if (!adminSession) {
      router.push('/story/admin');
      return;
    }
    setSession(adminSession);
  }, [router]);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/story/admin/online-users', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers);
        setOnlineCount(data.onlineCount);
        setTotalUsers(data.totalUsers);
      } else if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem('story_admin_session');
        router.push('/story/admin');
      }
    } catch (err) {
      console.error('Failed to fetch online users:', err);
    }
  }, [session, router]);

  // Fetch login logs
  const fetchLoginLogs = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/story/admin/login-logs', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs);
        setLoginStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch login logs:', err);
    }
  }, [session]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!session) return;
    try {
      let url = '/api/story/admin/message-history?limit=100';
      if (messageFilter !== 'all') url += `&type=${messageFilter}`;
      if (weekFilter !== 'all') url += `&week=${weekFilter}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setMessageStats(data.stats);
        setAvailableWeeks(data.availableWeeks);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [session, messageFilter, weekFilter]);

  // Auto-refresh online users
  useEffect(() => {
    if (session && activeTab === 'online') {
      fetchOnlineUsers();
      const interval = setInterval(fetchOnlineUsers, 5000);
      return () => clearInterval(interval);
    }
  }, [session, activeTab, fetchOnlineUsers]);

  // Fetch data when tab changes
  useEffect(() => {
    if (!session) return;
    if (activeTab === 'logs') fetchLoginLogs();
    if (activeTab === 'messages') fetchMessages();
  }, [session, activeTab, fetchLoginLogs, fetchMessages]);

  // Refetch messages when filters change
  useEffect(() => {
    if (activeTab === 'messages') fetchMessages();
  }, [messageFilter, weekFilter, fetchMessages, activeTab]);

  // Send admin message
  const sendAdminMessage = async () => {
    if (!adminMessage.trim() || !session) return;
    
    setSendingMessage(true);
    try {
      const res = await fetch('/api/story/admin/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ message: adminMessage.trim() })
      });

      if (res.ok) {
        setMessageSent(true);
        setAdminMessage('');
        setTimeout(() => setMessageSent(false), 3000);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem('story_admin_session');
    sessionStorage.removeItem('story_admin_username');
    router.push('/story/admin');
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <h1 className="text-xl font-bold">Story Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Logout →
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Send Message Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">📤 Send Secret Message</h2>
          <p className="text-slate-400 text-sm mb-4">
            This message will appear when users click the first 't' in the story.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendAdminMessage()}
              placeholder="Type your secret message..."
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={sendAdminMessage}
              disabled={sendingMessage || !adminMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {sendingMessage ? '⏳' : '📤'} Send
            </button>
          </div>
          {messageSent && (
            <p className="text-green-400 text-sm mt-2">✅ Message sent successfully!</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'online', label: "Who's Online", icon: '🟢' },
            { id: 'logs', label: 'Login Logs', icon: '📋' },
            { id: 'messages', label: 'Message History', icon: '💬' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800 rounded-xl p-6">
          {/* Online Users Tab */}
          {activeTab === 'online' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Currently Online</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-400">🟢 {onlineCount} online</span>
                  <span className="text-slate-400">👥 {totalUsers} total users</span>
                </div>
              </div>
              
              {onlineUsers.length > 0 ? (
                <div className="space-y-3">
                  {onlineUsers.map((user, idx) => (
                    <div key={idx} className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">👤</span>
                        <div>
                          <p className="font-bold">{user.username}</p>
                          <p className="text-slate-400 text-sm">
                            Session started: {new Date(user.session_started).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-green-400">● Active</p>
                        <p className="text-slate-400">
                          Last seen: {new Date(user.last_seen_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No users currently online</p>
              )}
            </div>
          )}

          {/* Login Logs Tab */}
          {activeTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Login History</h2>
                {loginStats && (
                  <div className="flex gap-4 text-sm">
                    <span className="text-slate-400">24h: {loginStats.last_24h}</span>
                    <span className="text-slate-400">7d: {loginStats.last_7d}</span>
                    <span className="text-slate-400">Total: {loginStats.total_logins}</span>
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                      <th className="pb-3">User</th>
                      <th className="pb-3">IP Address</th>
                      <th className="pb-3">Login Time</th>
                      <th className="pb-3">Logout Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/50">
                        <td className="py-3 font-medium">{log.username}</td>
                        <td className="py-3 text-slate-400 font-mono text-sm">{log.ip_address}</td>
                        <td className="py-3 text-sm">{new Date(log.login_at).toLocaleString()}</td>
                        <td className="py-3 text-sm text-slate-400">
                          {log.logout_at ? new Date(log.logout_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold">Message History</h2>
                <div className="flex gap-3">
                  <select
                    value={messageFilter}
                    onChange={(e) => setMessageFilter(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="text">Text</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                  </select>
                  <select
                    value={weekFilter}
                    onChange={(e) => setWeekFilter(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1 text-sm"
                  >
                    <option value="all">All Weeks</option>
                    {availableWeeks.map((week) => (
                      <option key={week} value={week}>
                        Week of {new Date(week).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {messageStats && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{messageStats.total_messages}</p>
                    <p className="text-slate-400 text-sm">Total</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{messageStats.text_count}</p>
                    <p className="text-slate-400 text-sm">Text</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{messageStats.image_count}</p>
                    <p className="text-slate-400 text-sm">Images</p>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{messageStats.video_count}</p>
                    <p className="text-slate-400 text-sm">Videos</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`bg-slate-700 rounded-lg p-4 ${msg.isExpired ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {msg.type === 'text' ? '💬' : msg.type === 'image' ? '🖼️' : '🎬'}
                        </span>
                        <div>
                          <p className="font-medium">
                            {msg.author}
                            {msg.isFromAdmin && (
                              <span className="ml-2 text-xs bg-indigo-600 px-2 py-0.5 rounded">Admin</span>
                            )}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {msg.isExpired && (
                        <span className="text-xs bg-red-600/30 text-red-400 px-2 py-1 rounded">Expired</span>
                      )}
                    </div>
                    {msg.type === 'text' && msg.content && (
                      <p className="mt-3 text-slate-300">{msg.content}</p>
                    )}
                    {msg.type === 'image' && msg.mediaUrl && (
                      <img 
                        src={msg.mediaUrl} 
                        alt="" 
                        className="mt-3 max-h-48 rounded-lg"
                      />
                    )}
                    {msg.type === 'video' && msg.mediaUrl && (
                      <video 
                        src={msg.mediaUrl} 
                        controls 
                        className="mt-3 max-h-48 rounded-lg"
                      />
                    )}
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-slate-400 text-center py-8">No messages found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
