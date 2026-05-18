// hooks/useThreadPolling.ts
// Lightweight polling for messaging thread detail pages so new replies
// appear without a manual refresh.
//
// Used by:
//   app/montree/parent/messages/[threadId]/page.tsx
//   app/montree/admin/communication/threads/[threadId]/page.tsx
//   app/montree/dashboard/messages/[threadId]/page.tsx
//
// Behaviour:
//   - Polls `endpoint` every `intervalMs` (default 5000ms) while enabled
//   - Pauses when document.hidden (battery + cost savings)
//   - Pauses while `pause` is true (caller flips this during send-in-flight
//     so optimistic bubbles aren't trampled by an in-flight server fetch)
//   - Skips when the previous fetch is still in flight (no overlap)
//   - Merges server messages into local state, preserving optimistic-only
//     bubbles (anything with id NOT in the server payload AND marked as
//     optimistic stays — server-side acks replace optimistic id via the
//     send handler, not this hook)
//   - Stops cleanly on unmount / threadId change
//
// The merge strategy is conservative — we trust the SERVER ordering for
// confirmed messages, append optimistic ones at the end. Send handlers
// continue to replace `tempId → server.id` in their own success branch.

import { useEffect, useRef } from 'react';

interface ThreadMessageLike {
  id: string;
  optimistic?: boolean;
  sendFailed?: boolean;
  created_at?: string;
}

interface UseThreadPollingArgs<M extends ThreadMessageLike> {
  /** The full messages endpoint URL, including threadId. */
  endpoint: string;
  /** State updater for the messages array. */
  setMessages: (updater: (prev: M[]) => M[]) => void;
  /** Disable polling entirely (initial load not done yet, or unauthorized). */
  enabled: boolean;
  /** Pause polling temporarily — e.g. while a send is in flight. */
  pause?: boolean;
  /** Polling interval in milliseconds. Default 5000. */
  intervalMs?: number;
}

export function useThreadPolling<M extends ThreadMessageLike>({
  endpoint,
  setMessages,
  enabled,
  pause = false,
  intervalMs = 5000,
}: UseThreadPollingArgs<M>): void {
  const inFlightRef = useRef(false);
  const pauseRef = useRef(pause);
  const enabledRef = useRef(enabled);

  // Mirror props into refs so the interval closure always sees latest values
  // without re-binding the interval (avoids the listener-multiplication trap
  // documented in CLAUDE.md Session 103 rule #14).
  useEffect(() => { pauseRef.current = pause; }, [pause]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const timer = window.setInterval(async () => {
      if (cancelled) return;
      if (document.hidden) return;
      if (pauseRef.current) return;
      if (!enabledRef.current) return;
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      try {
        const res = await fetch(endpoint, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const serverMessages = (data?.messages || []) as M[];
        if (cancelled) return;

        setMessages((prev) => {
          const serverIds = new Set(serverMessages.map((m) => m.id));
          // Preserve optimistic-only bubbles (the send handler will replace
          // their id with the server id when the POST resolves).
          const optimisticOnly = prev.filter(
            (m) => (m.optimistic || m.sendFailed) && !serverIds.has(m.id)
          );
          return [...serverMessages, ...optimisticOnly];
        });
      } catch {
        // Network blip — next tick will retry. Don't surface as error.
      } finally {
        inFlightRef.current = false;
      }
    }, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [endpoint, enabled, intervalMs, setMessages]);
}
