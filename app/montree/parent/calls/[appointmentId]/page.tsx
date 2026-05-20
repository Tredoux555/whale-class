// /montree/parent/calls/[appointmentId]/page.tsx
//
// 🚨 Session 119 Task 3 — dedicated Join page for the parent side.
// Parents tap a video-call invite card in their chat → land here →
// AgoraVideoCall opens fullscreen. On close, back to parent dashboard.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AgoraVideoCall = dynamic(
  () => import('@/components/montree/appointments/AgoraVideoCall'),
  { ssr: false, loading: () => <CallSplash message="Loading the call interface…" /> },
);

interface ApptMeta {
  id: string;
  staff_name: string;
}

export default function ParentJoinCallPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apptId, setApptId] = useState<string | null>(null);
  const [meta, setMeta] = useState<ApptMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioOnly = searchParams?.get('audio') === '1';

  useEffect(() => {
    params.then(p => setApptId(p.appointmentId));
  }, [params]);

  useEffect(() => {
    if (!apptId) return;
    void (async () => {
      try {
        // The parent-side appointment lookup is /api/montree/parent/appointments
        // — we just want to know it exists + grab the host name for the UI.
        // The /agora-token route below also pre-checks auth.
        const tokenRes = await fetch(
          `/api/montree/appointments/${apptId}/agora-token?as=parent`,
          { method: 'POST', credentials: 'same-origin' }
        );
        if (tokenRes.status === 401 || tokenRes.status === 403) {
          router.push('/montree/parent/login');
          return;
        }
        if (tokenRes.status === 404) {
          setError("This call isn't available — the meeting may have been cancelled.");
          return;
        }
        if (!tokenRes.ok) {
          const j = await tokenRes.json().catch(() => ({}));
          setError(j?.error || `Could not join (HTTP ${tokenRes.status}).`);
          return;
        }
        await tokenRes.json().catch(() => ({}));
        // Try to pull host name — canonical /[id] detail route. The
        // collection route ignores ?id= and returns the parent's whole
        // list (audit catch — would have rendered wrong name on calls
        // when multiple appointments were active).
        try {
          const detailRes = await fetch(`/api/montree/parent/appointments/${apptId}`, {
            credentials: 'same-origin',
          });
          if (detailRes.ok) {
            const d = await detailRes.json().catch(() => ({}));
            const a = d?.appointment || d;
            const name = a?.host?.name || a?.hosts?.[0]?.name || a?.host_name || 'Your teacher';
            setMeta({ id: apptId, staff_name: name });
            return;
          }
        } catch { /* fall through */ }
        setMeta({ id: apptId, staff_name: 'Your teacher' });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load the call.');
      }
    })();
  }, [apptId, router]);

  const handleClose = useCallback(() => {
    router.push('/montree/parent/dashboard');
  }, [router]);

  if (error) {
    return <CallSplash message={error} action={{ label: 'Back to dashboard', onClick: handleClose }} />;
  }
  if (!apptId || !meta) {
    return <CallSplash message={audioOnly ? 'Starting voice call…' : 'Starting video call…'} />;
  }

  return (
    <AgoraVideoCall
      appointmentId={meta.id}
      callerRole="parent"
      remoteDisplayName={meta.staff_name}
      recordingEnabledForAppointment={false}
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
