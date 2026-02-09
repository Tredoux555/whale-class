'use client';

// /home/dashboard/guru/page.tsx
// Montessori AI Advisor - Chat interface for parenting guidance
// Personalized suggestions based on child's progress and observations

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface ChildInfo {
  id: string;
  name: string;
  age: number;
}

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: Array<{ priority: number; suggestion: string; details: string }>;
  tips?: string[];
}

interface ConversationHistory {
  id: string;
  asked_at: string;
  question: string;
  response_insight: string;
  response_suggestions?: Array<{ priority: number; suggestion: string; details: string }>;
}

const QUICK_SUGGESTIONS = [
  "What should my child work on next?",
  "How do I present a new work?",
  "My child seems frustrated with...",
  "How can I encourage independence?",
  "What's a good next step after mastery?",
  "How do I support concentration?",
];

export default function GuruPage() {
  const router = useRouter();

  const [session, setSession] = useState<HomeSession | null>(null);
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load session and children
  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);

    loadChildren();
  }, [router]);

  const loadChildren = async () => {
    try {
      const sess = getHomeSession();
      if (!sess) return;

      const res = await fetch(`/api/home/children?family_id=${sess.family.id}`);
      const data = await res.json();

      if (data.success) {
        const childList = data.children || [];
        setChildren(childList);
        if (childList.length > 0) {
          setSelectedChildId(childList[0].id);
          loadConversationHistory(childList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load children:', err);
      toast.error('Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationHistory = async (childId: string) => {
    try {
      const sess = getHomeSession();
      if (!sess) return;

      const res = await fetch(
        `/api/home/guru?child_id=${childId}&family_id=${sess.family.id}&limit=20`
      );
      const data = await res.json();

      if (data.success && data.history) {
        // Convert history to messages
        const historyMessages: Message[] = [];
        for (const item of data.history.reverse()) {
          historyMessages.push({
            id: item.id,
            type: 'user',
            content: item.question,
            timestamp: item.asked_at,
          });
          historyMessages.push({
            id: `${item.id}-response`,
            type: 'assistant',
            content: item.response_insight,
            timestamp: item.asked_at,
            suggestions: item.response_suggestions,
          });
        }
        setMessages(historyMessages);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    }
  };

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId);
    setMessages([]);
    loadConversationHistory(childId);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!session || !selectedChildId) return;

    const text = messageText.trim();
    if (!text) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);
    setTyping(true);

    try {
      const res = await fetch('/api/home/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: selectedChildId,
          family_id: session.family.id,
          question: text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.insight || 'No response',
          timestamp: new Date().toISOString(),
          suggestions: data.suggestions,
          tips: data.parent_tips,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast.error(data.error || 'Failed to get response');
        // Remove the user message if request failed
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } catch (err) {
      console.error('Send error:', err);
      toast.error('Failed to send message');
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-bounce text-5xl mb-4">🧙</div>
          <p className="text-gray-600">Loading your Montessori advisor...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access the advisor</p>
        </div>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with Child Selector */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Montessori Advisor</h2>
          <span className="text-sm text-emerald-100">🧙 AI Powered</span>
        </div>

        {/* Child Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => handleChildChange(child.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedChildId === child.id
                  ? 'bg-white text-emerald-600'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🧙</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Hello! I'm your Montessori Advisor
            </h3>
            <p className="text-sm text-gray-600 max-w-xs mb-6">
              I'm here to help you navigate your child's Montessori journey at home. Ask me anything about
              {selectedChild && ` ${selectedChild.name}'s`} development, learning strategies, or practical tips.
            </p>

            {/* Quick Suggestions */}
            <div className="w-full max-w-md space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Try asking:</p>
              {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(suggestion)}
                  className="w-full px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm rounded-lg transition-colors text-left border border-emerald-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md space-y-2 ${
                    message.type === 'user'
                      ? 'bg-emerald-500 text-white rounded-3xl rounded-tr-lg'
                      : 'bg-gray-100 text-gray-800 rounded-3xl rounded-tl-lg'
                  } px-4 py-2.5`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="space-y-2 mt-3 pt-3 border-t border-gray-300 border-opacity-30">
                      {message.suggestions.map((sugg, idx) => (
                        <div key={idx} className="text-xs">
                          <p className="font-semibold opacity-90">
                            {idx + 1}. {sugg.suggestion}
                          </p>
                          {sugg.details && (
                            <p className="opacity-75 mt-0.5">{sugg.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tips */}
                  {message.tips && message.tips.length > 0 && (
                    <div className="space-y-1 mt-3 pt-3 border-t border-gray-300 border-opacity-30">
                      <p className="text-xs font-semibold opacity-90">Parent Tips:</p>
                      {message.tips.map((tip, idx) => (
                        <p key={idx} className="text-xs opacity-75">
                          • {tip}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-3xl rounded-tl-lg px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your child's learning..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={sending || !inputValue.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed"
          >
            {sending ? '...' : '→'}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          💡 Personalized advice based on {selectedChild?.name}'s progress and your observations
        </p>
      </div>
    </div>
  );
}
