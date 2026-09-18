// app/montree/library/dark-phonics/page.tsx
// Montree Library — Dark Phonics, the whole programme on one page.
//
// 🚨 THE BODY OF THIS PAGE NOW LIVES IN
// components/montree/dark-phonics/DarkPhonicsClassroom.tsx. It moved there on
// 2026-09-17 so the public hub at /dark-phonics can render the very same
// printables under its Classroom tab instead of keeping a second copy that
// would drift. Nothing about THIS route changed: same URL, same client
// component, same chrome, same markup — `embedded` is left off, which is the
// library rendering.
//
// Public: no auth. middleware.ts exempts /montree/library/*.
'use client';

import DarkPhonicsClassroom from '@/components/montree/dark-phonics/DarkPhonicsClassroom';

export default function DarkPhonicsPage() {
  return <DarkPhonicsClassroom />;
}
