'use client';

// The Diary lives behind the single Story-admin login (handled by the parent
// (personal) shell) — no extra phrase. Tredoux's call: "Coach is my diary, I
// have a right to keep it private; one layer (my login), not two." So this is a
// plain pass-through; the personal shell already guards the whole space.

import { type ReactNode } from 'react';

export default function DiaryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
