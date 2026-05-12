'use client';

// components/montree/child/ChildGuruChat.tsx
// Compact AI chat bubble embedded on the child's page.
// Voice-first: mic button is primary. Text input as fallback.
// Ephemeral: chat clears between page visits. Actions persist to DB.
// Uses Haiku via SSE streaming from /api/montree/children/[childId]/guru
// Dark forest visual treatment — all wiring intact

import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, ChevronDown, Mic, Square, ArrowUp, Check, X } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ tool: string; success: boolean; message: string }>;
  isStreaming?: boolean;
}

interface Props {
  childId: string;
  childName: string;
  onAction?: () => void;
}

const T = {
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  blur: 'blur(20px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.20)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function ChildGuruChat({ childId, childName, onAction }: Props) {
  const { t, locale } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || historyLoaded) return;
    setHistoryLoaded(true);
    fetch(`/api/montree/children/${childId}/guru`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(data => {
        if (data.messages?.length) {
          setMessages(data.messages.map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            actions: [],
          })));
        }
      })
      .catch(() => { /* silent — empty chat is fine */ });
  }, [isOpen, historyLoaded, childId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const getHistory = useCallback(() => {
    return messages
      .filter(m => !m.isStreaming)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      actions: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/montree/children/${childId}/guru`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: getHistory(),
          locale,
        }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hadAction = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'text') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, content: m.content + (data.content || '') }
                  : m
              ));
            } else if (data.type === 'action') {
              if (data.success) hadAction = true;
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, actions: [...(m.actions || []), { tool: data.tool, success: data.success, message: data.message }] }
                  : m
              ));
            } else if (data.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, content: data.message || 'Something went wrong', isStreaming: false }
                  : m
              ));
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, isStreaming: false }
                  : m
              ));
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
      ));

      if (hadAction && onAction) {
        setTimeout(() => onAction(), 300);
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('[ChildGuru] Send error:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? { ...m, content: 'Connection error. Try again.', isStreaming: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, isLoading, getHistory, locale, onAction]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : undefined,
      });

      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (blob.size < 100) return;

        setIsLoading(true);
        try {
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');

          const res = await montreeApi('/api/montree/guru/transcribe', {
            method: 'POST',
            body: formData,
            timeout: 15000,
          });

          if (res.ok) {
            const data = await res.json();
            const transcript = data.text || data.transcript || '';
            if (transcript.trim()) {
              await sendMessage(transcript);
            }
          }
        } catch (err) {
          console.error('[ChildGuru] Transcription error:', err);
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('[ChildGuru] Mic error:', err);
    }
  }, [sendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const toolLabel = (name: string): string => {
    const labels: Record<string, string> = {
      set_focus_work: t('childGuru.shelfUpdated'),
      clear_focus_work: t('childGuru.shelfCleared'),
      update_progress: t('childGuru.progressUpdated'),
      save_observation: t('childGuru.observationSaved'),
      browse_curriculum: t('childGuru.browsingCurriculum'),
      search_curriculum: t('childGuru.searchingCurriculum'),
      get_prioritized_recommendations: t('childGuru.analyzing'),
      get_child_recent_activity: t('childGuru.checkingActivity'),
    };
    return labels[name] || name;
  };

  // ─── Closed state — floating action button ───────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title={t('childGuru.aiAssistant')}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #34d399, #059669)',
          border: '1px solid rgba(52,211,153,0.55)',
          color: '#06281a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(16,185,129,0.40)',
          zIndex: 50,
          transition: 'all 140ms ease',
        }}
      >
        <Brain size={22} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 360,
      maxWidth: 'calc(100vw - 32px)',
      height: 480,
      maxHeight: 'calc(100vh - 96px)',
      background: T.sheet,
      border: `1px solid ${T.sheetBorder}`,
      borderRadius: 18,
      backdropFilter: T.blur,
      WebkitBackdropFilter: T.blur,
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 50,
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(52,211,153,0.06))',
        borderBottom: `1px solid ${T.sheetBorder}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.40)',
            color: T.emerald,
          }}>
            <Brain size={14} strokeWidth={1.75} />
          </div>
          <span style={{
            fontFamily: T.serif,
            fontSize: 14,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.1,
          }}>
            {childName}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          aria-label="Collapse"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: T.textPrimary,
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          <ChevronDown size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '32px 12px 12px',
            color: T.textMuted,
            fontFamily: T.sans,
            fontSize: 13,
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.35)',
              color: T.emerald,
              marginBottom: 10,
            }}>
              <Brain size={20} strokeWidth={1.75} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: T.textSecondary }}>
              {t('childGuru.askAboutChild', { name: childName })}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: T.textMuted }}>
              {t('childGuru.voiceOrText')}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '85%',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding: '10px 12px',
              background: msg.role === 'user' ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.10)'}`,
              backdropFilter: 'blur(14px) saturate(140%)',
              WebkitBackdropFilter: 'blur(14px) saturate(140%)',
              color: T.textPrimary,
            }}>
              {/* Action badges */}
              {msg.actions && msg.actions.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginBottom: 6,
                }}>
                  {msg.actions.map((action, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: action.success ? T.emeraldStrong : T.redSoft,
                        border: `1px solid ${action.success ? 'rgba(52,211,153,0.40)' : T.redBorder}`,
                        color: action.success ? T.emerald : T.red,
                        fontFamily: T.sans,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {action.success
                        ? <Check size={9} strokeWidth={2.5} />
                        : <X size={9} strokeWidth={2.5} />}
                      {toolLabel(action.tool)}
                    </span>
                  ))}
                </div>
              )}

              {/* Message text */}
              {msg.content && (
                <p style={{
                  margin: 0,
                  fontFamily: T.sans,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: T.textPrimary,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </p>
              )}

              {/* Streaming indicator */}
              {msg.isStreaming && !msg.content && msg.actions?.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: T.emerald,
                    animation: 'cgc-pulse 1.4s ease-in-out infinite',
                  }} />
                  <span style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted }}>
                    {t('childGuru.thinking')}
                  </span>
                  <style>{`@keyframes cgc-pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={{
        flexShrink: 0,
        borderTop: `1px solid ${T.cardBorder}`,
        padding: '10px 12px',
        background: 'linear-gradient(180deg, rgba(7,18,12,0) 0%, rgba(7,18,12,0.55) 100%)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
        }}>
          {/* Mic */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading && !isRecording}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isRecording ? T.redSoft : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isRecording ? T.redBorder : 'rgba(255,255,255,0.12)'}`,
              color: isRecording ? T.red : T.textPrimary,
              cursor: (isLoading && !isRecording) ? 'not-allowed' : 'pointer',
              opacity: (isLoading && !isRecording) ? 0.4 : 1,
              transition: 'all 120ms ease',
              animation: isRecording ? 'cgc-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          >
            {isRecording ? (
              <span style={{
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.red,
              }}>
                {recordingSeconds}s
              </span>
            ) : (
              <Mic size={15} strokeWidth={1.75} />
            )}
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('childGuru.typeOrSpeak')}
            disabled={isLoading || isRecording}
            rows={1}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 14,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'none',
              maxHeight: 80,
              opacity: (isLoading || isRecording) ? 0.5 : 1,
              boxSizing: 'border-box',
            }}
          />
          <style>{`textarea::placeholder { color: rgba(255,255,255,0.30); }`}</style>

          {/* Send */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            aria-label="Send"
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (!input.trim() || isLoading)
                ? 'rgba(52,211,153,0.20)'
                : 'linear-gradient(180deg, #34d399, #10b981)',
              border: `1px solid ${(!input.trim() || isLoading) ? 'rgba(52,211,153,0.20)' : 'rgba(52,211,153,0.55)'}`,
              color: (!input.trim() || isLoading) ? 'rgba(52,211,153,0.50)' : '#06281a',
              cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
              boxShadow: (!input.trim() || isLoading) ? 'none' : '0 4px 14px rgba(16,185,129,0.30)',
              transition: 'all 120ms ease',
            }}
          >
            <ArrowUp size={15} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
