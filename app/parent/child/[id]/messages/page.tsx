'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Message {
  id: string;
  sender_type: 'teacher' | 'parent';
  sender_name: string;
  message: string;
  created_at: string;
}

export default function ParentMessagesPage() {
  const params = useParams();
  const childId = params.id as string;
  const [childName, setChildName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChild();
    fetchMessages();
  }, [childId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChild = async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      const data = await res.json();
      if (data.child) setChildName(data.child.name);
    } catch (e) { console.error(e); }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?child_id=${childId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          sender_type: 'parent',
          sender_name: 'Parent',
          message: newMessage.trim()
        })
      });
      setNewMessage('');
      fetchMessages();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  const formatDate = (date: string) => {
    const d = new Date(date);
    if (d.toDateString() === new Date().toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">💬</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex flex-col">
      <header className="bg-purple-600 text-white px-4 py-4">
        <Link href={`/parent/child/${childId}`} className="text-purple-200 text-sm hover:text-white">
          ← Back to {childName}
        </Link>
        <h1 className="text-xl font-bold mt-1">💬 Messages</h1>
        <p className="text-purple-200 text-sm">Chat with {childName}&apos;s teacher</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <span className="text-5xl block mb-2">💬</span>
            <p>No messages yet</p>
            <p className="text-sm">Send a message to start chatting</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const showDate = i === 0 || formatDate(msg.created_at) !== formatDate(messages[i-1].created_at);
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="text-center text-xs text-gray-400 my-2">{formatDate(msg.created_at)}</div>
                )}
                <div className={`flex ${msg.sender_type === 'parent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                    msg.sender_type === 'parent' 
                      ? 'bg-purple-600 text-white rounded-br-md' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.sender_type === 'teacher' && (
                      <p className="text-xs font-medium text-purple-600 mb-1">{msg.sender_name}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${msg.sender_type === 'parent' ? 'text-purple-200' : 'text-gray-500'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-full font-medium disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
