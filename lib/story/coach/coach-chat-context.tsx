'use client';

// Shared Coach chat — ONE conversation across the full Coach page AND the
// floating companion, held in a provider mounted at the (personal) layout (so
// it survives Coach↔Diary↔Planner navigation) and mirrored to sessionStorage
// (so it survives a reload while the window is open; clears on tab close).
//
// sessionStorage holds the live in-browser conversation in plaintext — fine for
// this single-user-own-device model; the durable record is the encrypted
// story_coach_log archive + semantic memory server-side.

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';

export interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  error?: boolean;
  tools?: string[];
}

interface CoachChatValue {
  messages: CoachMessage[];
  busy: boolean;
  send: (text: string, opts?: { reflectEntryId?: string; displayText?: string }) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'story_coach_chat';
const CoachChatContext = createContext<CoachChatValue | null>(null);

function newConvoId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`;
}

export function CoachChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<CoachMessage[]>([]);
  messagesRef.current = messages;
  const convoRef = useRef<string>('');
  if (!convoRef.current) convoRef.current = newConvoId();
  const hydrated = useRef(false);

  // Hydrate once from sessionStorage (client-only; avoids SSR/hydration mismatch
  // by keeping the initial render empty and filling in after mount).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { conversationId?: string; messages?: CoachMessage[] };
        if (parsed.conversationId) convoRef.current = parsed.conversationId;
        if (Array.isArray(parsed.messages) && parsed.messages.length) {
          const cleaned = parsed.messages
            .map((m) => ({ ...m, streaming: false }))
            // drop a trailing empty assistant placeholder left mid-stream
            .filter((m) => !(m.role === 'assistant' && !m.text && !m.error));
          if (cleaned.length) setMessages(cleaned);
        }
      }
    } catch { /* ignore corrupt storage */ }
    hydrated.current = true;
  }, []);

  // Persist on change (after hydration, so we don't clobber stored state with [] on mount).
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId: convoRef.current, messages }));
    } catch { /* quota/availability — non-fatal */ }
  }, [messages]);

  const reset = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    convoRef.current = newConvoId();
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* non-fatal */ }
  }, []);

  const send = useCallback(
    async (text: string, opts?: { reflectEntryId?: string; displayText?: string }) => {
      const token = getStoryAdminToken();
      if (!token) {
        if (typeof window !== 'undefined') window.location.href = '/story/admin';
        return;
      }
      const userText = opts?.displayText ?? text;
      const history = messagesRef.current
        .filter((m) => !m.streaming && !m.error)
        .map((m) => ({ role: m.role, content: m.text }));

      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: userText },
        { role: 'assistant', text: '', streaming: true, tools: [] },
      ]);

      const patchLast = (fn: (m: CoachMessage) => CoachMessage) =>
        setMessages((prev) => {
          if (!prev.length) return prev;
          const copy = prev.slice();
          copy[copy.length - 1] = fn(copy[copy.length - 1]);
          return copy;
        });

      try {
        const res = await fetch('/api/story/coach', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: text, history, reflect_entry_id: opts?.reflectEntryId, conversation_id: convoRef.current }),
        });
        if (res.status === 401) {
          if (typeof window !== 'undefined') { sessionStorage.removeItem('story_admin_session'); window.location.href = '/story/admin'; }
          return;
        }
        if (!res.ok || !res.body) {
          // Surface the REAL server error (don't swallow it) so failures are diagnosable.
          let serverMsg = '';
          try { serverMsg = ((await res.json()) as { error?: string })?.error || ''; } catch { /* not json */ }
          patchLast((m) => ({
            ...m, streaming: false, error: true,
            text: serverMsg ? `${serverMsg} (${res.status})` : `Something went wrong (${res.status}). Try again.`,
          }));
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const line = part.trim();
            if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
            let evt: Record<string, unknown>;
            try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
            const type = evt.type;
            if (type === 'text' && typeof evt.text === 'string') {
              patchLast((m) => ({ ...m, text: m.text + (evt.text as string) }));
            } else if (type === 'tool_call' && typeof evt.tool === 'string') {
              patchLast((m) => ({ ...m, tools: [...(m.tools || []), evt.tool as string] }));
            } else if (type === 'error' && typeof evt.error === 'string') {
              patchLast((m) => ({ ...m, error: true, streaming: false, text: m.text || (evt.error as string) }));
            } else if (type === 'done') {
              patchLast((m) => ({ ...m, streaming: false }));
            }
          }
        }
        patchLast((m) => ({ ...m, streaming: false }));
      } catch {
        patchLast((m) => ({ ...m, streaming: false, error: true, text: 'Connection lost. Try again.' }));
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return (
    <CoachChatContext.Provider value={{ messages, busy, send, reset }}>
      {children}
    </CoachChatContext.Provider>
  );
}

// Consume the shared conversation. Falls back to a no-op shape if somehow used
// outside the provider (shouldn't happen — the personal layout wraps everything).
export function useCoachChat(): CoachChatValue {
  const ctx = useContext(CoachChatContext);
  if (!ctx) {
    return {
      messages: [],
      busy: false,
      send: async () => {},
      reset: () => {},
    };
  }
  return ctx;
}
