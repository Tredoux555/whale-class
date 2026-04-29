'use client';

import { useState, useEffect } from 'react';
import { Cake, X } from 'lucide-react';

interface BirthdayChild {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  turning_age: number;
  days_until: number;
}

export default function BirthdayBanner() {
  const [birthdays, setBirthdays] = useState<BirthdayChild[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedKey = 'birthday-banner-dismissed';
    if (typeof window !== 'undefined' && sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
      return;
    }

    const controller = new AbortController();

    fetch('/api/montree/children/birthdays', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('fetch failed');
        return res.json();
      })
      .then(data => setBirthdays(data.birthdays || []))
      .catch(err => {
        if (err?.name !== 'AbortError') console.error('[BirthdayBanner]', err);
      });

    return () => controller.abort();
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('birthday-banner-dismissed', 'true');
  };

  if (dismissed || birthdays.length === 0) return null;

  const formatMessage = (b: BirthdayChild): string => {
    const age = b.days_until === 0 ? b.turning_age : b.turning_age + 1;
    if (b.days_until === 0) return `Happy Birthday ${b.name}! Turning ${age} today!`;
    if (b.days_until === 1) return `${b.name} turns ${age} tomorrow!`;
    return `${b.name} turns ${age} in ${b.days_until} days`;
  };

  return (
    <div style={{
      margin: '0 12px 12px',
      padding: '12px 14px',
      borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(236,72,153,0.16), rgba(245,158,11,0.10))',
      border: '1px solid rgba(236,72,153,0.30)',
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      boxShadow: '0 6px 16px rgba(0,0,0,0.20)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
      fontFamily: '"Inter", -apple-system, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        flex: 1,
        minWidth: 0,
      }}>
        <Cake size={18} strokeWidth={1.75} color="#f9a8d4" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {birthdays.map(b => (
            <p
              key={b.id}
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.95)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {formatMessage(b)}
            </p>
          ))}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.55)',
          cursor: 'pointer',
          transition: 'all 120ms ease',
        }}
      >
        <X size={12} strokeWidth={1.75} />
      </button>
    </div>
  );
}
