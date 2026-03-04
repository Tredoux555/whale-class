// components/montree/voice-observation/VoiceObservationProgress.tsx
// Polls /status every 3s — shows transcribing → analyzing → ready_for_review
'use client';

import { useState, useEffect, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  sessionId: string;
  onComplete: () => void;
}

interface StatusData {
  status: string;
  chunksTranscribed: number;
  totalChunks: number;
  extractionsCount: number;
  errorMessage: string | null;
  wordCount: number;
}

const STAGES = ['queued', 'transcribing', 'analyzing', 'ready_for_review'];

export default function VoiceObservationProgress({ sessionId, onComplete }: Props) {
  const { t } = useI18n();
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data = await montreeApi(`/api/montree/voice-observation/${sessionId}/status`);
        if (!data.success) {
          setError(data.error);
          return;
        }
        setStatusData(data);

        if (data.status === 'ready_for_review') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onComplete();
        } else if (data.status === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setError(data.errorMessage || 'Processing failed');
        }
      } catch {
        setError('Connection lost');
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, onComplete]);

  const currentStage = statusData?.status || 'queued';
  const stageIndex = STAGES.indexOf(currentStage);
  const progressPct = stageIndex >= 0 ? ((stageIndex + 1) / STAGES.length) * 100 : 10;

  const stageLabel = () => {
    switch (currentStage) {
      case 'queued': return t('voiceObs.processing') || 'Preparing...';
      case 'transcribing': return t('voiceObs.transcribing') || 'Transcribing audio...';
      case 'analyzing': return t('voiceObs.analyzing') || 'Analyzing with AI...';
      default: return t('voiceObs.processing') || 'Processing...';
    }
  };

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-lg font-bold text-red-700 mb-2">{t('voiceObs.processingFailed') || 'Processing Failed'}</h2>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-6 animate-pulse">🧠</div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">{stageLabel()}</h2>

      {/* Progress bar */}
      <div className="w-full max-w-sm mx-auto bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stage details */}
      <div className="text-sm text-gray-500 space-y-1">
        {statusData && currentStage === 'transcribing' && (
          <p>
            {statusData.chunksTranscribed} / {statusData.totalChunks} chunks transcribed
          </p>
        )}
        {statusData && currentStage === 'analyzing' && (
          <p>
            {statusData.wordCount > 0 && `${statusData.wordCount.toLocaleString()} words · `}
            {statusData.extractionsCount > 0 && `${statusData.extractionsCount} observations found`}
          </p>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex justify-center gap-4 mt-8">
        {STAGES.slice(0, -1).map((stage, idx) => (
          <div key={stage} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              idx < stageIndex ? 'bg-emerald-500 text-white' :
              idx === stageIndex ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' :
              'bg-gray-200 text-gray-400'
            }`}>
              {idx < stageIndex ? '✓' : idx + 1}
            </div>
            {idx < STAGES.length - 2 && (
              <div className={`w-8 h-0.5 ${idx < stageIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
