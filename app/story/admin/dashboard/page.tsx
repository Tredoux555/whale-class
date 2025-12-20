'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginLog {
  id: number;
  username: string;
  login_time: string;
  ip_address: string;
  user_agent: string;
}

interface MessageHistory {
  id: number;
  week_start_date: string;
  message_type: 'text' | 'image' | 'video';
  message_content: string | null;
  media_url: string | null;
  media_filename: string | null;
  author: string;
  created_at: string;
  expires_at: string | null;
  is_expired: boolean;
}

interface Statistics {
  message_type: string;
  count: string;
  expired_count: string;
}

export default function StoryAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'logs' | 'messages'>('logs');
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [messages, setMessages] = useState<MessageHistory[]>([]);
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  
  // Admin message sending state
  const [adminMessage, setAdminMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [messageError, setMessageError] = useState('');

  useEffect(() => {
    verifySession();
  }, []);

  useEffect(() => {
    if (adminUsername) {
      if (activeTab === 'logs') {
        fetchLoginLogs();
      } else {
        fetchMessageHistory();
      }
    }
  }, [activeTab, adminUsername]);

  const verifySession = async () => {
    const session = sessionStorage.getItem('story_admin_session');
    
    if (!session) {
      router.push('/story/admin');
      return;
    }

    try {
      const res = await fetch('/api/story/admin/auth', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (!res.ok) {
        sessionStorage.removeItem('story_admin_session');
        router.push('/story/admin');
        return;
      }

      const data = await res.json();
      setAdminUsername(data.username);
      setIsLoading(false);
    } catch (err) {
      console.error('Session verification error:', err);
      router.push('/story/admin');
    }
  };

  const fetchLoginLogs = async () => {
    const session = sessionStorage.getItem('story_admin_session');
    
    try {
      const res = await fetch('/api/story/admin/login-logs?limit=100', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs);
      } else {
        setError('Failed to fetch login logs');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const fetchMessageHistory = async () => {
    const session = sessionStorage.getItem('story_admin_session');
    
    try {
      const res = await fetch('/api/story/admin/message-history?limit=200&showExpired=false', {
        headers: { 'Authorization': `Bearer ${session}` }
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setStatistics(data.statistics);
      } else {
        setError('Failed to fetch message history');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('story_admin_session');
    router.push('/story/admin');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sendAdminMessage = async () => {
    if (!adminMessage.trim()) return;
    
    setSendingMessage(true);
    setMessageError('');
    setMessageSent(false);

    const session = sessionStorage.getItem('story_admin_session');
    if (!session) {
      setMessageError('Session expired. Please log in again.');
      setSendingMessage(false);
      return;
    }

    try {
      const res = await fetch('/api/story/admin/send-message', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ 
          message: adminMessage.trim(),
          author: adminUsername || 'Admin'
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessageSent(true);
        setAdminMessage('');
        // Auto-hide success message after 3 seconds
        setTimeout(() => setMessageSent(false), 3000);
        // Refresh message history if on messages tab
        if (activeTab === 'messages') {
          fetchMessageHistory();
        }
      } else {
        setMessageError(data.error || 'Failed to send message');
      }
    } catch (err) {
      setMessageError('Network error. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📊 Story Admin Dashboard
            </h1>
            <p className="text-sm text-gray-600">Logged in as: {adminUsername}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        <div className="flex space-x-4 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🔑 Login Logs ({loginLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'messages'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            💬 Message History ({messages.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Admin Message Sender */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            💬 Send Secret Message
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Send a message that will appear when users click the first 't' in the story.
          </p>
          
          <div className="space-y-4">
            <textarea
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              placeholder="Type your secret message here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={3}
              disabled={sendingMessage}
            />
            
            <div className="flex items-center gap-4">
              <button
                onClick={sendAdminMessage}
                disabled={sendingMessage || !adminMessage.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {sendingMessage ? '⏳ Sending...' : '📤 Send Message'}
              </button>
              
              {messageSent && (
                <span className="text-green-600 font-medium">
                  ✅ Message sent successfully!
                </span>
              )}
              
              {messageError && (
                <span className="text-red-600 font-medium">
                  ❌ {messageError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Login Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Username
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      User Agent
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No login logs found
                      </td>
                    </tr>
                  ) : (
                    loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(log.login_time)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {log.username}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                          {log.user_agent}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Message History Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* Statistics */}
            {statistics.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statistics.map((stat) => (
                  <div key={stat.message_type} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="text-sm text-gray-600 uppercase font-semibold mb-2">
                      {stat.message_type === 'text' ? '💬 Text' : stat.message_type === 'image' ? '🖼️ Images' : '🎥 Videos'}
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stat.count}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {stat.expired_count} expired
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Messages List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No messages found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {messages.map((msg) => (
                      <div key={msg.id} className="p-6 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">
                              {msg.message_type === 'text' ? '💬' : msg.message_type === 'image' ? '🖼️' : '🎥'}
                            </span>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {msg.author}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDate(msg.created_at)}
                              </div>
                            </div>
                          </div>
                          {msg.is_expired && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                              Expired
                            </span>
                          )}
                        </div>

                        {msg.message_type === 'text' && (
                          <div className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                            {msg.message_content}
                          </div>
                        )}

                        {msg.message_type === 'image' && msg.media_url && (
                          <div>
                            <img 
                              src={msg.media_url} 
                              alt={msg.media_filename || 'Image'}
                              className="max-w-md rounded-lg shadow-sm"
                            />
                            <div className="text-xs text-gray-500 mt-2">
                              {msg.media_filename}
                            </div>
                          </div>
                        )}

                        {msg.message_type === 'video' && msg.media_url && (
                          <div>
                            <video 
                              src={msg.media_url} 
                              controls
                              className="max-w-md rounded-lg shadow-sm"
                            />
                            <div className="text-xs text-gray-500 mt-2">
                              {msg.media_filename}
                            </div>
                          </div>
                        )}

                        {msg.expires_at && (
                          <div className="text-xs text-gray-500 mt-3">
                            Expires: {formatDate(msg.expires_at)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



