// /montree/dashboard/messages/page.tsx
//
// 🚨 Session 120 (continued) — REDIRECT to the WeChat-style /parent-chats
// page. The old thread-list-by-subject layout was disorienting (rows showed
// "Meeting booked — May 20" without showing WHO the conversation was with).
//
// The /parent-chats list page already groups one row per person with the
// person's name as title — exactly the WeChat-style UX the user wants.
//
// Kept this file in place so existing routes / bookmarks / the More-menu
// link don't 404; new code should link directly to /dashboard/parent-chats.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MessagesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/montree/dashboard/parent-chats');
  }, [router]);
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a1a0f',
        color: 'rgba(255,255,255,0.65)',
        fontFamily: 'var(--font-lora), Georgia, serif',
        fontSize: 15,
      }}
    >
      Opening your conversations…
    </div>
  );
}
