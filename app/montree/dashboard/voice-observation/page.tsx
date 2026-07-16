// /montree/dashboard/voice-observation/page.tsx
// Voice Observation System — 6-state machine: idle → recording → paused → processing → review → committed
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
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
  const { isEnabled, loading: featuresLoading } = useFeatures();
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

    // Feature check now handled by FeaturesProvider + useFeatures() hook

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

  if (loading || featuresLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Premium gate
  if (!isEnabled('voice_observations')) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
        />
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <div className="text-6xl mb-4">🎤</div>
          <h1 className="text-2xl font-bold text-white/95 mb-3">
            {t('voiceObs.premium') || 'Voice Observations'}
          </h1>
          <p className="text-white/60 mb-6">
            {t('voiceObs.premiumDescription') || 'AI-powered hands-free classroom observation. Record your work cycle, and let AI identify students, match works, and propose progress updates.'}
          </p>
          <p className="text-sm text-white/40">
            {t('voiceObs.contactAdmin') || 'Contact your administrator to enable this premium feature.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1a0f] relative">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
      />
      <Toaster position="top-center" />

      {/* Header */}
      <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/montree/dashboard')} className="text-white/50 hover:text-white/80">
            ←
          </button>
          <h1 className="text-lg font-semibold text-white/95">
            🎤 {t('voiceObs.title') || 'Voice Observation'}
          </h1>
        </div>
        {pageState !== 'idle' && activeSession && (
          <span className="text-xs text-white/40">{activeSession.sessionDate}</span>
        )}
      </div>

      <div className="relative max-w-2xl mx-auto p-4">
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
                <h2 className="text-sm font-semibold text-white/70 mb-3">
                  {t('voiceObs.sessionHistory') || 'Session History'}
                </h2>
                <div className="space-y-2">
                  {history.map(h => (
                    <div key={h.id} className="bg-white/[0.06] rounded-lg border border-[rgba(52,211,153,0.15)] p-3 flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-white/90">{h.session_date}</div>
                        <div className="text-xs text-white/40">
                          {Math.round((h.duration_seconds || 0) / 60)}min · {h.approved_count || 0} {t('voiceObs.approved') || 'approved'}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        h.status === 'committed' ? 'bg-emerald-500/15 text-emerald-300' :
                        h.status === 'failed' ? 'bg-red-500/15 text-red-300' :
                        h.status === 'expired' ? 'bg-white/10 text-white/50' :
                        'bg-amber-500/15 text-amber-300'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.length === 0 && (
              <div className="text-center text-white/40 text-sm mt-12">
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
            <h2 className="text-xl font-bold text-white/95 mb-2">
              {t('voiceObs.committed') || 'Observations Committed!'}
            </h2>
            <p className="text-white/60 mb-6 text-sm">
              {t('voiceObs.committedDescription') || 'Student progress has been updated. All audio and transcripts have been permanently deleted.'}
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
