'use client';

// Shared Coach chat hook — used by the full Coach page AND the floating
// companion. Manages messages, streams the SSE reply, attaches the Story-admin
// bearer token, and bounces to login on 401.

import { useCallback, useRef, useState } from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';

export interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  error?: boolean;
  tools?: string[];
}

export function useCoachChat(initial: CoachMessage[] = []) {
  const [messages, setMessages] = useState<CoachMessage[]>(initial);
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<CoachMessage[]>(initial);
  messagesRef.current = messages;
  // Stable id for this chat session — groups the archive (story_coach_log).
  const convoRef = useRef<string>('');
  if (!convoRef.current) {
    convoRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`;
  }

  const reset = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    convoRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}`;
  }, []);

  const send = useCallback(
    async (text: string, opts?: { reflectEntryId?: string; displayText?: string }) => {
      const token = getStoryAdminToken();
      if (!token) {
        if (typeof window !== 'undefined') window.location.href = '/story/admin';
        return;
      }
      const userText = opts?.displayText ?? text;
      // History = completed messages before this turn (text only).
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
          patchLast((m) => ({ ...m, streaming: false, error: true, text: 'Something went wrong. Try again.' }));
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
            if (!line || line.startsWith(':')) continue;
            if (!line.startsWith('data:')) continue;
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

  return { messages, busy, send, reset };
}
