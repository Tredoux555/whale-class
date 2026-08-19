// app/montree/library/tools/helper-strips/page.tsx
// Thin redirect — Helper Name Strips now lives as the "Name strips" tab of
// the merged Classroom Helpers tool. This route stays alive so old
// bookmarks and links keep working; its actual body moved to
// components/montree/tools/HelperStripsTool.tsx (mounted from
// app/montree/library/tools/classroom-helpers/page.tsx).
//
// Client-side replace, not a server `redirect()`: the old page was itself
// 'use client' (it needed `getSession()`/`useRouter()` on mount), so this
// follows the same client-replace convention already used elsewhere in this
// app for a retired route — see app/montree/login/page.tsx's LoginRedirect.
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HelperStripsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/montree/library/tools/classroom-helpers?tab=strips');
  }, [router]);

  return null;
}
