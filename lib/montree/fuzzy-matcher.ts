// lib/montree/fuzzy-matcher.ts
// DETERMINISTIC Fuzzy Matching Engine
// Based on SoftTFIDF (TF-IDF + Jaro-Winkler) - 85-91% F1 accuracy

import { CURRICULUM, getAllWorks } from './curriculum-data';
import { createServerClient } from '@/lib/supabase';
import type { Work } from './types';

// ============================================
// CONFIDENCE THRESHOLDS (enterprise standard)
// ============================================
export const CONFIDENCE_THRESHOLDS = {
  AUTO_ACCEPT: 95,      // Green - no review needed
  HIGH_CONFIDENCE: 85,  // Green with logging
  SUGGEST: 70,          // Yellow - show suggestions
  MANUAL: 0,            // Red - manual selection required
} as const;

// ============================================
// TYPES
// ============================================
export interface MatchResult {
  work_id: string;
  work_name: string;
  work_chinese?: string;
  area: string;
  confidence: number;
  match_source: 'synonym' | 'fuzzy' | 'exact';
  original_text: string;
}

export interface MatchResponse {
  status: 'auto' | 'suggest' | 'manual' | 'missing';
  confidence: number;
  match?: MatchResult;
  suggestions: MatchResult[];
  original_text: string;
  area: string;
}

// ============================================
// JARO-WINKLER SIMILARITY (0-1)
// Best for short strings and names
// ============================================
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (!s1.length || !s2.length) return 0;

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3;

  // Winkler boost for common prefix (max 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// ============================================
// TOKENIZATION
// ============================================
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// ============================================
// TF-IDF TOKEN MATCHING
// ============================================
function tokenMatchScore(query: string, candidate: string, allCandidates: string[]): number {
  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidate);
  
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  
  // Document frequency
  const docFreq = new Map<string, number>();
  for (const c of allCandidates) {
    const tokens = new Set(tokenize(c));
    tokens.forEach(t => docFreq.set(t, (docFreq.get(t) || 0) + 1));
  }
  
  let score = 0;
  let maxScore = 0;
  
  for (const qt of queryTokens) {
    const df = docFreq.get(qt) || 1;
    const idf = Math.log(allCandidates.length / df) + 1;
    maxScore += idf;
    
    if (candidateTokens.includes(qt)) {
      score += idf;
      continue;
    }
    
    // Fuzzy token match
    let bestMatch = 0;
    for (const ct of candidateTokens) {
      const sim = jaroWinkler(qt, ct);
      if (sim > 0.85) {
        bestMatch = Math.max(bestMatch, sim * idf);
      }
    }
    score += bestMatch;
  }
  
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

// ============================================
// NUMBER MATCHING (critical for "Box 1", "Board 2")
// ============================================
function numberMatchScore(query: string, candidate: string): number {
  const queryNums = query.match(/\d+/g) || [];
  const candidateNums = candidate.match(/\d+/g) || [];
  
  if (queryNums.length === 0 && candidateNums.length === 0) return 0;
  if (queryNums.length === 0 || candidateNums.length === 0) return -10;
  
  const matches = queryNums.filter(n => candidateNums.includes(n)).length;
  return matches > 0 ? 15 * matches : -10;
}

// ============================================
// ABBREVIATION MATCHING ("RB" -> "Review Box")
// ============================================
function abbreviationScore(query: string, candidate: string): number {
  const queryClean = query.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const candidateWords = candidate.split(/\s+/);
  const candidateAbbrev = candidateWords.map(w => w[0]?.toLowerCase() || '').join('');
  
  if (queryClean === candidateAbbrev) return 50;
  if (candidateAbbrev.includes(queryClean) && queryClean.length >= 2) return 30;
  
  return 0;
}

// ============================================
// CHINESE MATCHING
// ============================================
function chineseMatchScore(query: string, candidateChinese?: string): number {
  if (!candidateChinese) return 0;
  
  const queryHasChinese = /[\u4e00-\u9fff]/.test(query);
  if (!queryHasChinese) return 0;
  
  const queryChinese = query.match(/[\u4e00-\u9fff]+/g)?.join('') || '';
  
  if (queryChinese === candidateChinese) return 100;
  if (candidateChinese.includes(queryChinese)) return 80;
  if (queryChinese.includes(candidateChinese)) return 70;
  
  return 0;
}

// ============================================
// MAIN MATCHING FUNCTION
// ============================================
export async function matchWork(
  originalText: string,
  area: string,
  schoolId?: string
): Promise<MatchResponse> {
  const normalized = originalText.toLowerCase().trim();
  
  if (!normalized) {
    return {
      status: 'missing',
      confidence: 0,
      suggestions: [],
      original_text: originalText,
      area,
    };
  }
  
  const areaData = CURRICULUM.find(a => a.id === area);
  if (!areaData) {
    return {
      status: 'manual',
      confidence: 0,
      suggestions: [],
      original_text: originalText,
      area,
    };
  }
  
  const areaWorks: Work[] = areaData.categories.flatMap(c => c.works);
  const allWorkNames = areaWorks.map(w => w.name);
  
  // ---- STEP 1: Exact Match ----
  for (const work of areaWorks) {
    if (work.name.toLowerCase() === normalized || work.id.toLowerCase() === normalized) {
      return {
        status: 'auto',
        confidence: 100,
        match: {
          work_id: work.id,
          work_name: work.name,
          work_chinese: work.chineseName,
          area,
          confidence: 100,
          match_source: 'exact',
          original_text: originalText,
        },
        suggestions: [],
        original_text: originalText,
        area,
      };
    }
  }
  
  // ---- STEP 2: Synonym Lookup ----
  const synonym = await lookupSynonym(normalized, schoolId);
  if (synonym) {
    // Find work in this area OR any area
    let work = areaWorks.find(w => w.id === synonym.work_id);
    if (!work) {
      // Check all areas
      work = getAllWorks().find(w => w.id === synonym.work_id) || undefined;
    }
    
    if (work) {
      await incrementSynonymUsage(synonym.id);
      
      const result: MatchResult = {
        work_id: work.id,
        work_name: work.name,
        work_chinese: work.chineseName,
        area,
        confidence: synonym.confidence,
        match_source: 'synonym',
        original_text: originalText,
      };
      
      return {
        status: synonym.confidence >= CONFIDENCE_THRESHOLDS.AUTO_ACCEPT ? 'auto' : 'suggest',
        confidence: synonym.confidence,
        match: result,
        suggestions: [],
        original_text: originalText,
        area,
      };
    }
  }
  
  // ---- STEP 3: Fuzzy Matching ----
  const scores: { work: Work; score: number }[] = [];
  
  for (const work of areaWorks) {
    const tokenScore = tokenMatchScore(normalized, work.name, allWorkNames);
    const numScore = numberMatchScore(normalized, work.name);
    const abbrScore = abbreviationScore(normalized, work.name);
    const chineseScore = chineseMatchScore(normalized, work.chineseName);
    
    // Weighted combination
    let finalScore = tokenScore * 0.6 + 
                     Math.max(0, numScore) * 0.15 + 
                     abbrScore * 0.15 +
                     chineseScore * 0.1;
    
    if (numScore < 0) finalScore += numScore * 0.3;
    
    // Jaro-Winkler tiebreaker
    const directJW = jaroWinkler(normalized, work.name.toLowerCase()) * 100;
    if (directJW > 85) finalScore = Math.max(finalScore, directJW * 0.9);
    
    scores.push({ work, score: Math.min(100, Math.max(0, finalScore)) });
  }
  
  scores.sort((a, b) => b.score - a.score);
  
  const suggestions: MatchResult[] = scores.slice(0, 5).map(s => ({
    work_id: s.work.id,
    work_name: s.work.name,
    work_chinese: s.work.chineseName,
    area,
    confidence: Math.round(s.score),
    match_source: 'fuzzy' as const,
    original_text: originalText,
  }));
  
  const topMatch = scores[0];
  
  let status: 'auto' | 'suggest' | 'manual';
  let match: MatchResult | undefined;
  
  if (topMatch.score >= CONFIDENCE_THRESHOLDS.AUTO_ACCEPT) {
    status = 'auto';
    match = suggestions[0];
  } else if (topMatch.score >= CONFIDENCE_THRESHOLDS.SUGGEST) {
    status = 'suggest';
    match = suggestions[0];
  } else {
    status = 'manual';
  }
  
  return {
    status,
    confidence: Math.round(topMatch.score),
    match,
    suggestions,
    original_text: originalText,
    area,
  };
}

// ============================================
// SYNONYM DATABASE OPERATIONS
// ============================================

interface SynonymRecord {
  id: string;
  raw_text: string;
  work_id: string;
  confidence: number;
}

async function lookupSynonym(rawText: string, schoolId?: string): Promise<SynonymRecord | null> {
  try {
    const supabase = await createServerClient();
    
    // School-specific first
    if (schoolId) {
      const { data: schoolSyn } = await supabase
        .from('montree_work_synonyms')
        .select('id, raw_text, work_id, confidence')
        .eq('raw_text', rawText)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (schoolSyn) return schoolSyn;
    }
    
    // Global fallback
    const { data: globalSyn } = await supabase
      .from('montree_work_synonyms')
      .select('id, raw_text, work_id, confidence')
      .eq('raw_text', rawText)
      .is('school_id', null)
      .eq('status', 'active')
      .maybeSingle();
    
    return globalSyn;
  } catch (error) {
    console.error('Synonym lookup error:', error);
    return null;
  }
}

async function incrementSynonymUsage(synonymId: string): Promise<void> {
  try {
    const supabase = await createServerClient();
    await supabase.rpc('increment_synonym_usage', { synonym_id: synonymId });
  } catch (error) {
    console.warn('Failed to increment synonym usage:', error);
  }
}

// ============================================
// LEARNING FROM CORRECTIONS
// ============================================
export async function learnFromCorrection(
  rawText: string,
  selectedWorkId: string,
  schoolId?: string,
  createdBy?: string
): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const normalized = rawText.toLowerCase().trim();
    
    const { data: existing } = await supabase
      .from('montree_work_synonyms')
      .select('id, usage_count')
      .eq('raw_text', normalized)
      .eq('school_id', schoolId || null)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('montree_work_synonyms')
        .update({
          work_id: selectedWorkId,
          usage_count: existing.usage_count + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('montree_work_synonyms')
        .insert({
          raw_text: normalized,
          work_id: selectedWorkId,
          school_id: schoolId || null,
          source: 'user_correction',
          confidence: 100,
          status: 'active',
          created_by: createdBy,
        });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to learn from correction:', error);
    return false;
  }
}

// ============================================
// UTILITIES
// ============================================
export function getWorksForArea(areaId: string): Work[] {
  const area = CURRICULUM.find(a => a.id === areaId);
  if (!area) return [];
  return area.categories.flatMap(c => c.works);
}

export function searchWorks(query: string, areaId?: string): Work[] {
  const allWorks = areaId ? getWorksForArea(areaId) : getAllWorks();
  const normalized = query.toLowerCase();
  
  return allWorks
    .map(work => ({
      work,
      score: tokenMatchScore(normalized, work.name, allWorks.map(w => w.name))
    }))
    .filter(r => r.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(r => r.work);
}
