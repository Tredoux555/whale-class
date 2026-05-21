// /montree/dashboard/calls/[appointmentId]/page.tsx
//
// 🚨 Session 119 Task 3 — dedicated Join page for teachers/principals.
// One-tap target from chat invite cards: navigate here and the AgoraVideoCall
// component opens fullscreen, ready to join. No calendar bounce.
//
// On end-of-call (close), the user is sent back to /montree/dashboard
// (they probably came from a chat or a click on an invite — back-to-dash
// is a safe universal landing). The chat thread stays where it is.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

const AgoraVideoCall = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false, loading: () => <LoadingSplash /> },
);

// Loading fallback for the dynamic AgoraVideoCall chunk. Its own component so
// it can use the i18n hook (the dynamic `loading` callback renders inside the
// React tree, so hooks are valid here).
function LoadingSplash() {
  const { t } = useI18n();
  return <CallSplash message={t('calls.loadingInterface')} />;
}

interface ApptMeta {
  id: string;
  parent_name: string;
  recording_enabled: boolean;
}

export default function TeacherJoinCallPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [apptId, setApptId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApptMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  // audio=1 query param signals voice-only mode. Session 121 wired the
  // prop through to AgoraVideoCall so the camera track is never created.
  const audioOnly = searchParams?.get('audio') === '1';

  useEffect(() => {
    params.then(p => setApptId(p.appointmentId));
  }, [params]);

  useEffect(() => {
    if (!apptId) return;
    void (async () => {
      try {
        // Minimal pre-flight: hit /agora-token to verify auth + appointment
        // existence + flag. If 401/403/404, bail before we try to render the
        // SDK (it'd error noisily otherwise).
        const res = await montreeApi(
          `/api/montree/appointments/${apptId}/agora-token?as=teacher`,
          { method: 'POST', credentials: 'same-origin' }
        );
        if (res.status === 401 || res.status === 403) {
          router.push('/montree/login');
          return;
        }
        if (res.status === 404) {
          setError(t('calls.unavailableAppointment'));
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j?.error || t('calls.couldNotJoin', { status: res.status }));
          return;
        }
        // We don't actually NEED the token here — the AgoraVideoCall component
        // fetches its own. But this call doubles as a server-side auth check
        // AND populates the appointment for the recording flag lookup below.
        await res.json().catch(() => ({}));

        // Pull a tiny bit of metadata for the UI (remote display name +
        // recording flag). Use the canonical /[id] detail route — the
        // collection route ignores ?id= and returns the whole list.
        try {
          const detailRes = await montreeApi(`/api/montree/appointments/${apptId}`);
          if (detailRes.ok) {
            const d = await detailRes.json().catch(() => ({}));
            const a = d?.appointment || d;
            setMeta({
              id: apptId,
              parent_name: a?.parent?.name || a?.parent_name || t('calls.defaultParentName'),
              recording_enabled: !!a?.recording_enabled,
            });
            return;
          }
        } catch { /* fall through */ }
        setMeta({ id: apptId, parent_name: t('calls.defaultParentName'), recording_enabled: false });
      } catch (e) {
        setError(e instanceof Error ? e.message : t('calls.couldNotLoad'));
      }
    })();
  }, [apptId, router, t]);

  const handleClose = useCallback(() => {
    router.push('/montree/dashboard');
  }, [router]);

  if (error) {
    return <CallSplash message={error} action={{ label: t('calls.backToDashboard'), onClick: handleClose }} />;
  }
  if (!apptId || !meta) {
    return <CallSplash message={audioOnly ? t('calls.startingVoiceCall') : t('calls.startingVideoCall')} />;
  }

  return (
    <AgoraVideoCall
      appointmentId={meta.id}
      callerRole="teacher"
      remoteDisplayName={meta.parent_name}
      recordingEnabledForAppointment={meta.recording_enabled}
      onClose={handleClose}
      audioOnly={audioOnly}
    />
  );
}

function CallSplash({
  message,
  action,
}: {
  message: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a1a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 18,
      color: 'rgba(255,255,255,0.85)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      padding: 24,
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(52,211,153,0.65)',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'cs-spin 0.9s linear infinite',
      }} />
      <div style={{ fontSize: 14, textAlign: 'center', maxWidth: 320 }}>{message}</div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            padding: '10px 20px',
            borderRadius: 10,
            background: '#34d399',
            border: 0,
            color: '#06281a',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
      <style>{`@keyframes cs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
