// /montree/parent/messages/page.tsx
// Parent messaging inbox - View and reply to teacher messages

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getParentSession, type ParentSession } from '@/lib/montree/parent-auth';
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
  photo_url?: string;
}

interface GroupedMessages {
  [childId: string]: {
    child: Child;
    messages: Message[];
  };
}

export default function ParentMessagesPage() {
  const router = useRouter();
  const [session, setSession] = useState<ParentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'from_teacher'>('all');

  // Load session
  useEffect(() => {
    const sess = getParentSession();
    if (!sess) {
      router.push('/montree/parent/login');
      return;
    }
    setSession(sess);
  }, [router]);

  // Load children and messages
  useEffect(() => {
    if (!session?.parent?.id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Fetch parent's children
        const childRes = await fetch(
          `/api/montree/parent/children?parent_id=${session.parent!.id}`
        );
        const childData = await childRes.json();
        setChildren(childData.children || []);

        // Fetch messages
        const msgRes = await fetch(
          `/api/montree/messages?parent_id=${session.parent!.id}`
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
  }, [session?.parent?.id]);

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
    // Reload messages
    if (session?.parent?.id) {
      fetch(`/api/montree/messages?parent_id=${session.parent.id}`)
        .then(r => r.json())
        .then(data => setMessages(data.messages || []))
        .catch(error => console.error('Reload error:', error));
    }
  };

  // Group messages by child
  const grouped: GroupedMessages = {};
  messages.forEach(msg => {
    const child = children.find(c => c.id === msg.child_id);
    if (!grouped[msg.child_id]) {
      grouped[msg.child_id] = {
        child: child || { id: msg.child_id, name: 'Unknown' },
        messages: [],
      };
    }
    grouped[msg.child_id].messages.push(msg);
  });

  // Apply filters
  let displayGroups = Object.entries(grouped);
  if (filter === 'unread') {
    displayGroups = displayGroups
      .map(([id, group]) => ({
        id,
        ...group,
        messages: group.messages.filter(m => !m.is_read),
      }))
      .filter(g => g.messages.length > 0);
  } else if (filter === 'from_teacher') {
    displayGroups = displayGroups
      .map(([id, group]) => ({
        id,
        ...group,
        messages: group.messages.filter(m => m.sender_type === 'teacher'),
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
      <InboxHeader unreadCount={unreadCount} isTeacher={false} />

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Messages list */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
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
                  onClick={() => setFilter('from_teacher')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    filter === 'from_teacher'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  From Teacher
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
                  if (children.length === 0) {
                    toast.error('No children found');
                    return;
                  }
                  setComposing(true);
                  setSelectedChild(children[0]);
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
                  senderType="parent"
                  senderId={session.parent?.id || ''}
                  senderName={session.parent?.email || 'Parent'}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === 'unread' ? "You're all caught up!" : 'No messages yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === 'unread'
                    ? 'All messages have been read.'
                    : 'Messages from teachers will appear here.'}
                </p>
              </div>
            ) : (
              displayGroups.map(([childId, group]) => (
                <div key={childId} className="space-y-3">
                  {/* Child header */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200">
                    {group.child.photo_url ? (
                      <img
                        src={group.child.photo_url}
                        alt={group.child.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {group.child.name.charAt(0)}
                      </div>
                    )}
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
                        isTeacher={false}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-1">
            {/* Children list */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>👥</span>
                Your Children
              </h3>
              <div className="space-y-2">
                {children.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No children added yet</p>
                ) : (
                  children.map(child => {
                    const childMessages = grouped[child.id];
                    const unread = childMessages?.messages.filter(m => !m.is_read).length || 0;
                    return (
                      <button
                        key={child.id}
                        onClick={() => {
                          setSelectedChild(child);
                          setComposing(true);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors duration-200 text-left group"
                      >
                        {child.photo_url ? (
                          <img
                            src={child.photo_url}
                            alt={child.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                            {child.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{child.name}</p>
                        </div>
                        {unread > 0 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
