// components/montree/guru/GuruChatThread.tsx
// WhatsApp-style conversational Guru chat for teachers and homeschool parents.
// Dark forest visual treatment — uniform across teacher / parent / admin.
// Wiring intact: SSE streaming, thinking-stream debounce, image upload + compress,
// onboarding flow, history fetch, error fallback, daily-limit handling.
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Camera, ArrowUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import ChatBubble from './ChatBubble';
import ConcernPills from './ConcernPills';
import GuruOnboardingPicker from './GuruOnboardingPicker';
import VoiceNoteButton from './VoiceNoteButton';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  imageUrl?: string;
  thinking?: string;
}

interface GuruChatThreadProps {
  childId: string;
  childName: string;
  classroomId?: string;
  isTeacher?: boolean;
  isWholeClassMode?: boolean;
  onGuruLimitReached?: () => void;
}

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  cardBg: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  red: '#f87171',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function GuruChatThread({
  childId,
  childName,
  classroomId,
  isTeacher = false,
  isWholeClassMode = false,
  onGuruLimitReached,
}: GuruChatThreadProps) {
  const { t, locale } = useI18n();
  const [state, setState] = useState<'loading' | 'onboarding' | 'chat'>('loading');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(0);
  const thinkingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingImage, setPendingImage] = useState<{ url: string; uploading: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const streamBufferRef = useRef('');
  const streamFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const thinkingBufferRef = useRef('');
  const thinkingFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const firstName = childName.split(' ')[0];

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    const abortController = new AbortController();
    const init = async () => {
      try {
        if (isTeacher) {
          const histParams = new URLSearchParams({ child_id: childId, locale, limit: '20' });
          if (isWholeClassMode && classroomId) histParams.set('classroom_id', classroomId);
          const histRes = await fetch(`/api/montree/guru?${histParams.toString()}`, { signal: abortController.signal });
          if (!histRes.ok) throw new Error(`History fetch failed: ${histRes.status}`);
          const histData = await histRes.json();

          if (histData.success && histData.history && histData.history.length > 0) {
            const chatMessages: ChatMessage[] = [];
            const reversed = [...histData.history].reverse();
            for (const item of reversed) {
              chatMessages.push({ id: `q-${item.id}`, content: item.question, isUser: true, timestamp: item.asked_at });
              if (item.response_insight) {
                chatMessages.push({ id: `r-${item.id}`, content: item.response_insight, isUser: false, timestamp: item.asked_at });
              }
            }
            setMessages(chatMessages);
          } else {
            const welcomeContent = isWholeClassMode
              ? t('guru.wholeClassWelcome')
              : t('guru.teacherWelcome').replace('{name}', firstName);
            setMessages([{
              id: 'welcome',
              content: welcomeContent,
              isUser: false,
              timestamp: new Date().toISOString(),
            }]);
          }
          setState('chat');
          return;
        }

        // Parent flow
        const concernsRes = await fetch(`/api/montree/guru/concerns?child_id=${childId}`, { signal: abortController.signal });
        if (!concernsRes.ok) throw new Error(`Concerns fetch failed: ${concernsRes.status}`);
        const concernsData = await concernsRes.json();

        if (concernsData.success && concernsData.onboarded) {
          setConcerns(concernsData.concerns || []);

          const histRes = await fetch(`/api/montree/guru?child_id=${childId}&locale=${locale}&limit=20`, { signal: abortController.signal });
          if (!histRes.ok) throw new Error(`History fetch failed: ${histRes.status}`);
          const histData = await histRes.json();

          if (histData.success && histData.history) {
            const chatMessages: ChatMessage[] = [];
            const reversed = [...histData.history].reverse();
            for (const item of reversed) {
              chatMessages.push({
                id: `q-${item.id}`,
                content: item.question,
                isUser: true,
                timestamp: item.asked_at,
              });
              if (item.response_insight) {
                chatMessages.push({
                  id: `r-${item.id}`,
                  content: item.response_insight,
                  isUser: false,
                  timestamp: item.asked_at,
                });
              }
            }

            setMessages(chatMessages);

            if (histData.history.length > 0) {
              const lastChat = new Date(histData.history[0].asked_at);
              const daysSince = Math.floor((Date.now() - lastChat.getTime()) / 86400000);
              if (daysSince >= 2) {
                chatMessages.push({
                  id: 'followup-greeting',
                  content: t('guru.welcomeBackGreeting').replace('{name}', firstName),
                  isUser: false,
                  timestamp: new Date().toISOString(),
                });
                setMessages([...chatMessages]);
              }
            }
          }

          if (!histData.history || histData.history.length === 0) {
            setMessages([{
              id: 'welcome',
              content: t('guru.welcomeGreeting').replace('{name}', firstName),
              isUser: false,
              timestamp: new Date().toISOString(),
            }]);
          }

          setState('chat');
        } else {
          setState('onboarding');
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        toast.error(t('guru.errorLoadChat'));
        setState(isTeacher ? 'chat' : 'onboarding');
      }
    };

    init();
    return () => abortController.abort();
  }, [childId, childName, classroomId, isTeacher, isWholeClassMode, locale, firstName, t]);

  const handleOnboardingComplete = (selectedConcerns: string[]) => {
    setConcerns(selectedConcerns);
    const welcomeMsg = selectedConcerns.length > 0
      ? t('guru.onboardingWelcomeWithConcerns').replace('{name}', firstName)
      : t('guru.onboardingWelcomeNoConcerns').replace('{name}', firstName);

    setMessages([{
      id: 'onboarding-welcome',
      content: welcomeMsg,
      isUser: false,
      timestamp: new Date().toISOString(),
    }]);
    setState('chat');
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    if (pendingImage?.uploading) return;

    const imageUrl = pendingImage?.url || undefined;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      isUser: true,
      timestamp: new Date().toISOString(),
      imageUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setPendingImage(null);
    setSending(true);
    setThinkingPhase(0);
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = setTimeout(() => {
      setThinkingPhase(1);
      thinkingTimerRef.current = setTimeout(() => {
        setThinkingPhase(2);
      }, 5000);
    }, 3000);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      if (isWholeClassMode && !classroomId) {
        console.error('[GuruChat] Whole-class mode but no classroomId available');
        const errorMsg: ChatMessage = {
          id: `guru-error-${Date.now()}`,
          content: t('guru.unableLoadClassroom') || 'Unable to load classroom data. Please go back to the dashboard and try again, or select a specific student.',
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setSending(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          question: text,
          classroom_id: classroomId || undefined,
          conversational: true,
          stream: true,
          locale,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        clearTimeout(timeout);
        let errorContent = '';
        try {
          const data = await res.json();
          if (data.error === 'guru_daily_limit_reached' || data.error === 'guru_trial_expired') {
            onGuruLimitReached?.();
            errorContent = t('guru.limitReachedUpgrade');
          } else if (data.error === 'ai_budget_reached') {
            errorContent = t('aiBudget.budgetReached');
          } else if (res.status === 503) {
            errorContent = '⚠️ Guru is temporarily offline. The AI service may not be configured — please check that ANTHROPIC_API_KEY is set in your deployment environment.';
          } else {
            errorContent = data.error || data.message || t('guru.failedResponse');
          }
        } catch {
          errorContent = res.status === 503
            ? '⚠️ Guru is temporarily offline. The AI service may not be configured.'
            : t('guru.failedResponse');
        }
        const errorMsg: ChatMessage = {
          id: `guru-error-${Date.now()}`,
          content: errorContent,
          isUser: false,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
        setSending(false);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const guruMsgId = `guru-${Date.now()}`;
        let streamedText = '';
        let streamedThinking = '';
        let firstTokenReceived = false;
        let firstThinkingReceived = false;
        let bubbleCreated = false;

        const flushThinkingBuffer = () => {
          if (thinkingBufferRef.current) {
            streamedThinking += thinkingBufferRef.current;
            if (bubbleCreated) {
              setMessages(prev => prev.map(msg =>
                msg.id === guruMsgId ? { ...msg, thinking: streamedThinking } : msg
              ));
            }
            thinkingBufferRef.current = '';
          }
        };

        const scheduleThinkingFlush = () => {
          if (thinkingFlushTimerRef.current) {
            clearTimeout(thinkingFlushTimerRef.current);
          }
          thinkingFlushTimerRef.current = setTimeout(() => {
            flushThinkingBuffer();
            thinkingFlushTimerRef.current = null;
          }, 80);
        };

        const flushStreamBuffer = () => {
          if (streamBufferRef.current) {
            streamedText += streamBufferRef.current;
            setMessages(prev => prev.map(msg =>
              msg.id === guruMsgId ? { ...msg, content: streamedText } : msg
            ));
            streamBufferRef.current = '';
          }
        };

        const scheduleFlush = () => {
          if (streamFlushTimerRef.current) {
            clearTimeout(streamFlushTimerRef.current);
          }
          streamFlushTimerRef.current = setTimeout(() => {
            flushStreamBuffer();
            streamFlushTimerRef.current = null;
          }, 100);
        };

        const ensureBubble = () => {
          if (!bubbleCreated) {
            bubbleCreated = true;
            setMessages(prev => [...prev, {
              id: guruMsgId,
              content: '',
              isUser: false,
              timestamp: new Date().toISOString(),
              thinking: '',
            }]);
          }
        };

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
              const jsonStr = line.slice(6);
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'thinking' && event.text) {
                  if (!firstThinkingReceived) {
                    firstThinkingReceived = true;
                    setIsThinking(true);
                    setIsStreaming(true);
                    ensureBubble();
                  }
                  thinkingBufferRef.current += event.text;
                  scheduleThinkingFlush();
                } else if (event.type === 'text' && event.text) {
                  if (!firstTokenReceived) {
                    firstTokenReceived = true;
                    setIsThinking(false);
                    setIsStreaming(true);
                    ensureBubble();
                    if (thinkingFlushTimerRef.current) {
                      clearTimeout(thinkingFlushTimerRef.current);
                      thinkingFlushTimerRef.current = null;
                    }
                    flushThinkingBuffer();
                  }
                  streamBufferRef.current += event.text;
                  scheduleFlush();
                } else if (event.type === 'error') {
                  toast.error(t('guru.failedResponse'));
                } else if (event.type === 'done') {
                  // Stream complete
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (thinkingFlushTimerRef.current) {
          clearTimeout(thinkingFlushTimerRef.current);
          thinkingFlushTimerRef.current = null;
        }
        flushThinkingBuffer();
        if (streamFlushTimerRef.current) {
          clearTimeout(streamFlushTimerRef.current);
          streamFlushTimerRef.current = null;
        }
        flushStreamBuffer();

        clearTimeout(timeout);

        setIsStreaming(false);
        setIsThinking(false);

        if (!streamedText.trim()) {
          setMessages(prev => {
            const filtered = prev.filter(msg => msg.id !== guruMsgId);
            return [...filtered, {
              id: `guru-error-${Date.now()}`,
              content: t('guru.failedResponse'),
              isUser: false,
              timestamp: new Date().toISOString(),
            }];
          });
        }
      } else {
        clearTimeout(timeout);
        const data = await res.json();

        if (data.success && data.insight) {
          const guruMsg: ChatMessage = {
            id: `guru-${Date.now()}`,
            content: data.insight,
            isUser: false,
            timestamp: new Date().toISOString(),
          };
          setMessages(prev => [...prev, guruMsg]);
        } else if (data.error === 'guru_daily_limit_reached' || data.error === 'guru_trial_expired') {
          onGuruLimitReached?.();
          toast.error(t('guru.limitReachedUpgrade'));
        } else if (data.error === 'ai_budget_reached') {
          toast.error(t('aiBudget.budgetReached'), { duration: 8000 });
        } else {
          toast.error(data.error || t('guru.failedResponse'));
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error(t('guru.timeout'));
      } else {
        toast.error(t('guru.connectionFailed'));
      }
    } finally {
      setSending(false);
      setIsStreaming(false);
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
    }
  };

  const handleVoiceTranscription = (text: string) => {
    setInputText(prev => prev ? `${prev} ${text}` : text);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error(t('guru.selectImageFile') || 'Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('guru.imageTooLarge') || 'Image too large (max 10MB)');
      return;
    }

    const uploadController = new AbortController();

    try {
      const compressed = await compressImageForChat(file);
      setPendingImage({ url: '', uploading: true });

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('child_id', childId);
      formData.append('type', 'guru_image');

      const res = await fetch('/api/montree/media/upload', {
        method: 'POST',
        body: formData,
        signal: uploadController.signal,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      if (data.success && data.url) {
        setPendingImage({ url: data.url, uploading: false });
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.error(t('guru.imageUploadFailed') || 'Image upload failed');
      setPendingImage(null);
    }
  };

  async function compressImageForChat(file: File): Promise<File> {
    let bitmap: ImageBitmap | null = null;
    try {
      const maxDim = 1024;
      bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;

      if (width <= maxDim && height <= maxDim && file.size <= 500 * 1024) {
        bitmap.close();
        bitmap = null;
        return file;
      }

      const scale = Math.min(maxDim / width, maxDim / height, 1);
      const canvas = new OffscreenCanvas(Math.round(width * scale), Math.round(height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { bitmap.close(); bitmap = null; return file; }

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      bitmap = null;

      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch {
      return file;
    } finally {
      if (bitmap) { try { bitmap.close(); } catch { /* already closed */ } }
    }
  }

  // ─── Loading state ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.sans,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 10px',
            color: T.emerald,
            animation: 'gc-pulse 1.6s ease-in-out infinite',
          }}>
            <Sparkles size={20} strokeWidth={1.75} />
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>
            {t('common.loading')}
          </p>
          <style>{`@keyframes gc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
        </div>
      </div>
    );
  }

  // ─── Onboarding (parents only) ─────────────────────────────────────────
  if (state === 'onboarding' && !isTeacher) {
    return (
      <GuruOnboardingPicker
        childId={childId}
        childName={childName}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // ─── Chat ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: T.sans,
      color: T.textPrimary,
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(7,18,12,0.97), rgba(7,18,12,0.92))',
        borderBottom: `1px solid ${T.cardBorder}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: T.emerald,
            flexShrink: 0,
          }}>
            <Sparkles size={17} strokeWidth={1.75} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 17,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {isTeacher ? `${firstName} — ${t('guru.guruAdvisor')}` : `${firstName} ${t('guru.guide')}`}
            </h2>
            {!isTeacher && concerns.length > 0 && (
              <div style={{ marginTop: 5 }}>
                <ConcernPills concernIds={concerns} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          background: T.bg,
          backgroundImage: T.glow,
        }}
      >
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
            imageUrl={msg.imageUrl}
            thinking={msg.thinking}
            isThinkingLive={isThinking && msg.id === messages[messages.length - 1]?.id && !msg.isUser}
            isTeacher={isTeacher}
          />
        ))}

        {/* Thinking indicator (waiting for first SSE event) */}
        {sending && !isStreaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(52,211,153,0.32), rgba(16,185,129,0.18))',
              border: '1px solid rgba(52,211,153,0.40)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.emerald,
              flexShrink: 0,
            }}>
              <Sparkles size={14} strokeWidth={1.75} />
            </div>
            <div style={{
              background: T.cardBg,
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: '14px 14px 14px 4px',
              padding: '12px 16px',
              backdropFilter: T.blur,
              WebkitBackdropFilter: T.blur,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: T.emerald,
                      display: 'inline-block',
                      animation: 'gc-dot-pulse 1.4s ease-in-out infinite',
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
                <style>{`@keyframes gc-dot-pulse { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }`}</style>
              </div>
              <span style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: T.textSecondary,
                transition: 'opacity 300ms ease',
              }}>
                {thinkingPhase === 0
                  ? (t('guru.thinking') || 'Thinking...')
                  : thinkingPhase === 1
                    ? (t('guru.thinkingContext') || 'Building context...')
                    : (t('guru.thinkingGenerating') || 'Generating response...')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(10,26,15,0) 0%, rgba(10,26,15,0.85) 30%, rgba(10,26,15,0.95) 100%)',
        borderTop: `1px solid ${T.cardBorder}`,
        padding: '14px 16px 18px',
      }}>
        {/* Image preview */}
        {pendingImage && (
          <div style={{
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {pendingImage.uploading ? (
              <div style={{
                width: 60,
                height: 60,
                borderRadius: 10,
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 18,
                  height: 18,
                  border: '2px solid rgba(245,158,11,0.65)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'gc-spin 0.9s linear infinite',
                }} />
                <style>{`@keyframes gc-spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingImage.url}
                  alt="Upload preview"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 10,
                    objectFit: 'cover',
                    border: `1px solid ${T.cardBorder}`,
                    display: 'block',
                  }}
                />
                <button
                  onClick={() => setPendingImage(null)}
                  aria-label="Remove image"
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: T.red,
                    color: '#1a0606',
                    border: '2px solid #0a1a0f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </div>
            )}
            <span style={{
              fontFamily: T.sans,
              fontSize: 11,
              color: T.textMuted,
            }}>
              {pendingImage.uploading ? (t('guru.imageUploading') || 'Uploading...') : (t('guru.uploadImage') || 'Image ready')}
            </span>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 10,
          padding: '10px 12px',
          background: T.cardBg,
          border: `1px solid ${T.cardBorder}`,
          borderRadius: 22,
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        }}>
          {/* Image upload */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={sending || !!pendingImage}
            title={t('guru.uploadImage') || 'Upload image'}
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: '1px solid rgba(52,211,153,0.25)',
              color: T.emerald,
              cursor: (sending || !!pendingImage) ? 'not-allowed' : 'pointer',
              opacity: (sending || !!pendingImage) ? 0.3 : 1,
              transition: 'all 120ms ease',
            }}
          >
            <Camera size={16} strokeWidth={1.75} />
          </button>

          {/* Voice */}
          <VoiceNoteButton
            onTranscription={handleVoiceTranscription}
            disabled={sending}
          />

          {/* Textarea */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isWholeClassMode ? t('guru.wholeClassPlaceholder') : isTeacher ? t('guru.teacherAskPlaceholder') : t('guru.askPlaceholder').replace('{name}', firstName)}
              rows={1}
              style={{
                width: '100%',
                resize: 'none',
                outline: 'none',
                border: 'none',
                background: 'transparent',
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 14.5,
                lineHeight: 1.5,
                maxHeight: 160,
                padding: '9px 4px',
              }}
            />
            <style>{`textarea::placeholder { color: rgba(255,255,255,0.30); }`}</style>
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            aria-label="Send"
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: (!inputText.trim() || sending)
                ? 'rgba(52,211,153,0.20)'
                : 'linear-gradient(180deg, #34d399, #10b981)',
              border: `1px solid ${(!inputText.trim() || sending) ? 'rgba(52,211,153,0.20)' : 'rgba(52,211,153,0.55)'}`,
              color: (!inputText.trim() || sending) ? 'rgba(52,211,153,0.50)' : '#06281a',
              cursor: (!inputText.trim() || sending) ? 'not-allowed' : 'pointer',
              boxShadow: (!inputText.trim() || sending) ? 'none' : '0 4px 14px rgba(16,185,129,0.30)',
              transition: 'all 120ms ease',
            }}
          >
            <ArrowUp size={17} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
