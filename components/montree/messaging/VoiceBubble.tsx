// components/montree/messaging/VoiceBubble.tsx
// Renders an audio message: native <audio controls> + the Whisper transcript
// below. Used inside the message bubble on every thread detail page.

'use client';

import { Volume2 } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  /** Stable proxy URL from the message row's media_url. */
  audioUrl: string;
  /** Whisper transcript, stored in body. */
  transcript: string;
  /** True when this bubble is from the current user (alignment hint). */
  isMine?: boolean;
}

export default function VoiceBubble({ audioUrl, transcript, isMine = false }: Props) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          borderRadius: 12,
          background: isMine ? 'rgba(255,255,255,0.10)' : 'rgba(52,211,153,0.10)',
        }}
      >
        <Volume2 size={16} style={{ color: isMine ? 'rgba(255,255,255,0.85)' : '#34d399', flexShrink: 0 }} />
        <audio
          controls
          preload="metadata"
          src={audioUrl}
          aria-label={t('msg.voiceMessage')}
          style={{ height: 32, flex: 1, minWidth: 0 }}
        />
      </div>
      {transcript && (
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            color: isMine ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.92)',
            fontStyle: 'normal',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {transcript}
        </div>
      )}
    </div>
  );
}
