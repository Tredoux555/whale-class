// /montree/dashboard/parent-chats/page.tsx
//
// 🚨 Session 119 — WeChat-style parent chats list. One row per parent
// (NOT per thread). Tap a row → /parent-chats/[parentId] with the full
// flattened chat stream. Dark forest aesthetic matching the rest of the
// dashboard.
//
// Source endpoint: /api/montree/dashboard/parent-chats (collapses every
// thread the caller shares with each parent into a single row).

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle, Search } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBgHover: 'rgba(255,255,255,0.08)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  gold: '#E8C96A',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.42)',
  red: '#f87171',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface ParentChatRow {
  parent_id: string;
  parent_name: string;
  parent_email: string | null;
  last_message_at: string;
  last_snippet: string;
  last_sender_is_me: boolean;
  last_sender_name: string;
  unread_count: number;
  thread_count: number;
  child_names: string[];
}

export default function ParentChatsListPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<ParentChatRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await montreeApi('/api/montree/dashboard/parent-chats');
      if (res.status === 401 || res.status === 403) {
        router.push('/montree/login');
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setRows(data.parents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load chats');
    }
  }, [router]);

  // load() is async — setState calls happen AFTER `await`, not synchronously.
  // The lint rule's static analysis doesn't track this; the suppression is
  // intentional. Same pattern in the focus listener below.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // Refresh on window focus (catches "back from a chat" naturally)
  useEffect(() => {
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const filtered = rows?.filter(r => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.parent_name.toLowerCase().includes(q) ||
      (r.parent_email || '').toLowerCase().includes(q) ||
      r.child_names.some(c => c.toLowerCase().includes(q)) ||
      r.last_snippet.toLowerCase().includes(q)
    );
  }) ?? null;

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <header style={{
        position: 'sticky',
        top: 57,
        zIndex: 40,
        background: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: T.cardBorder,
        padding: '14px 22px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          maxWidth: 920,
          margin: '0 auto',
        }}>
          <Link
            href="/montree/dashboard/parent-codes"
            aria-label={t('common.back')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            {t('common.back')}
          </Link>
          <h1 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: -0.3,
            color: T.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <MessageCircle size={20} color={T.emerald} strokeWidth={1.75} />
            Parent Chats
          </h1>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: '24px 16px 60px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search
            size={16}
            color={T.textMuted}
            strokeWidth={1.75}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by parent, child, or message…"
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              borderRadius: 12,
              background: T.cardBg,
              border: T.cardBorder,
              color: T.textPrimary,
              fontSize: 16,
              fontFamily: T.sans,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Body */}
        {error ? (
          <div style={{
            padding: '40px 16px',
            textAlign: 'center',
            color: T.red,
            fontSize: 14,
          }}>
            Couldn&apos;t load chats — {error}
          </div>
        ) : !filtered ? (
          <div style={{ padding: '60px 16px', textAlign: 'center', color: T.textMuted, fontSize: 14 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '60px 24px',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 14,
            lineHeight: 1.5,
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 14,
          }}>
            {query.trim()
              ? <>No parents match &ldquo;{query}&rdquo;.</>
              : <>No parent chats yet. Once a parent signs in and messages you, they&apos;ll appear here.</>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(row => (
              <ParentRow key={row.parent_id} row={row} locale={locale} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ParentRow({ row, locale }: { row: ParentChatRow; locale: string }) {
  const [hover, setHover] = useState(false);
  const initials = row.parent_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';
  const time = formatRelative(row.last_message_at, locale);

  return (
    <Link
      href={`/montree/dashboard/parent-chats/${row.parent_id}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 14px',
        borderRadius: 14,
        background: hover ? T.cardBgHover : T.cardBg,
        border: T.cardBorder,
        color: T.textPrimary,
        textDecoration: 'none',
        transition: 'background 120ms ease',
      }}
    >
      {/* Avatar */}
      <div style={{
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #34d399 0%, #1D6B48 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: 16,
        fontFamily: T.sans,
        letterSpacing: 0.4,
      }}>
        {initials}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <span style={{
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {row.parent_name}
          </span>
          <span style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {time}
          </span>
        </div>
        <div style={{
          marginTop: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            fontSize: 13,
            color: T.textSecondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {row.last_snippet
              ? (row.last_sender_is_me ? `You: ${row.last_snippet}` : row.last_snippet)
              : <em style={{ color: T.textMuted }}>(no messages yet)</em>}
          </span>
          {row.unread_count > 0 && (
            <span style={{
              flexShrink: 0,
              minWidth: 20,
              height: 20,
              padding: '0 6px',
              borderRadius: 10,
              background: T.gold,
              color: '#1a1a1a',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              letterSpacing: 0,
            }}>
              {row.unread_count > 99 ? '99+' : row.unread_count}
            </span>
          )}
        </div>
        {row.child_names.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 11, color: T.textMuted }}>
            {row.child_names.join(' · ')}
          </div>
        )}
      </div>
    </Link>
  );
}

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24 && then.getDate() === now.getDate()) {
    return then.toLocaleTimeString(getIntlLocale(locale), {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (diffHr < 48) return 'yesterday';
  return then.toLocaleDateString(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
  });
}
