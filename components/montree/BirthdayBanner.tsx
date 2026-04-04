'use client';

import { useState, useEffect, useRef } from 'react';

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
    // turning_age from API is current age; on their birthday they'll turn turning_age + 1
    // But if days_until === 0 (today IS their birthday), they've already turned
    const age = b.days_until === 0 ? b.turning_age : b.turning_age + 1;
    if (b.days_until === 0) return `Happy Birthday ${b.name}! Turning ${age} today!`;
    if (b.days_until === 1) return `${b.name} turns ${age} tomorrow!`;
    return `${b.name} turns ${age} in ${b.days_until} days`;
  };

  return (
    <div className="mx-3 mb-3 rounded-xl bg-gradient-to-r from-pink-50 via-rose-50 to-orange-50 border border-pink-200/60 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-4 py-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0 mt-0.5">🎂</span>
          <div className="space-y-0.5 min-w-0">
            {birthdays.map(b => (
              <p key={b.id} className="text-sm font-medium text-gray-800 truncate">
                {formatMessage(b)}
              </p>
            ))}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-3 mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
