// Classroom Curriculum Utilities
// Shared constants and functions for classroom-owned curriculum

// ============================================
// CONSTANTS
// ============================================

// The Whale classroom ID (Tredoux's class at Beijing International School)
export const WHALE_CLASSROOM_ID = 'bf0daf1b-cd46-4fba-9c2f-d3297bd11fc6';

// Status mapping for child progress
export const STATUS_TO_NUMBER: Record<string, number> = {
  'not_started': 0,
  'presented': 1,
  'practicing': 2,
  'mastered': 3
};

export const NUMBER_TO_STATUS: Record<number, string> = {
  0: 'not_started',
  1: 'presented',
  2: 'practicing',
  3: 'mastered'
};

// Status display names
export const STATUS_DISPLAY: Record<number, { label: string; color: string; bgColor: string }> = {
  0: { label: 'Not Started', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  1: { label: 'Presented', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  2: { label: 'Practicing', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  3: { label: 'Mastered', color: 'text-green-600', bgColor: 'bg-green-100' }
};

// Area configuration for display
export const AREA_CONFIG: Record<string, { icon: string; color: string; bgColor: string; name: string }> = {
  practical_life: { icon: '🧹', color: 'bg-pink-500', bgColor: 'bg-pink-50', name: 'Practical Life' },
  sensorial: { icon: '👁️', color: 'bg-purple-500', bgColor: 'bg-purple-50', name: 'Sensorial' },
  mathematics: { icon: '🔢', color: 'bg-blue-500', bgColor: 'bg-blue-50', name: 'Mathematics' },
  language: { icon: '📖', color: 'bg-green-500', bgColor: 'bg-green-50', name: 'Language' },
  cultural: { icon: '🌍', color: 'bg-orange-500', bgColor: 'bg-orange-50', name: 'Cultural' },
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Normalize area keys to handle variations
 * e.g., 'math' -> 'mathematics', 'culture' -> 'cultural'
 */
export function normalizeArea(area: string): string {
  const areaMap: Record<string, string> = {
    'math': 'mathematics',
    'culture': 'cultural',
    'science': 'cultural',  // Science is part of Cultural in Montessori
  };
  return areaMap[area.toLowerCase()] || area.toLowerCase();
}

/**
 * Convert string status to number
 */
export function statusToNumber(status: string): number {
  return STATUS_TO_NUMBER[status] ?? 0;
}

/**
 * Convert number status to string
 */
export function numberToStatus(status: number): string {
  return NUMBER_TO_STATUS[status] ?? 'not_started';
}

/**
 * Generate a work key from a work name
 */
export function generateWorkKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  return `custom_${slug}_${Date.now()}`;
}

/**
 * Fuzzy match a work name to curriculum
 * Returns the best match or null if no match found
 */
export function findBestMatch(
  workName: string, 
  curriculumWorks: { id: string; name: string }[]
): { id: string; name: string } | null {
  const normalizedName = workName.toLowerCase().trim()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ');
  
  // Exact match (case-insensitive)
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName === normalizedName) {
      return work;
    }
  }
  
  // Contains match
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase().trim();
    if (currName.includes(normalizedName) || normalizedName.includes(currName)) {
      return work;
    }
  }
  
  // Word-based matching (at least 2 words match, or 1 word if only 1 word in name)
  const nameWords = normalizedName.split(' ').filter(w => w.length > 2);
  for (const work of curriculumWorks) {
    const currName = (work.name || '').toLowerCase();
    const matchCount = nameWords.filter(word => currName.includes(word)).length;
    if (matchCount >= 2 || (nameWords.length === 1 && matchCount === 1)) {
      return work;
    }
  }
  
  return null;
}

/**
 * Get area display info
 */
export function getAreaInfo(areaKey: string) {
  const normalized = normalizeArea(areaKey);
  return AREA_CONFIG[normalized] || { 
    icon: '📚', 
    color: 'bg-gray-500', 
    bgColor: 'bg-gray-50',
    name: areaKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  };
}

/**
 * Get status display info
 */
export function getStatusInfo(status: number) {
  return STATUS_DISPLAY[status] || STATUS_DISPLAY[0];
}
