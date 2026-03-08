// components/montree/guru/GuruChatThread.tsx
// WhatsApp-style conversational Guru chat for both teachers and homeschool parents
// Teachers skip onboarding picker and go straight to chat
// States: onboarding (no concerns, parents only) → chat (concerns saved)
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
}

interface GuruChatThreadProps {
  childId: string;
  childName: string;
  classroomId?: string;
  isTeacher?: boolean;
  onGuruLimitReached?: () => void;
}

export default function GuruChatThread({
  childId,
  childName,
  classroomId,
  isTeacher = false,
  onGuruLimitReached,
}: GuruChatThreadProps) {
  const { t } = useI18n();
  const [state, setState] = useState<'loading' | 'onboarding' | 'chat'>('loading');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
    const init = async () => {
      try {
        // Teachers skip concern onboarding — go straight to chat
        if (isTeacher) {
          // Fetch chat history
          const histRes = await fetch(`/api/montree/guru?child_id=${childId}&limit=20`);
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
            // Teacher welcome message
            setMessages([{
              id: 'welcome',
              content: `${t('guru.teacherWelcome').replace('{name}', firstName)} 👋`,
              isUser: false,
              timestamp: new Date().toISOString(),
            }]);
          }
          setState('chat');
          return;
        }

        // Parent flow — fetch concerns for onboarding check
        const concernsRes = await fetch(`/api/montree/guru/concerns?child_id=${childId}`);
        const concernsData = await concernsRes.json();

        if (concernsData.success && concernsData.onboarded) {
          setConcerns(concernsData.concerns || []);

          // Fetch chat history
          const histRes = await fetch(`/api/montree/guru?child_id=${childId}&limit=20`);
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
      } catch {
        toast.error(t('guru.errorLoadChat'));
        setState(isTeacher ? 'chat' : 'onboarding');
      }
    };

    init();
  }, [childId, childName, isTeacher]);

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

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // 60s client-side timeout prevents indefinite "typing..." indicator
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);

      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          question: text,
          classroom_id: classroomId,
          conversational: true,
        }),
        signal: controller.signal,
      });
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
      } else {
        toast.error(data.error || t('guru.failedResponse'));
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error(t('guru.timeout') || 'The Guru took too long. Please try again.');
      } else {
        toast.error(t('guru.connectionFailed'));
      }
    } finally {
      setSending(false);
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

  // Theme colors — teachers get violet/indigo, parents get botanical green
  const headerGradient = isTeacher
    ? 'bg-gradient-to-r from-violet-600 to-indigo-700'
    : 'bg-gradient-to-r from-[#0D3330] to-[#164340]';
  const guruIcon = isTeacher ? '🎓' : '🌿';
  const bgClass = isTeacher
    ? 'bg-gradient-to-br from-violet-50 to-indigo-50'
    : HOME_THEME.pageBgGradient;
  const accentColor = isTeacher ? 'violet' : '[#0D3330]';

  // Loading state
  if (state === 'loading') {
    return (
      <div className={`flex-1 flex items-center justify-center ${isTeacher ? 'bg-gradient-to-br from-violet-50 to-indigo-50' : HOME_THEME.pageBg}`}>
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-2">{guruIcon}</div>
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
      <div className={`${headerGradient} px-4 py-3`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg">{guruIcon}</span>
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
        className={`flex-1 overflow-y-auto px-4 py-4 ${bgClass}`}
      >
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            content={msg.content}
            isUser={msg.isUser}
            timestamp={msg.timestamp}
          />
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-full ${isTeacher ? 'bg-violet-600' : 'bg-[#0D3330]'} flex items-center justify-center`}>
              <span className="text-sm">{guruIcon}</span>
            </div>
            <div className={`bg-white border ${isTeacher ? 'border-violet-200' : 'border-[#0D3330]/10'} rounded-2xl rounded-bl-md px-4 py-3 shadow-sm`}>
              <div className="flex gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-bounce`} style={{ animationDelay: '0ms' }} />
                <div className={`w-2 h-2 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-bounce`} style={{ animationDelay: '150ms' }} />
                <div className={`w-2 h-2 rounded-full ${isTeacher ? 'bg-violet-400' : 'bg-[#0D3330]/30'} animate-bounce`} style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area — fixed at bottom */}
      <div className={`border-t ${isTeacher ? 'border-gray-200' : 'border-[#0D3330]/10'} bg-white px-3 py-3`}>
        <div className="flex items-end gap-2">
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
              placeholder={isTeacher ? t('guru.teacherAskPlaceholder') : t('guru.askPlaceholder').replace('{name}', firstName)}
              disabled={sending}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-2xl border text-sm resize-none focus:outline-none disabled:opacity-50 ${
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
