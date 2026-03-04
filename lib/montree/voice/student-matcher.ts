// lib/montree/voice/student-matcher.ts
// Match spoken student names against classroom roster + aliases
// Uses Jaro-Winkler from fuzzy-matcher.ts

import { getSupabase } from '@/lib/supabase-client';

interface Child {
  id: string;
  name: string;
  first_name?: string;
}

interface Alias {
  child_id: string;
  alias: string;
}

interface MatchResult {
  childId: string | null;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
  matchedName: string;
}

// Jaro-Winkler distance (replicates logic from fuzzy-matcher.ts)
function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1.0;

  const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Match a spoken student name against classroom roster + aliases
 */
export function matchStudentName(
  spokenName: string,
  children: Child[],
  aliases: Alias[]
): MatchResult {
  const spoken = spokenName.trim().toLowerCase();
  if (!spoken) return { childId: null, confidence: 0, matchType: 'none', matchedName: spokenName };

  // Step 1: Exact first-name match
  for (const child of children) {
    const firstName = (child.first_name || child.name.split(' ')[0]).toLowerCase();
    const fullName = child.name.toLowerCase();
    if (spoken === firstName || spoken === fullName) {
      return { childId: child.id, confidence: 1.0, matchType: 'exact', matchedName: child.name };
    }
  }

  // Step 2: Alias lookup
  for (const alias of aliases) {
    if (spoken === alias.alias.toLowerCase()) {
      const child = children.find(c => c.id === alias.child_id);
      return {
        childId: alias.child_id,
        confidence: 0.95,
        matchType: 'alias',
        matchedName: child?.name || alias.alias
      };
    }
  }

  // Step 3: Jaro-Winkler fuzzy match (threshold: 0.85)
  let bestMatch: { childId: string; score: number; name: string } | null = null;

  for (const child of children) {
    const firstName = (child.first_name || child.name.split(' ')[0]).toLowerCase();
    const score = jaroWinkler(spoken, firstName);
    if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { childId: child.id, score, name: child.name };
    }
    // Also try full name
    const fullScore = jaroWinkler(spoken, child.name.toLowerCase());
    if (fullScore >= 0.85 && (!bestMatch || fullScore > bestMatch.score)) {
      bestMatch = { childId: child.id, score: fullScore, name: child.name };
    }
  }

  // Also fuzzy against aliases
  for (const alias of aliases) {
    const score = jaroWinkler(spoken, alias.alias.toLowerCase());
    if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
      const child = children.find(c => c.id === alias.child_id);
      bestMatch = { childId: alias.child_id, score, name: child?.name || alias.alias };
    }
  }

  if (bestMatch) {
    return {
      childId: bestMatch.childId,
      confidence: bestMatch.score,
      matchType: 'fuzzy',
      matchedName: bestMatch.name
    };
  }

  // Step 4: No match
  return { childId: null, confidence: 0, matchType: 'none', matchedName: spokenName };
}

/**
 * Save an AI-learned alias for future sessions
 */
export async function learnAlias(
  classroomId: string,
  childId: string,
  alias: string
): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('voice_observation_student_aliases')
    .upsert(
      { classroom_id: classroomId, child_id: childId, alias: alias.trim(), source: 'ai_learned' },
      { onConflict: 'classroom_id,alias' }
    );
}

/**
 * Load all aliases for a classroom
 */
export async function loadAliases(classroomId: string): Promise<Alias[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('voice_observation_student_aliases')
    .select('child_id, alias')
    .eq('classroom_id', classroomId);
  return data || [];
}
