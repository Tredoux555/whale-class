// app/api/montree/guru/photo-insight/route.ts
// Photo-Aware Observations — Sonnet vision analyzes a child's photo
// Cached per media_id in montree_guru_interactions

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, media_id } = body;

    if (!child_id || !media_id) {
      return NextResponse.json(
        { success: false, error: 'child_id and media_id are required' },
        { status: 400 }
      );
    }

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Check for cached insight
    const { data: cached } = await supabase
      .from('montree_guru_interactions')
      .select('response_insight')
      .eq('child_id', child_id)
      .eq('question_type', 'photo_insight')
      .eq('question', `photo:${media_id}`)
      .limit(1)
      .single();

    if (cached?.response_insight) {
      return NextResponse.json({ success: true, insight: cached.response_insight });
    }

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features are not enabled' }, { status: 503 });
    }

    // Fetch the photo URL
    const { data: media } = await supabase
      .from('montree_media')
      .select('file_url, media_type')
      .eq('id', media_id)
      .single();

    if (!media?.file_url) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    // Only process images
    if (media.media_type && !media.media_type.startsWith('image') && media.media_type !== 'photo') {
      return NextResponse.json({ success: false, error: 'Only photos can be analyzed' }, { status: 400 });
    }

    // Get child context
    const { data: child } = await supabase
      .from('montree_children')
      .select('name, age')
      .eq('id', child_id)
      .single();

    const childName = child?.name?.split(' ')[0] || 'This child';
    const childAge = child?.age || 4;

    // Get current works for context
    const { data: currentWorks } = await supabase
      .from('montree_child_work_progress')
      .select('work_name, area, status')
      .eq('child_id', child_id)
      .in('status', ['practicing', 'presented'])
      .limit(10);

    const worksContext = currentWorks && currentWorks.length > 0
      ? `Current works: ${currentWorks.map(w => `${w.work_name} (${w.area})`).join(', ')}`
      : 'No current works tracked yet.';

    // Build the photo URL — ensure it's a full URL
    let photoUrl = media.file_url;
    if (photoUrl.startsWith('/')) {
      // Relative URL — can't send to Claude vision API
      return NextResponse.json({ success: false, error: 'Photo URL not accessible' }, { status: 400 });
    }

    // Call Sonnet with vision
    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      system: `You are a warm, observant Montessori guide. You're looking at a photo of a child working. Comment on what you observe in 2-3 sentences:
- What Montessori activity or work do you see?
- Note concentration, grip, posture, or technique (be specific and positive)
- Keep it warm and encouraging — this goes to the parent

Do NOT use headers. Just 2-3 flowing sentences. If the photo isn't clearly a Montessori activity, comment on what you observe about the child's engagement.`,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: photoUrl },
          },
          {
            type: 'text',
            text: `Child: ${childName}, age ${childAge}\n${worksContext}\n\nWhat do you observe in this photo?`,
          },
        ],
      }],
    });

    const insightText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    // Cache per media_id
    await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id,
        question: `photo:${media_id}`,
        question_type: 'photo_insight',
        response_insight: insightText,
        model_used: AI_MODEL,
        context_snapshot: {
          child_name: childName,
          media_id,
          photo_url: photoUrl,
        },
      });

    return NextResponse.json({ success: true, insight: insightText });

  } catch (error) {
    console.error('[Guru PhotoInsight] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze photo' },
      { status: 500 }
    );
  }
}
