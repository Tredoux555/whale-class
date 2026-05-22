'use client';

// app/story/call/page.tsx
//
// The Story voice-call surface. Both the admin and the Story user land
// here. Query params:
//   ?call=<uuid>   — the story_calls row id
//   ?as=admin|user — which side this device is
//
// Query params are read from window.location (not useSearchParams) to
// avoid the Next.js Suspense-boundary requirement — same pattern as
// /montree/try (Session 86).
//
// A static /story/call segment takes precedence over the dynamic
// /story/[session] route, so this does not collide with /story/active.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const StoryVoiceCall = dynamic(() => import('@/components/story/StoryVoiceCall'), {
  ssr: false,
  loading: () => <CallSplash message="Loading the call…" />,
});

export default function StoryCallPage() {
  const router = useRouter();
  const [resolved, setResolved] = useState<{
    callId: string | null;
    as: 'admin' | 'user';
    authToken: string | null;
  } | null>(null);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const role = sp.get('as') === 'admin' ? 'admin' : 'user';
    const token = sessionStorage.getItem(
      role === 'admin' ? 'story_admin_session' : 'story_session'
    );
    // window.location + sessionStorage are browser-only — unavailable during
    // SSR — so this resolution must happen in a mount effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolved({ callId: sp.get('call'), as: role, authToken: token });
  }, []);

  if (!resolved) {
    return <CallSplash message="Loading the call…" />;
  }
  const { callId, as, authToken } = resolved;
  if (!callId) {
    return (
      <CallSplash
        message="No call was specified."
        action={{ label: 'Go back', onClick: () => router.push('/story/active') }}
      />
    );
  }
  if (!authToken) {
    // Not signed in on this device — send them to the right login.
    return (
      <CallSplash
        message="Please sign in first."
        action={{
          label: 'Sign in',
          onClick: () => router.push(as === 'admin' ? '/story/admin' : '/story'),
        }}
      />
    );
  }

  return (
    <StoryVoiceCall
      callId={callId}
      as={as}
      authToken={authToken}
      onClose={() => router.push(as === 'admin' ? '/story/admin/dashboard' : '/story/active')}
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
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-5 bg-slate-900 px-6 text-white">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-600 border-t-transparent" />
      <p className="max-w-xs text-center text-sm text-slate-300">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-full bg-slate-700 px-6 py-2.5 font-semibold transition-colors hover:bg-slate-600"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
