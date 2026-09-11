// lib/montree/media/identify-trigger.ts
//
// In-process invocation of the work-identification pipeline for a media row
// that has no teacher session behind it (the video transcode path).
//
// Same pattern as app/api/montree/cron/photo-sweep/route.ts: Railway's SSL
// loopback makes an HTTP self-call unreliable, so we call the route handler
// directly with a synthetic NextRequest carrying a 60-second server-internal
// token scoped to that row's OWN school. The token never leaves the process.
//
// NODE RUNTIME ONLY (the /process route is).

import { NextRequest } from 'next/server';
import { createMontreeToken } from '@/lib/montree/server-auth';
import { POST as processPost } from '@/app/api/montree/photo-identification/process/route';

export async function triggerIdentification(opts: {
  mediaId: string;
  schoolId: string;
  classroomId?: string | null;
  origin: string;
  subject?: string;
  force?: boolean;
}): Promise<boolean> {
  try {
    const token = await createMontreeToken(
      {
        sub: opts.subject || 'server:media-identify',
        schoolId: opts.schoolId,
        classroomId: opts.classroomId || undefined,
        role: 'principal',
      },
      { ttlSeconds: 60 },
    );

    const synthetic = new NextRequest(
      new URL('/api/montree/photo-identification/process', opts.origin),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ media_id: opts.mediaId, force: opts.force ?? false }),
      },
    );

    const res = await processPost(synthetic as unknown as NextRequest);
    return res.ok;
  } catch (err) {
    console.error('[IdentifyTrigger] failed for', opts.mediaId, err);
    return false;
  }
}
