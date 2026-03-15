// /montree/dashboard/voice-observation/page.tsx
// Voice Observation System — 6-state machine: idle → recording → paused → processing → review → committed
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import VoiceObservationRecorder from '@/components/montree/voice-observation/VoiceObservationRecorder';
import VoiceObservationProgress from '@/components/montree/voice-observation/VoiceObservationProgress';
import VoiceObservationReview from '@/components/montree/voice-observation/VoiceObservationReview';

type PageState = 'idle' | 'recording' | 'paused' | 'processing' | 'review' | 'committed';

interface SessionData {
  id: string;
  sessionDate: string;
}

interface HistorySession {
  id: string;
  session_date: string;
  duration_seconds: number;
  extractions_count: number;
  approved_count: number;
  rejected_count: number;
  status: string;
  total_cost_cents: number;
}

export default function VoiceObservationPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [pageState, setPageState] = useState<PageState>('idle');
  const [activeSession, setActiveSession] = useState<SessionData | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Load session + feature check + history
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    setSession(sess);

    // Check feature toggle
    montreeApi(`/api/montree/features?school_id=${sess.school.id}`)
      .then(res => { if (!res.ok) throw new Error(`Feature check: ${res.status}`); return res.json(); })
      .then(data => {
        const voiceFeature = data.features?.find((f: any) => f.feature_key === 'voice_observations');
        setFeatureEnabled(voiceFeature?.enabled || false);
      })
      .catch((err) => { console.error('[voice-obs] Feature check error:', err); setFeatureEnabled(false); });

    // Load history
    montreeApi('/api/montree/voice-observation/history?limit=10')
      .then(res => { if (!res.ok) throw new Error(`History fetch: ${res.status}`); return res.json(); })
      .then(data => {
        setHistory(data.sessions || []);
      })
      .catch((err) => { console.error('[voice-obs] History fetch error:', err); });

    setLoading(false);
  }, [router]);

  // Start recording
  const handleStart = useCallback(async (language: string) => {
    try {
      const resp = await montreeApi('/api/montree/voice-observation/start', {
        method: 'POST',
        body: JSON.stringify({ language }),
      });
      const data = await resp.json();
      if (data.success) {
        setActiveSession({ id: data.sessionId, sessionDate: data.sessionDate });
        setPageState('recording');
      } else {
        toast.error(data.error || t('voiceObs.failedToStart'));
      }
    } catch {
      toast.error(t('voiceObs.failedToStart'));
    }
  }, []);

  // Pause/resume
  const handlePause = useCallback(async () => {
    if (!activeSession) return;
    try {
      const resp = await montreeApi(`/api/montree/voice-observation/${activeSession.id}/pause`, {
        method: 'POST',
      });
      const data = await resp.json();
      if (data.success) {
        setPageState(data.status === 'paused' ? 'paused' : 'recording');
      }
    } catch {
      toast.error(t('voiceObs.failedToPause'));
    }
  }, [activeSession]);

  // End recording → start processing
  const handleEnd = useCallback(async (durationSeconds: number) => {
    if (!activeSession) return;
    try {
      const resp = await montreeApi(`/api/montree/voice-observation/${activeSession.id}/end`, {
        method: 'POST',
        body: JSON.stringify({ duration_seconds: durationSeconds }),
      });
      const data = await resp.json();
      if (data.success) {
        setPageState('processing');
      } else {
        toast.error(data.error || t('voiceObs.failedToEnd'));
      }
    } catch {
      toast.error(t('voiceObs.failedToEnd'));
    }
  }, [activeSession]);

  // Processing complete → review
  const handleProcessingComplete = useCallback(() => {
    setPageState('review');
  }, []);

  // Commit complete
  const handleCommitted = useCallback((committedCount: number) => {
    setPageState('committed');
    toast.success(t('voiceObs.commitSuccess'));
    // Refresh history
    montreeApi('/api/montree/voice-observation/history?limit=10')
      .then(res => { if (!res.ok) throw new Error(`History refresh: ${res.status}`); return res.json(); })
      .then(data => setHistory(data.sessions || []))
      .catch((err) => { console.error('[voice-obs] History refresh error:', err); });
  }, []);

  // Return to idle
  const handleNewSession = useCallback(() => {
    setActiveSession(null);
    setPageState('idle');
  }, []);

  if (loading || featureEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Premium gate
  if (!featureEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Toaster position="top-center" />
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {t('voiceObs.premium') || 'Voice Observations'}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('voiceObs.premiumDescription') || 'AI-powered hands-free classroom observation. Record your work cycle, and let AI identify students, match works, and propose progress updates.'}
          </p>
          <p className="text-sm text-gray-500">
            {t('voiceObs.contactAdmin') || 'Contact your administrator to enable this premium feature.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/montree/dashboard')} className="text-gray-500 hover:text-gray-700">
            ←
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            🎤 {t('voiceObs.title') || 'Voice Observation'}
          </h1>
        </div>
        {pageState !== 'idle' && activeSession && (
          <span className="text-xs text-gray-500">{activeSession.sessionDate}</span>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* State: IDLE */}
        {pageState === 'idle' && (
          <div>
            <VoiceObservationRecorder
              state="idle"
              onStart={handleStart}
              onPause={handlePause}
              onEnd={handleEnd}
              sessionId={null}
            />

            {/* History */}
            {history.length > 0 && (
              <div className="mt-8">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  {t('voiceObs.sessionHistory') || 'Session History'}
                </h2>
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="bg-white rounded-lg border p-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{h.session_date}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round((h.duration_seconds || 0) / 60)}min · {h.approved_count || 0} approved
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        h.status === 'committed' ? 'bg-emerald-100 text-emerald-700' :
                        h.status === 'failed' ? 'bg-red-100 text-red-700' :
                        h.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-12">
                {t('voiceObs.noSessions') || 'No sessions yet. Start your first voice observation!'}
              </div>
            )}
          </div>
        )}

        {/* State: RECORDING / PAUSED */}
        {(pageState === 'recording' || pageState === 'paused') && activeSession && (
          <VoiceObservationRecorder
            state={pageState}
            onStart={handleStart}
            onPause={handlePause}
            onEnd={handleEnd}
            sessionId={activeSession.id}
          />
        )}

        {/* State: PROCESSING */}
        {pageState === 'processing' && activeSession && (
          <VoiceObservationProgress
            sessionId={activeSession.id}
            onComplete={handleProcessingComplete}
          />
        )}

        {/* State: REVIEW */}
        {pageState === 'review' && activeSession && (
          <VoiceObservationReview
            sessionId={activeSession.id}
            onCommitted={handleCommitted}
          />
        )}

        {/* State: COMMITTED */}
        {pageState === 'committed' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('voiceObs.committed') || 'Observations Committed!'}
            </h2>
            <p className="text-gray-600 mb-6 text-sm">
              Student progress has been updated. All audio and transcripts have been permanently deleted.
            </p>
            <button
              onClick={handleNewSession}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {t('voiceObs.startSession') || 'Start New Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
