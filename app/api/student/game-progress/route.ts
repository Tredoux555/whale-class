import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

function getBadgeDescription(badgeType: string): string {
  const descriptions: Record<string, string> = {
    first_game: 'Played your first game!',
    letter_master: 'Completed all 26 letters!',
    word_wizard: 'Built 10 words!',
    sentence_star: 'Matched 10 sentences!',
    perfect_match: 'Completed letter matching!',
    tracer_champion: 'Traced all letters!',
    streak_7: 'Played 7 days in a row!',
    completionist: 'Completed all games!',
  };
  return descriptions[badgeType] || 'Great job!';
}

async function checkBadgeTriggers(
  supabase: any,
  childId: string,
  gameType: string,
  itemId: string
) {
  const checks: Array<{ badge_type: string; badge_name: string; badge_icon: string }> = [];

  // First game badge - check if this is first completion
  const { count: totalCompletions } = await supabase
    .from('letter_sounds_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('completed', true);
  
  if ((totalCompletions || 0) === 1) {
    checks.push({ badge_type: 'first_game', badge_name: 'First Game', badge_icon: '🎮' });
  }

  // Letter Master (all 26 letters)
  if (gameType === 'letter_sounds') {
    const { count: lettersCompleted } = await supabase
      .from('letter_sounds_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    
    if (lettersCompleted === 26) {
      checks.push({ badge_type: 'letter_master', badge_name: 'Letter Master', badge_icon: '🔤' });
    }
  }

  // Word Wizard (10 words)
  if (gameType === 'word_builder') {
    const { count: wordsCompleted } = await supabase
      .from('word_builder_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    
    if (wordsCompleted === 10) {
      checks.push({ badge_type: 'word_wizard', badge_name: 'Word Wizard', badge_icon: '📝' });
    }
  }

  // Sentence Star (10 sentences)
  if (gameType === 'sentence_match') {
    const { count: sentencesCompleted } = await supabase
      .from('sentence_match_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    
    if (sentencesCompleted === 10) {
      checks.push({ badge_type: 'sentence_star', badge_name: 'Sentence Star', badge_icon: '⭐' });
    }
  }

  if (gameType === 'sentence_builder') {
    const { count: sentencesCompleted } = await supabase
      .from('sentence_builder_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    
    if (sentencesCompleted === 10) {
      checks.push({ badge_type: 'sentence_star', badge_name: 'Sentence Star', badge_icon: '⭐' });
    }
  }

  // Perfect Match (all 26 letter pairs)
  if (gameType === 'letter_match') {
    const { count: pairsCompleted } = await supabase
      .from('letter_match_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('completed', true);
    
    if (pairsCompleted === 26) {
      checks.push({ badge_type: 'perfect_match', badge_name: 'Perfect Match', badge_icon: '🔄' });
    }
  }

  // Tracer Champion (all 26 letters traced)
  if (gameType === 'letter_tracer') {
    const { count: lettersTraced } = await supabase
      .from('letter_tracing_progress')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId)
      .gte('status_level', 3);
    
    if (lettersTraced === 26) {
      checks.push({ badge_type: 'tracer_champion', badge_name: 'Tracer Champion', badge_icon: '✏️' });
    }
  }

  // Completionist - check if all games are complete
  const { count: letterSoundsCount } = await supabase
    .from('letter_sounds_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('completed', true);
  
  const { count: wordBuilderCount } = await supabase
    .from('word_builder_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('completed', true);
  
  const { count: sentenceMatchCount } = await supabase
    .from('sentence_match_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('completed', true);
  
  const { count: letterMatchCount } = await supabase
    .from('letter_match_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .eq('completed', true);
  
  const { count: letterTracerCount } = await supabase
    .from('letter_tracing_progress')
    .select('*', { count: 'exact', head: true })
    .eq('child_id', childId)
    .gte('status_level', 3);

  // If significant progress in all games (adjust thresholds as needed)
  if (
    (letterSoundsCount || 0) >= 20 &&
    (wordBuilderCount || 0) >= 50 &&
    (sentenceMatchCount || 0) >= 15 &&
    (letterMatchCount || 0) >= 20 &&
    (letterTracerCount || 0) >= 20
  ) {
    const { data: existingBadge } = await supabase
      .from('child_badges')
      .select('id')
      .eq('child_id', childId)
      .eq('badge_type', 'completionist')
      .maybeSingle();

    if (!existingBadge) {
      checks.push({ badge_type: 'completionist', badge_name: 'Completionist', badge_icon: '🏆' });
    }
  }

  // Award badges
  for (const badge of checks) {
    await supabase
      .from('child_badges')
      .upsert({
        child_id: childId,
        badge_type: badge.badge_type,
        badge_name: badge.badge_name,
        badge_icon: badge.badge_icon,
        badge_description: getBadgeDescription(badge.badge_type),
      }, {
        onConflict: 'child_id,badge_type',
      });

    // Update child's total badges
    const { data: badgeCount } = await supabase
      .from('child_badges')
      .select('*', { count: 'exact', head: true })
      .eq('child_id', childId);

    await supabase
      .from('children')
      .update({ total_badges: badgeCount || 0 })
      .eq('id', childId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { gameType, childId, itemId, completed } = await request.json();

    if (!gameType || !childId || !itemId) {
      return NextResponse.json(
        { error: 'gameType, childId, and itemId are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();
    let tableName: string;
    let itemField: string;

    // Map game types to tables
    switch (gameType) {
      case 'letter_sounds':
        tableName = 'letter_sounds_progress';
        itemField = 'letter';
        break;
      case 'word_builder':
        tableName = 'word_builder_progress';
        itemField = 'word';
        break;
      case 'sentence_match':
        tableName = 'sentence_match_progress';
        itemField = 'sentence_id';
        break;
      case 'sentence_builder':
        tableName = 'sentence_builder_progress';
        itemField = 'sentence_id';
        break;
      case 'letter_match':
        tableName = 'letter_match_progress';
        itemField = 'letter_pair';
        break;
      case 'letter_tracer':
        tableName = 'letter_tracing_progress';
        itemField = 'letter';
        break;
      default:
        return NextResponse.json({ error: 'Invalid game type' }, { status: 400 });
    }

    // Get existing record
    const { data: existing } = await supabase
      .from(tableName)
      .select('*')
      .eq('child_id', childId)
      .eq(itemField, itemId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from(tableName)
        .update({
          completed: completed || false,
          completed_date: completed ? new Date().toISOString() : null,
          attempts: (existing.attempts || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('child_id', childId)
        .eq(itemField, itemId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Check for badge triggers (if completed)
      if (completed) {
        await checkBadgeTriggers(supabase, childId, gameType, itemId);
      }

      return NextResponse.json({ success: true, data });
    } else {
      // Create new record
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          child_id: childId,
          [itemField]: itemId,
          completed: completed || false,
          completed_date: completed ? new Date().toISOString() : null,
          attempts: 1,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Check for badge triggers (if completed)
      if (completed) {
        await checkBadgeTriggers(supabase, childId, gameType, itemId);
      }

      return NextResponse.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Game progress error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update progress' },
      { status: 500 }
    );
  }
}

