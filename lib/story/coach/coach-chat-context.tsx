'use client';

// Shared Coach chat — ONE conversation across the full Coach page AND the
// floating companion, held in a provider mounted at the (personal) layout (so
// it survives Coach↔Diary↔Planner navigation) and mirrored to sessionStorage
// (so it survives a reload while the window is open; clears on tab close).
//
// sessionStorage holds the live in-browser conversation in plaintext — fine for
// this single-user-own-device model; the durable record is the encrypted
// story_coach_log archive + semantic memory server-side.
//
// Prompt economy (MONETISATION SPEC v1.0): the server decides Sonnet vs Haiku
// and reports it back as a NEUTRAL `meter` event (mode 'full' | 'quiet' — never
// a model name, rule #323). The model is PINNED per conversation: we capture the
// mode on turn 1 and echo it back as `pinned_mode` on every later turn, so the
// sitting never changes voice mid-thread. A new conversation re-decides fresh.

import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import { coachLoginPath } from '@/lib/story/login-path';

export interface CoachMessage {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  error?: boolean;
  tools?: string[];
  image?: string; // preview data URL for an attached image on a user message
  // Prompt-economy notice (MONETISATION SPEC v1.0). 'approaching' = near the
  // monthly cloud limit; 'quiet' = now on the quieter mode (renders the
  // [Upgrade] button). Shown at most once per session, enforced by the provider.
  // (Neutral tokens — never a model name; rule #323.)
  notice?: 'approaching' | 'quiet';
}

/** Neutral model-depth token carried between server + client. Never a model name. */
type CoachMode = 'full' | 'quiet';

// Exact spec copy — do NOT improvise. No model names ever.
const COPY_APPROACHING =
  "We've covered a lot of ground together this month — you're near your cloud limit. Your local AI keeps going anytime.";
const COPY_HAIKU =
  "You've done deep work this month. Your coach is still here — just a little quieter until your next cycle.";

interface CoachSendOpts {
  reflectEntryId?: string;
  displayText?: string;
  /** An attached image for the coach to read (base64, no prefix). */
  image?: { media_type: string; data: string };
  /** A data URL preview of that image, for the chat bubble. */
  imagePreview?: string;
}

interface CoachChatValue {
  messages: CoachMessage[];
  busy: boolean;
  send: (text: string, opts?: CoachSendOpts) => Promise<void>;
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
  // The model depth pinned for the CURRENT conversation (null until turn 1's
  // meter event lands). Echoed to the server each turn; cleared on reset.
  const pinnedModeRef = useRef<CoachMode | null>(null);
  // Once-per-session guards for the prompt-economy notices (spec: never repeated).
  // Session-scoped (persisted to sessionStorage), NOT reset on a new conversation.
  const approachingShownRef = useRef(false);
  const haikuShownRef = useRef(false);

  const persist = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        conversationId: convoRef.current,
        messages: messagesRef.current,
        pinnedMode: pinnedModeRef.current,
        noticeShown: { approaching: approachingShownRef.current, quiet: haikuShownRef.current },
      }));
    } catch { /* quota/availability — non-fatal */ }
  }, []);

  // Hydrate once from sessionStorage (client-only; avoids SSR/hydration mismatch
  // by keeping the initial render empty and filling in after mount).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          conversationId?: string; messages?: CoachMessage[];
          pinnedMode?: CoachMode | null; noticeShown?: { approaching?: boolean; quiet?: boolean };
        };
        if (parsed.conversationId) convoRef.current = parsed.conversationId;
        if (parsed.pinnedMode === 'full' || parsed.pinnedMode === 'quiet') pinnedModeRef.current = parsed.pinnedMode;
        if (parsed.noticeShown?.approaching) approachingShownRef.current = true;
        if (parsed.noticeShown?.quiet) haikuShownRef.current = true;
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
    persist();
  }, [messages, persist]);

  const reset = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    convoRef.current = newConvoId();
    // New conversation → re-decide the model fresh. (Notice guards are
    // session-scoped per spec, so they are intentionally NOT reset here.)
    pinnedModeRef.current = null;
    persist();
  }, [persist]);

  const send = useCallback(
    async (text: string, opts?: CoachSendOpts) => {
      const token = getStoryAdminToken();
      if (!token) {
        if (typeof window !== 'undefined') window.location.href = coachLoginPath();
        return;
      }
      const userText = opts?.displayText ?? text;
      const history = messagesRef.current
        // Exclude streaming/error placeholders AND the prompt-economy notices
        // (canned copy) so the model never sees its own limit messages as dialogue.
        .filter((m) => !m.streaming && !m.error && !m.notice)
        .map((m) => ({ role: m.role, content: m.text }));

      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: userText, image: opts?.imagePreview },
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
        // Tell the server the caller's timezone + local time, so "today/now" is
        // theirs (not the server's). Best-effort — the server falls back if absent.
        let clientTz: string | undefined;
        try { clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
        const res = await fetch('/api/story/coach', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: text, history, reflect_entry_id: opts?.reflectEntryId, conversation_id: convoRef.current,
            client_tz: clientTz, client_now: new Date().toISOString(),
            image: opts?.image,
            // The model depth pinned for this conversation (absent on turn 1).
            pinned_mode: pinnedModeRef.current ?? undefined,
          }),
        });
        if (res.status === 401) {
          if (typeof window !== 'undefined') { sessionStorage.removeItem('story_admin_session'); window.location.href = coachLoginPath(); }
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
        // Captured from the server's `meter` event; acted on after the reply.
        let meterMode: CoachMode | null = null;
        let meterApproaching = false;
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
            } else if (type === 'meter') {
              meterMode = evt.mode === 'quiet' ? 'quiet' : 'full';
              meterApproaching = evt.approaching === true;
            }
          }
        }
        patchLast((m) => ({ ...m, streaming: false }));

        // Pin the model depth for the rest of THIS conversation (echoed next turn).
        if (meterMode) pinnedModeRef.current = meterMode;

        // Prompt-economy notice — exact spec copy, at most once per session.
        // Haiku transition (with [Upgrade]) takes precedence over the warning.
        if (meterMode === 'quiet' && !haikuShownRef.current) {
          haikuShownRef.current = true;
          setMessages((prev) => [...prev, { role: 'assistant', text: COPY_HAIKU, notice: 'quiet' }]);
        } else if (meterApproaching && !approachingShownRef.current) {
          approachingShownRef.current = true;
          setMessages((prev) => [...prev, { role: 'assistant', text: COPY_APPROACHING, notice: 'approaching' }]);
        }
        persist();
      } catch {
        patchLast((m) => ({ ...m, streaming: false, error: true, text: 'Connection lost. Try again.' }));
      } finally {
        setBusy(false);
      }
    },
    [persist],
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
