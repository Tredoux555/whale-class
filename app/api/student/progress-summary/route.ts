import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');

    if (!childId) {
      return NextResponse.json({ error: 'childId is required' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Letter Sounds Progress (26 letters total)
    const { count: letterSoundsCompleted } = await supabase
      .from('letter_sounds_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    const letterSoundsProgress = Math.round(((letterSoundsCompleted || 0) / 26) * 100);

    // Word Builder Progress (95 words total - adjust based on your word list)
    const { count: wordBuilderCompleted } = await supabase
      .from('word_builder_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    const wordBuilderProgress = Math.round(((wordBuilderCompleted || 0) / 95) * 100);

    // Sentence Match Progress (20 sentences total - adjust based on your sentences)
    const { count: sentenceMatchCompleted } = await supabase
      .from('sentence_match_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    const sentenceMatchProgress = Math.round(((sentenceMatchCompleted || 0) / 20) * 100);

    // Sentence Builder Progress
    const { count: sentenceBuilderCompleted } = await supabase
      .from('sentence_builder_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    const sentenceBuilderProgress = Math.round(((sentenceBuilderCompleted || 0) / 20) * 100);

    // Letter Match Progress (26 pairs total)
    const { count: letterMatchCompleted } = await supabase
      .from('letter_match_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    const letterMatchProgress = Math.round(((letterMatchCompleted || 0) / 26) * 100);

    // Letter Tracer Progress (26 letters total)
    const { count: letterTracerCompleted } = await supabase
      .from('letter_tracing_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .gte('status_level', 3); // Independent or better
    const letterTracerProgress = Math.round(((letterTracerCompleted || 0) / 26) * 100);

    return NextResponse.json({
      data: {
        letterSounds: letterSoundsProgress,
        wordBuilder: wordBuilderProgress,
        sentenceMatch: sentenceMatchProgress,
        sentenceBuilder: sentenceBuilderProgress,
        letterMatch: letterMatchProgress,
        letterTracer: letterTracerProgress,
      },
    });
  } catch (error: any) {
    console.error('Progress summary error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

