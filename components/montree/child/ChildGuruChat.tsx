'use client';

// components/montree/child/ChildGuruChat.tsx
// Compact AI chat bubble embedded on the child's page.
// Voice-first: mic button is primary. Text input as fallback.
// Ephemeral: chat clears between page visits. Actions persist to DB.
// Uses Haiku via SSE streaming from /api/montree/children/[childId]/guru

import { useState, useRef, useEffect, useCallback } from 'react';
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
  onAction?: () => void; // Called after tool actions so parent can refresh data
}

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

  // Load chat history from DB on first open
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Build history for context (last 10 messages, alternating user/assistant)
  const getHistory = useCallback(() => {
    return messages
      .filter(m => !m.isStreaming)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));
  }, [messages]);

  // --- Send message ---
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

    // Abort any previous request
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

      // Ensure streaming flag is cleared
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id ? { ...m, isStreaming: false } : m
      ));

      // If tools executed, tell the parent page to refresh its data
      if (hadAction && onAction) {
        setTimeout(() => onAction(), 300); // Small delay for DB writes to settle
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
  }, [childId, isLoading, getHistory]);

  // --- Voice recording ---
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
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (blob.size < 100) return; // Too short, discard

        // Transcribe via Whisper
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
      mediaRecorder.start(1000); // Collect chunks every second
      setIsRecording(true);
      setRecordingSeconds(0);

      // Timer
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

  // --- Key handler ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // --- Tool name display ---
  const toolLabel = (name: string): string => {
    const labels: Record<string, string> = {
      set_focus_work: locale === 'zh' ? '更新书架' : 'Shelf updated',
      clear_focus_work: locale === 'zh' ? '已清除' : 'Shelf cleared',
      update_progress: locale === 'zh' ? '进度已更新' : 'Progress updated',
      save_observation: locale === 'zh' ? '已记录' : 'Observation saved',
      browse_curriculum: locale === 'zh' ? '浏览课程' : 'Browsing curriculum',
      search_curriculum: locale === 'zh' ? '搜索课程' : 'Searching curriculum',
      get_prioritized_recommendations: locale === 'zh' ? '分析中' : 'Analyzing',
      get_child_recent_activity: locale === 'zh' ? '查看活动' : 'Checking activity',
    };
    return labels[name] || name;
  };

  // --- Render ---
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 active:scale-90 transition-all flex items-center justify-center z-50"
        title={locale === 'zh' ? 'AI 助手' : 'AI Assistant'}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-500 text-white rounded-t-2xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="font-semibold text-sm">{childName}</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-emerald-600 rounded-full transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            <p className="text-2xl mb-2">🧠</p>
            <p>{locale === 'zh' ? `问我关于${childName}的任何问题` : `Ask me anything about ${childName}`}</p>
            <p className="text-xs mt-1 text-gray-300">
              {locale === 'zh' ? '语音或文字均可' : 'Voice or text'}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-emerald-500 text-white rounded-2xl rounded-br-md px-3 py-2'
                : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3 py-2'
            }`}>
              {/* Action badges */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {msg.actions.map((action, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        action.success
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-red-200 text-red-800'
                      }`}
                    >
                      {action.success ? '✓' : '✗'} {toolLabel(action.tool)}
                    </span>
                  ))}
                </div>
              )}

              {/* Message text */}
              {msg.content && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}

              {/* Streaming indicator */}
              {msg.isStreaming && !msg.content && msg.actions?.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-400">
                    {locale === 'zh' ? '思考中...' : 'Thinking...'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-100 px-3 py-2 bg-gray-50 rounded-b-2xl">
        <div className="flex items-end gap-2">
          {/* Mic button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading && !isRecording}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-90'
            } disabled:opacity-40`}
          >
            {isRecording ? (
              <span className="text-xs font-bold">{recordingSeconds}s</span>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={locale === 'zh' ? '输入或说话...' : 'Type or speak...'}
            disabled={isLoading || isRecording}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:opacity-50 max-h-20"
          />

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 active:scale-90 transition-all disabled:opacity-40 disabled:hover:bg-emerald-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
