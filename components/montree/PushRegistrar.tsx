'use client';

// components/montree/PushRegistrar.tsx
// App Store build (Jun 2026): invisible mount-point that registers the
// device for push notifications inside the native shell. Renders nothing;
// no-op on web. Mounted in the teacher dashboard, principal, and parent
// layouts (i.e. only behind a signed-in session, so the token can be tied
// to an owner).

import { useEffect } from 'react';
import { initPushRegistration } from '@/lib/montree/push-client';

export default function PushRegistrar() {
  useEffect(() => {
    // Slight delay so first paint + session recovery settle before the
    // iOS permission prompt appears.
    const t = setTimeout(() => {
      void initPushRegistration();
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  return null;
}
