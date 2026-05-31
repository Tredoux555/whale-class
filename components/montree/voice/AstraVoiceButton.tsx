'use client';

// components/montree/voice/AstraVoiceButton.tsx
//
// Press-to-talk control for hands-free Astra. Browser-native (no Agora):
// drives useAstraVoice, which listens via the Web Speech API, sends the
// transcript to the existing text-Astra brain, and speaks the reply.
// Tap to start a hands-free conversation; tap again to stop.

import { Mic, Square, Loader2, Volume2 } from 'lucide-react';
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

  const active = status === 'listening' || status === 'thinking' || status === 'speaking';
  const unsupported = status === 'unsupported';

  const label =
    status === 'listening'
      ? 'Listening — tap to stop'
      : status === 'thinking'
        ? 'Astra is thinking…'
        : status === 'speaking'
          ? 'Astra is speaking — tap to stop'
          : 'Talk to Astra';

  const Icon =
    status === 'thinking'
      ? Loader2
      : status === 'speaking'
        ? Volume2
        : active
          ? Square
          : Mic;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => (active ? stop() : start())}
        disabled={unsupported}
        aria-label={active ? 'Stop talking to Astra' : 'Talk to Astra'}
        className={[
          'flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium shadow-sm transition',
          active
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-amber-500 text-white hover:bg-amber-600',
          unsupported ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <Icon className={`h-4 w-4 ${status === 'thinking' ? 'animate-spin' : ''}`} />
        <span>{label}</span>
      </button>

      {status === 'listening' ? (
        <span className="flex items-center gap-1 text-xs text-stone-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          Astra is listening
        </span>
      ) : null}

      {(status === 'error' || unsupported) && error ? (
        <span className="max-w-xs text-center text-xs text-red-600">{error}</span>
      ) : null}
    </div>
  );
}
