'use client';

// components/montree/PushRegistrar.tsx
// App Store build (Jun 2026): invisible mount-point that registers the
// device for push notifications inside the native shell. Renders nothing;
// no-op on web.
//
// Audit-fix (Jun 2026): the parent/principal layouts also wrap their LOGIN
// pages, and layouts persist across router.push navigations — so this
// re-attempts on every route change. initPushRegistration() itself gates on
// an existing session and only runs once after sign-in, so the permission
// prompt can never appear on a login screen.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initPushRegistration } from '@/lib/montree/push-client';

export default function PushRegistrar() {
  const pathname = usePathname();

  useEffect(() => {
    // Slight delay so first paint + session recovery settle before the
    // iOS permission prompt appears.
    const t = setTimeout(() => {
      void initPushRegistration();
    }, 3000);
    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
