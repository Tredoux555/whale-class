// components/montree/guru/GuruChatThread.tsx
// WhatsApp-style conversational Guru chat for both teachers and homeschool parents
// Teachers skip onboarding picker and go straight to chat
// States: onboarding (no concerns, parents only) → chat (concerns saved)
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import ChatBubble from './ChatBubble';
import ConcernPills from './ConcernPills';
import GuruOnboardingPicker from './GuruOnboardingPicker';
import VoiceNoteButton from './VoiceNoteButton';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  imageUrl?: string;
}

interface GuruChatThreadProps {
  childId: string;
  childName: string;
  classroomId?: string;
  isTeacher?: boolean;
  isWholeClassMode?: boolean;
  onGuruLimitReached?: () => void;
}

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
  const [isStreaming, setIsStreaming] = useState(false); // true once SSE tokens start arriving
  const [pendingImage, setPendingImage] = useState<{ url: string; uploading: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const streamBufferRef = useRef('');
  const streamFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const firstName = childName.split(' ')[0];

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Load concerns and chat history on mount
  useEffect(() => {
    const abortController = new AbortController();
    const init = async () => {
      try {
        // Teachers skip concern onboarding — go straight to chat
        if (isTeacher) {
          // Fetch chat history — include classroom_id for whole-class mode so server can query by classroom
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
            // Teacher welcome message (or whole class mode)
            const welcomeContent = isWholeClassMode
              ? `${t('guru.wholeClassWelcome')} 👥`
              : `${t('guru.teacherWelcome').replace('{name}', firstName)} 👋`;
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

        // Parent flow — fetch concerns for onboarding check
        const concernsRes = await fetch(`/api/montree/guru/concerns?child_id=${childId}`, { signal: abortController.signal });
        if (!concernsRes.ok) throw new Error(`Concerns fetch failed: ${concernsRes.status}`);
        const concernsData = await concernsRes.json();

        if (concernsData.success && concernsData.onboarded) {
          setConcerns(concernsData.concerns || []);

          // Fetch chat history
          const histRes = await fetch(`/api/montree/guru?child_id=${childId}&locale=${locale}&limit=20`, { signal: abortController.signal });
          if (!histRes.ok) throw new Error(`History fetch failed: ${histRes.status}`);
          const histData = await histRes.json();

          if (histData.success && histData.history) {
            // Convert history to chat messages (oldest first)
            const chatMessages: ChatMessage[] = [];
            const reversed = [...histData.history].reverse();

            for (const item of reversed) {
              // User message
              chatMessages.push({
                id: `q-${item.id}`,
                content: item.question,
                isUser: true,
                timestamp: item.asked_at,
              });
              // Guru response
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

            // Check if we need a follow-up greeting (last chat > 2 days ago)
            if (histData.history.length > 0) {
              const lastChat = new Date(histData.history[0].asked_at);
              const daysSince = Math.floor((Date.now() - lastChat.getTime()) / 86400000);

              if (daysSince >= 2) {
                // Add a follow-up greeting bubble
                chatMessages.push({
                  id: 'followup-greeting',
                  content: `${t('guru.welcomeBackGreeting').replace('{name}', firstName)} 🌿`,
                  isUser: false,
                  timestamp: new Date().toISOString(),
                });
                setMessages([...chatMessages]);
              }
            }
          }

          // If no history at all, add a greeting
          if (!histData.history || histData.history.length === 0) {
            setMessages([{
              id: 'welcome',
              content: `${t('guru.welcomeGreeting').replace('{name}', firstName)} 🌿`,
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
  }, [childId, childName, classroomId, isTeacher, isWholeClassMode, locale]);

  // Handle onboarding complete
  const handleOnboardingComplete = (selectedConcerns: string[]) => {
    setConcerns(selectedConcerns);

    // Add welcome message referencing concerns
    const welcomeMsg = selectedConcerns.length > 0
      ? `${t('guru.onboardingWelcomeWithConcerns').replace('{name}', firstName)} 🌿`
      : `${t('guru.onboardingWelcomeNoConcerns').replace('{name}', firstName)} 🌿`;

    setMessages([{
      id: 'onboarding-welcome',
      content: welcomeMsg,
      isUser: false,
      timestamp: new Date().toISOString(),
    }]);
    setState('chat');
  };

  // Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    if (pendingImage?.uploading) return; // Wait for image upload

    const imageUrl = pendingImage?.url || undefined;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      isUser: true,
      timestamp: new Date().toISOString(),
      imageUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setPendingImage(null); // Clear pending image
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Guard: whole-class mode requires a valid classroomId
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

      // 120s client-side timeout (streaming can take longer — server does tool rounds before streaming)
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
          stream: true, // Request SSE streaming response
          locale,
          ...(imageUrl ? { image_url: imageUrl } : {}),
        }),
        signal: controller.signal,
      });

      // Check for non-streaming error responses (rate limits, auth errors, etc.)
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
        // Show error as a persistent chat message instead of a fleeting toast
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

      // Check if response is SSE stream
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        // Streaming response — read SSE events and update message incrementally
        const guruMsgId = `guru-${Date.now()}`;
        let streamedText = '';
        let firstTokenReceived = false;

        // Don't add the bubble yet — the "Thinking..." indicator covers this phase.
        // The bubble is created when the first token arrives (see firstTokenReceived below).

        // Helper: flush accumulated buffer to state with debounce
        const flushStreamBuffer = () => {
          if (streamBufferRef.current) {
            streamedText += streamBufferRef.current;
            // Update the message content with accumulated text
            setMessages(prev => prev.map(msg =>
              msg.id === guruMsgId ? { ...msg, content: streamedText } : msg
            ));
            streamBufferRef.current = '';
          }
        };

        // Helper: schedule flush with 100ms debounce
        const scheduleFlush = () => {
          if (streamFlushTimerRef.current) {
            clearTimeout(streamFlushTimerRef.current);
          }
          streamFlushTimerRef.current = setTimeout(() => {
            flushStreamBuffer();
            streamFlushTimerRef.current = null;
          }, 100);
        };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              try {
                const event = JSON.parse(jsonStr);
                if (event.type === 'text' && event.text) {
                  // On first token, create the message bubble and switch to streaming mode
                  if (!firstTokenReceived) {
                    firstTokenReceived = true;
                    setIsStreaming(true);
                    setMessages(prev => [...prev, {
                      id: guruMsgId,
                      content: '',
                      isUser: false,
                      timestamp: new Date().toISOString(),
                    }]);
                  }
                  // Accumulate text in buffer instead of updating state immediately
                  streamBufferRef.current += event.text;
                  // Schedule a debounced flush
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

        // Final flush of any remaining buffered text
        if (streamFlushTimerRef.current) {
          clearTimeout(streamFlushTimerRef.current);
          streamFlushTimerRef.current = null;
        }
        flushStreamBuffer();

        clearTimeout(timeout);

        setIsStreaming(false);

        // If we got no text at all, show an error as a chat message
        if (!streamedText.trim()) {
          // Remove empty streaming bubble if it was created
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
        // Fallback: non-streaming JSON response (shouldn't happen but handle gracefully)
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
    }
  };

  // Handle voice transcription
  const handleVoiceTranscription = (text: string) => {
    setInputText(prev => prev ? `${prev} ${text}` : text);
    textareaRef.current?.focus();
  };

  // Handle Enter key (send on Enter, newline on Shift+Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle image upload
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    // Validate file type and size
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
      // Compress image using canvas before uploading
      const compressed = await compressImageForChat(file);

      // Show uploading state AFTER compression succeeds (prevents stuck state if compression fails)
      setPendingImage({ url: '', uploading: true });

      // Upload to Supabase storage via media upload route
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

  // Simple image compressor for chat
  async function compressImageForChat(file: File): Promise<File> {
    let bitmap: ImageBitmap | null = null;
    try {
      const maxDim = 1024;
      bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;

      if (width <= maxDim && height <= maxDim && file.size <= 500 * 1024) {
        bitmap.close();
        bitmap = null;
        return file; // Small enough already
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

  // Theme colors — teachers get violet/indigo, parents get botanical green
  const themeClasses = useMemo(() => ({
    headerGradient: isTeacher
      ? 'bg-gradient-to-r from-violet-600 to-indigo-700'
      : 'bg-gradient-to-r from-[#0D3330] to-[#164340]',
    guruIcon: isTeacher ? '🎓' : '🌿',
    bgClass: isTeacher
      ? 'bg-gradient-to-br from-violet-50 to-indigo-50'
      : HOME_THEME.pageBgGradient,
    accentColor: isTeacher ? 'violet' : '[#0D3330]',
  }), [isTeacher]);

  // Loading state
  if (state === 'loading') {
    return (
      <div className={`flex-1 flex items-center justify-center ${isTeacher ? 'bg-gradient-to-br from-violet-50 to-indigo-50' : HOME_THEME.pageBg}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-2">{themeClasses.guruIcon}</div>
          <p className={`text-sm ${isTeacher ? 'text-gray-500' : HOME_THEME.subtleText}`}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Onboarding state (parents only — teachers skip this)
  if (state === 'onboarding' && !isTeacher) {
    return (
      <GuruOnboardingPicker
        childId={childId}
        childName={childName}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Chat state
  return (
    <div className="flex flex-col h-full">
      {/* Chat header with concern pills */}
      <div className={`${themeClasses.headerGradient} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg">{themeClasses.guruIcon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base">
              {isTeacher ? `${firstName} — ${t('guru.guruAdvisor')}` : `${firstName} ${t('guru.guide')}`}
            </h2>
            {!isTeacher && concerns.length > 0 && (
              <div className="mt-1 opacity-90">
                <ConcernPills concernIds={concerns} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className={`flex-1 overflow-y-auto px-4 py-4 ${themeClasses.bgClass}`}
      >
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
            imageUrl={msg.imageUrl}
          />
        ))}

        {/* Thinking indicator — shows while waiting for first token, hides once streaming starts */}
        {sending && !isStreaming && (
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-full ${isTeacher ? 'bg-violet-600' : 'bg-[#0D3330]'} flex items-center justify-center`}>
              <span className="text-sm">{themeClasses.guruIcon}</span>
            </div>
            <div className={`bg-white border ${isTeacher ? 'border-violet-200' : 'border-[#0D3330]/10'} rounded-2xl rounded-bl-md px-4 py-3 shadow-sm`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-pulse`} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-pulse`} style={{ animationDelay: '150ms' }} />
                  <div className={`w-1.5 h-1.5 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-pulse`} style={{ animationDelay: '300ms' }} />
                </div>
                <span className={`text-xs ${isTeacher ? 'text-violet-400' : 'text-[#0D3330]/40'}`}>
                  {t('guru.thinking') || 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area — fixed at bottom */}
      <div className={`border-t ${isTeacher ? 'border-gray-200' : 'border-[#0D3330]/10'} bg-white px-3 py-3`}>
        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2">
            {pendingImage.uploading ? (
              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingImage.url} alt="Upload preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-sm"
                >
                  ✕
                </button>
              </div>
            )}
            <span className="text-xs text-gray-400">
              {pendingImage.uploading ? (t('guru.imageUploading') || 'Uploading...') : (t('guru.uploadImage') || 'Image ready')}
            </span>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Image upload button */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={sending || !!pendingImage}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${
              isTeacher ? 'text-violet-500 hover:bg-violet-50' : 'text-[#0D3330]/60 hover:bg-[#0D3330]/5'
            }`}
            title={t('guru.uploadImage') || 'Upload image'}
          >
            📷
          </button>

          {/* Voice button */}
          <VoiceNoteButton
            onTranscription={handleVoiceTranscription}
            disabled={sending}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isWholeClassMode ? t('guru.wholeClassPlaceholder') : isTeacher ? t('guru.teacherAskPlaceholder') : t('guru.askPlaceholder').replace('{name}', firstName)}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm resize-none focus:outline-none ${
                isTeacher
                  ? 'border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:border-violet-300 focus:ring-1 focus:ring-violet-200'
                  : 'border-[#0D3330]/15 bg-[#FFFDF8] text-[#0D3330] placeholder:text-[#0D3330]/40 focus:border-[#0D3330]/30 focus:ring-1 focus:ring-[#0D3330]/10'
              }`}
              style={{ maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed ${
              isTeacher ? 'bg-violet-600 hover:bg-violet-700' : HOME_THEME.primaryBtn
            }`}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
