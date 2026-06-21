// app/api/story/admin/family/brain/route.ts
//
// The PARENT's window into the Family Brain: "What are you seeing in our family?"
//   POST → a family-LEVEL observation. Pattern only, NEVER attributed to a person.
//
// 🔒 Access + seal:
//   • Gated to role === 'parent'. Children NEVER reach the Family Brain — no query,
//     no read. (Their coach may receive a quiet tonal nudge, but the child has no
//     access here.)
//   • The brain reads ONLY structured signals + the captain's own context notes.
//     It NEVER reads anyone's sealed conversation. Its observation is pattern-level
//     and is archived encrypted.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken, getAdminSpace } from '@/lib/story-db';
import { anthropic, AI_MODEL } from '@/lib/ai/anthropic';
import { encryptDiaryField, isDiaryEncryptionConfigured } from '@/lib/story/diary-crypto';
import { getFamilyRole, resolveFamilyKey, familyBrainObservationForParent } from '@/lib/story/coach';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!(await verifyAdminToken(auth))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const space = await getAdminSpace(auth);
  if (!space) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!anthropic) return NextResponse.json({ error: 'AI is not configured.' }, { status: 503 });

  const supabase = getSupabase();
  const role = await getFamilyRole(supabase, space);
  // Children NEVER access the Family Brain. Only a parent (captain) may query it.
  if (role !== 'parent') {
    return NextResponse.json({ error: 'This area is for parents.' }, { status: 403 });
  }

  const familyKey = await resolveFamilyKey(supabase, space);
  const encryptFn = isDiaryEncryptionConfigured() ? encryptDiaryField : (s: string) => s;
  try {
    const observation = await familyBrainObservationForParent(
      supabase, anthropic, AI_MODEL, familyKey, space, encryptFn,
    );
    return NextResponse.json({ observation });
  } catch (e) {
    console.warn('[family/brain] query error:', e instanceof Error ? e.message : 'unknown');
    return NextResponse.json({ error: 'Could not read the family right now — try again.' }, { status: 500 });
  }
}
