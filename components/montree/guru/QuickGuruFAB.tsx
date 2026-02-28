// components/montree/guru/QuickGuruFAB.tsx
// Floating Action Button for quick Guru questions
// Tap 🌿 → small modal with text input → 2-sentence Haiku answer
// Inject into any page for home parents only
'use client';

import { useState, useRef, useCallback } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';
import VoiceNoteButton from './VoiceNoteButton';
import { useI18n } from '@/lib/montree/i18n';

interface QuickGuruFABProps {
  childId: string;
  childName: string;
}

export default function QuickGuruFAB({ childId, childName }: QuickGuruFABProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTranscription = useCallback((text: string) => {
    setQuestion(text);
    // Auto-focus input so user can review/edit before submitting
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/montree/guru/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, question: question.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAnswer(data.answer);
      } else {
        setAnswer(t('guru.couldNotAnswer'));
      }
    } catch {
      setAnswer(t('guru.somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setQuestion('');
    setAnswer(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuestion('');
    setAnswer(null);
  };

  return (
    <>
      {/* FAB Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full ${HOME_THEME.primaryBtn} ${HOME_THEME.primaryBtnShadow} flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95`}
          aria-label={t('guru.askTheGuru')}
        >
          🌿
        </button>
      )}

      {/* Quick Question Modal */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50">
          <div className={`${HOME_THEME.cardBg} rounded-2xl border ${HOME_THEME.borderStrong} shadow-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`${HOME_THEME.headerBg} text-white px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌿</span>
                <span className="font-semibold text-sm">{t('guru.quickQuestion').replace('{name}', childName)}</span>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Input */}
            <div className="p-4">
              <div className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('guru.askAnything').replace('{name}', childName)}
                  maxLength={500}
                  className={`flex-1 px-4 py-2.5 rounded-full border ${HOME_THEME.inputBorder} ${HOME_THEME.inputBg} ${HOME_THEME.inputFocus} text-sm ${HOME_THEME.headingText} placeholder:text-[#0D3330]/30 outline-none`}
                  disabled={loading}
                />
                <VoiceNoteButton onTranscription={handleTranscription} disabled={loading} />
                <button
                  onClick={handleSubmit}
                  disabled={!question.trim() || loading}
                  className={`px-4 py-2.5 rounded-full ${HOME_THEME.primaryBtn} text-sm font-medium disabled:opacity-40 transition-all`}
                >
                  {loading ? '...' : t('guru.ask')}
                </button>
              </div>

              {/* Answer */}
              {(answer || loading) && (
                <div className={`mt-3 p-3 rounded-xl ${HOME_THEME.sectionBgSubtle} border ${HOME_THEME.border}`}>
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-bounce text-lg">🌿</span>
                      <span className={`text-sm ${HOME_THEME.subtleText}`}>{t('guru.thinking')}</span>
                    </div>
                  ) : (
                    <p className={`text-sm ${HOME_THEME.headingText} leading-relaxed`}>{answer}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
