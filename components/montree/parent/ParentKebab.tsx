'use client';

// components/montree/parent/ParentKebab.tsx
//
// The single three-dot menu for the parent portal. Every parent page renders
// this at the top-right of its own header (the parent layout is a bare
// pass-through, so there's no shared chrome to hang it off).
//
// 🚨 Parent auth uses the httpOnly `montree_parent_session` cookie — NOT
// `montree-auth`. Logging out MUST hit /api/montree/parent/auth/logout;
// clearing localStorage alone leaves the cookie alive and the parent still
// signed in. Never point this at /api/montree/auth/logout.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import KebabMenu from '@/components/montree/shared/KebabMenu';
import { clearLaunchSurface } from '@/lib/montree/launch-surface';
import { useI18n } from '@/lib/montree/i18n';

export default function ParentKebab({ className = '' }: { className?: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    // Await the API so the httpOnly cookie is actually gone before we
    // navigate — a fire-and-forget call races the redirect and leaves a
    // half-dead session. Clear local state regardless of the API outcome.
    try {
      await fetch('/api/montree/parent/auth/logout', { method: 'POST', credentials: 'include' });
    } catch { /* offline — still clear local state and leave */ }
    try {
      localStorage.removeItem('montree_parent_session');
      localStorage.removeItem('montree_selected_child');
      clearLaunchSurface();
    } catch { /* ignore */ }
    router.push('/montree/parent');
  };

  return (
    <KebabMenu
      className={className}
      items={[
        {
          icon: LogOut,
          label: t('auth.logout') || 'Log out',
          danger: true,
          disabled: busy,
          onClick: handleLogout,
        },
      ]}
    />
  );
}
