// lib/games/picture-match-data.ts
// Picture Match Game - Vowel-based CVC word progression
// Now aligned with MASTER_CVC_WORDS (6 words per vowel)

import { WordData } from './game-data';
import { MASTER_CVC_WORDS, toGameFormat } from '@/lib/data/master-words';

// ============================================
// PICTURE MATCH LEVELS - By Vowel Sound
// 6 words per level, 5 core levels + 3 mixed review
// ============================================

export const PICTURE_MATCH_SETS: Record<string, WordData[]> = {
  // Level 1: Short A (6 words)
  level1: toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'a')?.words || []),
  
  // Level 2: Short E (6 words)
  level2: toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'e')?.words || []),
  
  // Level 3: Short I (6 words)
  level3: toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'i')?.words || []),
  
  // Level 4: Short O (6 words)
  level4: toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'o')?.words || []),
  
  // Level 5: Short U (6 words)
  level5: toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'u')?.words || []),
  
  // Level 6: Mixed Review A + E
  level6: [
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'a')?.words.slice(0, 3) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'e')?.words.slice(0, 3) || []),
  ],
  
  // Level 7: Mixed Review I + O
  level7: [
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'i')?.words.slice(0, 3) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'o')?.words.slice(0, 3) || []),
  ],
  
  // Level 8: Mixed Review - All Vowels (1-2 from each)
  level8: [
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'a')?.words.slice(0, 2) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'e')?.words.slice(0, 1) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'i')?.words.slice(0, 1) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'o')?.words.slice(0, 1) || []),
    ...toGameFormat(MASTER_CVC_WORDS.find(g => g.vowel === 'u')?.words.slice(0, 1) || []),
  ],
};

// Level metadata for UI
export const PICTURE_MATCH_LEVELS = [
  { id: 1, name: 'Short A', icon: '🍎', color: '#ef4444', vowel: 'a' },
  { id: 2, name: 'Short E', icon: '🥚', color: '#22c55e', vowel: 'e' },
  { id: 3, name: 'Short I', icon: '🏠', color: '#f97316', vowel: 'i' },
  { id: 4, name: 'Short O', icon: '🐙', color: '#3b82f6', vowel: 'o' },
  { id: 5, name: 'Short U', icon: '☂️', color: '#8b5cf6', vowel: 'u' },
  { id: 6, name: 'Review A+E', icon: '🔄', color: '#14b8a6', vowel: 'mixed' },
  { id: 7, name: 'Review I+O', icon: '🔄', color: '#f59e0b', vowel: 'mixed' },
  { id: 8, name: 'All Vowels', icon: '⭐', color: '#ec4899', vowel: 'mixed' },
];

export function getPictureMatchLevel(level: number): WordData[] {
  const key = `level${level}` as keyof typeof PICTURE_MATCH_SETS;
  return PICTURE_MATCH_SETS[key] || PICTURE_MATCH_SETS.level1;
}

export function getLevelInfo(level: number) {
  return PICTURE_MATCH_LEVELS.find(l => l.id === level) || PICTURE_MATCH_LEVELS[0];
}
