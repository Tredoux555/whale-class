// /montree/admin/people/page.tsx
// Session 97 — the old People hub was replaced by /montree/admin/communication.
// This page now exists only to redirect any stale links. Routes for teachers,
// students, parent-codes etc. still exist independently and remain reachable
// from inside Communication via Quick Actions.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PeopleRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/montree/admin/communication');
  }, [router]);
  return null;
}
