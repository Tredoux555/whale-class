// components/montree/home/PortalChat.tsx
// The Portal — AI-first conversational interface for home parents
// Guru greets first, manages intake, check-ins, and daily advice
// Bioluminescent Depth aesthetic
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import { useI18n } from '@/lib/montree/i18n/context';
import { compressImage } from '@/lib/montree/cache';
import VoiceNoteButton from '@/components/montree/guru/VoiceNoteButton';

// TTS playback hook — reuses a single Audio element to avoid GC pressure
function useTTS() {
  const { t } = useI18n();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Lazily create and reuse a single Audio element
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const stop = useCallback(() => {
    // Cancel any pending fetch
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Stop any playing audio (reuse element, don't destroy)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load(); // Reset internal state
    }
    // Revoke previous blob URL
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    setPlayingId(null);
    setLoadingId(null);
  }, []);

  const play = useCallback(async (messageId: string, text: string) => {
    // If already playing this message, stop it
    if (playingId === messageId) {
      stop();
      return;
    }

    // Stop any current playback or pending fetch
    stop();
    setLoadingId(messageId);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/montree/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (!res.ok) {
        toast.error(t('home.portal.couldNotGenerateSpeech'));
        setLoadingId(null);
        return;
      }

      const blob = await res.blob();
      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      currentUrlRef.current = url;
      const audio = getAudio();

      audio.onended = () => {
        if (currentUrlRef.current === url) {
          URL.revokeObjectURL(url);
          currentUrlRef.current = null;
        }
        setPlayingId(null);
      };
      audio.onerror = () => {
        if (currentUrlRef.current === url) {
          URL.revokeObjectURL(url);
          currentUrlRef.current = null;
        }
        setPlayingId(null);
        setLoadingId(null);
      };

      audio.src = url;
      abortRef.current = null;
      setLoadingId(null);
      setPlayingId(messageId);
      await audio.play();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadingId(null);
      toast.error(t('home.portal.couldNotGenerateSpeech'));
    }
  }, [playingId, stop, getAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { play, stop, playingId, loadingId };
}

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  actions?: Array<{ tool: string; success: boolean; message: string }>;
}

interface PortalChatProps {
  childId: string;
  childName: string;
  classroomId?: string;
  onShelfUpdated?: () => void;
  onGuruLimitReached?: () => void;
  prefillMessage?: string;
  onPrefillConsumed?: () => void;
}

export default function PortalChat({
  childId,
  childName,
  classroomId,
  onShelfUpdated,
  onGuruLimitReached,
  prefillMessage,
  onPrefillConsumed,
}: PortalChatProps) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [thinkingLong, setThinkingLong] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendAbortRef = useRef<AbortController | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const tts = useTTS();

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Handle prefill from Shelf → Portal
  useEffect(() => {
    if (prefillMessage) {
      setInputText(prefillMessage);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefillMessage, onPrefillConsumed]);

  // Initialize: load history + greeting
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const init = async () => {
      try {
        // 1. Load chat history
        const histRes = await fetch(`/api/montree/guru?child_id=${childId}&limit=20`, { signal });
        if (signal.aborted) return;
        if (!histRes.ok) throw new Error('History fetch failed');
        const histData = await histRes.json();

        const chatMessages: ChatMessage[] = [];

        if (histData.success && Array.isArray(histData.history) && histData.history.length > 0) {
          const reversed = [...histData.history].reverse();
          for (const item of reversed) {
            if (item.question) {
              chatMessages.push({
                id: `q-${item.id}`,
                content: item.question,
                isUser: true,
                timestamp: item.asked_at,
              });
            }
            if (item.response_insight) {
              chatMessages.push({
                id: `r-${item.id}`,
                content: item.response_insight,
                isUser: false,
                timestamp: item.asked_at,
              });
            }
          }
        }

        // 2. Show static greeting — no AI call on load (user sends first message)
        const name = childName?.split(' ')[0] || '';
        chatMessages.push({
          id: 'greeting-static',
          content: name ? t('home.portal.greetingWithName').replace('{name}', name) : t('home.portal.greetingDefault'),
          isUser: false,
          timestamp: new Date().toISOString(),
        });
        setMessages(chatMessages);
        setLoading(false);

      } catch (err) {
        if (signal.aborted) return;
        setLoading(false);
        setMessages([{
          id: 'error-init',
          content: t('home.portal.greetingError'),
          isUser: false,
          timestamp: new Date().toISOString(),
        }]);
      }
    };

    init();

    return () => { abortController.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Cleanup send abort on unmount
  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort();
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    };
  }, []);

  // Image selection handler
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('home.portal.selectImageFile'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('home.portal.imageTooLarge'));
      return;
    }

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
  }, [t]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if ((!text && !selectedImage) || sending) return;

    // Cancel any previous in-flight request
    sendAbortRef.current?.abort();
    const controller = new AbortController();
    sendAbortRef.current = controller;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text || (selectedImage ? t('home.portal.photoAttached') : ''),
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setThinkingLong(false);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // "Still thinking..." after 10s
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = setTimeout(() => setThinkingLong(true), 10000);
    // Hard timeout at 70s (server hard wall is 60s — 10s buffer for network)
    const hardTimeout = setTimeout(() => controller.abort(), 70000);

    try {
      // Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        try {
          const formData = new FormData();
          formData.append('file', selectedImage);
          formData.append('child_id', childId);
          if (classroomId) formData.append('classroom_id', classroomId);

          const uploadRes = await fetch('/api/montree/media/upload', {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            imageUrl = uploadData.url || uploadData.publicUrl || null;
            clearImage(); // Only clear preview on successful upload
          } else {
            console.error('Image upload failed with status:', uploadRes.status);
            toast.error(t('home.portal.imageUploadFailed'));
            clearImage(); // Clear on failure too — user can re-attach
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            clearTimeout(hardTimeout);
            if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
            setSending(false);
            setThinkingLong(false);
            return;
          }
          // Image upload failed — continue with text only
          console.error('Image upload failed:', err);
          toast.error(t('home.portal.imageUploadFailed'));
          clearImage();
        }
      }

      const guruBody: Record<string, unknown> = {
          child_id: childId,
          question: text || (imageUrl ? t('home.portal.photoAttached') : ''),
          classroom_id: classroomId,
          conversational: true,
          stream: true, // Request SSE streaming response
      };
      // Send image_url as separate field so the guru route can use Claude's vision API
      if (imageUrl) {
        guruBody.image_url = imageUrl;
      }

      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guruBody),
        signal: controller.signal,
      });

      clearTimeout(hardTimeout);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);

      // Check for non-streaming error responses
      if (!res.ok) {
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* non-JSON */ }
        if (data.error === 'guru_daily_limit_reached' || data.error === 'guru_trial_expired') {
          onGuruLimitReached?.();
          toast.error(t('home.portal.limitReached'));
        } else if (res.status === 429) {
          toast.error(t('home.portal.rateLimited'));
        } else {
          toast.error((data.error as string) || t('home.portal.failedToRespond'));
        }
        return;
      }

      // Check if response is SSE stream
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        // Streaming response — read SSE events and update message incrementally
        const guruMsgId = `guru-${Date.now()}`;
        let streamedText = '';

        // Add empty guru message bubble
        setMessages(prev => [...prev, {
          id: guruMsgId,
          content: '',
          isUser: false,
          timestamp: new Date().toISOString(),
        }]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === 'text' && event.text) {
                  streamedText += event.text;
                  setMessages(prev => prev.map(msg =>
                    msg.id === guruMsgId ? { ...msg, content: streamedText } : msg
                  ));
                } else if (event.type === 'error') {
                  toast.error(t('home.portal.failedToRespond'));
                }
              } catch { /* skip malformed JSON */ }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!streamedText.trim()) {
          setMessages(prev => prev.filter(msg => msg.id !== guruMsgId));
          toast.error(t('home.portal.failedToRespond'));
        }
      } else {
        // Fallback: non-streaming JSON response
        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch {
          toast.error(t('home.portal.failedToRespond'));
          return;
        }

        if (data.success && data.insight) {
          const guruMsg: ChatMessage = {
            id: `guru-${Date.now()}`,
            content: data.insight as string,
            isUser: false,
            timestamp: new Date().toISOString(),
            actions: (data.actions as Array<{ success: boolean }>) || undefined,
          };
          setMessages(prev => [...prev, guruMsg]);

          if ((data.actions as Array<{ success: boolean }>)?.some(a => a.success)) {
            onShelfUpdated?.();
          }
        } else {
          toast.error((data.error as string) || t('home.portal.failedToRespond'));
        }
      }
    } catch (err) {
      clearTimeout(hardTimeout);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error(t('home.portal.timeout'));
      } else {
        toast.error(t('home.portal.connectionFailed'));
      }
    } finally {
      setSending(false);
      setThinkingLong(false);
      sendAbortRef.current = null;
    }
  };

  // Voice transcription
  const handleVoiceTranscription = (text: string) => {
    setInputText(prev => prev ? `${prev} ${text}` : text);
    textareaRef.current?.focus();
  };

  // Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${BIO.bg.deep}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-3">🌿</div>
          <p className={`text-sm ${BIO.text.secondary}`}>{t('home.portal.guideIsPreparing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-4 py-4 ${BIO.bg.gradient}`}
      >
        {messages.map(msg => (
          <div key={msg.id} className={`flex mb-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Guru avatar */}
            {!msg.isUser && (
              <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center mr-2 mt-1 shrink-0"
                   style={{ boxShadow: BIO.glow.soft }}>
                <span className="text-sm">🌿</span>
              </div>
            )}

            <div className={`max-w-[80%] ${
              msg.isUser
                ? `${BIO.bg.cardSolid} border ${BIO.border.dim} rounded-2xl rounded-br-md`
                : `${BIO.bg.card} border ${BIO.border.glow} rounded-2xl rounded-bl-md`
            } px-4 py-3`}
              style={!msg.isUser ? { boxShadow: BIO.glow.soft } : undefined}
            >
              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                msg.isUser ? BIO.text.primary : BIO.text.primary
              }`}>
                {msg.content}
              </p>

              {/* Tool action badges */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.actions.filter(a => a.success).map((a, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${BIO.bg.mintSubtle} ${BIO.text.mint}`}>
                      {a.message}
                    </span>
                  ))}
                </div>
              )}

              {/* TTS speaker button — Guru messages only */}
              {!msg.isUser && msg.content.length > 10 && (
                <button
                  onClick={(e) => { e.stopPropagation(); tts.play(msg.id, msg.content); }}
                  className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  title={tts.playingId === msg.id ? t('home.portal.stop') : t('home.portal.listen')}
                >
                  {tts.loadingId === msg.id ? (
                    <span className="animate-pulse">⏳</span>
                  ) : tts.playingId === msg.id ? (
                    <span className="text-[#4ADE80] animate-pulse">🔊</span>
                  ) : (
                    <span>🔈</span>
                  )}
                  <span>
                    {tts.loadingId === msg.id ? t('home.portal.generating') :
                     tts.playingId === msg.id ? t('home.portal.playing') : t('home.portal.listen')}
                  </span>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#4ADE80]/15 flex items-center justify-center"
                 style={{ boxShadow: BIO.glow.soft }}>
              <span className="text-sm">🌿</span>
            </div>
            <div className={`${BIO.bg.card} border ${BIO.border.glow} rounded-2xl rounded-bl-md px-4 py-3`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {thinkingLong && (
                  <span className="text-[10px] text-white/40 ml-1">{t('home.portal.stillThinking')}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className={`border-t ${BIO.border.subtle} ${BIO.bg.surface} px-3 py-2`}>
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-16 rounded-lg object-cover" />
            <button
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className={`border-t ${BIO.border.subtle} ${BIO.bg.surface} px-3 py-3`}>
        <div className="flex items-end gap-2">
          <VoiceNoteButton
            onTranscription={handleVoiceTranscription}
            disabled={sending}
          />

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={childName ? t('home.portal.askAboutChild').replace('{name}', childName.split(' ')[0]) : t('home.portal.askYourGuide')}
              disabled={sending}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-2xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-[#4ADE80]/30 focus:ring-1 focus:ring-[#4ADE80]/10 disabled:opacity-50`}
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${BIO.btn.ghost}`}
            title={t('home.portal.attachPhoto')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Hidden file input for images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />

          <button
            onClick={handleSend}
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
