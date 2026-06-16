// components/montree/home/IvyChat.tsx
// Ivy — the family's companion and the home system's central controller.
// Streams from /api/montree/companion and renders her warm replies plus the
// inline Step Card. Photos drive the Smart-Capture loop (a photo of the child
// working advances the step; a photo of what they love seeds the journey).
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { compressImage } from '@/lib/montree/cache';
import VoiceNoteButton from '@/components/montree/guru/VoiceNoteButton';
import StepCard, { type StepCardData } from '@/components/montree/home/StepCard';
import MarkdownLite from '@/components/montree/home/MarkdownLite';

type IvyMessage =
  | { id: string; kind: 'text'; isUser: boolean; content: string }
  | { id: string; kind: 'card'; card: StepCardData };

interface IvyChatProps {
  childId: string;
  childName: string;
  classroomId?: string;
  onShelfUpdated?: () => void;
  onScheduleUpdated?: () => void;
  prefillMessage?: string;
  onPrefillConsumed?: () => void;
}

const TOOL_STATUS: Record<string, string> = {
  present_step: 'Preparing your step…',
  add_to_calendar: 'Adding to your calendar…',
  set_routine: 'Setting the routine…',
  cancel_calendar_item: 'Updating your calendar…',
  list_schedule: 'Checking your calendar…',
  growth_snapshot: 'Looking at how they\'re growing…',
  set_focus_work: 'Saving to the shelf…',
  update_progress: 'Noting their progress…',
  save_observation: 'Writing it down…',
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function IvyChat({
  childId,
  childName,
  classroomId,
  onShelfUpdated,
  onScheduleUpdated,
  prefillMessage,
  onPrefillConsumed,
}: IvyChatProps) {
  const [messages, setMessages] = useState<IvyMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [upgrade, setUpgrade] = useState<{ url: string; message: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const currentAssistantIdRef = useRef<string | null>(null);
  const greetedRef = useRef(false);
  const convIdRef = useRef<string>(newId('conv'));

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, status, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Prefill (e.g. from Shelf / Plan "ask Ivy")
  useEffect(() => {
    if (prefillMessage) {
      setInputText(prefillMessage);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefillMessage, onPrefillConsumed]);

  // --- SSE helpers (lazy assistant bubble keeps text/card ordering correct) ---
  const ensureAssistant = useCallback((): string => {
    if (currentAssistantIdRef.current) return currentAssistantIdRef.current;
    const id = newId('ivy');
    currentAssistantIdRef.current = id;
    setMessages((prev) => [...prev, { id, kind: 'text', isUser: false, content: '' }]);
    return id;
  }, []);

  const appendAssistantText = useCallback((text: string) => {
    const id = ensureAssistant();
    setMessages((prev) => prev.map((m) => (m.id === id && m.kind === 'text' ? { ...m, content: m.content + text } : m)));
  }, [ensureAssistant]);

  const runSend = useCallback(async (opts: { text?: string; isGreeting?: boolean }) => {
    if (sending) return;
    const text = (opts.text || '').trim();
    const hasImage = !!selectedImage;
    if (!opts.isGreeting && !text && !hasImage) return;

    sendAbortRef.current?.abort();
    const controller = new AbortController();
    sendAbortRef.current = controller;

    if (!opts.isGreeting) {
      setMessages((prev) => [...prev, { id: newId('user'), kind: 'text', isUser: true, content: text || '📷 Photo' }]);
    }
    setInputText('');
    setSending(true);
    setStatus('');
    currentAssistantIdRef.current = null;
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const hardTimeout = setTimeout(() => controller.abort(), 110000);

    try {
      // Upload image first (if any) → https url for the route's vision.
      let imageUrl: string | null = null;
      if (hasImage && selectedImage) {
        try {
          const fd = new FormData();
          fd.append('file', selectedImage);
          fd.append('child_id', childId);
          if (classroomId) fd.append('classroom_id', classroomId);
          const up = await fetch('/api/montree/media/upload', { method: 'POST', body: fd, signal: controller.signal });
          if (up.ok) {
            const d = await up.json();
            imageUrl = d.url || d.publicUrl || null;
            clearImage();
          } else {
            toast.error('Photo upload failed — try again.');
            clearImage();
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') { clearTimeout(hardTimeout); setSending(false); return; }
          toast.error('Photo upload failed — try again.');
          clearImage();
        }
      }

      const body: Record<string, unknown> = {
        child_id: childId,
        question: opts.isGreeting ? '__greeting__' : (text || ''),
        conversation_id: convIdRef.current,
      };
      if (imageUrl) body.image_url = imageUrl;

      const res = await fetch('/api/montree/companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(hardTimeout);

      if (!res.ok) {
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* non-JSON */ }
        if (res.status === 402 && data.requires_upgrade) {
          setUpgrade({ url: (data.upgrade_url as string) || '/montree/admin/billing', message: (data.error as string) || 'Ivy is part of your home plan.' });
        } else if (res.status === 429) {
          toast.error('Just a moment — too many messages. Try again shortly.');
        } else {
          toast.error((data.error as string) || 'Something went wrong — please try again.');
        }
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('text/event-stream') || !res.body) {
        toast.error('Something went wrong — please try again.');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let gotText = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let event: Record<string, unknown>;
            try { event = JSON.parse(line.slice(6)); } catch { continue; }
            const type = event.type as string;
            if (type === 'text' && typeof event.text === 'string' && event.text) {
              gotText = true;
              setStatus('');
              appendAssistantText(event.text);
            } else if (type === 'tool_call' && typeof event.tool === 'string') {
              setStatus(TOOL_STATUS[event.tool] || '');
            } else if (type === 'step_card' && event.card) {
              setMessages((prev) => [...prev, { id: newId('card'), kind: 'card', card: event.card as StepCardData }]);
              currentAssistantIdRef.current = null; // text after a card starts a fresh bubble
            } else if (type === 'state_changed') {
              if (event.what === 'shelf') onShelfUpdated?.();
              else if (event.what === 'schedule') onScheduleUpdated?.();
            } else if (type === 'error') {
              if (!gotText) toast.error((event.error as string) || 'Something went wrong — please try again.');
            }
            // 'thinking' and 'done' need no UI handling here.
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      clearTimeout(hardTimeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('That took too long — please try again.');
      } else {
        toast.error('Connection problem — please try again.');
      }
    } finally {
      setSending(false);
      setStatus('');
      currentAssistantIdRef.current = null;
      sendAbortRef.current = null;
    }
  }, [sending, selectedImage, childId, classroomId, appendAssistantText, onShelfUpdated, onScheduleUpdated]);

  // Greet once on mount.
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    runSend({ isGreeting: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { sendAbortRef.current?.abort(); }, []);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('That image is too large.'); return; }
    try {
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  function clearImage() {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleVoice = (text: string) => {
    setInputText((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runSend({ text: inputText }); }
  };

  // Upgrade gate (free tier)
  if (upgrade) {
    return (
      <div className={`flex-1 flex items-center justify-center px-6 ${BIO.bg.gradient}`}>
        <div className={`max-w-sm text-center rounded-2xl border ${BIO.border.glow} ${BIO.bg.cardSolid} px-6 py-8`} style={{ boxShadow: BIO.glow.medium }}>
          <div className="text-4xl mb-3">🌿</div>
          <h3 className={`text-lg font-semibold ${BIO.text.primary}`}>Meet Ivy</h3>
          <p className={`mt-2 text-sm leading-relaxed ${BIO.text.secondary}`}>{upgrade.message}</p>
          <a href={upgrade.url} className={`mt-5 inline-block px-5 py-2.5 rounded-full text-sm ${BIO.btn.mint}`}>
            Start your home plan
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-4 ${BIO.bg.gradient}`}>
        {messages.map((msg) =>
          msg.kind === 'card' ? (
            <div key={msg.id} className="mb-3 ml-10">
              <StepCard card={msg.card} />
            </div>
          ) : (
            <div key={msg.id} className={`flex mb-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              {!msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center mr-2 mt-1 shrink-0" style={{ boxShadow: BIO.glow.soft }}>
                  <span className="text-sm">🌿</span>
                </div>
              )}
              <div
                className={`max-w-[80%] ${msg.isUser ? `${BIO.bg.cardSolid} border ${BIO.border.dim} rounded-2xl rounded-br-md` : `${BIO.bg.card} border ${BIO.border.glow} rounded-2xl rounded-bl-md`} px-4 py-3`}
                style={!msg.isUser ? { boxShadow: BIO.glow.soft } : undefined}
              >
                {msg.content ? (
                  msg.isUser
                    ? <p className={`text-sm leading-relaxed whitespace-pre-wrap ${BIO.text.primary}`}>{msg.content}</p>
                    : <div className={BIO.text.primary}><MarkdownLite text={msg.content} /></div>
                ) : (
                  <span className={`text-sm ${BIO.text.muted}`}>…</span>
                )}
              </div>
            </div>
          ),
        )}

        {sending && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center" style={{ boxShadow: BIO.glow.soft }}>
              <span className="text-sm">🌿</span>
            </div>
            <div className={`${BIO.bg.card} border ${BIO.border.glow} rounded-2xl rounded-bl-md px-4 py-3`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {status && <span className="text-[10px] text-white/40 ml-1">{status}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {imagePreview && (
        <div className={`border-t ${BIO.border.subtle} ${BIO.bg.surface} px-3 py-2`}>
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, not a remote asset */}
            <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
            <button onClick={clearImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">✕</button>
          </div>
        </div>
      )}

      <div className={`border-t ${BIO.border.subtle} ${BIO.bg.surface} px-3 py-3`}>
        <div className="flex items-end gap-2">
          <VoiceNoteButton onTranscription={handleVoice} disabled={sending} />
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={childName ? `Tell Ivy about ${childName.split(' ')[0]}…` : 'Tell Ivy anything…'}
              disabled={sending}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-2xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-[#4ADE80]/30 focus:ring-1 focus:ring-[#4ADE80]/10 disabled:opacity-50`}
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${BIO.btn.ghost}`}
            title="Add a photo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,.jpg,.jpeg" capture="environment" className="hidden" onChange={handleImageSelect} />
          <button
            onClick={() => runSend({ text: inputText })}
            disabled={(!inputText.trim() && !selectedImage) || sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${BIO.btn.mint}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
