'use client';

// Floating Coach companion — present on every personal-platform screen so
// Tredoux can ask "what should I focus on today?" from anywhere. Hidden on the
// full Coach page (which IS the Coach in full). Collapsed: a small avatar
// bottom-right. Expanded: a compact chat panel.

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCoachChat } from '@/lib/story/coach/use-coach-chat';
import { useVoiceRecord } from '@/lib/story/coach/use-voice-record';
import Markdown from './Markdown';
import { T } from '@/lib/story/personal-theme';

export default function CoachFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { messages, busy, send } = useCoachChat();
  const [draft, setDraft] = useState('');
  const { recording, transcribing, toggle: toggleMic } = useVoiceRecord(
    (t) => setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // The Coach page already is the Coach — don't double up there.
  if (pathname?.startsWith('/story/admin/coach')) return null;

  const submit = () => {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft('');
    void send(t);
  };

  return (
    <>
      {/* trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open coach"
          style={{
            position: 'fixed',
            right: 'max(18px, env(safe-area-inset-right))',
            bottom: 'max(18px, env(safe-area-inset-bottom))',
            zIndex: 40,
            width: 54, height: 54, borderRadius: '50%',
            border: `1px solid ${T.border}`,
            background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            color: '#06140c', fontSize: 24, cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(0,0,0,0.45), 0 0 22px rgba(52,211,153,0.3)',
          }}
        >
          ✦
        </button>
      )}

      {/* panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 'max(14px, env(safe-area-inset-right))',
            bottom: 'max(14px, env(safe-area-inset-bottom))',
            zIndex: 41,
            width: 'min(380px, calc(100vw - 28px))',
            height: 'min(520px, calc(100dvh - 100px))',
            display: 'flex', flexDirection: 'column',
            background: T.cardSolid,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: `1px solid ${T.borderSoft}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: T.gold, fontSize: 16 }}>✦</span>
              <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.text }}>Coach</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.length === 0 && (
              <div style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6 }}>
                Quick question? Ask me anything — what to focus on, how you&apos;re holding up, or to plan the day.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                {m.role === 'user' ? (
                  <div style={{ background: 'rgba(52,211,153,0.18)', border: `1px solid ${T.border}`, color: T.text, padding: '8px 12px', borderRadius: 13, fontSize: 14 }}>{m.text}</div>
                ) : m.text ? (
                  <Markdown text={m.text} style={{ fontSize: 14, color: m.error ? '#f87171' : 'rgba(255,255,255,0.88)' }} />
                ) : (
                  <span style={{ color: T.textDim, fontSize: 13 }}>thinking…</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, padding: 12, borderTop: `1px solid ${T.borderSoft}` }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              placeholder={recording ? 'Listening…' : transcribing ? 'Transcribing…' : 'Ask your coach…'}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.borderSoft}`, borderRadius: 11, outline: 'none', color: T.text, fontFamily: T.sans, fontSize: 14, padding: '9px 12px' }}
            />
            <button onClick={toggleMic} disabled={transcribing} aria-label={recording ? 'Stop' : 'Record'}
              style={{ appearance: 'none', width: 38, height: 38, borderRadius: 11, flexShrink: 0, cursor: transcribing ? 'default' : 'pointer',
                border: `1px solid ${recording ? '#f87171' : T.borderSoft}`,
                background: recording ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.05)',
                color: recording ? '#f87171' : T.textMid, fontSize: 15 }}>
              {transcribing ? '…' : recording ? '■' : '🎤'}
            </button>
            <button onClick={submit} disabled={busy || !draft.trim()} aria-label="Send"
              style={{ appearance: 'none', border: 'none', width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: busy || !draft.trim() ? 'rgba(52,211,153,0.25)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                color: '#06140c', fontWeight: 700, cursor: busy || !draft.trim() ? 'default' : 'pointer' }}>↑</button>
          </div>
        </div>
      )}
    </>
  );
}
