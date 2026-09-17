// tests/media/tag-first-upload.test.ts
//
// TAG-FIRST CAPTURE — the contract that replaced AI photo recognition
// (2026-09-17). See docs/handoffs/PHOTO_RECOGNITION_RETIRED_2026-09-17.md.
//
// Four things must hold, or the retirement quietly breaks the tracker:
//
//   1. A photo uploaded WITH a work_id is a confirmed teacher observation:
//      teacher_confirmed = true, identification_status = 'confirmed',
//      identification_attempted_at = null — and the progress door is called
//      exactly ONCE PER TAGGED CHILD (group work is real Montessori work).
//   2. A photo uploaded WITHOUT one is "tag later": identification_status
//      'skipped', teacher_confirmed false, no progress write, and NOT ONE
//      Anthropic call anywhere in the request.
//   3. The retired pipeline's own entry point answers 410 while the flag is
//      off, so nothing can quietly start spending again.
//   4. No plan — not Full, not the founding/partner schools that resolve to
//      Full — grants photoRecognition any more.
//
// The route is exercised for real; only its collaborators are stubbed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const SCHOOL = '33333333-3333-3333-3333-333333333333';
const CLASSROOM = '22222222-2222-2222-2222-222222222222';
const CHILD_A = '11111111-1111-1111-1111-111111111111';
const CHILD_B = '44444444-4444-4444-4444-444444444444';
const WORK = '55555555-5555-5555-5555-555555555555';

const advanceMock = vi.fn(async () => undefined);
const anthropicCreate = vi.fn();
const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];

vi.mock('@/lib/montree/verify-request', () => ({
  verifySchoolRequest: async () => ({
    userId: 'teacher-1',
    schoolId: SCHOOL,
    classroomId: CLASSROOM,
    role: 'teacher' as const,
  }),
}));

vi.mock('@/lib/montree/verify-child-access', () => ({
  verifyChildBelongsToSchool: async () => ({ allowed: true }),
}));

vi.mock('@/lib/montree/plans/photo-cap', () => ({
  enforcePhotoCap: async () => undefined,
}));

vi.mock('@/lib/montree/media/identify-trigger', () => ({
  triggerIdentification: async () => false,
}));

vi.mock('@/lib/montree/progress/advance-on-confirm', () => ({
  advanceProgressOnConfirm: (...args: unknown[]) => advanceMock(...(args as [])),
}));

// If anything in this request path ever reaches Anthropic, this blows up loudly.
vi.mock('@/lib/ai/anthropic', () => ({
  anthropic: { messages: { create: (...a: unknown[]) => anthropicCreate(...a) } },
  AI_MODEL: 'claude-sonnet-4-6',
  HAIKU_MODEL: 'claude-haiku-4.5',
}));

vi.mock('@/lib/supabase-client', () => {
  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    Object.assign(builder, {
      select: self,
      eq: self,
      in: self,
      is: self,
      not: self,
      gte: self,
      order: self,
      limit: self,
      update: self,
      insert: (row: Record<string, unknown> | Array<Record<string, unknown>>) => {
        for (const r of Array.isArray(row) ? row : [row]) inserted.push({ table, row: r });
        return builder;
      },
      maybeSingle: async () => {
        if (table === 'montree_media') {
          return { data: { id: 'media-1' }, error: null };
        }
        if (table === 'montree_classroom_curriculum_works') {
          return {
            data: {
              id: WORK,
              name: 'Pink Tower',
              work_key: 'ps:pink-tower',
              classroom_id: CLASSROOM,
              area: { area_key: 'sensorial' },
            },
            error: null,
          };
        }
        if (table === 'montree_classrooms') {
          return { data: { id: CLASSROOM }, error: null };
        }
        return { data: null, error: null };
      },
      // montree_daily_focus is updated with a thenable builder, never awaited.
      then: (resolve: (v: unknown) => void) => resolve({ error: null }),
    });
    return builder;
  };
  return {
    getSupabase: () => ({
      from: (table: string) => makeBuilder(table),
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
        }),
      },
    }),
    getPublicUrl: (p: string) => `https://example.test/${p}`,
  };
});

const { POST } = await import('@/app/api/montree/media/upload/route');

function uploadRequest(metadata: Record<string, unknown>): NextRequest {
  const form = new FormData();
  form.append('file', new File([new Uint8Array([0xff, 0xd8, 0xff])], 'shot.jpg', { type: 'image/jpeg' }));
  form.append('metadata', JSON.stringify({ school_id: SCHOOL, classroom_id: CLASSROOM, media_type: 'photo', ...metadata }));
  return new NextRequest('http://localhost/api/montree/media/upload', {
    method: 'POST',
    body: form,
  });
}

function mediaRow(): Record<string, unknown> {
  const hit = inserted.find((i) => i.table === 'montree_media');
  if (!hit) throw new Error('no montree_media insert was made');
  return hit.row;
}

beforeEach(() => {
  advanceMock.mockClear();
  anthropicCreate.mockClear();
  inserted.length = 0;
});

describe('tag-first upload — a teacher-picked work is a confirmed observation', () => {
  it('stamps confirmed and walks the progress door once for a single child', async () => {
    const res = await POST(uploadRequest({ child_id: CHILD_A, work_id: WORK }));
    expect(res.status).toBe(200);

    const row = mediaRow();
    expect(row.work_id).toBe(WORK);
    expect(row.teacher_confirmed).toBe(true);
    expect(row.identification_status).toBe('confirmed');
    expect(row.identification_attempted_at).toBeNull();

    expect(advanceMock).toHaveBeenCalledTimes(1);
    const arg = advanceMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.childId).toBe(CHILD_A);
    expect(arg.workName).toBe('Pink Tower');
    expect(arg.workKey).toBe('ps:pink-tower');
    expect(arg.area).toBe('sensorial');
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('writes progress once PER CHILD on a group capture — one work, every child tagged', async () => {
    await POST(uploadRequest({ child_ids: [CHILD_A, CHILD_B], work_id: WORK }));

    expect(advanceMock).toHaveBeenCalledTimes(2);
    const children = advanceMock.mock.calls.map((c) => (c[0] as Record<string, unknown>).childId);
    expect(children).toEqual([CHILD_A, CHILD_B]);
  });
});

describe('tag later — saved immediately, nothing spent, nothing guessed', () => {
  it('stamps skipped, leaves teacher_confirmed false and never writes progress', async () => {
    const res = await POST(uploadRequest({ child_id: CHILD_A }));
    expect(res.status).toBe(200);

    const row = mediaRow();
    expect(row.work_id).toBeNull();
    expect(row.teacher_confirmed).toBe(false);
    expect(row.identification_status).toBe('skipped');
    expect(row.identification_attempted_at).toBeNull();

    expect(advanceMock).not.toHaveBeenCalled();
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('uses only statuses the migration-210 constraint already allows', async () => {
    const ALLOWED = new Set([
      null, 'haiku_matched', 'haiku_drafted', 'sonnet_drafted', 'confirmed', 'failed', 'skipped',
    ]);
    await POST(uploadRequest({ child_id: CHILD_A, work_id: WORK }));
    expect(ALLOWED.has(mediaRow().identification_status as string)).toBe(true);
    inserted.length = 0;
    await POST(uploadRequest({ child_id: CHILD_A }));
    expect(ALLOWED.has(mediaRow().identification_status as string)).toBe(true);
  });
});

describe('the retired pipeline stays retired', () => {
  it('the kill switch is OFF unless the env var says exactly "true"', async () => {
    const { isPhotoRecognitionEnabled } = await import('@/lib/montree/photo-identification/flag');
    const original = process.env.PHOTO_RECOGNITION_ENABLED;
    try {
      delete process.env.PHOTO_RECOGNITION_ENABLED;
      expect(isPhotoRecognitionEnabled()).toBe(false);
      process.env.PHOTO_RECOGNITION_ENABLED = 'TRUE';
      expect(isPhotoRecognitionEnabled()).toBe(false);
      process.env.PHOTO_RECOGNITION_ENABLED = '1';
      expect(isPhotoRecognitionEnabled()).toBe(false);
      process.env.PHOTO_RECOGNITION_ENABLED = 'true';
      expect(isPhotoRecognitionEnabled()).toBe(true);
    } finally {
      if (original === undefined) delete process.env.PHOTO_RECOGNITION_ENABLED;
      else process.env.PHOTO_RECOGNITION_ENABLED = original;
    }
  });

  it('POST /photo-identification/process answers 410 with the retired marker', async () => {
    const { POST: processPost } = await import('@/app/api/montree/photo-identification/process/route');
    const res = await processPost(
      new NextRequest('http://localhost/api/montree/photo-identification/process', {
        method: 'POST',
        body: JSON.stringify({ media_id: 'media-1' }),
      }),
    );
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.skipped).toBe('photo_recognition_retired');
    expect(anthropicCreate).not.toHaveBeenCalled();
  });

  it('no plan grants photoRecognition — including Full, founding and partner schools', async () => {
    const { PLAN_CAPABILITIES } = await import('@/lib/montree/plans/capabilities');
    const { ALL_PLANS } = await import('@/lib/montree/plans/types');
    for (const plan of ALL_PLANS) {
      expect(PLAN_CAPABILITIES[plan].photoRecognition).toBe(false);
    }
  });
});
