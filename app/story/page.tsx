'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RecentMessage {
  id: number;
  type: string;
  author: string;
  created_at: string;
  hasMedia: boolean;
}

export default function StoryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const router = useRouter();

  // Load recent messages on mount
  useEffect(() => {
    fetch('/api/story/recent-messages')
      .then(r => r.json())
      .then(data => setRecentMessages(data.messages || []))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/story/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('story_session', data.session);
        router.push(`/story/${data.session}`);
      } else {
        setError(data.details || data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '📷';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      default: return '💬';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Login Card */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
            Classroom Activities
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Weekly learning updates for parents
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Parent Name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Access Code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                autoComplete="off"
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
            >
              {isLoading ? 'Loading...' : 'View Activities'}
            </button>
          </form>
        </div>

        {/* Recent Activity Preview */}
        {recentMessages.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
              <span>✨</span> Recent Updates
            </h2>
            <div className="space-y-2">
              {recentMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm"
                >
                  <span className="text-lg">{getTypeIcon(msg.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">{msg.author}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-500">
                      {msg.type === 'text' ? 'sent a message' : 
                       msg.type === 'image' ? 'shared a photo' :
                       msg.type === 'video' ? 'shared a video' :
                       msg.type === 'audio' ? 'shared a song' : 'posted'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              Login to see full content
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
