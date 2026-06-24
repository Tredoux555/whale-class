'use client';

// The Coach — full conversation page. Reflects on the diary, guards against
// overcommitment, plans the day/week with built-in rest. Reads ?reflect=<id>
// from the URL (via window.location, per the project's Suspense-avoidance
// pattern) to kick off a reflection on a specific entry.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachChat } from '@/lib/story/coach/use-coach-chat';
import { useVoiceRecord } from '@/lib/story/coach/use-voice-record';
import { fileToCoachImage, type CoachImage } from '@/lib/story/coach/image-attach';
import { getStoryAdminToken } from '@/lib/story/personal-client';
import Markdown from '@/components/story/personal/Markdown';
import CoachUpgradeButton from '@/components/story/personal/CoachUpgradeButton';
import CopyButton from '@/components/story/personal/CopyButton';
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

const MAX_PHOTOS = 5;
const DOC_ACCEPT =
  '.pdf,.docx,.txt,.csv,.md,.tsv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown';

interface PendingDoc { name: string; text: string; chars: number; truncated: boolean }

export default function CoachPage() {
  const router = useRouter();
  const { messages, busy, send, reset } = useCoachChat();
  const [draft, setDraft] = useState('');
  const { recording, transcribing, error: voiceError, toggle: toggleMic } = useVoiceRecord(
    (t) => setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t),
  );
  const [pendingImgs, setPendingImgs] = useState<CoachImage[]>([]);
  const [pendingDoc, setPendingDoc] = useState<PendingDoc | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const [attachError, setAttachError] = useState('');
  const photoRef = useRef<HTMLInputElement | null>(null);
  const docRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const kickedOff = useRef(false);

  // Pick photos — multi-select, capped at 5 total. Each is downscaled client-side
  // (image-attach) and read as a separate vision block on send.
  const onPickPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setAttachError('');
    const room = MAX_PHOTOS - pendingImgs.length;
    if (room <= 0) { setAttachError(`You can attach up to ${MAX_PHOTOS} photos.`); return; }
    const converted: CoachImage[] = [];
    for (const f of files.slice(0, room)) {
      try {
        const ci = await fileToCoachImage(f);
        if (ci) converted.push(ci);
      } catch { /* skip unreadable file */ }
    }
    if (!converted.length) { setAttachError('Those files aren’t images I can read.'); return; }
    setPendingImgs((prev) => [...prev, ...converted].slice(0, MAX_PHOTOS));
    if (files.length > room) setAttachError(`Added the first ${room} — up to ${MAX_PHOTOS} photos per message.`);
  };

  const removeImg = (idx: number) => setPendingImgs((prev) => prev.filter((_, i) => i !== idx));

  // Pick a document — uploaded to the server, full text extracted, held until send.
  const onPickDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setAttachError('');
    if (f.size > 10 * 1024 * 1024) { setAttachError('That file is too large — the limit is 10MB.'); return; }
    const token = getStoryAdminToken();
    if (!token) { setAttachError('Please sign in again to attach a document.'); return; }
    setDocBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/story/coach/extract-document', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        let msg = 'Could not read that document.';
        try { msg = ((await res.json()) as { error?: string })?.error || msg; } catch { /* not json */ }
        setAttachError(msg);
        return;
      }
      const data = (await res.json()) as { name: string; text: string; chars: number; truncated?: boolean };
      setPendingDoc({ name: data.name, text: data.text, chars: data.chars, truncated: !!data.truncated });
    } catch {
      setAttachError('Could not upload that document. Try again.');
    } finally {
      setDocBusy(false);
    }
  };

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

  const canSend = !busy && !docBusy && (draft.trim().length > 0 || pendingImgs.length > 0 || !!pendingDoc);

  const submit = () => {
    if (!canSend) return;
    const t = draft.trim();
    const imgs = pendingImgs;
    const doc = pendingDoc;
    setDraft('');
    setPendingImgs([]);
    setPendingDoc(null);
    setAttachError('');
    void send(t, {
      images: imgs.length
        ? imgs.map((i) => ({ media_type: i.media_type, data: i.data, previewUrl: i.previewUrl }))
        : undefined,
      document: doc ? { text: doc.text, name: doc.name } : undefined,
    });
  };

  // Explicit wrap-up — routes through the normal send path so the coach
  // synthesises the build state from the conversation and saves it via
  // save_build_state, then reads it back.
  const endAndSave = () => {
    if (busy) return;
    void send('Save our build state and end the session.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 200px)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.4px' }}>Coach</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/story/admin/diary')} style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer' }}>
            📓 Journal
          </button>
          {messages.length > 0 && (
            <button onClick={reset} style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 13, cursor: 'pointer' }}>
              New conversation
            </button>
          )}
        </div>
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
                {(() => {
                  const bubbleImgs = m.images && m.images.length ? m.images : m.image ? [m.image] : [];
                  return bubbleImgs.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: m.text || m.docName ? 8 : 0 }}>
                      {bubbleImgs.map((src, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={src} alt="Attached" style={{ maxWidth: bubbleImgs.length > 1 ? 120 : '100%', maxHeight: bubbleImgs.length > 1 ? 120 : 240, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                      ))}
                    </div>
                  ) : null;
                })()}
                {m.docName && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: m.text ? 8 : 0,
                    background: 'rgba(232,201,106,0.12)', border: `1px solid rgba(232,201,106,0.3)`,
                    borderRadius: 10, padding: '6px 10px', fontSize: 13, color: T.text,
                  }}>
                    <span aria-hidden>📄</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{m.docName}</span>
                  </div>
                )}
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
                {m.notice === 'quiet' && <CoachUpgradeButton />}
                {m.text && !m.streaming && !m.error && !m.notice && <CopyButton text={m.text} />}
              </div>
            )}
          </div>
        ))}
      </div>

      {voiceError && <div style={{ color: '#f87171', fontSize: 12.5, padding: '8px 2px 0' }}>{voiceError}</div>}
      {attachError && <div style={{ color: '#f87171', fontSize: 12.5, padding: '8px 2px 0' }}>{attachError}</div>}

      {/* Attachment tray — photo thumbnails (removable) + document chip + extracting state. */}
      {(pendingImgs.length > 0 || pendingDoc || docBusy) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '10px 0 2px' }}>
          {pendingImgs.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', width: 52, height: 52 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.previewUrl} alt="To send" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 9, border: `1px solid ${T.border}` }} />
              <button
                onClick={() => removeImg(idx)}
                aria-label="Remove photo"
                style={{
                  position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%',
                  border: 'none', cursor: 'pointer', background: 'rgba(6,20,12,0.92)', color: '#fff',
                  fontSize: 13, lineHeight: '20px', textAlign: 'center', padding: 0,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.18)',
                }}
              >
                ×
              </button>
            </div>
          ))}

          {docBusy && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.textMid, fontSize: 13, padding: '8px 12px', border: `1px solid ${T.borderSoft}`, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <span style={{
                width: 13, height: 13, borderRadius: '50%', display: 'inline-block',
                border: `2px solid ${T.gold}`, borderTopColor: 'transparent', animation: 'lc-spin 0.7s linear infinite',
              }} />
              Reading your document…
            </div>
          )}

          {pendingDoc && !docBusy && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              background: 'rgba(232,201,106,0.12)', border: `1px solid rgba(232,201,106,0.3)`,
              borderRadius: 10, padding: '7px 11px', fontSize: 13, color: T.text,
            }}>
              <span aria-hidden>📄</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{pendingDoc.name}</span>
                <span style={{ color: T.textDim, fontSize: 11.5 }}>
                  Ready to review{pendingDoc.truncated ? ' · long doc, trimmed' : ''}
                </span>
              </span>
              <button
                onClick={() => setPendingDoc(null)}
                aria-label="Remove document"
                style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 16, cursor: 'pointer', padding: '0 0 0 2px' }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* composer */}
      <input ref={photoRef} type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ display: 'none' }} />
      <input ref={docRef} type="file" accept={DOC_ACCEPT} onChange={onPickDoc} style={{ display: 'none' }} />
      <style>{`@keyframes lc-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 12, borderTop: `1px solid ${T.borderSoft}` }}>
        <button
          onClick={() => photoRef.current?.click()}
          disabled={pendingImgs.length >= MAX_PHOTOS}
          aria-label="Attach photos to read"
          title={pendingImgs.length >= MAX_PHOTOS ? `Up to ${MAX_PHOTOS} photos` : 'Attach photos for your coach to read (up to 5)'}
          style={{
            appearance: 'none', flexShrink: 0, width: 46, height: 46, borderRadius: 14,
            cursor: pendingImgs.length >= MAX_PHOTOS ? 'default' : 'pointer',
            border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.05)',
            color: pendingImgs.length >= MAX_PHOTOS ? T.textDim : T.textMid, fontSize: 18,
          }}
        >
          📎
        </button>
        <button
          onClick={() => docRef.current?.click()}
          disabled={docBusy}
          aria-label="Attach a document to review"
          title="Attach a document for your coach to review (PDF, Word, text, CSV · up to 10MB)"
          style={{
            appearance: 'none', flexShrink: 0, width: 46, height: 46, borderRadius: 14,
            cursor: docBusy ? 'default' : 'pointer',
            border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.05)', color: T.textMid, fontSize: 18,
          }}
        >
          {docBusy ? '…' : '📄'}
        </button>
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
          disabled={!canSend}
          style={{
            appearance: 'none', border: 'none',
            background: !canSend ? 'rgba(52,211,153,0.25)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
            color: '#06140c', fontWeight: 700, fontSize: 15, width: 46, height: 46,
            borderRadius: 14, cursor: !canSend ? 'default' : 'pointer', flexShrink: 0,
          }}
          aria-label="Send"
        >
          ↑
        </button>
      </div>

      {messages.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button
            onClick={endAndSave}
            disabled={busy}
            title="Save a recoverable build state so you can pick up exactly here next time"
            style={{
              appearance: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              border: `1px solid ${T.borderSoft}`, background: 'rgba(255,255,255,0.04)',
              color: busy ? T.textDim : T.textMid, fontFamily: T.sans, fontSize: 13,
              padding: '7px 12px', borderRadius: 11, cursor: busy ? 'default' : 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Save &amp; end session
          </button>
        </div>
      )}
    </div>
  );
}
