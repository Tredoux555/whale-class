'use client';

// The Coach — full conversation page. Reflects on the diary, guards against
// overcommitment, plans the day/week with built-in rest. Reads ?reflect=<id>
// from the URL (via window.location, per the project's Suspense-avoidance
// pattern) to kick off a reflection on a specific entry.

import { useEffect, useRef, useState } from 'react';
import { useCoachChat } from '@/lib/story/coach/use-coach-chat';
import { useVoiceRecord } from '@/lib/story/coach/use-voice-record';
import Markdown from '@/components/story/personal/Markdown';
import { T } from '@/lib/story/personal-theme';

const TOOL_LABEL: Record<string, string> = {
  read_diary: 'reading your diary',
  read_projects: 'looking at your projects',
  check_load: 'checking your load',
  plan_day: 'planning today',
  plan_week: 'planning the week',
  wellbeing_check: 'checking how you’re doing',
  consult_wisdom: 'consulting the frameworks',
  recall: 'remembering',
  remember: 'noting that',
  update_project: 'updating a project',
};

const SUGGESTIONS = [
  'What should I focus on today?',
  'How am I doing this week?',
  'I want to take on something new — talk me through it.',
  'Plan my week.',
];

export default function CoachPage() {
  const { messages, busy, send, reset } = useCoachChat();
  const [draft, setDraft] = useState('');
  const { recording, transcribing, error: voiceError, toggle: toggleMic } = useVoiceRecord(
    (t) => setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const kickedOff = useRef(false);

  // Reflect-on-entry kickoff from ?reflect=<id>.
  useEffect(() => {
    if (kickedOff.current) return;
    kickedOff.current = true;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reflectId = params.get('reflect');
    const ask = params.get('ask');
    if (reflectId && /^[0-9a-f-]{36}$/i.test(reflectId)) {
      void send('Reflect on this diary entry.', {
        reflectEntryId: reflectId,
        displayText: 'Reflect on this entry ✦',
      });
      window.history.replaceState(null, '', '/story/admin/coach');
    } else if (ask && ask.trim()) {
      void send(ask.trim().slice(0, 400));
      window.history.replaceState(null, '', '/story/admin/coach');
    }
  }, [send]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const submit = () => {
    const t = draft.trim();
    if (!t || busy) return;
    setDraft('');
    void send(t);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 200px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.4px' }}>Coach</h1>
        {messages.length > 0 && (
          <button onClick={reset} style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer' }}>
            New conversation
          </button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: T.textMid, lineHeight: 1.7 }}>
            <div style={{ fontFamily: T.serif, fontSize: 20, color: T.text, marginBottom: 6 }}>I&apos;ve got you.</div>
            Ask me what to focus on, talk through what&apos;s heavy, or let&apos;s plan the day with rest built in.
            <button
              onClick={() => { if (!busy) void send('Let me do my first session — get to know me. Ask me what a good coach would, a couple of questions at a time.', { displayText: 'Start my first session ✦' }); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', marginTop: 16,
                border: `1px solid ${T.border}`, borderRadius: 12, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(232,201,106,0.16), rgba(232,201,106,0.05))',
                color: T.text, fontFamily: T.sans, fontSize: 14.5, fontWeight: 600, padding: '13px 15px',
              }}
            >
              ✦ Start my first session — let Coach get to know you
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { if (!busy) void send(s); }}
                  style={{
                    appearance: 'none', textAlign: 'left',
                    border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.03)',
                    color: T.textMid, fontFamily: T.sans, fontSize: 14, padding: '11px 14px',
                    borderRadius: 12, cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
            {m.role === 'user' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(52,211,153,0.22), rgba(29,107,72,0.18))',
                border: `1px solid ${T.border}`, color: T.text, padding: '10px 14px',
                borderRadius: 16, fontSize: 15, lineHeight: 1.55,
              }}>
                {m.text}
              </div>
            ) : (
              <div>
                {m.tools && m.tools.length > 0 && m.streaming && !m.text && (
                  <div style={{ fontSize: 12.5, color: T.textDim, marginBottom: 6, fontStyle: 'italic' }}>
                    {TOOL_LABEL[m.tools[m.tools.length - 1]] || 'thinking'}…
                  </div>
                )}
                {m.text ? (
                  <Markdown text={m.text} style={{ color: m.error ? '#f87171' : 'rgba(255,255,255,0.88)', fontSize: 15.5 }} />
                ) : m.streaming ? (
                  <span style={{ color: T.textDim }}>thinking…</span>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {voiceError && <div style={{ color: '#f87171', fontSize: 12.5, padding: '8px 2px 0' }}>{voiceError}</div>}

      {/* composer */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={recording ? 'Listening…' : transcribing ? 'Transcribing…' : 'Talk to your coach…'}
          rows={1}
          style={{
            flex: 1, resize: 'none', maxHeight: 140,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.borderSoft}`,
            borderRadius: 14, outline: 'none', color: T.text, fontFamily: T.sans,
            fontSize: 15, lineHeight: 1.5, padding: '11px 14px',
          }}
        />
        <button
          onClick={toggleMic}
          disabled={transcribing}
          aria-label={recording ? 'Stop recording' : 'Record voice'}
          title="Speak to your coach"
          style={{
            appearance: 'none', flexShrink: 0, width: 46, height: 46, borderRadius: 14, cursor: transcribing ? 'default' : 'pointer',
            border: `1px solid ${recording ? '#f87171' : T.borderSoft}`,
            background: recording ? 'rgba(248,113,113,0.18)' : 'rgba(255,255,255,0.05)',
            color: recording ? '#f87171' : T.textMid, fontSize: 18,
          }}
        >
          {transcribing ? '…' : recording ? '■' : '🎤'}
        </button>
        <button
          onClick={submit}
          disabled={busy || !draft.trim()}
          style={{
            appearance: 'none', border: 'none',
            background: busy || !draft.trim() ? 'rgba(52,211,153,0.25)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            color: '#06140c', fontWeight: 700, fontSize: 15, width: 46, height: 46,
            borderRadius: 14, cursor: busy || !draft.trim() ? 'default' : 'pointer', flexShrink: 0,
          }}
          aria-label="Send"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
