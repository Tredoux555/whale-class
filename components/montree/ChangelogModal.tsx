'use client';

// components/montree/ChangelogModal.tsx
// "What's new since you last logged in" modal.
//
// Tracks last-seen entry id in localStorage. When a new entry exists,
// renders a small dismissible modal on dashboard mount showing the new ones.
//
// Audience-scoped: if the caller passes audience='teacher', only entries
// targeted at teachers (or 'all') show.
//
// Non-blocking: failures silently no-op. The modal never breaks the dashboard.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getChangelogEntries, type ChangelogEntry } from '@/lib/montree/changelog';
import { useI18n } from '@/lib/montree/i18n';

const STORAGE_KEY = 'montree.changelog.lastSeenEntryId';

interface ChangelogModalProps {
  audience?: ChangelogEntry['audience'];
}

export default function ChangelogModal({ audience = 'all' }: ChangelogModalProps) {
  const { t } = useI18n();
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Compute first, then set ONCE. Keeps the lint rule (which warns about
    // multiple/cascading setState in effects) happy by giving it a single
    // setNewEntries() call at the end.
    let next: ChangelogEntry[] = [];
    try {
      const lastSeen = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const entries = getChangelogEntries(audience);
      if (entries.length === 0) return;
      if (!lastSeen) {
        // Baseline silently for first-time visitors.
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, entries[0].id);
        }
        return;
      }
      const lastSeenIdx = entries.findIndex((e) => e.id === lastSeen);
      if (lastSeenIdx === -1) {
        next = [entries[0]];
      } else if (lastSeenIdx > 0) {
        next = entries.slice(0, lastSeenIdx);
      }
    } catch {
      // localStorage unavailable — no-op.
      return;
    }
    if (next.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time localStorage read, single state set, no cascading renders
      setNewEntries(next);
    }
  }, [audience]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const entries = getChangelogEntries(audience);
      if (entries.length > 0) {
        localStorage.setItem(STORAGE_KEY, entries[0].id);
      }
    } catch {
      /* no-op */
    }
  };

  if (dismissed || newEntries.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0a1a0f',
          border: '1px solid rgba(52,211,153,0.25)',
          borderRadius: 18,
          padding: 24,
          maxWidth: 520,
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          color: 'rgba(255,255,255,0.95)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 20,
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontWeight: 700,
              color: '#34d399',
            }}
          >
            {t('changelog.whatsNew')}
          </h2>
          <button
            onClick={handleDismiss}
            aria-label={t('common.close')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ×
          </button>
        </div>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {newEntries.map((entry) => (
            <li
              key={entry.id}
              style={{
                paddingBottom: 16,
                marginBottom: 16,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#fff',
                }}
              >
                {entry.title}
              </h3>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: 'rgba(255,255,255,0.72)',
                }}
              >
                {entry.summary}
              </p>
              {entry.highlights && entry.highlights.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'rgba(255,255,255,0.62)' }}>
                  {entry.highlights.map((h, idx) => (
                    <li key={idx} style={{ fontSize: 13, lineHeight: 1.6 }}>
                      {h}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Link
            href="/montree/changelog"
            style={{
              fontSize: 13,
              color: 'rgba(52,211,153,0.85)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
            onClick={handleDismiss}
          >
            {t('changelog.seeFull')} →
          </Link>
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 16px',
              background: 'rgba(52,211,153,0.18)',
              border: '1px solid rgba(52,211,153,0.32)',
              borderRadius: 10,
              color: '#34d399',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('changelog.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}
