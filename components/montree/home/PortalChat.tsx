// components/montree/home/PortalChat.tsx
// The Portal — AI-first conversational interface for home parents
// Guru greets first, manages intake, check-ins, and daily advice
// Bioluminescent Depth aesthetic
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { BIO } from '@/lib/montree/bioluminescent-theme';
import VoiceNoteButton from '@/components/montree/guru/VoiceNoteButton';

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

// Greeting cache — avoid repeated AI calls on every app open
const GREETING_TTL = 4 * 60 * 60 * 1000; // 4 hours

function getCachedGreeting(childId: string): string | null {
  try {
    const raw = localStorage.getItem(`montree_greeting_${childId}`);
    if (!raw) return null;
    const { text, ts } = JSON.parse(raw);
    if (Date.now() - ts > GREETING_TTL) {
      localStorage.removeItem(`montree_greeting_${childId}`);
      return null;
    }
    return text;
  } catch { return null; }
}

function cacheGreeting(childId: string, text: string) {
  try {
    localStorage.setItem(`montree_greeting_${childId}`, JSON.stringify({ text, ts: Date.now() }));
  } catch { /* localStorage full — non-critical */ }
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        const histData = await histRes.json();

        if (signal.aborted) return;

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

        // 2. Check for cached greeting
        const cached = getCachedGreeting(childId);
        if (cached) {
          chatMessages.push({
            id: 'greeting-cached',
            content: cached,
            isUser: false,
            timestamp: new Date().toISOString(),
          });
          setMessages(chatMessages);
          setLoading(false);
          return;
        }

        // 3. No cache — fetch fresh greeting from AI
        setMessages(chatMessages);
        setLoading(false);

        // Show typing indicator for greeting
        setSending(true);
        try {
          const greetRes = await fetch('/api/montree/guru', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              child_id: childId,
              question: '__greeting__',
              classroom_id: classroomId,
              conversational: true,
            }),
            signal,
          });

          if (signal.aborted) return;

          const greetData = await greetRes.json();
          if (greetData.success && greetData.insight) {
            cacheGreeting(childId, greetData.insight);
            setMessages(prev => [...prev, {
              id: `greeting-${Date.now()}`,
              content: greetData.insight,
              isUser: false,
              timestamp: new Date().toISOString(),
            }]);

            // If greeting triggered tool use (e.g., intake set up shelf)
            if (greetData.actions?.length > 0) {
              onShelfUpdated?.();
            }
          }
        } catch (err) {
          if (signal.aborted) return;
          // Greeting failed — non-critical, show fallback
          const name = childName?.split(' ')[0] || '';
          setMessages(prev => [...prev, {
            id: 'greeting-fallback',
            content: `Hi there! 🌿 I'm your Montessori guide${name ? ` for ${name}` : ''}. How can I help today?`,
            isUser: false,
            timestamp: new Date().toISOString(),
          }]);
        } finally {
          if (!signal.aborted) setSending(false);
        }

      } catch (err) {
        if (signal.aborted) return;
        const name = childName?.split(' ')[0] || '';
        setLoading(false);
        setMessages([{
          id: 'error-init',
          content: `Welcome! 🌿 I'm here to help with${name ? ` ${name}'s` : ' your child\'s'} Montessori journey. Ask me anything!`,
          isUser: false,
          timestamp: new Date().toISOString(),
        }]);
      }
    };

    init();

    return () => { abortController.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId]);

  // Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      isUser: true,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const res = await fetch('/api/montree/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          question: text,
          classroom_id: classroomId,
          conversational: true,
        }),
      });

      const data = await res.json();

      if (data.success && data.insight) {
        const guruMsg: ChatMessage = {
          id: `guru-${Date.now()}`,
          content: data.insight,
          isUser: false,
          timestamp: new Date().toISOString(),
          actions: data.actions || undefined,
        };
        setMessages(prev => [...prev, guruMsg]);

        // Notify parent if tools were used (shelf may have changed)
        if (data.actions?.some((a: { success: boolean }) => a.success)) {
          onShelfUpdated?.();
        }
      } else if (data.error === 'guru_limit_reached') {
        onGuruLimitReached?.();
        toast.error('You\'ve used your free sessions. Upgrade for unlimited guidance.');
      } else {
        toast.error(data.error || 'Failed to get a response. Please try again.');
      }
    } catch {
      toast.error('Connection failed. Please check your internet and try again.');
    } finally {
      setSending(false);
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
          <p className={`text-sm ${BIO.text.secondary}`}>Your guide is preparing...</p>
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
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#4ADE80]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

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
              placeholder={childName ? `Ask about ${childName.split(' ')[0]}...` : 'Ask your guide...'}
              disabled={sending}
              rows={1}
              className={`w-full px-4 py-2.5 rounded-2xl border ${BIO.border.dim} ${BIO.bg.cardSolid} ${BIO.text.primary} text-sm placeholder:text-white/30 resize-none focus:outline-none focus:border-[#4ADE80]/30 focus:ring-1 focus:ring-[#4ADE80]/10 disabled:opacity-50`}
              style={{ maxHeight: '120px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
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
