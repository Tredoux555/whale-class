// components/montree/InboxFloat.tsx
// Session-aware floating inbox button for the Montree layout
// Renders on all authenticated pages so teachers can always message admin
'use client';

import { useState, useEffect } from 'react';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import InboxButton from './InboxButton';

export default function InboxFloat() {
  const [session, setSession] = useState<MontreeSession | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  // Only show for authenticated teachers/principals
  if (!session?.teacher?.id) return null;

  return (
    <InboxButton
      conversationId={session.teacher.id}
      userName={session.teacher.name || 'Teacher'}
      floating
    />
  );
}
