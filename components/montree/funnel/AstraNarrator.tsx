// components/montree/funnel/AstraNarrator.tsx
//
// The companion — a small lit figure in the top-left of every funnel screen who
// narrates what is happening RIGHT NOW in second person, and carries one quiet
// "Ask me anything" affordance. Astra (principal journey, gold "A") or Guru
// (teacher journey, emerald "G"). Depends on the page having injected FUNNEL_CSS
// once.
//
// Ask wiring (contract §2):
//   authed=false → POST /api/montree/onboarding-copilot/ask-public {question, screen}
//   authed=true  → POST /api/montree/onboarding-copilot/ask       {question, journey, locale, screen}
// Errors degrade to copilot.card.askError — never a raw error.
'use client';

import { useState, type ReactNode } from 'react';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

// Parse **bold** markers into gold spans (mirrors CopilotDock's renderBold; the
// i18n narration values keep the ** markers per contract §4).
function renderBold(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <b key={i}>{part.slice(2, -2)}</b>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AstraNarrator({
  screenKey,
  journey,
  authed,
  extra,
}: {
  screenKey: string;
  journey: 'principal' | 'teacher';
  authed: boolean;
  extra?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState('');

  const isAstra = journey === 'principal';
  const name = isAstra ? t('copilot.funnel.astra.name') : t('copilot.funnel.guru.name');
  const role = isAstra ? t('copilot.funnel.astra.role') : t('copilot.funnel.guru.role');

  const sayKey = `copilot.funnel.say.${screenKey}` as TranslationKey;
  const say = t(sayKey);

  const send = async () => {
    const q = input.trim();
    if (!q || asking) return;
    setInput('');
    setAsking(true);
    setAnswer('');
    try {
      let res: Response;
      if (authed) {
        res = await montreeApi('/api/montree/onboarding-copilot/ask', {
          method: 'POST',
          body: JSON.stringify({ question: q, journey, locale, screen: screenKey }),
        });
      } else {
        res = await fetch('/api/montree/onboarding-copilot/ask-public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, screen: screenKey, website: '' }),
        });
      }
      if (!res.ok) throw new Error(`ask ${res.status}`);
      const j = await res.json();
      const a =
        typeof j?.answer === 'string' && j.answer.trim()
          ? j.answer.trim()
          : t('copilot.card.askError');
      setAnswer(a);
    } catch {
      setAnswer(t('copilot.card.askError'));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="fn-narrator" role="complementary" aria-label={name}>
      <div className="fn-n-head">
        <div className={`fn-n-avatar ${isAstra ? 'astra' : 'guru'}`}>{isAstra ? 'A' : 'G'}</div>
        <div>
          <div className={`fn-n-name ${isAstra ? '' : 'guru'}`}>{name}</div>
          <div className="fn-n-role">{role}</div>
        </div>
      </div>

      <div className="fn-n-say">{renderBold(say)}</div>

      {extra}

      <div className="fn-n-ask">
        {!open ? (
          <button type="button" className="fn-n-ask-btn" onClick={() => setOpen(true)}>
            <span className="dots">••</span> {t('copilot.funnel.ask')}
          </button>
        ) : (
          <div className="fn-n-chat">
            {asking && (
              <div className="fn-n-typing" aria-live="polite">
                <i />
                <i />
                <i />
              </div>
            )}
            {!asking && answer && (
              <div className="fn-n-answer" aria-live="polite">
                {answer}
              </div>
            )}
            <div className="fn-n-row">
              <input
                className="fn-n-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder={t('copilot.funnel.askPlaceholder')}
                maxLength={400}
                disabled={asking}
                autoFocus
              />
              <button
                type="button"
                className="fn-n-send"
                onClick={() => void send()}
                disabled={!input.trim() || asking}
              >
                {t('copilot.funnel.send')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
