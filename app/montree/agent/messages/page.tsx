// /montree/agent/messages/page.tsx
// Session 104 — Agent messaging list. Mirrors the parent + teacher list shape.
//
// Agents → principals only. The compose modal lists every school the agent
// founded; each row shows the principal name. Server-computed
// last_sender_is_me drives the "You" label so multi-school agents see other
// senders by name and themselves as "You".

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Plus, X, Send } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

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
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ThreadRow {
  id: string;
  school_id: string;
  school_name: string | null;
  thread_type: string;
  subject: string | null;
  last_message_at: string;
  participants: Array<{ role: string; id: string; name: string | null; is_observer: boolean }>;
  last_snippet: string | null;
  last_sender_name: string | null;
  last_sender_role: string | null;
  last_sender_is_me: boolean;
  unread_for_me: number;
}

interface SchoolBundle {
  school_id: string;
  school_name: string;
  principal: { id: string; name: string } | null;
}

export default function AgentMessagesPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/agent/messages/threads', { credentials: 'include' });
        if (res.status === 401) { router.replace('/montree/login-select'); return; }
        if (res.status === 403) { router.replace('/montree/agent/dashboard'); return; }
        if (res.status === 404) {
          // No referred schools yet — show empty state instead of bouncing.
          if (active) { setThreads([]); setLoading(false); }
          return;
        }
        if (!res.ok) {
          if (active) setLoading(false);
          return;
        }
        const data = await res.json();
        if (active) { setThreads(data.threads || []); setLoading(false); }
      } catch (err) {
        console.error('[agent messages] load failed', err);
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [router]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const intl = getIntlLocale(locale);
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString(intl, { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleDateString(intl, { month: 'short', day: 'numeric' });
  };

  const threadTitle = (thread: ThreadRow): string => {
    if (thread.subject) return thread.subject;
    const principal = thread.participants.find((p) => p.role === 'principal');
    const principalName = principal?.name || t('agentMessages.principalFallback');
    if (thread.school_name) return `${principalName} · ${thread.school_name}`;
    return principalName;
  };

  const senderLabel = (thread: ThreadRow): string => {
    if (!thread.last_sender_name) return '';
    if (thread.last_sender_is_me) return t('agentMessages.you');
    return thread.last_sender_name;
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.sans, color: T.textSecondary,
      }}>
        <p style={{ fontSize: 14, color: T.textMuted }}>{t('agentMessages.loadingMessages')}</p>
      </div>
    );
  }

  return (
    <div style={{ color: T.textPrimary, fontFamily: T.sans }}>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 80px' }}>
        <button
          onClick={() => router.push('/montree/agent/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
            color: T.textSecondary, background: 'none', border: 'none',
            cursor: 'pointer', marginBottom: 12, padding: 0,
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          {t('common.back')}
        </button>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{
            margin: 0, fontSize: 28, fontWeight: 700, fontFamily: T.serif,
            color: T.textPrimary, letterSpacing: -0.4,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <MessageSquare size={22} color={T.emerald} strokeWidth={1.75} />
            {t('agentMessages.title')}
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, margin: '8px 0 0' }}>
            {t('agentMessages.subtitle')}
          </p>
        </div>

        {threads.length === 0 ? (
          <div style={{
            background: T.card, border: T.cardBorder, borderRadius: T.cardRadius,
            padding: '40px 24px', textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: T.emeraldSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <MessageSquare size={24} color={T.emerald} strokeWidth={1.75} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.textSecondary, margin: '0 0 8px 0' }}>
              {t('agentMessages.emptyTitle')}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
              {t('agentMessages.emptyHint')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {threads.map((thread) => {
              const unread = thread.unread_for_me > 0;
              return (
                <Link
                  key={thread.id}
                  href={`/montree/agent/messages/${thread.id}`}
                  style={{
                    display: 'block', padding: '16px 18px', borderRadius: T.cardRadius,
                    background: unread ? T.emeraldSoft : T.card,
                    border: unread ? T.cardBorderStrong : T.cardBorder,
                    textDecoration: 'none', transition: 'all 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary }}>
                          {threadTitle(thread)}
                        </span>
                        {unread && (
                          <span style={{
                            background: T.emerald, color: '#0a1a0f',
                            borderRadius: 999, padding: '2px 7px',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {thread.unread_for_me}
                          </span>
                        )}
                      </div>
                      {thread.last_snippet && (
                        <p style={{
                          fontSize: 13, color: T.textSecondary, margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
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

      <button
        onClick={() => setComposeOpen(true)}
        style={{
          position: 'fixed', right: 24, bottom: 24, zIndex: 30,
          width: 56, height: 56, borderRadius: '50%',
          background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
          border: 'none', color: '#0a1a0f', cursor: 'pointer',
          boxShadow: '0 12px 32px rgba(52,211,153,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label={t('agentMessages.newMessage')}
      >
        <Plus size={24} strokeWidth={2} />
      </button>

      {composeOpen && (
        <ComposeModal
          onClose={() => setComposeOpen(false)}
          onSent={(threadId) => {
            setComposeOpen(false);
            router.push(`/montree/agent/messages/${threadId}`);
          }}
        />
      )}
    </div>
  );
}

function ComposeModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (threadId: string) => void;
}) {
  const { t } = useI18n();
  const [schools, setSchools] = useState<SchoolBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/montree/agent/messages/recipients', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (active) setSchools(data.schools || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const selectedSchool = schools.find((s) => s.school_id === schoolId);
  const canSend = !!schoolId && !!selectedSchool?.principal && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/agent/messages/threads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          subject: subject.trim() || null,
          body: body.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t('agentMessages.failedToSend'));
        setSending(false);
        return;
      }
      const data = await res.json();
      onSent(data.thread_id);
    } catch (err) {
      console.error('[agent compose] failed', err);
      setError(t('agentMessages.networkError'));
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520, maxHeight: '90vh',
          background: 'rgba(10,26,15,0.98)', backdropFilter: T.blur,
          border: T.cardBorder, borderRadius: T.cardRadius,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: T.sans,
        }}
      >
        <div style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <h2 style={{
            margin: 0, fontSize: 16, fontWeight: 600,
            fontFamily: T.serif, color: T.textPrimary,
          }}>
            {t('agentMessages.composeTitle')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: T.textMuted,
              cursor: 'pointer', display: 'flex', padding: 4,
            }}
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: T.textMuted }}>{t('agentMessages.loadingSchools')}</p>
          ) : schools.length === 0 ? (
            <p style={{ fontSize: 13, color: T.textMuted }}>
              {t('agentMessages.noSchoolsYet')}
            </p>
          ) : (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
                  {t('agentMessages.schoolLabel')}
                </label>
                <select
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: T.card, border: T.cardBorder, color: T.textPrimary,
                    fontSize: 14, fontFamily: T.sans,
                  }}
                >
                  <option value="" style={{ background: '#0a1a0f' }}>{t('agentMessages.chooseSchool')}</option>
                  {schools.map((s) => (
                    <option key={s.school_id} value={s.school_id} style={{ background: '#0a1a0f' }}>
                      {s.school_name}
                      {s.principal ? ` — ${s.principal.name}` : ` ${t('agentMessages.noPrincipalSuffix')}`}
                    </option>
                  ))}
                </select>
                {schoolId && selectedSchool && !selectedSchool.principal && (
                  <p style={{ fontSize: 12, color: '#f59e0b', margin: '6px 0 0 0' }}>
                    {t('agentMessages.principalNotSetUp')}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
                  {t('agentMessages.subjectLabel')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder={t('agentMessages.subjectPlaceholder')}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: T.card, border: T.cardBorder, color: T.textPrimary,
                    fontSize: 14, fontFamily: T.sans, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
                  {t('agentMessages.messageLabel')}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={10000}
                  rows={6}
                  placeholder={t('agentMessages.messagePlaceholder')}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10,
                    background: T.card, border: T.cardBorder, color: T.textPrimary,
                    fontSize: 14, fontFamily: T.sans, boxSizing: 'border-box',
                    resize: 'vertical', minHeight: 140,
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>{error}</p>
              )}
            </>
          )}
        </div>

        <div style={{
          padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: 10,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px', borderRadius: 10,
              background: 'transparent', border: T.cardBorder,
              color: T.textSecondary, fontSize: 13, fontFamily: T.sans, cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: canSend ? `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})` : 'rgba(52,211,153,0.2)',
              border: 'none', color: canSend ? '#0a1a0f' : T.textMuted,
              fontSize: 13, fontWeight: 600, fontFamily: T.sans,
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Send size={14} strokeWidth={2} />
            {sending ? t('agentMessages.sending') : t('agentMessages.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
