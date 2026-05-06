'use client';

// components/montree/agent/AgentRedemptionBanner.tsx
//
// Phase 7e — Celebration banner shown when the agent's referred-school count
// has gone up since they last loaded the dashboard. Tracked via localStorage
// so it doesn't fire on every page nav.
//
// "🎉 [School name] just signed up using one of your codes. Welcome to your
// dashboard, partner."
//
// Shown once per detected delta. Dismiss writes the new count.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'montree.agent.lastSeenSchoolCount.v1';

interface Props {
  schoolCount: number;
  newestSchoolName: string | null;
}

export default function AgentRedemptionBanner({ schoolCount, newestSchoolName }: Props) {
  const [show, setShow] = useState(false);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lastSeen = raw === null ? null : Number(raw);

      if (lastSeen === null) {
        // First time we've ever recorded — set the baseline silently. No
        // celebration on first dashboard load (agents who've already had
        // schools shouldn't get a fake "school just signed up" banner).
        try { localStorage.setItem(STORAGE_KEY, String(schoolCount)); } catch { /* */ }
        return;
      }

      if (Number.isFinite(lastSeen) && schoolCount > lastSeen) {
        // setState-in-effect intentional — observing prop change against
        // localStorage-stored prior value, no external system to sync to.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDelta(schoolCount - lastSeen);
        setShow(true);
      }
    } catch {
      // localStorage blocked — quietly skip. Banner can't persist anyway.
    }
  }, [schoolCount]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(schoolCount)); } catch { /* */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="mb-6 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-white/50 hover:text-white text-sm"
        aria-label="Dismiss"
      >
        ✕
      </button>
      <p className="text-emerald-200 text-xs uppercase tracking-wider font-semibold mb-1">
        🎉 New referral
      </p>
      <p className="text-white text-base leading-relaxed pr-6">
        {delta === 1 ? (
          newestSchoolName ? (
            <><span className="font-medium">{newestSchoolName}</span> just signed up using one of your codes. Welcome to your dashboard, partner.</>
          ) : (
            <>A school just signed up using one of your codes. Welcome to your dashboard, partner.</>
          )
        ) : (
          <><span className="font-medium">{delta} new schools</span> have signed up using your codes since you were last here. Nice work.</>
        )}
      </p>
    </div>
  );
}
