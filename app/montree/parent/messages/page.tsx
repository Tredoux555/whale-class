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
import { ArrowLeft, ChevronDown, Camera, Sparkles, MessageSquare } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};


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
  const { t } = useI18n();
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
        toast.error(t('parentMessages.errorLoad'));
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
        .then(r => { if (!r.ok) throw new Error(`Messages reload: ${r.status}`); return r.json(); })
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
      <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "3rem", height: "3rem", border: `4px solid rgba(52,211,153,0.3)`, borderTopColor: T.emerald, borderRadius: "9999px", animation: "spin 1s linear infinite", marginLeft: "auto", marginRight: "auto", marginBottom: "1rem" }} />
          <p style={{ color: T.textSecondary }}>{t('parentMessages.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: T.bg, backgroundImage: T.glow, backgroundAttachment: "fixed" }}>
      <Toaster position="top-right" />

      {/* Header */}
      <InboxHeader unreadCount={unreadCount} isTeacher={false} />

      {/* Main content */}
      <div style={{ maxWidth: "72rem", marginLeft: "auto", marginRight: "auto", paddingLeft: "1rem", paddingRight: "1rem", paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", gridAutoFlow: "dense" }}>
          {/* Messages list */}
          <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => setFilter('all')}
                  style={{
                    paddingLeft: "0.75rem",
                    paddingRight: "0.75rem",
                    paddingTop: "0.375rem",
                    paddingBottom: "0.375rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transitionDuration: "200ms",
                    transitionProperty: "background-color, border-color",
                    background: filter === 'all' ? T.emerald : T.card,
                    backdropFilter: filter === 'all' ? undefined : T.blur,
                    color: filter === 'all' ? T.textPrimary : T.textSecondary,
                    border: filter === 'all' ? 'none' : T.cardBorder,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== 'all') {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== 'all') {
                      (e.currentTarget as HTMLButtonElement).style.background = T.card;
                    }
                  }}
                >
                  {t('parentMessages.filterAll')}
                </button>
                <button
                  onClick={() => setFilter('from_teacher')}
                  style={{
                    paddingLeft: "0.75rem",
                    paddingRight: "0.75rem",
                    paddingTop: "0.375rem",
                    paddingBottom: "0.375rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transitionDuration: "200ms",
                    transitionProperty: "background-color, border-color",
                    background: filter === 'from_teacher' ? T.emerald : T.card,
                    backdropFilter: filter === 'from_teacher' ? undefined : T.blur,
                    color: filter === 'from_teacher' ? T.textPrimary : T.textSecondary,
                    border: filter === 'from_teacher' ? 'none' : T.cardBorder,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== 'from_teacher') {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== 'from_teacher') {
                      (e.currentTarget as HTMLButtonElement).style.background = T.card;
                    }
                  }}
                >
                  {t('parentMessages.filterFromTeacher')}
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  style={{
                    paddingLeft: "0.75rem",
                    paddingRight: "0.75rem",
                    paddingTop: "0.375rem",
                    paddingBottom: "0.375rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    transitionDuration: "200ms",
                    transitionProperty: "background-color, border-color",
                    background: filter === 'unread' ? T.emerald : T.card,
                    backdropFilter: filter === 'unread' ? undefined : T.blur,
                    color: filter === 'unread' ? T.textPrimary : T.textSecondary,
                    border: filter === 'unread' ? 'none' : T.cardBorder,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (filter !== 'unread') {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (filter !== 'unread') {
                      (e.currentTarget as HTMLButtonElement).style.background = T.card;
                    }
                  }}
                >
                  {t('parentMessages.filterUnread')} ({unreadCount})
                </button>
              </div>

              <button
                onClick={() => {
                  if (children.length === 0) {
                    toast.error(t('parentMessages.errorNoChildren'));
                    return;
                  }
                  setComposing(true);
                  setSelectedChild(children[0]);
                }}
                style={{
                  paddingLeft: "1rem",
                  paddingRight: "1rem",
                  paddingTop: "0.5rem",
                  paddingBottom: "0.5rem",
                  background: `linear-gradient(to right, ${T.emerald}, #14b8a6)`,
                  color: T.textPrimary,
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  transitionDuration: "200ms",
                  transitionProperty: "all",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(to right, #10b981, #0d9488)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(to right, ${T.emerald}, #14b8a6)`;
                }}
              >
                <MessageSquare size={16} strokeWidth={1.75} />
                {t('parentMessages.newMessage')}
              </button>
            </div>

            {/* Compose form */}
            {composing && selectedChild && (
              <div style={{ animation: "slideUp 0.3s ease-out" }}>
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
              <div style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: T.textPrimary, marginBottom: "0.5rem" }}>
                  {filter === 'unread' ? t('parentMessages.allCaughtUp') : t('parentMessages.noMessages')}
                </h3>
                <p style={{ color: T.textSecondary }}>
                  {filter === 'unread'
                    ? t('parentMessages.allRead')
                    : t('parentMessages.noMessagesDescription')}
                </p>
              </div>
            ) : (
              displayGroups.map(([childId, group]) => (
                <div key={childId} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Child header */}
                  <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "0.75rem", padding: "1rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    {group.child.photo_url ? (
                      <img
                        src={group.child.photo_url}
                        alt={group.child.name}
                        style={{ width: "2.5rem", height: "2.5rem", borderRadius: "9999px", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{ width: "2.5rem", height: "2.5rem", background: `linear-gradient(to bottom right, #34d399, #14b8a6)`, borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", color: T.textPrimary, fontWeight: "600", fontSize: "0.875rem" }}>
                        {group.child.name.charAt(0)}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: "600", color: T.textPrimary }}>{group.child.name}</h3>
                      <p style={{ fontSize: "0.75rem", color: T.textMuted }}>
                        {group.messages.length} {group.messages.length === 1 ? t('parentMessages.message') : t('parentMessages.messages')}
                      </p>
                    </div>
                    {group.messages.some(m => !m.is_read) && (
                      <div style={{ width: "0.625rem", height: "0.625rem", borderRadius: "9999px", background: T.emerald, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                    )}
                  </div>

                  {/* Messages */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
          <div style={{ gridColumn: "span 1", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Children list */}
            <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "0.75rem", padding: "1.5rem" }}>
              <h3 style={{ fontWeight: "600", color: T.textPrimary, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>👥</span>
                {t('parentMessages.yourChildren')}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {children.length === 0 ? (
                  <p style={{ fontSize: "0.875rem", color: T.textMuted, paddingTop: "1rem", paddingBottom: "1rem", textAlign: "center" }}>{t('parentMessages.noChildrenAdded')}</p>
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
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          background: T.emeraldSoft,
                          transitionDuration: "200ms",
                          transitionProperty: "background-color",
                          textAlign: "left",
                          border: "none",
                          cursor: "pointer",
                          color: T.textPrimary,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(52,211,153,0.18)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = T.emeraldSoft; }}
                      >
                        {child.photo_url ? (
                          <img
                            src={child.photo_url}
                            alt={child.name}
                            style={{ width: "2rem", height: "2rem", borderRadius: "9999px", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{ width: "2rem", height: "2rem", background: `linear-gradient(to bottom right, #34d399, #14b8a6)`, borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", color: T.textPrimary, fontWeight: "600", fontSize: "0.75rem", flexShrink: 0 }}>
                            {child.name.charAt(0)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.875rem", fontWeight: "500", color: T.textPrimary }}>{child.name}</p>
                        </div>
                        {unread > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "1.25rem", height: "1.25rem", borderRadius: "9999px", background: T.emerald, color: T.textPrimary, fontSize: "0.75rem", fontWeight: "700" }}>
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
            <div style={{ background: T.card, backdropFilter: T.blur, borderRadius: "0.75rem", padding: "1.5rem" }}>
              <h3 style={{ fontWeight: "600", color: T.textPrimary, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>📊</span>
                {t('parentMessages.overview')}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: 'rgba(52,211,153,0.10)', borderRadius: "0.5rem", border: `1px solid rgba(52,211,153,0.15)` }}>
                  <span style={{ fontSize: "0.875rem", color: T.textSecondary }}>{t('parentMessages.totalMessages')}</span>
                  <span style={{ fontWeight: "700", color: T.emerald, fontSize: "1.125rem" }}>{messages.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: 'rgba(245,158,11,0.10)', borderRadius: "0.5rem", border: `1px solid rgba(245,158,11,0.15)` }}>
                  <span style={{ fontSize: "0.875rem", color: T.textSecondary }}>{t('parentMessages.unread')}</span>
                  <span style={{ fontWeight: "700", color: '#f59e0b', fontSize: "1.125rem" }}>{unreadCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
