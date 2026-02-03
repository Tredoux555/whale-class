// /montree/dashboard/messages/page.tsx
// Teacher messaging inbox - Academic-focused communication

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { MessageCard } from '@/components/montree/messaging/MessageCard';
import { MessageComposer } from '@/components/montree/messaging/MessageComposer';
import { InboxHeader } from '@/components/montree/messaging/InboxHeader';
import { toast, Toaster } from 'sonner';

interface Message {
  id: string;
  child_id: string;
  sender_name: string;
  sender_type: 'teacher' | 'parent';
  subject?: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface Child {
  id: string;
  name: string;
}

interface GroupedMessages {
  [childId: string]: {
    child: Child;
    messages: Message[];
  };
}

export default function TeacherMessagesPage() {
  const router = useRouter();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [children, setChildren] = useState<Map<string, Child>>(new Map());
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Load session
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);
  }, [router]);

  // Load children and messages
  useEffect(() => {
    if (!session?.classroom?.id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Fetch children
        const childRes = await fetch(
          `/api/montree/children?classroom_id=${session.classroom!.id}`
        );
        const childData = await childRes.json();
        const childMap = new Map<string, Child>();
        childData.children?.forEach((child: Child) => {
          childMap.set(child.id, child);
        });
        setChildren(childMap);

        // Fetch messages
        const msgRes = await fetch(
          `/api/montree/messages?classroom_id=${session.classroom!.id}`
        );
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      } catch (error) {
        console.error('Load error:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session?.classroom?.id]);

  // Mark message as read
  const handleMarkRead = async (messageId: string) => {
    try {
      await fetch(`/api/montree/messages/${messageId}`, {
        method: 'PATCH',
      });

      setMessages(msgs =>
        msgs.map(m =>
          m.id === messageId ? { ...m, is_read: true } : m
        )
      );
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  // Handle compose
  const handleSent = () => {
    setComposing(false);
    setSelectedChild(null);
    // Reload messages
    if (session?.classroom?.id) {
      fetch(`/api/montree/messages?classroom_id=${session.classroom.id}`)
        .then(r => r.json())
        .then(data => setMessages(data.messages || []))
        .catch(error => console.error('Reload error:', error));
    }
  };

  // Group messages by child
  const grouped: GroupedMessages = {};
  messages.forEach(msg => {
    if (!grouped[msg.child_id]) {
      grouped[msg.child_id] = {
        child: children.get(msg.child_id) || { id: msg.child_id, name: 'Unknown' },
        messages: [],
      };
    }
    grouped[msg.child_id].messages.push(msg);
  });

  // Filter messages
  let displayGroups = Object.entries(grouped);
  if (filter === 'unread') {
    displayGroups = displayGroups
      .map(([id, group]) => ({
        id,
        ...group,
        messages: group.messages.filter(m => !m.is_read),
      }))
      .filter(g => g.messages.length > 0);
  }

  const unreadCount = messages.filter(m => !m.is_read).length;

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <Toaster position="top-right" />

      {/* Header */}
      <InboxHeader unreadCount={unreadCount} isTeacher={true} />

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Messages list */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    filter === 'all'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  All Messages
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    filter === 'unread'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              <button
                onClick={() => {
                  setComposing(true);
                  setSelectedChild(null);
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-sm font-medium shadow-md transition-all duration-200 flex items-center gap-2"
              >
                <span>✉️</span>
                New Message
              </button>
            </div>

            {/* Compose form */}
            {composing && selectedChild && (
              <div className="animate-slide-up">
                <MessageComposer
                  childId={selectedChild.id}
                  childName={selectedChild.name}
                  senderType="teacher"
                  senderId={session.user?.id || ''}
                  senderName={session.user?.email || 'Teacher'}
                  onSent={handleSent}
                  onCancel={() => {
                    setComposing(false);
                    setSelectedChild(null);
                  }}
                />
              </div>
            )}

            {/* Messages grouped by child */}
            {displayGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-600 mb-6">
                  {filter === 'unread'
                    ? 'You\'re all caught up!'
                    : 'Communication will appear here once parents reach out.'}
                </p>
                <button
                  onClick={() => {
                    setComposing(true);
                    if (children.size > 0) {
                      setSelectedChild(Array.from(children.values())[0]);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Start a conversation
                </button>
              </div>
            ) : (
              displayGroups.map(([childId, group]) => (
                <div key={childId} className="space-y-3">
                  {/* Child header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200">
                    <span className="text-2xl">👶</span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{group.child.name}</h3>
                      <p className="text-xs text-gray-500">
                        {group.messages.length} message{group.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {group.messages.some(m => !m.is_read) && (
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>

                  {/* Messages */}
                  <div className="space-y-2">
                    {group.messages.map(msg => (
                      <MessageCard
                        key={msg.id}
                        message={msg}
                        childName={group.child.name}
                        onRead={() => handleMarkRead(msg.id)}
                        onReply={() => {
                          setSelectedChild(group.child);
                          setComposing(true);
                        }}
                        isTeacher={true}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1">
            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📊</span>
                Overview
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-sm text-gray-700">Total Messages</span>
                  <span className="font-bold text-emerald-700 text-lg">{messages.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <span className="text-sm text-gray-700">Unread</span>
                  <span className="font-bold text-orange-700 text-lg">{unreadCount}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-sm text-gray-700">Children</span>
                  <span className="font-bold text-blue-700 text-lg">{displayGroups.length}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>💡</span>
                Best Practices
              </h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex gap-2">
                  <span>✓</span>
                  <span>Keep messages focused on learning and development</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span>Share specific observations and examples</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span>Respond within 24-48 hours when possible</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span>Use positive, constructive language</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
