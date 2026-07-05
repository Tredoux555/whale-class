// /montree/parent/messages/page.tsx
// Session 98 — Parent threaded messaging (NEW).
//
// Replaces the legacy flat-table inbox. Uses the same montree_message_threads
// schema as /montree/admin/communication so the principal sees parent threads
// in the same surface as teacher threads.
//
// FEATURE-GATED: this entire surface gates on the `parent_messaging` feature
// flag (migration 193), checked server-side by every API endpoint via
// resolveMessagingParent(). When the flag is OFF, the threads endpoint returns
// 404 and this page redirects to the dashboard. The dashboard never links here
// — direct URL is the only way in.
//
// AUTHORITATIVE PARENT IDENTITY: server reads the JWT cookie. Invite-based
// sessions (childId only, no parentId) get 403 from the API, which we surface
// as a redirect to dashboard. Messaging is for full parent accounts only.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { MessageSquare, Plus, Sparkles, X } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import MontreeLogo from '@/components/montree/MonteeLogo';

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
  serif: 'var(--font-lora), Georgia, serif',
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
  // Session 103: server-computed flag — a parent with two children in the
  // same classroom (siblings) could share a thread with another parent in
  // the future; role check alone would mislabel them as "You".
  last_sender_is_me: boolean;
  unread_for_me: number;
}

interface RecipientBundle {
  child_id: string;
  child_name: string;
  classroom_id: string | null;
  classroom_name: string | null;
  teachers: Array<{ role: 'teacher'; id: string; name: string; classroom_name?: string | null; is_lead?: boolean }>;
  principal: { role: 'principal'; id: string; name: string } | null;
}

export default function ParentMessagesPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  // --- Initial load: probe the flag via the threads endpoint. 404 → dashboard.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/parent/messages/threads', {
          credentials: 'include',
        });
        if (res.status === 401 || res.status === 403) {
          // Not logged in OR invite-only session — bounce to dashboard.
          router.replace('/montree/parent/dashboard');
          return;
        }
        if (res.status === 404) {
          // Feature flag is OFF for this school — redirect, don't show.
          router.replace('/montree/parent/dashboard');
          return;
        }
        if (!res.ok) {
          if (active) {
            toast.error('Could not load messages');
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
        console.error('[parent messages] load failed', err);
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

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
    // Session 103 audit: use last_sender_is_me (server-computed) so a parent
    // with siblings doesn't mislabel another parent's reply as "You".
    if (thread.last_sender_is_me) return t('parentMessages.you') || 'You';
    return thread.last_sender_name;
  };

  // --- Loading
  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: T.bg,
        backgroundImage: T.glow,
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
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
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
        paddingTop: 'env(safe-area-inset-top)', // clear the iOS status bar
      }}>
        <div style={{
          maxWidth: 512,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Montree home anchor — tap takes you straight to the parent dashboard. */}
          <Link
            href="/montree/parent/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: T.textPrimary,
            }}
            aria-label="Montree home"
          >
            <MontreeLogo size={28} />
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>
              Montree
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 512, margin: '0 auto', padding: '24px 20px 80px' }}>
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
            {t('parentMessages.title') || 'Messages'}
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: '8px 0 0' }}>
            {t('parentMessages.subtitle') || 'Conversations with your child’s teachers and the principal.'}
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
              {t('parentMessages.emptyTitle') || 'No conversations yet'}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
              {t('parentMessages.emptyHint') || 'Start a thread when you have something to share.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {threads.map((thread) => {
              const unread = thread.unread_for_me > 0;
              return (
                <Link
                  key={thread.id}
                  href={`/montree/parent/messages/${thread.id}`}
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
                          {thread.subject || (thread.thread_type === 'parent_principal' ? (t('parentMessages.principalLabel') || 'Principal') : (t('parentMessages.teacherLabel') || 'Teacher'))}
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
        aria-label={t('parentMessages.newThread') || 'New conversation'}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSent={(threadId) => {
          setComposeOpen(false);
          router.push(`/montree/parent/messages/${threadId}`);
        }} />
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
// Compose modal — pick child, pick recipient, write, send.
// ─────────────────────────────────────────────────────────────────────────────

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: (threadId: string) => void }) {
  const { t } = useI18n();
  const [bundles, setBundles] = useState<RecipientBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState<{ role: 'teacher' | 'principal'; id: string } | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/parent/messages/recipients', { credentials: 'include' });
        if (!res.ok) {
          if (active) setLoading(false);
          return;
        }
        const data = await res.json();
        if (active) {
          setBundles(data.recipients || []);
          if (data.recipients?.length === 1) {
            setChildId(data.recipients[0].child_id);
          }
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const currentBundle = bundles.find((b) => b.child_id === childId) || null;

  const handleSend = useCallback(async () => {
    if (!childId || !recipient || !body.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/montree/parent/messages/threads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          recipient,
          subject: subject.trim() || null,
          body: body.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || (t('parentMessages.sendFailed') || 'Could not send'));
        setSending(false);
        return;
      }
      const data = await res.json();
      onSent(data.thread_id);
    } catch {
      toast.error(t('parentMessages.sendFailed') || 'Could not send');
      setSending(false);
    }
  }, [childId, recipient, subject, body, onSent, t]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
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
          maxWidth: 512,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          border: T.cardBorder,
          padding: '24px 20px 32px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.textPrimary }}>
            {t('parentMessages.newThread') || 'New conversation'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {loading ? (
          <p style={{ color: T.textMuted, fontSize: 13 }}>{t('common.loading') || 'Loading…'}</p>
        ) : bundles.length === 0 ? (
          <p style={{ color: T.textMuted, fontSize: 13 }}>
            {t('parentMessages.noChildren') || 'No children linked to your account.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Child picker */}
            {bundles.length > 1 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
                  {t('parentMessages.aboutChild') || 'About'}
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {bundles.map((b) => (
                    <button
                      key={b.child_id}
                      onClick={() => { setChildId(b.child_id); setRecipient(null); }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        background: childId === b.child_id ? T.emerald : T.card,
                        color: childId === b.child_id ? '#0a1a0f' : T.textPrimary,
                      }}
                    >
                      {b.child_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Recipient picker */}
            {currentBundle && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
                  {t('parentMessages.toLabel') || 'To'}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {currentBundle.teachers.map((teacher) => (
                    <button
                      key={`teacher:${teacher.id}`}
                      onClick={() => setRecipient({ role: 'teacher', id: teacher.id })}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: recipient?.role === 'teacher' && recipient.id === teacher.id ? T.emeraldSoft : T.card,
                        border: recipient?.role === 'teacher' && recipient.id === teacher.id ? T.cardBorderStrong : T.cardBorder,
                        color: T.textPrimary,
                        fontSize: 14,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{teacher.name}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {teacher.is_lead ? (t('parentMessages.leadTeacher') || 'Lead teacher') : (t('parentMessages.teacherLabel') || 'Teacher')}
                        {teacher.classroom_name ? ` · ${teacher.classroom_name}` : ''}
                      </div>
                    </button>
                  ))}
                  {currentBundle.principal && (
                    <button
                      key={`principal:${currentBundle.principal.id}`}
                      onClick={() => setRecipient({ role: 'principal', id: currentBundle.principal!.id })}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        textAlign: 'left',
                        cursor: 'pointer',
                        background: recipient?.role === 'principal' && recipient.id === currentBundle.principal!.id ? T.emeraldSoft : T.card,
                        border: recipient?.role === 'principal' && recipient.id === currentBundle.principal!.id ? T.cardBorderStrong : T.cardBorder,
                        color: T.textPrimary,
                        fontSize: 14,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{currentBundle.principal.name}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {t('parentMessages.principalLabel') || 'Principal'}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Subject + body */}
            {recipient && (
              <>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
                    {t('parentMessages.subjectLabel') || 'Subject (optional)'}
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('parentMessages.subjectPlaceholder') || 'e.g. Pickup time tomorrow'}
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: T.card,
                      border: T.cardBorder,
                      color: T.textPrimary,
                      // 16px prevents iOS Safari zoom-in on focus.
                      fontSize: 16,
                      fontFamily: T.sans,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, display: 'block' }}>
                    {t('parentMessages.bodyLabel') || 'Message'}
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={t('parentMessages.bodyPlaceholder') || 'Write a short message…'}
                    rows={5}
                    maxLength={10000}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: T.card,
                      border: T.cardBorder,
                      color: T.textPrimary,
                      // 16px prevents iOS Safari zoom-in on focus.
                      fontSize: 16,
                      fontFamily: T.sans,
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: 120,
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={sending || !body.trim()}
                  style={{
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
                  {sending ? (t('parentMessages.sending') || 'Sending…') : (t('parentMessages.send') || 'Send')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
