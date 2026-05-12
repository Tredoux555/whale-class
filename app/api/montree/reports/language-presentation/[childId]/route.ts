// app/api/montree/reports/language-presentation/[childId]/route.ts
//
// Per-child Language semester presentation.
// Aggregates all Language-area photos for a child across a date range (default Feb 1 → now),
// calls Sonnet to curate into a progression narrative, and saves the slide plan to
// montree_children.settings.language_presentation.
//
// GET  — returns saved presentation or 404
// POST — regenerates (aggregates + calls Sonnet, overwrites saved plan)
// PATCH — edits slide inclusion / order / captions without regenerating
//
// All photo captions / narrative are Sonnet-authored. The teacher curates from the plan.

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { anthropic, AI_MODEL, AI_ENABLED } from '@/lib/ai/anthropic';
import { updateChildSettings } from '@/lib/montree/guru/settings-helper';
import { resolveReportModel } from '@/lib/montree/reports/resolve-model';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Sonnet can take 30-60s for 50+ photos

// --- types -----------------------------------------------------------------

type AreaRow = { id: string };
type WorkRow = {
  id: string;
  name: string;
  name_chinese: string | null;
  parent_description: string | null;
  why_it_matters: string | null;
};
type MediaRow = {
  id: string;
  child_id: string | null;
  work_id: string | null;
  captured_at: string;
  storage_path: string | null;
  cropped_storage_path: string | null;
  caption: string | null;
};
type ChildRow = { id: string; name: string; classroom_id: string; settings: unknown };

export interface PresentationSlide {
  id: string;            // photo id, or 'intro'/'closing'/'chapter_X' for synthetic
  kind: 'intro' | 'chapter' | 'photo' | 'closing';
  photo_id?: string;
  photo_url?: string;
  work_name?: string;
  chapter?: string;      // chapter title (e.g. "Sound Exploration")
  caption: string;       // 1-2 sentence Sonnet-written caption
  captured_at?: string;
  order: number;
  included: boolean;
}

export interface PresentationPlan {
  child_id: string;
  child_name: string;
  date_from: string;
  date_to: string;
  photo_count: number;
  slides: PresentationSlide[];
  generated_at: string;
  model: string;
}

// --- Sonnet tool schema ----------------------------------------------------
// We ask Sonnet to return structured JSON via tool_use. It assigns each photo to a
// learning chapter and writes a warm, process-focused caption for each.

const CURATE_TOOL = {
  name: 'curate_language_presentation',
  description:
    'Take a chronological list of photos and produce a curated presentation plan. Group photos into 3-6 learning chapters that tell the story of the child\'s Language development. Write a 1-2 sentence caption for each photo that is warm, specific, and process-focused (what the child was doing / learning, not just the work name). Include an intro slide and closing slide.',
  input_schema: {
    type: 'object' as const,
    properties: {
      intro_caption: {
        type: 'string',
        description:
          "Opening slide text. 2-3 warm sentences introducing this presentation as a semester-long look at the child's Language journey. Name the child. No jargon.",
      },
      chapters: {
        type: 'array',
        description:
          'Ordered chapters that group photos into a progression story. Each chapter has a title (e.g. "Sound Exploration", "Sandpaper Letters", "Building Words") and 1-2 sentences introducing what the child was working on.',
        items: {
          type: 'object' as const,
          properties: {
            title: { type: 'string', description: 'Chapter title, 2-5 words.' },
            description: {
              type: 'string',
              description:
                '1-2 sentences setting up what this chapter shows in the child\'s progression.',
            },
            photo_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Photo IDs from the input list that belong in this chapter, in order.',
            },
          },
          required: ['title', 'description', 'photo_ids'],
        },
      },
      photo_captions: {
        type: 'array',
        description:
          'One caption per photo id provided in input. 1-2 sentences, warm, process-focused, naming what the child was doing or learning at that moment. Avoid repeating the work name in every caption.',
        items: {
          type: 'object' as const,
          properties: {
            photo_id: { type: 'string' },
            caption: { type: 'string' },
          },
          required: ['photo_id', 'caption'],
        },
      },
      closing_caption: {
        type: 'string',
        description:
          "2-3 warm sentences closing the presentation. Look ahead to what's next in the child's Language journey. Celebratory but honest.",
      },
    },
    required: ['intro_caption', 'chapters', 'photo_captions', 'closing_caption'],
  },
};

interface CurateToolInput {
  intro_caption: string;
  chapters: Array<{ title: string; description: string; photo_ids: string[] }>;
  photo_captions: Array<{ photo_id: string; caption: string }>;
  closing_caption: string;
}

// --- helpers ---------------------------------------------------------------

function urlFor(m: { storage_path: string | null; cropped_storage_path?: string | null }): string | null {
  const path = m.cropped_storage_path || m.storage_path;
  return path ? getProxyUrl(path) : null;
}

async function aggregateLanguagePhotos(
  supabase: ReturnType<typeof getSupabase>,
  classroomId: string,
  childId: string,
  dateFrom: string,
  dateTo: string
): Promise<{ photos: Array<MediaRow & { work_name: string }>; workNameMap: Map<string, WorkRow> }> {
  // 1. Get Language area ID
  const { data: langArea } = await supabase
    .from('montree_classroom_curriculum_areas')
    .select('id')
    .eq('classroom_id', classroomId)
    .eq('area_key', 'language')
    .maybeSingle();

  if (!langArea) {
    return { photos: [], workNameMap: new Map() };
  }

  // 2. Get all Language work IDs + names for classroom
  const { data: rawLangWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('id, name, name_chinese, parent_description, why_it_matters')
    .eq('classroom_id', classroomId)
    .eq('area_id', (langArea as AreaRow).id);

  const langWorks = (rawLangWorks || []) as WorkRow[];
  const langWorkIds = new Set(langWorks.map((w) => w.id));
  const workNameMap = new Map(langWorks.map((w) => [w.id, w]));

  if (langWorkIds.size === 0) {
    return { photos: [], workNameMap };
  }

  // 3. Direct media: photos captured for this child in Language works
  const { data: rawDirect } = await supabase
    .from('montree_media')
    .select('id, child_id, work_id, captured_at, storage_path, cropped_storage_path, caption')
    .eq('classroom_id', classroomId)
    .eq('child_id', childId)
    .gte('captured_at', dateFrom)
    .lte('captured_at', dateTo)
    .not('work_id', 'is', null)
    .or('identification_status.is.null,identification_status.neq.pending_review');

  const direct = (rawDirect || []) as MediaRow[];

  // 4. Group photos via junction
  const { data: rawLinks } = await supabase
    .from('montree_media_children')
    .select('media_id')
    .eq('child_id', childId);

  const linkIds = Array.from(new Set((rawLinks || []).map((r: { media_id: string }) => r.media_id)));

  let group: MediaRow[] = [];
  if (linkIds.length > 0) {
    const { data: rawGroup } = await supabase
      .from('montree_media')
      .select('id, child_id, work_id, captured_at, storage_path, cropped_storage_path, caption')
      .in('id', linkIds)
      .gte('captured_at', dateFrom)
      .lte('captured_at', dateTo)
      .not('work_id', 'is', null)
      .or('identification_status.is.null,identification_status.neq.pending_review');
    group = (rawGroup || []) as MediaRow[];
  }

  // 5. Merge + dedupe + filter to Language
  const byId = new Map<string, MediaRow>();
  for (const m of [...direct, ...group]) {
    if (!m.work_id || !langWorkIds.has(m.work_id)) continue;
    byId.set(m.id, m);
  }

  const photos = Array.from(byId.values())
    .sort((a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime())
    .map((m) => ({
      ...m,
      work_name: workNameMap.get(m.work_id as string)?.name || 'Language work',
    }));

  return { photos, workNameMap };
}

async function curateWithSonnet(
  childName: string,
  photos: Array<MediaRow & { work_name: string }>,
  workNameMap: Map<string, WorkRow>,
  model: string = AI_MODEL,
): Promise<CurateToolInput> {
  if (!AI_ENABLED || !anthropic) {
    throw new Error('AI not configured (ANTHROPIC_API_KEY missing)');
  }

  // Build the photo manifest for Sonnet — ID, date, work name, any teacher caption
  const manifest = photos.map((p, idx) => {
    const work = workNameMap.get(p.work_id as string);
    return {
      photo_id: p.id,
      order: idx + 1,
      date: new Date(p.captured_at).toISOString().slice(0, 10),
      work: p.work_name,
      work_chinese: work?.name_chinese || null,
      why_it_matters: work?.why_it_matters || null,
      teacher_caption: p.caption || null,
    };
  });

  const systemPrompt = `You are a Montessori-trained educator helping a teacher present a child's semester-long Language progression to their parents.

You will be given a chronological list of photos with the work each one shows. Your job:
1. Write a warm, short intro (2-3 sentences) introducing this presentation.
2. Group photos into 3-6 learning chapters that tell a progression story (e.g. "Listening and Sound Games", "Sandpaper Letters", "The Moveable Alphabet", "Pink Series", "Blue Series", "Green Series", "Reading", "Writing"). Only create chapters you have photos for.
3. For each photo, write a 1-2 sentence caption that is warm, specific, and process-focused. Name what the child was doing or what skill is developing, NOT just restate the work name. Parents don't need to hear "Sandpaper Letters" 8 times.
4. Write a 2-3 sentence closing that looks ahead to what's next.

Voice: warm, calm, Montessori-literate. Written for a parent sitting across from you. No jargon without explanation. No hype. No emojis.

If there are only a few photos for a work or chapter, fluff it gracefully — speak to ongoing engagement, the slow unfolding of a skill, the quality of repetition. Never invent events you don't have evidence for; do lean into the Montessori understanding of what the work develops.

Every photo_id in the input MUST appear in exactly one chapter's photo_ids list AND have a corresponding entry in photo_captions. Do not skip photos.`;

  const userMessage = `Child: ${childName}

Photos (${photos.length} total, chronological):

${JSON.stringify(manifest, null, 2)}

Please curate these into a presentation plan using the curate_language_presentation tool.`;

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    tools: [CURATE_TOOL],
    tool_choice: { type: 'tool', name: 'curate_language_presentation' },
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract tool_use block
  const toolBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Sonnet did not return tool_use output');
  }

  return toolBlock.input as CurateToolInput;
}

function buildSlidePlan(
  childId: string,
  childName: string,
  dateFrom: string,
  dateTo: string,
  photos: Array<MediaRow & { work_name: string }>,
  curation: CurateToolInput,
  modelUsed: string = AI_MODEL,
): PresentationPlan {
  const photoById = new Map(photos.map((p) => [p.id, p]));
  const captionByPhotoId = new Map(curation.photo_captions.map((c) => [c.photo_id, c.caption]));

  const slides: PresentationSlide[] = [];
  let order = 0;

  // Intro
  slides.push({
    id: 'intro',
    kind: 'intro',
    caption: curation.intro_caption,
    order: order++,
    included: true,
  });

  // Chapters + photos
  for (let i = 0; i < curation.chapters.length; i++) {
    const ch = curation.chapters[i];
    slides.push({
      id: `chapter_${i}`,
      kind: 'chapter',
      chapter: ch.title,
      caption: ch.description,
      order: order++,
      included: true,
    });

    for (const photoId of ch.photo_ids) {
      const photo = photoById.get(photoId);
      if (!photo) continue;
      slides.push({
        id: photo.id,
        kind: 'photo',
        photo_id: photo.id,
        photo_url: urlFor(photo) || undefined,
        work_name: photo.work_name,
        chapter: ch.title,
        caption: captionByPhotoId.get(photoId) || '',
        captured_at: photo.captured_at,
        order: order++,
        included: true,
      });
    }
  }

  // Sweep any photos Sonnet forgot to assign to a chapter — tack them onto the last chapter
  const assigned = new Set<string>();
  for (const ch of curation.chapters) for (const id of ch.photo_ids) assigned.add(id);
  const missed = photos.filter((p) => !assigned.has(p.id));
  if (missed.length > 0) {
    // Ensure a catch-all chapter exists
    const lastChapterIdx = slides.findIndex((s, idx) => s.kind === 'chapter' && idx >= slides.length - missed.length - 1);
    const chapterTitle =
      lastChapterIdx >= 0 ? (slides[lastChapterIdx].chapter as string) : 'Continued Practice';
    if (lastChapterIdx < 0) {
      slides.push({
        id: `chapter_extra`,
        kind: 'chapter',
        chapter: chapterTitle,
        caption: 'Ongoing Language practice throughout the semester.',
        order: order++,
        included: true,
      });
    }
    for (const photo of missed) {
      slides.push({
        id: photo.id,
        kind: 'photo',
        photo_id: photo.id,
        photo_url: urlFor(photo) || undefined,
        work_name: photo.work_name,
        chapter: chapterTitle,
        caption: captionByPhotoId.get(photo.id) || `${childName} working on ${photo.work_name}.`,
        captured_at: photo.captured_at,
        order: order++,
        included: true,
      });
    }
  }

  // Closing
  slides.push({
    id: 'closing',
    kind: 'closing',
    caption: curation.closing_caption,
    order: order++,
    included: true,
  });

  return {
    child_id: childId,
    child_name: childName,
    date_from: dateFrom,
    date_to: dateTo,
    photo_count: photos.length,
    slides,
    generated_at: new Date().toISOString(),
    model: modelUsed,
  };
}

// --- handlers --------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { childId } = await params;
  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = getSupabase();
  const { data: rawChild } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id, settings')
    .eq('id', childId)
    .maybeSingle();

  const child = rawChild as ChildRow | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const settings = (child.settings as Record<string, unknown>) || {};
  const plan = settings.language_presentation as PresentationPlan | undefined;

  if (!plan) {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
  return NextResponse.json({ exists: true, plan });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { childId } = await params;
  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { date_from?: string; date_to?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const dateFrom = body.date_from || '2026-02-01T00:00:00Z';
  const dateTo = body.date_to || new Date().toISOString();

  const supabase = getSupabase();

  // TIER GATE: this route is Sonnet-quality output (parent-facing presentation),
  // so we require a paid AI tier. Free schools get 402 + a clear message.
  const aiTier = await resolveReportModel(supabase, auth.schoolId);
  if (aiTier.tier === 'free' || !aiTier.model) {
    return NextResponse.json(
      {
        error: 'Language Presentation requires an active AI tier',
        tier: aiTier.tier,
        requires_upgrade: true,
        upgrade_url: '/montree/admin/billing',
        feature: 'language_presentation',
      },
      { status: 402 }
    );
  }

  const { data: rawChild } = await supabase
    .from('montree_children')
    .select('id, name, classroom_id, settings')
    .eq('id', childId)
    .maybeSingle();

  const child = rawChild as ChildRow | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
  if (!child.classroom_id) {
    return NextResponse.json({ error: 'Child has no classroom' }, { status: 400 });
  }

  const { photos, workNameMap } = await aggregateLanguagePhotos(
    supabase,
    child.classroom_id,
    childId,
    dateFrom,
    dateTo
  );

  if (photos.length === 0) {
    return NextResponse.json(
      {
        error: 'No Language photos found for this child in the selected date range',
        photo_count: 0,
      },
      { status: 404 }
    );
  }

  // Safety cap — Sonnet prompt stays manageable and cost bounded
  const MAX_PHOTOS = 80;
  const workingSet = photos.slice(0, MAX_PHOTOS);

  let curation: CurateToolInput;
  try {
    curation = await curateWithSonnet(child.name, workingSet, workNameMap, aiTier.model);
  } catch (err) {
    console.error('[LanguagePresentation] Sonnet curation failed:', err);
    return NextResponse.json(
      { error: 'Sonnet curation failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const plan = buildSlidePlan(childId, child.name, dateFrom, dateTo, workingSet, curation, aiTier.model);

  try {
    await updateChildSettings(childId, { language_presentation: plan });
  } catch (err) {
    console.error('[LanguagePresentation] Failed to persist plan:', err);
    // Plan still returned to client even if persistence fails
  }

  return NextResponse.json({ success: true, plan });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { childId } = await params;
  const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: { slides?: PresentationSlide[] } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!Array.isArray(body.slides)) {
    return NextResponse.json({ error: 'slides array required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: rawChild } = await supabase
    .from('montree_children')
    .select('id, settings')
    .eq('id', childId)
    .maybeSingle();

  const child = rawChild as { id: string; settings: unknown } | null;
  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });

  const settings = (child.settings as Record<string, unknown>) || {};
  const existing = settings.language_presentation as PresentationPlan | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'No presentation to patch — POST to generate first' }, { status: 404 });
  }

  // Preserve plan metadata; swap in edited slides
  const updated: PresentationPlan = {
    ...existing,
    slides: body.slides.map((s, idx) => ({ ...s, order: idx })),
  };

  try {
    await updateChildSettings(childId, { language_presentation: updated });
  } catch (err) {
    console.error('[LanguagePresentation] PATCH persist failed:', err);
    return NextResponse.json({ error: 'Failed to save edits' }, { status: 500 });
  }

  return NextResponse.json({ success: true, plan: updated });
}
