// /montree/dashboard/messages/page.tsx
// Session 103 — Teacher threaded messaging (NEW).
//
// Mirrors the parent Session 98 rebuild for the teacher. The legacy March
// 15 flat-table inbox (which queried the now-deleted montree_messages table)
// is replaced.
//
// Threads live in montree_message_threads (Session 97 schema). The same
// API endpoints serve principal, teacher, and parent — auth.role gates the
// view. Principal sees all school threads as observer; teacher sees only
// their own.
//
// Compose targets:
//   - parent_teacher: about a specific child, to one of their parents
//   - internal: to the school principal (no child)
// `addPrincipalObserver()` runs automatically server-side on every
// parent_teacher thread (Session 97), so the principal sees parent ↔ teacher
// conversations in their Communication inbox without us doing anything here.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { ArrowLeft, MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';

// Dark forest tokens (same as dashboard)
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardBorderStrong: '1px solid rgba(52,211,153,0.35)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ThreadRow {
  id: string;
  child_id: string | null;
  classroom_id: string | null;
  thread_type: string;
  subject: string | null;
  last_message_at: string;
  participants: Array<{ role: string; id: string; name: string | null; is_observer: boolean }>;
  last_snippet: string | null;
  last_sender_name: string | null;
  last_sender_role: string | null;
  unread_for_me: number;
}

interface RecipientOption {
  role: 'parent' | 'principal';
  id: string;
  name: string;
}

interface ChildBundle {
  child_id: string;
  child_name: string;
  parents: RecipientOption[];
}

interface RecipientsResponse {
  classroom: { id: string; name: string } | null;
  children: ChildBundle[];
  principal: RecipientOption | null;
}

export default function TeacherMessagesPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  // --- Initial load
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/messages/threads', {
          credentials: 'include',
        });
        if (res.status === 401) {
          router.replace('/montree/login');
          return;
        }
        if (res.status === 403) {
          // Wrong role for this surface — bounce back to dashboard.
          router.replace('/montree/dashboard');
          return;
        }
        if (!res.ok) {
          if (active) {
            toast.error(t('teacherMessages.loadFailed') || 'Could not load messages');
            setLoading(false);
          }
          return;
        }
        const data = await res.json();
        if (active) {
          setThreads(data.threads || []);
          setLoading(false);
        }
      } catch (err) {
        console.error('[teacher messages] load failed', err);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, t]);

  // --- Helpers
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const dl = getIntlLocale(locale);
    if (sameDay) return d.toLocaleTimeString(dl, { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString(dl, { month: 'short', day: 'numeric' });
  };

  const senderLabel = (thread: ThreadRow): string => {
    if (!thread.last_sender_name) return '';
    if (thread.last_sender_role === 'teacher') return t('teacherMessages.you') || 'You';
    return thread.last_sender_name;
  };

  const threadTitle = (thread: ThreadRow): string => {
    if (thread.subject) return thread.subject;
    // Surface the non-me participant as the title fallback.
    const others = thread.participants.filter(
      (p) => p.role !== 'teacher' && !p.is_observer
    );
    if (others.length === 1) {
      return others[0].name || (others[0].role === 'principal'
        ? t('teacherMessages.principalLabel') || 'Principal'
        : t('teacherMessages.parentLabel') || 'Parent');
    }
    if (others.length > 1) return others.map((o) => o.name || o.role).join(', ');
    if (thread.thread_type === 'internal') return t('teacherMessages.internalLabel') || 'Staff conversation';
    return t('teacherMessages.title') || 'Conversation';
  };

  // --- Loading
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: T.bg,
        backgroundImage: T.glow,
        backgroundAttachment: 'fixed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
        color: T.textSecondary,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: T.emeraldSoft,
            animation: 'cg-pulse 1.6s ease-in-out infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, color: T.textMuted }}>{t('common.loading') || 'Loading…'}</p>
        </div>
        <style>{`
          @keyframes cg-pulse {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <Toaster position="top-center" />

      {/* ═══ Sticky Header ═══ */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: T.card,
        backdropFilter: T.blur,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => router.push('/montree/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 500,
              color: T.textSecondary,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            {t('teacherMessages.backToDashboard') || 'Back'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: T.serif,
            color: T.textPrimary,
            letterSpacing: -0.4,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Sparkles size={22} color={T.emerald} strokeWidth={1.75} />
            {t('teacherMessages.title') || 'Messages'}
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: '8px 0 0' }}>
            {t('teacherMessages.subtitle') || 'Conversations with your principal and parents.'}
          </p>
        </div>

        {/* Thread list */}
        {threads.length === 0 ? (
          <div style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: T.cardRadius,
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: T.emeraldSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <MessageSquare size={24} color={T.emerald} strokeWidth={1.75} />
            </div>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              color: T.textSecondary,
              margin: '0 0 8px 0',
            }}>
              {t('teacherMessages.emptyTitle') || 'No conversations yet'}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
              {t('teacherMessages.emptyHint') || 'Tap the + button to start a new conversation.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {threads.map((thread) => {
              const unread = thread.unread_for_me > 0;
              return (
                <Link
                  key={thread.id}
                  href={`/montree/dashboard/messages/${thread.id}`}
                  style={{
                    display: 'block',
                    padding: '16px 18px',
                    borderRadius: T.cardRadius,
                    background: unread ? T.emeraldSoft : T.card,
                    border: unread ? T.cardBorderStrong : T.cardBorder,
                    textDecoration: 'none',
                    transition: 'all 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: T.textPrimary,
                        }}>
                          {threadTitle(thread)}
                        </span>
                        {unread && (
                          <span style={{
                            background: T.emerald,
                            color: '#0a1a0f',
                            borderRadius: 999,
                            padding: '2px 7px',
                            fontSize: 10,
                            fontWeight: 700,
                          }}>
                            {thread.unread_for_me}
                          </span>
                        )}
                      </div>
                      {thread.last_snippet && (
                        <p style={{
                          fontSize: 13,
                          color: T.textSecondary,
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}>
                          {senderLabel(thread) && (
                            <span style={{ color: T.textMuted, fontWeight: 600 }}>
                              {senderLabel(thread)}:{' '}
                            </span>
                          )}
                          {thread.last_snippet}
                        </p>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>
                      {formatTime(thread.last_message_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating compose button */}
      <button
        onClick={() => setComposeOpen(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 30,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
          border: 'none',
          color: '#0a1a0f',
          cursor: 'pointer',
          boxShadow: '0 12px 32px rgba(52,211,153,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label={t('teacherMessages.newThread') || 'New conversation'}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={(threadId) => {
            setComposeOpen(false);
            router.push(`/montree/dashboard/messages/${threadId}`);
          }}
        />
      )}

      <style>{`
        @keyframes cg-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose modal — pick principal OR (child → parent), write, send.
// ─────────────────────────────────────────────────────────────────────────────

interface SelectedRecipient {
  role: 'parent' | 'principal';
  id: string;
  name: string;
  child_id?: string | null;
}

function ComposeModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (threadId: string) => void;
}) {
  const { t } = useI18n();
  const [bundle, setBundle] = useState<RecipientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState<SelectedRecipient | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/dashboard/messages/recipients', {
          credentials: 'include',
        });
        if (!res.ok) {
          if (active) setLoading(false);
          return;
        }
        const data = (await res.json()) as RecipientsResponse;
        if (active) {
          setBundle(data);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSend = useCallback(async () => {
    if (!recipient || !body.trim() || sending || !bundle) return;
    setSending(true);
    setError(null);
    try {
      const threadType: 'parent_teacher' | 'internal' =
        recipient.role === 'parent' ? 'parent_teacher' : 'internal';

      // 1. Create thread + participants.
      const threadRes = await fetch('/api/montree/messages/threads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_type: threadType,
          subject: subject.trim() || null,
          classroom_id: bundle.classroom?.id || null,
          child_id: recipient.child_id || null,
          participants: [{ role: recipient.role, id: recipient.id }],
        }),
      });
      if (!threadRes.ok) {
        const err = await threadRes.json().catch(() => ({}));
        throw new Error(err.error || (t('teacherMessages.sendFailed') || "Couldn't send"));
      }
      const { thread_id } = await threadRes.json();

      // 2. Post the first message.
      const msgRes = await fetch(`/api/montree/messages/threads/${thread_id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (!msgRes.ok) {
        const err = await msgRes.json().catch(() => ({}));
        throw new Error(err.error || (t('teacherMessages.sendFailed') || "Couldn't send"));
      }
      onSent(thread_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('teacherMessages.sendFailed') || "Couldn't send";
      setError(msg);
      toast.error(msg);
      setSending(false);
    }
  }, [recipient, body, subject, sending, bundle, onSent, t]);

  const hasAnyParent = (bundle?.children || []).some((c) => c.parents.length > 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a1a0f',
          width: '100%',
          maxWidth: 560,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: T.cardBorder,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Sticky header inside modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: '#0a1a0f',
          }}
        >
          <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.textPrimary }}>
            {t('teacherMessages.newThread') || 'New conversation'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}
            aria-label={t('common.close') || 'Close'}
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {loading ? (
            <p style={{ color: T.textMuted, fontSize: 13 }}>{t('common.loading') || 'Loading…'}</p>
          ) : !bundle ? (
            <p style={{ color: T.textMuted, fontSize: 13 }}>
              {t('teacherMessages.noRecipients') || 'No recipients available.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Recipient picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
                  {t('teacherMessages.toLabel') || 'To'}
                </label>

                {/* Principal option */}
                {bundle.principal && (
                  <button
                    onClick={() =>
                      setRecipient({
                        role: 'principal',
                        id: bundle.principal!.id,
                        name: bundle.principal!.name,
                        child_id: null,
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      background:
                        recipient?.role === 'principal' && recipient.id === bundle.principal.id
                          ? T.emeraldSoft
                          : T.card,
                      border:
                        recipient?.role === 'principal' && recipient.id === bundle.principal.id
                          ? T.cardBorderStrong
                          : T.cardBorder,
                      color: T.textPrimary,
                      fontSize: 14,
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{bundle.principal.name}</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                      {t('teacherMessages.principalLabel') || 'Principal'}
                    </div>
                  </button>
                )}

                {/* Per-child parent groups */}
                {!hasAnyParent ? (
                  <p style={{ fontSize: 12, color: T.textMuted, margin: '0 0 0 2px' }}>
                    {t('teacherMessages.noParentsLinked') ||
                      'No parents linked to children in your classroom yet.'}
                  </p>
                ) : (
                  bundle.children
                    .filter((c) => c.parents.length > 0)
                    .map((child) => (
                      <div key={child.child_id} style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: T.textMuted,
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          {child.child_name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {child.parents.map((parent) => (
                            <button
                              key={`parent:${parent.id}:${child.child_id}`}
                              onClick={() =>
                                setRecipient({
                                  role: 'parent',
                                  id: parent.id,
                                  name: parent.name,
                                  child_id: child.child_id,
                                })
                              }
                              style={{
                                padding: '10px 12px',
                                borderRadius: 10,
                                textAlign: 'left',
                                cursor: 'pointer',
                                background:
                                  recipient?.role === 'parent' &&
                                  recipient.id === parent.id &&
                                  recipient.child_id === child.child_id
                                    ? T.emeraldSoft
                                    : T.card,
                                border:
                                  recipient?.role === 'parent' &&
                                  recipient.id === parent.id &&
                                  recipient.child_id === child.child_id
                                    ? T.cardBorderStrong
                                    : T.cardBorder,
                                color: T.textPrimary,
                                fontSize: 13,
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{parent.name}</div>
                              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                                {t('teacherMessages.parentLabel') || 'Parent'} ·{' '}
                                {child.child_name}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Subject + body */}
              {recipient && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 8,
                        display: 'block',
                      }}
                    >
                      {t('teacherMessages.subjectLabel') || 'Subject (optional)'}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t('teacherMessages.subjectPlaceholder') || 'Subject (optional)'}
                      maxLength={200}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: T.card,
                        border: T.cardBorder,
                        color: T.textPrimary,
                        fontSize: 14,
                        fontFamily: T.sans,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: T.textMuted,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 8,
                        display: 'block',
                      }}
                    >
                      {t('teacherMessages.bodyLabel') || 'Message'}
                    </label>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={t('teacherMessages.bodyPlaceholder') || 'Write a short message…'}
                      rows={5}
                      maxLength={10000}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: T.card,
                        border: T.cardBorder,
                        color: T.textPrimary,
                        fontSize: 14,
                        fontFamily: T.sans,
                        outline: 'none',
                        resize: 'vertical',
                        minHeight: 120,
                      }}
                    />
                  </div>
                </>
              )}

              {error && (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(220,38,38,0.12)',
                    border: '1px solid rgba(220,38,38,0.32)',
                    borderRadius: 10,
                    color: '#fecaca',
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky action footer (always visible — fixes Session 102 Send-off-screen bug) */}
        {recipient && (
          <div
            style={{
              padding: '12px 20px 20px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              background: '#0a1a0f',
            }}
          >
            <button
              onClick={handleSend}
              disabled={sending || !body.trim()}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 12,
                background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                border: 'none',
                color: '#0a1a0f',
                fontSize: 15,
                fontWeight: 700,
                cursor: sending || !body.trim() ? 'not-allowed' : 'pointer',
                opacity: sending || !body.trim() ? 0.5 : 1,
              }}
            >
              {sending
                ? t('teacherMessages.sending') || 'Sending…'
                : t('teacherMessages.send') || 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
