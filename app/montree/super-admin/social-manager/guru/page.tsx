'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function SocialGuruPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/montree/social-guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/montree/super-admin/social-manager"
            className="text-slate-400 hover:text-white transition-colors text-sm inline-flex items-center gap-2 mb-4"
          >
            ← Back to Social Manager
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>🧠</span> Social Media Guru
              </h1>
              <p className="text-slate-400 mt-1">
                AI advisor trained on Instagram, TikTok, Facebook, LinkedIn strategy
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Clear Chat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Social Media Guru is Ready
              </h2>
              <p className="text-slate-400 mb-6">
                Ask me about Instagram strategy, caption writing, hashtags, or platform best practices
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <button
                  onClick={() =>
                    setInput('Write an Instagram caption for our onboarding reel')
                  }
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-colors border border-slate-700"
                >
                  <div className="text-purple-400 font-medium mb-1">
                    Caption Writing
                  </div>
                  <div className="text-slate-300 text-sm">
                    Write an Instagram caption for our onboarding reel
                  </div>
                </button>
                <button
                  onClick={() => setInput('What hashtags should I use for a TikTok about teacher burnout?')}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-colors border border-slate-700"
                >
                  <div className="text-emerald-400 font-medium mb-1">
                    Hashtag Strategy
                  </div>
                  <div className="text-slate-300 text-sm">
                    What hashtags should I use for a TikTok about teacher burnout?
                  </div>
                </button>
                <button
                  onClick={() => setInput("When's the best time to post on Instagram?")}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-colors border border-slate-700"
                >
                  <div className="text-blue-400 font-medium mb-1">
                    Instagram Timing
                  </div>
                  <div className="text-slate-300 text-sm">
                    When's the best time to post on Instagram?
                  </div>
                </button>
                <button
                  onClick={() => setInput('Create 3 hashtag sets for Montree that I can rotate')}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left transition-colors border border-slate-700"
                >
                  <div className="text-amber-400 font-medium mb-1">
                    Hashtag Sets
                  </div>
                  <div className="text-slate-300 text-sm">
                    Create 3 hashtag sets for Montree that I can rotate
                  </div>
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  🧠
                </div>
              )}
              <div
                className={`max-w-3xl rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                  You
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                🧠
              </div>
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.4s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-6 border-t border-slate-700">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about captions, hashtags, posting strategy..."
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
