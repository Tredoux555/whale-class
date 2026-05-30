'use client';

// components/montree/voice/AstraVoiceButton.tsx
//
// Press-to-talk control for hands-free Astra. Self-contained: drives the
// useAstraVoice hook and shows connection state. Renders nothing when the
// `voice_astra` flag is off (the hook lands in 'disabled').
//
// NOTE: copy here is English-only for the preview; i18n keys are a follow-up
// (this whole surface is flag-gated and on a branch).

import { Mic, Square, Loader2 } from 'lucide-react';
import { useAstraVoice } from '@/hooks/useAstraVoice';

export interface AstraVoiceButtonProps {
  principalName?: string;
  schoolName?: string;
  locale?: string;
}

export default function AstraVoiceButton({
  principalName,
  schoolName,
  locale,
}: AstraVoiceButtonProps) {
  const { status, error, start, stop } = useAstraVoice({
    principalName,
    schoolName,
    locale,
  });

  if (status === 'disabled') return null;

  const live = status === 'live';
  const busy = status === 'connecting' || status === 'stopping';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => (live ? void stop() : void start())}
        disabled={busy}
        aria-label={live ? 'End voice session with Astra' : 'Talk to Astra'}
        className={[
          'flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-sm transition',
          live
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-amber-500 text-white hover:bg-amber-600',
          busy ? 'opacity-70 cursor-wait' : '',
        ].join(' ')}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : live ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span>
          {status === 'connecting'
            ? 'Connecting…'
            : status === 'stopping'
              ? 'Ending…'
              : live
                ? 'Listening — tap to end'
                : 'Talk to Astra'}
        </span>
      </button>

      {live ? (
        <span className="flex items-center gap-1 text-xs text-stone-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Astra is listening
        </span>
      ) : null}

      {status === 'error' && error ? (
        <span className="max-w-xs text-center text-xs text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
