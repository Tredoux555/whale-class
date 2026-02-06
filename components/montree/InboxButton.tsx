// components/montree/InboxButton.tsx
// Floating inbox button + slide-out message panel for teachers/principals
'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_type: 'admin' | 'user';
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface InboxButtonProps {
  conversationId: string;  // teacher ID, principal ID, or lead ID
  userName: string;
}

export default function InboxButton({ conversationId, userName }: InboxButtonProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fetchFailCountRef = useRef(0);
  const [connectionError, setConnectionError] = useState(false);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Fetch messages
  const fetchMessages = async (fullFetch = true) => {
    try {
      if (fullFetch) {
        setLoadingMessages(true);
      }

      const res = await fetch(
        `/api/montree/dm?conversation_id=${conversationId}&reader_type=user`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      if (!isMountedRef.current) return; // Bail if unmounted

      setMessages(data.messages || []);
      setUnreadCount(data.unread_count || 0);

      // Reset error tracking on success
      fetchFailCountRef.current = 0;
      setConnectionError(false);
    } catch (err) {
      if (!isMountedRef.current) return; // Bail if unmounted
      const failCount = ++fetchFailCountRef.current;
      // Log first failure for debugging, then quiet until threshold
      if (failCount === 1) {
        console.warn('Inbox fetch failed:', err);
      }
      if (failCount >= 3) {
        console.warn('Inbox: persistent connection issue after', failCount, 'attempts');
        setConnectionError(true);
      }
    } finally {
      if (fullFetch && isMountedRef.current) {
        setLoadingMessages(false);
      }
    }
  };

  // Smart polling based on panel state
  useEffect(() => {
    // Initial fetch when panel opens
    if (open) {
      fetchMessages(true);
    }

    // Set up polling interval based on panel state
    const pollingInterval = open ? 15000 : 60000; // 15s when open, 60s when closed
    const interval = setInterval(() => {
      fetchMessages(false); // lightweight check, don't show loading spinner
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [conversationId, open]);

  // Mark as read when opened
  useEffect(() => {
    if (open && unreadCount > 0) {
      fetch('/api/montree/dm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, reader_type: 'user' })
      }).then(() => {
        if (!isMountedRef.current) return;
        setUnreadCount(0);
        setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      }).catch(() => {}); // Silently handle — polling will retry
    }
  }, [open, conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/montree/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_name: userName,
          message: newMessage.trim()
        })
      });

      if (!isMountedRef.current) return;

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        // Refresh messages and unread count after successful send
        await fetchMessages(false);
      }
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      if (isMountedRef.current) {
        setSending(false);
      }
    }
  };

  return (
    <>
      {/* Inbox icon button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium"
        title="Messages"
      >
        ✉️
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">Messages</h2>
                <p className="text-slate-400 text-xs">Direct line to Montree</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">Loading...</p>
                </div>
              ) : connectionError ? (
                <div className="text-center py-12">
                  <span className="text-4xl block mb-3">⚠️</span>
                  <p className="text-slate-400 text-sm">Connection issue</p>
                  <p className="text-slate-500 text-xs mt-1">Please try again later</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-4xl block mb-3">👋</span>
                  <p className="text-slate-400 text-sm">No messages yet</p>
                  <p className="text-slate-500 text-xs mt-1">Send a message and I&apos;ll get back to you</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.sender_type === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-slate-800 text-white rounded-bl-md'
                      }`}
                    >
                      {msg.sender_type === 'admin' && (
                        <p className="text-emerald-400 text-xs font-medium mb-1">{msg.sender_name}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'user' ? 'text-emerald-200/50' : 'text-slate-500'}`}>
                        {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — pb-16 to avoid overlap with floating feedback button */}
            <div className="p-3 pb-16 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="px-4 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                >
                  {sending ? '...' : '→'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
