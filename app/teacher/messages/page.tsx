'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  avatar_emoji?: string;
}

interface Message {
  id: string;
  child_id: string;
  sender_type: 'teacher' | 'parent';
  sender_name: string;
  message: string;
  created_at: string;
}

export default function TeacherMessagesPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) { router.push('/teacher'); return; }
    setTeacherName(name);
    fetchChildren();
  }, [router]);

  useEffect(() => {
    if (selectedChild) fetchMessages();
  }, [selectedChild]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/children');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchMessages = async () => {
    if (!selectedChild) return;
    const res = await fetch(`/api/messages?child_id=${selectedChild.id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  };

  const sendMessage = async () => {
    if (!selectedChild || !newMessage.trim()) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: selectedChild.id,
          sender_type: 'teacher',
          sender_name: teacherName,
          message: newMessage.trim()
        })
      });
      setNewMessage('');
      fetchMessages();
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">💬</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <header className="bg-blue-600 text-white px-4 py-4 flex items-center gap-3">
        <Link href="/teacher/dashboard" className="text-blue-200 hover:text-white">←</Link>
        <div>
          <h1 className="font-bold">💬 Messages</h1>
          <p className="text-blue-200 text-sm">Chat with parents</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Child List */}
        <div className="w-24 bg-white border-r overflow-y-auto">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`w-full p-3 text-center border-b hover:bg-blue-50 ${
                selectedChild?.id === child.id ? 'bg-blue-100' : ''
              }`}
            >
              <span className="text-2xl block">{child.avatar_emoji || '👶'}</span>
              <span className="text-xs truncate block">{child.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {!selectedChild ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="text-5xl block mb-2">👈</span>
                <p>Select a child to message their parents</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 px-4 py-2 border-b">
                <span className="font-medium">{selectedChild.name}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const showDate = i === 0 || formatDate(msg.created_at) !== formatDate(messages[i-1].created_at);
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center text-xs text-gray-400 my-2">{formatDate(msg.created_at)}</div>
                      )}
                      <div className={`flex ${msg.sender_type === 'teacher' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          msg.sender_type === 'teacher' 
                            ? 'bg-blue-600 text-white rounded-br-md' 
                            : 'bg-gray-200 text-gray-800 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.sender_type === 'teacher' ? 'text-blue-200' : 'text-gray-500'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium disabled:opacity-50"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
